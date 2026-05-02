"""
동네 비교(SPEC 6.4) 응답용 더미 빌더.

7개 비교 지표(SPEC 6.4)를 한 행으로 빌드한다. 기존 더미 룰을 재사용하여
DongSummarySerializer / detail_dummy와 일관성 유지:

- score: composite_score 가중합 (소수 둘째자리)
- rent_avg: 120 - score_rent 룰 (DongSummarySerializer.get_rent_avg와 동일)
- transit_min: NEAREST_STATIONS_FALLBACK 1위 walking_min (없으면 폴백 10)
- amenity_label: 충분/보통/부족 (한국어, SPEC 6.4 명시)
- single_household_pct: SINGLE_HOUSEHOLD_PCT_FALLBACK 그대로
- safety_label: 높음/보통/낮음 (한국어, SPEC 6.4 비교표 명시)
- review_avg_rating / review_count: detail_dummy._build_reviews 룰 재사용

10단계 실데이터 적재 후에도 응답 키 형태는 변하지 않도록 빌더만 교체하면 됨.
"""

from __future__ import annotations

from .detail_dummy import NEAREST_STATIONS_FALLBACK, REVIEW_POOL
from .models import Dong
from .serializers import SINGLE_HOUSEHOLD_PCT_FALLBACK
import hashlib
import random


# 폴백 통학 시간 (NEAREST_STATIONS_FALLBACK에 없는 slug용 — 10단계 실 데이터 시 교체)
TRANSIT_MIN_FALLBACK = 10


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


def build_compare_row(dong: Dong, weights: dict) -> dict:
    """
    SPEC 6.4 비교 응답 한 행을 빌드.

    파라미터:
        dong: Dong 인스턴스 (centroid 미사용, score_*만 필요)
        weights: {"rent": 0~1, "amenity": 0~1, "transit": 0~1} 합 1

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

    # 평균 월세 — DongSummarySerializer.get_rent_avg와 동일 룰 (120 - score_rent)
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
        "transit_min": transit_min,
        "amenity_label": _amenity_label_ko(dong.score_amenity),
        "single_household_pct": single_household_pct,
        "safety_label": _safety_label_ko(dong.score_transit),
        "review_avg_rating": review_avg_rating,
        "review_count": review_count,
    }
