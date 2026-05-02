"""
Dong 관련 뷰.

엔드포인트:
- GET /api/dongs/scores?w_rent=33&w_amenity=33&w_transit=34
  → 행정동 종합 점수 리스트 (메인 지도 히트맵용)
- GET /api/dongs/<slug>/summary?w_rent=&w_amenity=&w_transit=
  → 동네 패널용 요약 (SPEC 6.2)
- GET /api/dongs/<slug>/detail?w_rent=&w_amenity=&w_transit=
  → 동네 상세 페이지 (SPEC 6.3)
- GET /api/compare?slugs=A,B,C[&w_rent=&w_amenity=&w_transit=]
  → 동네 비교 (SPEC 6.4, 최대 3개)
"""

from __future__ import annotations

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .compare_dummy import build_compare_row
from .models import Dong
from .serializers import (
    DongCompareItemSerializer,
    DongDetailSerializer,
    DongScoreSerializer,
    DongSummarySerializer,
)

# 비교 가능한 최대 동 수 (SPEC 6.4)
COMPARE_MAX_SLUGS = 3

# 기본 가중치 (SPEC 6.1 — 첫 진입 시 33/33/34, 합 100)
DEFAULT_W_RENT = 33
DEFAULT_W_AMENITY = 33
DEFAULT_W_TRANSIT = 34

# 합계 허용 오차 (반올림 누적 대비)
WEIGHT_SUM_TOLERANCE = 1


def _parse_weight(request: Request, key: str, default: int) -> int:
    """쿼리 파라미터에서 정수 가중치(0~100)를 추출. 부정확하면 ValidationError."""
    raw = request.query_params.get(key)
    if raw is None:
        return default
    try:
        value = int(raw)
    except (TypeError, ValueError) as exc:
        raise ValidationError({key: "정수여야 합니다 (0~100)."}) from exc
    if not 0 <= value <= 100:
        raise ValidationError({key: "0~100 범위여야 합니다."})
    return value


def _parse_and_validate_weights(request: Request) -> dict[str, float]:
    """
    DongScoresView / DongSummaryView 공통 — 쿼리 파라미터 가중치 파싱·검증.

    반환: {"rent": 0~1, "amenity": 0~1, "transit": 0~1} (정규화된 float)
    오류:
        - 정수가 아니거나 범위 밖 → 400 (필드별 메시지)
        - 합이 100±1을 벗어남 → 400 ("weights" 키)
    """
    w_rent = _parse_weight(request, "w_rent", DEFAULT_W_RENT)
    w_amenity = _parse_weight(request, "w_amenity", DEFAULT_W_AMENITY)
    w_transit = _parse_weight(request, "w_transit", DEFAULT_W_TRANSIT)

    total = w_rent + w_amenity + w_transit
    if abs(total - 100) > WEIGHT_SUM_TOLERANCE:
        raise ValidationError(
            {
                "weights": (
                    f"가중치 합이 100이어야 합니다 (현재 {total}). "
                    "허용 오차는 ±1입니다."
                )
            }
        )

    return {
        "rent": w_rent / 100.0,
        "amenity": w_amenity / 100.0,
        "transit": w_transit / 100.0,
    }


# Swagger에 표시할 가중치 파라미터 공용 정의.
WEIGHT_PARAMS = [
    OpenApiParameter(
        name="w_rent",
        type=OpenApiTypes.INT,
        location=OpenApiParameter.QUERY,
        required=False,
        description="전월세 가중치 0~100 (default 33). w_amenity + w_transit과 합 100±1.",
    ),
    OpenApiParameter(
        name="w_amenity",
        type=OpenApiTypes.INT,
        location=OpenApiParameter.QUERY,
        required=False,
        description="생활시설 가중치 0~100 (default 33).",
    ),
    OpenApiParameter(
        name="w_transit",
        type=OpenApiTypes.INT,
        location=OpenApiParameter.QUERY,
        required=False,
        description="교통 가중치 0~100 (default 34).",
    ),
]


