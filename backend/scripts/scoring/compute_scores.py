"""행정동 점수 계산 (SPEC 11.2) — 실 데이터/더미 데이터 양쪽 지원.

LEGACY STATUS:
- This script still targets the removed Dong score columns and gu-level rent fallback.
- Do not run it for the current Adong/CurrentAdong scoring flow until rewritten.

알고리즘 (SPEC 11.2)
--------------------
- score_rent: 환산월세(만원/월) = monthly_rent + deposit * 0.005 (apps.public_data.rent_deal.utils
  와 단일 진실). 동별 평균 → 백분위 invert (저렴할수록 높음).
  RentDeal 7.4M 은 SQL aggregation (Avg, Count) 으로 처리, 메모리 안전.
- score_amenity: 동별 Store 카운트 + Park 카운트 → log scale 가중합 → 백분위.
  (RDS 통합 후 Amenity 모델은 derived view 로 빠지고 raw 는 Store 가 보유.
  카테고리별 정밀 가중은 추후 별도 PR.)
- score_transit: (1 - rank=1 거리/1000 클램프) 지하철 가중 + log1p(BusStop 카운트)/
  log1p(50) 정규화 → 가중합 → 백분위. NearestSubway 캐시 (compute_nearest_subway.py)
  필요.

각 점수는 0~100 (소수점 1자리). Dong.score_rent / score_amenity / score_transit
컬럼에 bulk_update 로 갱신. 총점(composite)은 API 호출 시점에 가중치 곱해 계산.

거래량 3건 미만 동 → 같은 구 평균 → 서울 중위값 fallback.

Usage
-----
    python scripts/compute_scores.py --mode check
    python scripts/compute_scores.py --mode dummy
    python scripts/compute_scores.py --mode real

Prerequisite (real mode)
------------------------
    python scripts/compute_nearest_subway.py    # NearestSubway 캐시 채우기
"""

from __future__ import annotations

import argparse
import math
import statistics
import sys
from collections import defaultdict
from typing import Dict, List, Optional

from _django import setup

setup()

from django.db.models import Avg, Count, F, Value  # noqa: E402

from apps.service.amenities.models import Amenity, AmenityAdong  # noqa: E402
from apps.service.neighborhoods.models import Dong  # noqa: E402
from apps.public_data.rent_deal.models import RentDeal  # noqa: E402
from apps.public_data.rent_deal.utils import convert_to_monthly  # noqa: E402
from apps.public_data.bus.models import BusStop  # noqa: E402
from apps.public_data.subway.models import NearestSubwayAdong  # noqa: E402


# ---------------------------------------------------------------------------
# 가중치 (SPEC 11.2 미상세 — handoff 1b 권장값 기반 default)
# ---------------------------------------------------------------------------
AMENITY_WEIGHTS: Dict[str, float] = {
    "convenience": 0.20,
    "mart": 0.10,
    "restaurant": 0.10,
    "cafe": 0.10,
    "studycafe": 0.10,
    "hospital": 0.15,
    "pharmacy": 0.10,
    "laundry": 0.05,
    "oliveyoung": 0.05,
    "park": 0.05,
}

# 교통: 지하철 60% + 버스 40% (도시형 표준 가중)
TRANSIT_W_SUBWAY = 0.60
TRANSIT_W_BUS = 0.40

# 지하철: 1000m 이내일 때 점수, 그 이상은 0
SUBWAY_DISTANCE_CAP_M = 1000.0
# 버스: 정류장 수 정규화 (50개 = 만점)
BUS_COUNT_CAP = 50


# ---------------------------------------------------------------------------
# 헬퍼: 환산 월세 — 표준식 (apps.public_data.rent_deal.utils 와 단일 진실)
# ---------------------------------------------------------------------------
def _converted_rent(deposit: int, monthly_rent: int) -> float:
    """표준 환산식 (만원/월): monthly_rent + deposit × 0.005.

    구현은 apps.public_data.rent_deal.utils.convert_to_monthly 에 위임한다 (단일 진실).
    score_rent 와 API 응답(`converted_rent`, `rent_converted_avg`) 가 동일한
    계수/공식을 공유해야 표시값과 점수가 정합한다.

    주: 이전 구현은 "보증금 1000만원 초과분만 환산" 이었으나, 실 거래에서
    전세-반전세-월세 trade-off 를 일관 비교하려면 보증금 전액을 환산하는
    국토부 표준식이 적절. 변경 후 score_rent 분포가 미세 이동하나 (보증금이
    큰 동일수록 환산값↑ → score_rent↓) 상대 순위는 대체로 보존됨.
    """
    return convert_to_monthly(deposit, monthly_rent)


