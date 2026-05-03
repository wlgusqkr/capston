"""
동네 비교(SPEC 6.4) 응답용 더미 빌더.

7개 비교 지표(SPEC 6.4)를 한 행으로 빌드한다. 기존 더미 룰을 재사용하여
DongSummarySerializer / detail_dummy와 일관성 유지:

- score: composite_score 가중합 (소수 둘째자리)
- rent_avg: 120 - score_rent 룰 (DongSummarySerializer.get_rent_avg와 동일, 더미 raw)
- rent_converted_avg: RentDeal 환산월세(보증금 0.005/월 환산) 평균. <3건 fallback 적용
- transit_min: NEAREST_STATIONS_FALLBACK 1위 walking_min (없으면 폴백 10)
- amenity_label: 충분/보통/부족 (한국어, SPEC 6.4 명시)
- single_household_pct: SINGLE_HOUSEHOLD_PCT_FALLBACK 그대로
- safety_label: 높음/보통/낮음 (한국어, SPEC 6.4 비교표 명시)
- review_avg_rating / review_count: detail_dummy._build_reviews 룰 재사용

10단계 실데이터 적재 후에도 응답 키 형태는 변하지 않도록 빌더만 교체하면 됨.
"""

from __future__ import annotations

import hashlib
import random
import statistics
from collections import defaultdict
from typing import Dict, Iterable, List, Optional

from apps.realestate.models import RentDeal
from apps.realestate.utils import convert_to_monthly

from .detail_dummy import NEAREST_STATIONS_FALLBACK, REVIEW_POOL
from .models import Dong
from .serializers import SINGLE_HOUSEHOLD_PCT_FALLBACK


# 폴백 통학 시간 (NEAREST_STATIONS_FALLBACK에 없는 slug용 — 10단계 실 데이터 시 교체)
TRANSIT_MIN_FALLBACK = 10

# 환산월세 평균 산출 시 거래량 임계치 (SPEC 14.2: <3건 동은 단독 평균 미신뢰).
# compute_scores._collect_rent_metrics 와 동일한 임계.
RENT_MIN_DEALS_FOR_DIRECT_AVG = 3


def compute_rent_converted_avgs(dongs: Iterable[Dong]) -> Dict[str, Optional[int]]:
    """동별 환산월세(만원, 정수) 평균 사전 계산.

    fallback 정책 (compute_scores._apply_rent_fallback 와 동일 정신):
      1. RentDeal ≥3건 → 직접 평균
      2. <3건 → 같은 구의 ≥3건 충족 동 평균 (gu_avg)
      3. gu_avg 도 없으면 서울 전체 중위
      4. 어떤 데이터도 없으면 None (응답에서 null)

    파라미터
    --------
    dongs : 비교 대상 Dong iterable. 응답 행 빌드 직전에 한 번만 호출.

    반환
    ----
    {slug: int (만원) or None} — 입력 dong slug 키.
    """
    target_dongs = list(dongs)
    if not target_dongs:
        return {}

    target_gus = {d.gu for d in target_dongs}

    # ---- 동별 deals 수집 (대상 + 같은 구 동의 RentDeal 만 가져옴) ----
    # gu fallback 계산을 위해 같은 구의 다른 동도 필요.
    # 서울 중위 fallback 까지 필요하면 전체를 가져와야 하지만, 5개 비교 응답 위해
    # 전체 27,050건 fetch 는 과함. 대신 25개 구 × 평균 deal 분포로 처리.
    # 현실적 절충: 같은 구 + 5개 구 외 dong 들은 seoul_median fallback 으로 직접 처리.
    deals_by_dong: Dict[int, List[float]] = defaultdict(list)
    for dong_id, deposit, rent in RentDeal.objects.filter(
        dong__gu__in=target_gus
    ).values_list("dong_id", "deposit", "monthly_rent"):
        deals_by_dong[dong_id].append(convert_to_monthly(deposit, rent))

    # ---- 각 dong 의 직접 평균 (≥3건만) ----
    direct_avg: Dict[int, float] = {}
    for dong_id, vals in deals_by_dong.items():
        if len(vals) >= RENT_MIN_DEALS_FOR_DIRECT_AVG:
            direct_avg[dong_id] = sum(vals) / len(vals)

    # ---- gu_avg: 같은 구 내 직접 평균 충족 동들의 평균 ----
    by_gu: Dict[str, List[float]] = defaultdict(list)
    # 같은 구의 모든 dong 을 가져와야 (대상 외 dong 도 ≥3건 충족 시 gu_avg 기여)
    gu_dong_lookup = {
        d_id: gu
        for d_id, gu in Dong.objects.filter(gu__in=target_gus).values_list("id", "gu")
    }
    for d_id, avg in direct_avg.items():
        gu = gu_dong_lookup.get(d_id)
        if gu is not None:
            by_gu[gu].append(avg)
    gu_avg: Dict[str, float] = {gu: sum(vs) / len(vs) for gu, vs in by_gu.items() if vs}

    # ---- seoul_median: 서울 전체에서 ≥3건 충족 동의 환산월세 평균 분포 중위 ----
    # 대상 구에 데이터가 없으면 (예: 용산구만 비교) gu_avg 분포가 비어 fallback 실패.
    # → 서울 전체에서 ≥3건 충족 동들의 평균 분포 중위를 SQL 집계로 한 번에 산출.
    from django.db.models import Avg, Count as _Count  # noqa: WPS433 (지역 import)

    per_dong_aggs = (
        RentDeal.objects.values("dong_id")
        .annotate(
            n=_Count("id"),
            avg_dep=Avg("deposit"),
            avg_rent=Avg("monthly_rent"),
        )
        .filter(n__gte=RENT_MIN_DEALS_FOR_DIRECT_AVG)
    )
    seoul_dong_avgs: List[float] = [
        convert_to_monthly(r["avg_dep"], r["avg_rent"]) for r in per_dong_aggs
    ]
    if seoul_dong_avgs:
        seoul_median: Optional[float] = statistics.median(seoul_dong_avgs)
    elif gu_avg:
        # 안전망: 서울 집계도 비면 대상 구 gu_avg 분포 사용.
        seoul_median = statistics.median(gu_avg.values())
    else:
        seoul_median = None

    # ---- 결과 빌드 ----
    result: Dict[str, Optional[int]] = {}
    for dong in target_dongs:
        # 1) 직접 평균
        if dong.id in direct_avg:
            result[dong.slug] = round(direct_avg[dong.id])
            continue
        # 2) gu_avg
        if dong.gu in gu_avg:
            result[dong.slug] = round(gu_avg[dong.gu])
            continue
        # 3) seoul_median
        if seoul_median is not None:
            result[dong.slug] = round(seoul_median)
            continue
        # 4) 데이터 없음
        result[dong.slug] = None
    return result