@extend_schema(
    tags=["dongs"],
    summary="행정동 종합 점수 리스트 (메인 지도 히트맵용)",
    description=(
        "서울 425개 행정동의 가중합 종합 점수와 중심점 좌표, raw 축별 점수 3종을 반환. "
        "가중치는 0~100 정수 합 100±1. 응답은 score 내림차순 정렬."
    ),
    parameters=WEIGHT_PARAMS,
)
class DongScoresView(APIView):
    """
    GET /api/dongs/scores?w_rent=33&w_amenity=33&w_transit=34

    응답: [{slug, name, gu, score, lat, lng, score_rent, score_amenity, score_transit}, ...]
    score는 0~100 범위의 가중합 (소수점 둘째 자리), 내림차순 정렬.
    score_rent/amenity/transit은 raw 점수(SPEC 14.3 클라 재계산용).
    """

    pagination_class = None  # 426개 정도라 한 번에 반환 (SPEC 14.3 클라이언트 캐시)

    def get(self, request: Request) -> Response:
        weights = _parse_and_validate_weights(request)

        # 426개 정도라 단일 쿼리 + 메모리 정렬. 인덱스/공간 쿼리 불필요.
        qs = Dong.objects.all().only(
            "slug",
            "name",
            "gu",
            "centroid",
            "score_rent",
            "score_amenity",
            "score_transit",
        )
        serialized = DongScoreSerializer(qs, many=True, context={"weights": weights}).data
        # score 내림차순 정렬 (SPEC 6.1: 사용자가 "어디가 좋은가"를 보기 편함)
        serialized.sort(key=lambda d: d["score"], reverse=True)

        return Response(serialized, status=status.HTTP_200_OK)


@extend_schema(
    tags=["dongs"],
    summary="동네 패널 요약 (SPEC 6.2)",
    description="단일 행정동의 패널용 핵심 지표 5종 + 한 줄 요약.",
    parameters=WEIGHT_PARAMS,
)
class DongSummaryView(APIView):
    """
    GET /api/dongs/<slug>/summary?w_rent=&w_amenity=&w_transit=

    동네 패널(SPEC 6.2)용 요약. 가중치 파라미터는 옵션이며 default 33/33/34.
    응답: {slug, name, gu, score, summary, rent_avg, nearest_station,
           amenity_level, single_household_pct, safety_level}
    """

    def get(self, request: Request, slug: str) -> Response:
        weights = _parse_and_validate_weights(request)

        try:
            dong = Dong.objects.only(
                "slug",
                "name",
                "gu",
                "score_rent",
                "score_amenity",
                "score_transit",
            ).get(slug=slug)
        except Dong.DoesNotExist as exc:
            raise NotFound({"detail": "동을 찾을 수 없습니다."}) from exc

        data = DongSummarySerializer(dong, context={"weights": weights}).data
        return Response(data, status=status.HTTP_200_OK)


@extend_schema(
    tags=["dongs"],
    summary="동네 상세 — 6개 섹션 (SPEC 6.3)",
    description=(
        "Hero / 부동산 시세 / 편의시설 / 교통 / 자취생 리뷰 / 비슷한 동네를 한 번에 반환. "
        "현재 모두 더미 데이터 (10단계 data-pipeline 적재 후 교체)."
    ),
    parameters=WEIGHT_PARAMS,
)
class DongDetailView(APIView):
    """
    GET /api/dongs/<slug>/detail?w_rent=&w_amenity=&w_transit=

    동네 상세 페이지(SPEC 6.3)용 전체 데이터. 6개 섹션을 한 번에 반환:
    Hero / RealEstate / Amenities / Transit / Reviews / SimilarDongs.

    가중치 파라미터는 옵션이며 default 33/33/34. 가중치는 score 필드에만 영향.
    한 줄 요약과 vs_seoul_avg_pct는 raw 점수 기반이므로 가중치와 별개.
    """

    def get(self, request: Request, slug: str) -> Response:
        weights = _parse_and_validate_weights(request)

        try:
            # 비슷한 동네 계산을 위해 detail_dummy.build_dummy_detail이 다른 동네를
            # 별도로 조회한다. 여기선 대상 동만 가져온다.
            dong = Dong.objects.only(
                "slug",
                "name",
                "gu",
                "centroid",
                "area_km2",
                "score_rent",
                "score_amenity",
                "score_transit",
            ).get(slug=slug)
        except Dong.DoesNotExist as exc:
            raise NotFound({"detail": "동을 찾을 수 없습니다."}) from exc

        data = DongDetailSerializer(dong, context={"weights": weights}).data
        return Response(data, status=status.HTTP_200_OK)