# ---------------------------------------------------------------------------
# 헬퍼: 백분위 (None 처리 포함)
# ---------------------------------------------------------------------------
def _percentile_scores(values: List[Optional[float]], reverse: bool = False) -> List[float]:
    """0~100 백분위 점수.

    None 값은 50.0 (중앙) 으로 처리.
    reverse=True 면 작을수록 점수 높음 (예: 환산월세 → 저렴=높음).
    """
    valid = [(i, v) for i, v in enumerate(values) if v is not None]
    if not valid:
        return [50.0] * len(values)
    if len(valid) == 1:
        result = [50.0] * len(values)
        result[valid[0][0]] = 50.0
        return result

    # rank (작은 값 = 낮은 rank)
    sorted_idx = sorted(valid, key=lambda x: x[1])
    n = len(sorted_idx)
    rank_pct: Dict[int, float] = {}
    # 동률 처리: 같은 값에 평균 rank 부여
    i = 0
    while i < n:
        j = i
        while j + 1 < n and sorted_idx[j + 1][1] == sorted_idx[i][1]:
            j += 1
        # i..j 같은 값
        avg_rank = (i + j) / 2.0  # 0-indexed
        pct = (avg_rank / (n - 1)) * 100.0
        for k in range(i, j + 1):
            orig_idx = sorted_idx[k][0]
            rank_pct[orig_idx] = pct
        i = j + 1

    result = []
    for idx, v in enumerate(values):
        if v is None:
            result.append(50.0)
        else:
            pct = rank_pct[idx]
            if reverse:
                pct = 100.0 - pct
            result.append(pct)
    return result


# ---------------------------------------------------------------------------
# Step 1: 동별 raw metric 수집
# ---------------------------------------------------------------------------
def _collect_rent_metrics(dongs: List[Dong]) -> Dict[int, Optional[float]]:
    """자치구별 평균 환산월세. dong.gu 단위로 group_by 후 dong에 부여.

    sub-plan 4.5D: RentDeal.dong FK 제거 → ldong__gu_code 기반 자치구 평균.
    같은 자치구의 모든 dong은 동일 자치구 평균을 부여 (행정동↔법정동 N:M 매핑 부재).
    <3건은 None (구 평균 → 서울 중위 fallback 후 처리).

    7.4M RentDeal 행을 메모리에 적재하지 않고 SQL aggregation 으로 자치구별 평균 계산.
    환산식: monthly_rent + deposit * 0.005 (utils.convert_to_monthly 와 동일 계수).
    """
    qs = (
        RentDeal.objects.values("ldong__gu__name")
        .annotate(
            avg_rent=Avg(F("monthly_rent") + F("deposit") * Value(0.005)),
            n=Count("id"),
        )
    )
    agg = {row["ldong__gu__name"]: (row["avg_rent"], row["n"]) for row in qs}

    result: Dict[int, Optional[float]] = {}
    for dong in dongs:
        rec = agg.get(dong.gu)
        if rec is None or rec[1] < 3:
            result[dong.id] = None
        else:
            result[dong.id] = float(rec[0])
    return result


def _apply_rent_fallback(
    dongs: List[Dong], metrics: Dict[int, Optional[float]]
) -> tuple[Dict[int, Optional[float]], int]:
    """3건 미만 동에 fallback: 같은 구 평균 → 서울 중위.

    Returns (filled_metrics, fallback_count)
    """
    # 같은 구 평균 (>=3건 충족 동만 사용)
    by_gu: Dict[str, List[float]] = defaultdict(list)
    for dong in dongs:
        v = metrics.get(dong.id)
        if v is not None:
            by_gu[dong.gu].append(v)
    gu_avg = {gu: sum(vs) / len(vs) for gu, vs in by_gu.items() if vs}

    # 서울 전체 중위
    all_vals = [v for v in metrics.values() if v is not None]
    seoul_median = statistics.median(all_vals) if all_vals else 0.0

    filled: Dict[int, Optional[float]] = {}
    fallback_count = 0
    for dong in dongs:
        v = metrics.get(dong.id)
        if v is not None:
            filled[dong.id] = v
        else:
            fallback_count += 1
            filled[dong.id] = gu_avg.get(dong.gu, seoul_median)
    return filled, fallback_count


