"""
Dong 시리얼라이저.

- DongScoreSerializer: SPEC 9 GET /api/dongs/scores 응답 한 항목
  [{slug, name, gu, score, lat, lng, score_rent, score_amenity, score_transit}, ...]
  (raw 점수 3종은 SPEC 14.3 클라 재계산용으로 추가)

- DongSummarySerializer: SPEC 6.2 GET /api/dongs/:slug/summary 응답
  {slug, name, gu, score, summary, rent_avg, nearest_station,
   amenity_level, single_household_pct, safety_level}
  rent_avg/nearest_station/amenity_level/single_household_pct/safety_level는
  현재 더미. 실데이터 연동은 10단계(data-pipeline) 이후.
"""

from __future__ import annotations

from rest_framework import serializers

from .detail_dummy import build_dummy_detail
from .models import Dong
from .summary import generate_summary


# 5개 더미 동에 한해 가까운 역 하드코딩 (10단계 실 데이터 적재 시 교체).
NEAREST_STATION_FALLBACK: dict[str, dict[str, object]] = {
    "pildong": {"name": "충무로", "line": "4호선", "walking_min": 8},
    "hoegidong": {"name": "회기", "line": "1호선", "walking_min": 5},
    "seogyodong": {"name": "홍대입구", "line": "2호선", "walking_min": 7},
    "yeoksamdong": {"name": "역삼", "line": "2호선", "walking_min": 4},
    "jamsildong": {"name": "잠실", "line": "2/8호선", "walking_min": 6},
}

# 자취생 비율 더미 (slug별 30~60). 10단계에서 통계청 데이터로 교체.
SINGLE_HOUSEHOLD_PCT_FALLBACK: dict[str, float] = {
    "pildong": 42.0,
    "hoegidong": 58.0,
    "seogyodong": 51.0,
    "yeoksamdong": 36.0,
    "jamsildong": 31.0,
}


class DongScoreSerializer(serializers.ModelSerializer):
    """메인 지도 히트맵용 — 가중합 종합 점수 + 중심점 좌표 + raw 점수 3종."""

    score = serializers.SerializerMethodField()
    lat = serializers.SerializerMethodField()
    lng = serializers.SerializerMethodField()

    class Meta:
        model = Dong
        fields = (
            "slug",
            "name",
            "gu",
            "score",
            "lat",
            "lng",
            # SPEC 14.3: 클라이언트 재계산을 위해 raw 점수 3종 노출.
            "score_rent",
            "score_amenity",
            "score_transit",
        )

    def get_score(self, obj: Dong) -> float:
        weights = self.context.get("weights", {"rent": 1 / 3, "amenity": 1 / 3, "transit": 1 / 3})
        return round(
            obj.composite_score(
                w_rent=weights["rent"],
                w_amenity=weights["amenity"],
                w_transit=weights["transit"],
            ),
            2,
        )

    def get_lat(self, obj: Dong) -> float:
        # PostGIS PointField: x = lng, y = lat
        return round(obj.centroid.y, 6) if obj.centroid else 0.0

    def get_lng(self, obj: Dong) -> float:
        return round(obj.centroid.x, 6) if obj.centroid else 0.0


class DongSummarySerializer(serializers.ModelSerializer):
    """
    동네 패널(SPEC 6.2)용 요약 응답.

    note: rent_avg / nearest_station / amenity_level / single_household_pct /
    safety_level은 현재 점수 기반 휴리스틱 또는 slug 매핑으로 더미 값 산출. 10단계
    실데이터 적재 후 raw 데이터 기반으로 교체 예정.
    """

    score = serializers.SerializerMethodField()
    summary = serializers.SerializerMethodField()
    rent_avg = serializers.SerializerMethodField()
    nearest_station = serializers.SerializerMethodField()
    amenity_level = serializers.SerializerMethodField()
    single_household_pct = serializers.SerializerMethodField()
    safety_level = serializers.SerializerMethodField()

    class Meta:
        model = Dong
        fields = (
            "slug",
            "name",
            "gu",
            "score",
            "summary",
            "rent_avg",
            "nearest_station",
            "amenity_level",
            "single_household_pct",
            "safety_level",
        )

    # ---- 점수 (가중합) ----
    def get_score(self, obj: Dong) -> float:
        weights = self.context.get("weights", {"rent": 1 / 3, "amenity": 1 / 3, "transit": 1 / 3})
        return round(
            obj.composite_score(
                w_rent=weights["rent"],
                w_amenity=weights["amenity"],
                w_transit=weights["transit"],
            ),
            2,
        )

    # ---- 한 줄 요약 (SPEC 11.3 룰베이스) ----
    def get_summary(self, obj: Dong) -> str:
        return generate_summary(
            score_rent=obj.score_rent,
            score_amenity=obj.score_amenity,
            score_transit=obj.score_transit,
        )

    # ---- 더미: 평균 월세 (만원). score_rent가 높을수록 저렴 ----
    # 룰: 120 - score_rent (점수 100 → 20만원, 점수 50 → 70만원, 점수 0 → 120만원)
    def get_rent_avg(self, obj: Dong) -> int:
        return max(0, int(120 - obj.score_rent))

    # ---- 더미: 가까운 지하철 역 ----
    def get_nearest_station(self, obj: Dong) -> dict[str, object]:
        return NEAREST_STATION_FALLBACK.get(
            obj.slug,
            {"name": "정보 없음", "line": "-", "walking_min": 0},
        )

    # ---- amenity_level: score_amenity 구간 ----
    def get_amenity_level(self, obj: Dong) -> str:
        score = obj.score_amenity
        if score >= 70:
            return "sufficient"
        if score >= 40:
            return "normal"
        return "lacking"

    # ---- 더미: 자취생 비율 ----
    def get_single_household_pct(self, obj: Dong) -> float:
        return SINGLE_HOUSEHOLD_PCT_FALLBACK.get(obj.slug, 40.0)

    # ---- 더미: 안전 지수 (현재 transit 점수 기반 임시 매핑) ----
    # 실데이터(범죄율, CCTV 등)는 5/24 이후 정밀화.
    def get_safety_level(self, obj: Dong) -> str:
        score = obj.score_transit
        if score >= 70:
            return "high"
        if score >= 40:
            return "mid"
        return "low"