@extend_schema(
    tags=["compare"],
    summary="동네 비교 (SPEC 6.4, 최대 3개)",
    description="콤마 구분 슬러그 1~3개를 받아 7개 비교 지표를 입력 순서로 반환.",
    parameters=[
        OpenApiParameter(
            name="slugs",
            type=OpenApiTypes.STR,
            location=OpenApiParameter.QUERY,
            required=True,
            description="콤마 구분 슬러그. 예: `1101053,1101054,1101055`",
        ),
        *WEIGHT_PARAMS,
    ],
)
class CompareView(APIView):
    """
    GET /api/compare?slugs=A,B,C[&w_rent=&w_amenity=&w_transit=]

    동네 비교(SPEC 6.4). 최대 3개 슬러그를 받아 7개 비교 지표를 한 번에 반환한다.

    응답: { weights: {...}, dongs: [DongCompareItem, ...] }
      - weights: 적용된 가중치 (정수 0~100, 합 100±1) — 프론트가 표시용으로 사용
      - dongs: 입력 슬러그 순서 그대로 (프론트가 비교표 컬럼 순서 보존하기 위함)

    오류:
      - slugs 미지정/공백 → 400 ({"slugs": "최소 1개의 슬러그가 필요합니다."})
      - slugs > 3 → 400 ({"slugs": "최대 3개 동네까지 비교할 수 있습니다."})
      - 미존재 슬러그 포함 → 404 ({"detail": "찾을 수 없는 동네: slug_x"})
      - 가중치 검증 실패 → _parse_and_validate_weights가 400 발생
    """

    def get(self, request: Request) -> Response:
        weights = _parse_and_validate_weights(request)

        # ---- slugs 파싱 ----
        raw = request.query_params.get("slugs", "")
        slugs = [s.strip() for s in raw.split(",") if s.strip()]
        if not slugs:
            raise ValidationError({"slugs": "최소 1개의 슬러그가 필요합니다."})
        if len(slugs) > COMPARE_MAX_SLUGS:
            raise ValidationError(
                {"slugs": f"최대 {COMPARE_MAX_SLUGS}개 동네까지 비교할 수 있습니다."}
            )

        # ---- 한 번의 쿼리로 fetch 후 dict 룩업 ----
        # 입력 슬러그 순서 그대로 응답하기 위해 dict로 매핑.
        qs = Dong.objects.filter(slug__in=slugs).only(
            "slug",
            "name",
            "gu",
            "score_rent",
            "score_amenity",
            "score_transit",
        )
        by_slug = {d.slug: d for d in qs}

        missing = [s for s in slugs if s not in by_slug]
        if missing:
            raise NotFound({"detail": f"찾을 수 없는 동네: {', '.join(missing)}"})

        # 입력 순서 그대로 행 빌드
        rows = [build_compare_row(by_slug[s], weights) for s in slugs]

        # 응답: 적용 가중치를 정수 % 형태로 함께 반환 (프론트가 표시용으로 사용)
        applied_weights = {
            "w_rent": int(round(weights["rent"] * 100)),
            "w_amenity": int(round(weights["amenity"] * 100)),
            "w_transit": int(round(weights["transit"] * 100)),
        }

        return Response(
            {
                "weights": applied_weights,
                "dongs": DongCompareItemSerializer(rows, many=True).data,
            },
            status=status.HTTP_200_OK,
        )