def _collect_amenity_metrics(dongs: List[Dong]) -> Dict[int, float]:
    """행정동별 amenity 가중 점수 — 카테고리별 카운트 → log1p → AMENITY_WEIGHTS 가중합.

    sub-plan 4.5D: Amenity.dong FK 제거 → AmenityAdong N:M. adong_code(=Dong.code) GROUP BY.
    """
    # adong_code별 카테고리 카운트.
    counts: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for row in (
        AmenityAdong.objects.values("adong_id", "amenity__category")
        .annotate(n=Count("amenity_id"))
        .iterator()
    ):
        counts[row["adong_id"]][row["amenity__category"]] = row["n"]

    result: Dict[int, float] = {}
    for dong in dongs:
        # Dong.code(10자리 행정동) == Adong.adong_code.
        cdict = counts.get(dong.code, {})
        score = 0.0
        for cat, weight in AMENITY_WEIGHTS.items():
            cnt = cdict.get(cat, 0)
            score += math.log1p(cnt) * weight
        result[dong.id] = score
    return result


def _collect_transit_metrics(dongs: List[Dong]) -> Dict[int, float]:
    """행정동별 transit raw metric (지하철 가중 + 버스 카운트 가중).

    sub-plan 4.5D: NearestSubwayAdong(adong FK) + BusStop.adong FK 사용.
    Dong.code(10자리 행정동) == Adong.adong_code.
    """
    # 가까운 지하철 (rank=1) 거리 — NearestSubwayAdong.
    nearest_dist: Dict[str, float] = {}
    for adong_code, dist in NearestSubwayAdong.objects.filter(rank=1).values_list(
        "adong_id", "distance_m"
    ):
        nearest_dist[adong_code] = dist

    # 버스 정류장 카운트 — BusStop.adong (regions.Adong, PK=adong_code).
    bus_counts: Dict[str, int] = {}
    for row in (
        BusStop.objects.filter(adong__isnull=False)
        .values("adong_id")
        .annotate(n=Count("id"))
    ):
        bus_counts[row["adong_id"]] = row["n"]

    result: Dict[int, float] = {}
    log_cap = math.log1p(BUS_COUNT_CAP)
    for dong in dongs:
        dist = nearest_dist.get(dong.code, SUBWAY_DISTANCE_CAP_M)
        # 0..1: 거리 0m=1, 1000m=0
        subway_score = max(0.0, 1.0 - dist / SUBWAY_DISTANCE_CAP_M)

        cnt = bus_counts.get(dong.code, 0)
        # 0..1: log scale, 50개 = 1.0 (그 이상은 1.0 클램프)
        bus_score = min(1.0, math.log1p(cnt) / log_cap)

        result[dong.id] = TRANSIT_W_SUBWAY * subway_score + TRANSIT_W_BUS * bus_score
    return result


# ---- 실 데이터 모드 ---------------------------------------------------
def _compute_real() -> int:
    """SPEC 11.2 — 행정동별 score_rent / score_amenity / score_transit 갱신."""
    dongs = list(Dong.objects.all().order_by("id"))
    if not dongs:
        print("[ERROR] Dong 데이터가 없습니다. seed_dongs.py 먼저 실행.")
        return 1
    print(f"[INFO] {len(dongs)}개 행정동 점수 계산 시작.")

    # ---- 1) raw metric 수집 ------------------------------------------
    print("[INFO] (1/4) rent metric 수집 ...")
    rent_raw = _collect_rent_metrics(dongs)
    n_with_rent = sum(1 for v in rent_raw.values() if v is not None)
    print(f"        거래량 ≥3 동: {n_with_rent} / {len(dongs)}")

    rent_filled, fallback_count = _apply_rent_fallback(dongs, rent_raw)
    print(f"        fallback 적용 동: {fallback_count}")

    print("[INFO] (2/4) amenity metric 수집 ...")
    amenity_metric = _collect_amenity_metrics(dongs)

    print("[INFO] (3/4) transit metric 수집 ...")
    transit_metric = _collect_transit_metrics(dongs)

    # ---- 2) 백분위 변환 -----------------------------------------------
    print("[INFO] (4/4) 백분위 정규화 ...")
    rent_values = [rent_filled[d.id] for d in dongs]
    amenity_values = [amenity_metric[d.id] for d in dongs]
    transit_values = [transit_metric[d.id] for d in dongs]

    # rent: 저렴할수록 점수 높음 → reverse
    rent_scores = _percentile_scores(rent_values, reverse=True)
    amenity_scores = _percentile_scores(amenity_values, reverse=False)
    transit_scores = _percentile_scores(transit_values, reverse=False)

    # ---- 3) bulk_update -----------------------------------------------
    for d, sr, sa, st in zip(dongs, rent_scores, amenity_scores, transit_scores):
        d.score_rent = round(sr, 1)
        d.score_amenity = round(sa, 1)
        d.score_transit = round(st, 1)
    Dong.objects.bulk_update(
        dongs, ["score_rent", "score_amenity", "score_transit"], batch_size=200
    )

    # ---- 4) 요약 출력 -------------------------------------------------
    def _summary(name: str, vals: List[float]) -> None:
        print(
            f"  {name:14s} "
            f"min={min(vals):5.1f}  max={max(vals):5.1f}  "
            f"mean={statistics.mean(vals):5.1f}  "
            f"std={statistics.pstdev(vals):5.1f}"
        )

    print(f"\n[OK] {len(dongs)}개 동 갱신 완료.")
    print("점수 분포:")
    _summary("score_rent", rent_scores)
    _summary("score_amenity", amenity_scores)
    _summary("score_transit", transit_scores)

    print("\n상위 10 (score_amenity):")
    top_a = sorted(dongs, key=lambda x: x.score_amenity, reverse=True)[:10]
    for d in top_a:
        print(
            f"  {d.gu:8s} {d.name:15s} "
            f"R={d.score_rent:5.1f}  A={d.score_amenity:5.1f}  T={d.score_transit:5.1f}"
        )

    print("\n하위 10 (score_transit):")
    bot_t = sorted(dongs, key=lambda x: x.score_transit)[:10]
    for d in bot_t:
        print(
            f"  {d.gu:8s} {d.name:15s} "
            f"R={d.score_rent:5.1f}  A={d.score_amenity:5.1f}  T={d.score_transit:5.1f}"
        )

    return 0