class DongCompareItemSerializer(serializers.Serializer):
    """
    동네 비교(SPEC 6.4) 응답의 한 동(dong) 항목.

    `compare_dummy.build_compare_row`가 만든 dict를 그대로 직렬화. 검증/형 변환은
    빌더가 보장하므로 본 시리얼라이저는 필드 정의(스키마)만 책임진다.

    응답 dict는 build_compare_row 출력과 1:1 일치 (snake_case).
    """

    slug = serializers.CharField()
    name = serializers.CharField()
    gu = serializers.CharField()
    score = serializers.FloatField()
    rent_avg = serializers.IntegerField()
    # 환산월세 (만원, 보증금 0.005/월 환산 포함). RentDeal <3건 동은 fallback,
    # 모든 fallback 도 데이터 없으면 null. frontend 는 null-safe 처리 필수.
    rent_converted_avg = serializers.IntegerField(allow_null=True)
    transit_min = serializers.IntegerField()
    amenity_label = serializers.CharField()  # "충분" | "보통" | "부족"
    single_household_pct = serializers.FloatField()
    safety_label = serializers.CharField()  # "높음" | "보통" | "낮음"
    review_avg_rating = serializers.FloatField()
    review_count = serializers.IntegerField()


class DongDetailSerializer(serializers.Serializer):
    """
    동네 상세 페이지(SPEC 6.3) 응답 시리얼라이저.

    ModelSerializer가 아니다 — 응답 구조가 6개 섹션의 중첩 dict이라 빌더 함수가
    채운 dict를 그대로 반환하는 것이 명확. 검증/변환은 build_dummy_detail이 보장.

    실 데이터 적재 후에도 같은 응답 형식을 유지하기 위해, 빌더만 교체하면 되도록
    이 시리얼라이저는 단순한 패스스루 역할만 한다.
    """

    def to_representation(self, instance: Dong) -> dict:
        weights = self.context.get(
            "weights", {"rent": 1 / 3, "amenity": 1 / 3, "transit": 1 / 3}
        )
        return build_dummy_detail(instance, weights=weights)


# ---------------------------------------------------------------------------
# POST /api/score/point — 임의 지점 커널 점수 (Phase 2a)
# ---------------------------------------------------------------------------
class KernelScoreWeightsSerializer(serializers.Serializer):
    """가중치 dict — `{"rent": 0.3, "amenity": 0.4, "transit": 0.3}`.

    음수 거부. 합이 1이 아니면 View 에서 정규화 (정책: 비율만 의미 있음).
    누락 키는 0.0 (전부 0이면 ValidationError).
    """

    rent = serializers.FloatField(required=False, default=0.0, min_value=0.0)
    amenity = serializers.FloatField(required=False, default=0.0, min_value=0.0)
    transit = serializers.FloatField(required=False, default=0.0, min_value=0.0)


class KernelScoreRequestSerializer(serializers.Serializer):
    """`POST /api/score/point` 요청 본문 검증.

    - lat/lng: 서울 박스 대략 (33~39, 124~131) — 한반도 좌표 sanity. 서울 외도
      허용하되(통학 시간 시뮬), 한국 외 좌표는 거부.
    - weights: 음수 거부. 모두 0이면 거부.
    - school: optional 문자열 (학교명).
    """

    lat = serializers.FloatField(min_value=33.0, max_value=39.0)
    lng = serializers.FloatField(min_value=124.0, max_value=131.0)
    weights = KernelScoreWeightsSerializer()
    school = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate_weights(self, weights: dict) -> dict:
        total = (
            weights.get("rent", 0.0)
            + weights.get("amenity", 0.0)
            + weights.get("transit", 0.0)
        )
        if total <= 0:
            raise serializers.ValidationError(
                "rent/amenity/transit 중 하나 이상은 양수여야 합니다."
            )
        # 정규화 (합 1.0 만들기) — Phase 2a SPEC: w_i / sum(w).
        return {k: weights.get(k, 0.0) / total for k in ("rent", "amenity", "transit")}
