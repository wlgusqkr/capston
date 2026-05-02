"""행정동 점수 계산 (SPEC 11.2) — 실 데이터/더미 데이터 양쪽 지원.

알고리즘 (SPEC 11.2)
--------------------
- score_rent: 평균 월세(보증금 1000만원 기준 환산) → 백분위 → 100 - 백분위.
- score_amenity: 카테고리별 시설 밀도 (개수/km^2) 가중합 → 백분위.
- score_transit: (가까운 역까지 거리 역수, m) + (행정동 내 버스 정류장 수) 가중합 → 백분위.

각 점수는 0~100 정수(소수점 1자리 허용). Dong.score_rent / score_amenity / score_transit
컬럼에 update_or_create 로 갱신.

총점(Dong.composite_score) 은 API 호출 시점에 가중치를 곱해 계산하므로 여기서는 저장하지 않는다.

CURRENT STATUS
--------------
RentDeal / Amenity / SubwayStation / BusStop 모델이 아직 없으므로 실 데이터 모드는 불가.
다음 두 모드만 동작한다:

1. `--mode check`: 모델 존재 여부 점검. 없으면 안내 후 종료.
2. `--mode dummy`: 5개 더미 동의 score_* 가 0 또는 비정상 분포일 경우 결정적 룰로 갱신.
   (이미 seed_dummy_dongs 가 처리하지만, 실데이터 적재 전 단순 sanity check 용.)

실 데이터 모드 (`--mode real`) 는 모델 추가 + 본 파일 _compute_real() 활성화 후 사용.

Usage
-----
    python scripts/compute_scores.py --mode check
    python scripts/compute_scores.py --mode dummy
    python scripts/compute_scores.py --mode real    # 모델 추가 후
"""

from __future__ import annotations

import argparse
import sys

from _django import setup

setup()

from apps.neighborhoods.models import Dong  # noqa: E402


# ---- 실 데이터 모드 (placeholder) -------------------------------------
def _compute_real() -> int:
    """RentDeal/Amenity/Subway/BusStop 모델 활성화 후 구현.

    기본 흐름:
        1) 행정동별 평균 월세, 카테고리별 시설 수, 가까운 역 거리, 버스 정류장 수 집계.
        2) numpy / pandas 로 백분위 변환 (scipy.stats.rankdata 'average' / N * 100).
        3) Dong.score_rent/amenity/transit 일괄 update.

    의사코드:
        rent_avg = aggregate_rent_per_dong()           # {dong_id: float}
        rent_pct = percentile(rent_avg.values())       # 백분위 0~100
        for dong_id, pct in zip(rent_avg, rent_pct):
            score_rent = round(100 - pct, 1)           # 저렴할수록 높음
        ...
        Dong.objects.bulk_update([...], ["score_rent","score_amenity","score_transit"])
    """

    print("[ERROR] 실 데이터 모드는 RentDeal/Amenity/Subway/BusStop 모델 추가 후 사용 가능합니다.")
    print("        현재 모델 부재 — 모델 추가 후 _compute_real() 본문을 채우세요.")
    return 1


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
        ("realestate", "RentDeal"),
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
