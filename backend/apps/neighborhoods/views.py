"""
Dong 관련 뷰.

엔드포인트:
- GET /api/dongs/scores?w_rent=33&w_amenity=33&w_transit=34
  → 행정동 종합 점수 리스트 (메인 지도 히트맵용)
"""

from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Dong
from .serializers import DongScoreSerializer

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


class DongScoresView(APIView):
    """
    GET /api/dongs/scores?w_rent=33&w_amenity=33&w_transit=34

    응답: [{slug, name, gu, score, lat, lng}, ...]
    score는 0~100 범위의 가중합 (소수점 둘째 자리), 내림차순 정렬.
    """

    pagination_class = None  # 426개 정도라 한 번에 반환 (SPEC 14.3 클라이언트 캐시)

    def get(self, request: Request) -> Response:
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

        # 0~100 → 0~1로 정규화 후 점수 계산
        weights = {
            "rent": w_rent / 100.0,
            "amenity": w_amenity / 100.0,
            "transit": w_transit / 100.0,
        }

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