# ---- 더미 데이터 점검 모드 --------------------------------------------
def _compute_dummy() -> int:
    """5개 더미 동의 score_* 가 0 인 경우만 결정적 값으로 채워 넣는다.

    seed_dummy_dongs 가 이미 채우므로 일반적으로는 변경 없음. 단순 sanity check.
    """

    DUMMY_VALUES = {
        # slug: (score_rent, score_amenity, score_transit)
        "pildong":     (50.0, 60.0, 90.0),
        "hoegidong":   (85.0, 70.0, 60.0),
        "seogyodong":  (40.0, 95.0, 65.0),
        "yeoksamdong": (15.0, 80.0, 85.0),
        "jamsildong":  (55.0, 85.0, 75.0),
    }

    qs = Dong.objects.filter(slug__in=DUMMY_VALUES.keys())
    if not qs.exists():
        print("[INFO] 더미 동이 없습니다. seed_dummy_dongs 먼저 실행하세요.")
        return 0

    updated = 0
    for d in qs:
        sr, sa, st = DUMMY_VALUES[d.slug]
        # 이미 있는 값이면 두고, 0 인 경우만 채움 (idempotent + 비파괴)
        changed = False
        if d.score_rent == 0:
            d.score_rent = sr
            changed = True
        if d.score_amenity == 0:
            d.score_amenity = sa
            changed = True
        if d.score_transit == 0:
            d.score_transit = st
            changed = True
        if changed:
            d.save(update_fields=["score_rent", "score_amenity", "score_transit", "updated_at"])
            updated += 1

    print(f"[OK] dummy mode: 더미 동 {qs.count()}개 점검, {updated}개 갱신.")
    return 0


# ---- 모델 존재 점검 모드 ----------------------------------------------
def _check_models() -> int:
    from django.apps import apps as django_apps

    required = [
        ("rent_deal", "RentDeal"),
        ("amenities", "Amenity"),
        ("transit", "SubwayStation"),
        ("transit", "BusStop"),
    ]
    print("실 데이터 적재에 필요한 모델 존재 여부:")
    missing = 0
    for app_label, model_name in required:
        try:
            django_apps.get_model(app_label, model_name)
            print(f"  [OK]      {app_label}.{model_name}")
        except LookupError:
            print(f"  [MISSING] {app_label}.{model_name}")
            missing += 1

    print(f"\nDong 적재 상태: {Dong.objects.count()} 개 행")

    if missing:
        print("\n실 데이터 모드 사용 불가. 다음 단계:")
        print("  1) apps/realestate/, apps/amenities/, apps/transit/ 앱 생성")
        print("  2) SPEC 섹션 10 모델 정의 + INSTALLED_APPS 등록")
        print("  3) python manage.py makemigrations && migrate")
        print("  4) fetch_*.py 스크립트의 _persist_db 활성화")
        print("  5) python scripts/compute_scores.py --mode real")
        return 0
    print("\n전 모델 OK — `--mode real` 사용 가능.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="행정동 점수 계산 (SPEC 11.2)")
    parser.add_argument("--mode", choices=["check", "dummy", "real"], default="check")
    args = parser.parse_args()

    if args.mode == "check":
        return _check_models()
    if args.mode == "dummy":
        return _compute_dummy()
    if args.mode == "real":
        return _compute_real()
    return 0


if __name__ == "__main__":
    sys.exit(main())