def _amenity_label_ko(score_amenity: float) -> str:
    """SPEC 6.4 — 비교표에 표기할 한국어 레이블."""
    if score_amenity >= 70:
        return "충분"
    if score_amenity >= 40:
        return "보통"
    return "부족"


def _safety_label_ko(score_transit: float) -> str:
    """SPEC 6.4 안전 지수 — 한국어 레이블.
    실 안전 데이터(범죄율/CCTV)는 추후 적재 예정. 현재는 transit 점수 기반 임시 매핑
    (DongSummarySerializer.get_safety_level과 동일 임계값, 라벨만 한국어).
    """
    if score_transit >= 70:
        return "높음"
    if score_transit >= 40:
        return "보통"
    return "낮음"


def _seeded_rng(slug: str, salt: str) -> random.Random:
    """detail_dummy._seeded_rng와 동일 패턴 — 결정적 RNG."""
    seed_str = f"{slug}|{salt}"
    h = int(hashlib.md5(seed_str.encode("utf-8")).hexdigest(), 16)
    return random.Random(h)


def _review_summary(dong: Dong) -> tuple[float, int]:
    """
    detail_dummy._build_reviews와 동일한 룰로 (avg_rating, count) 산출.

    별도 함수로 추출한 이유: 비교 API는 reviews 섹션 전체가 아니라 평균 별점과
    리뷰 개수만 필요. 빌더 호출의 불필요한 작업(대표 리뷰 3개 생성)을 피한다.
    """
    rng = _seeded_rng(dong.slug, salt="reviews")
    overall = (dong.score_rent + dong.score_amenity + dong.score_transit) / 3
    avg_rating = round(3.5 + (overall / 100) * 1.4, 1)
    avg_rating = min(5.0, max(1.0, avg_rating))
    count = rng.randint(5, 30)
    # detail_dummy는 이후 sample(REVIEW_POOL, k=3)을 호출하지만 본 함수에선 호출하지
    # 않는다. count만 결정하면 동일한 시드라도 RNG 상태 차이가 생기지 않음.
    _ = REVIEW_POOL  # 룰 일관성 명시용 import 보호 (실제로는 미사용)
    return avg_rating, count


def build_compare_row(
    dong: Dong,
    weights: dict,
    rent_converted_avg: Optional[int] = None,
) -> dict:
    """
    SPEC 6.4 비교 응답 한 행을 빌드.

    파라미터:
        dong: Dong 인스턴스 (centroid 미사용, score_*만 필요)
        weights: {"rent": 0~1, "amenity": 0~1, "transit": 0~1} 합 1
        rent_converted_avg: 환산월세(만원, 정수) 또는 None.
            view 가 compute_rent_converted_avgs 로 사전 계산해 전달.
            누락(None)이면 응답 필드에 null 노출.

    반환: snake_case dict (CompareResponse.dongs[i] 그대로).
    """
    score = round(
        dong.composite_score(
            w_rent=weights["rent"],
            w_amenity=weights["amenity"],
            w_transit=weights["transit"],
        ),
        2,
    )

    # 평균 월세 (raw 더미) — DongSummarySerializer.get_rent_avg와 동일 룰 (120 - score_rent)
    # 주의: 이 값은 score_rent 로 역산한 더미라 실 raw 평균 아님. frontend 가
    # 점진적으로 rent_converted_avg 로 전환해야 함 (misleading 케이스 해결).
    rent_avg = max(0, int(120 - dong.score_rent))

    # 통학 시간 — NEAREST_STATIONS_FALLBACK 1위의 walking_min
    stations = NEAREST_STATIONS_FALLBACK.get(dong.slug)
    if stations:
        transit_min = int(stations[0]["walking_min"])
    else:
        transit_min = TRANSIT_MIN_FALLBACK

    # 자취생 비율 — 기존 폴백 그대로 (없으면 40.0)
    single_household_pct = SINGLE_HOUSEHOLD_PCT_FALLBACK.get(dong.slug, 40.0)

    review_avg_rating, review_count = _review_summary(dong)

    return {
        "slug": dong.slug,
        "name": dong.name,
        "gu": dong.gu,
        "score": score,
        "rent_avg": rent_avg,
        "rent_converted_avg": rent_converted_avg,
        "transit_min": transit_min,
        "amenity_label": _amenity_label_ko(dong.score_amenity),
        "single_household_pct": single_household_pct,
        "safety_label": _safety_label_ko(dong.score_transit),
        "review_avg_rating": review_avg_rating,
        "review_count": review_count,
    }
