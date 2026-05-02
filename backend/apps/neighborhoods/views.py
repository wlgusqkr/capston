"""
Dong 관련 뷰.

엔드포인트:
- GET /api/dongs/scores?w_rent=33&w_amenity=33&w_transit=34
  → 행정동 종합 점수 리스트 (메인 지도 히트맵용)
- GET /api/dongs/<slug>/summary?w_rent=&w_amenity=&w_transit=
  → 동네 패널용 요약 (SPEC 6.2)
"""

from __future__ import annotations

from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Dong
from .serializers import DongDetailSerializer, DongScoreSerializer, DongSummarySerializer

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
