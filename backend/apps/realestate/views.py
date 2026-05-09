"""
RentDeal 관련 뷰.

엔드포인트:
- GET /api/transactions/bbox?bbox=lng1,lat1,lng2,lat2
                            &deal_type=apt|officetel|villa|dagagu|danok|all
                            &from=YYYY-MM-DD&to=YYYY-MM-DD
                            &limit=200
  → 메인 지도 bbox 내 실거래 핀 (SPEC 6.1)

설계 원칙:
- bbox가 너무 크면 limit (default 200, max 500) 으로 자동 컷. 명시적 에러 X.
- limit + 1 fetch → has_more 단순 페이지네이션. cursor 없음 (학부 데모 충분).
- N+1 회피: select_related("dong").
- geom__isnull=False 필수 (RDS 통합 후 7.4M 거래는 모두 좌표 보유, 안전 가드).
- ordering: -deal_date (최신순). RentDeal.Meta.ordering이 동일하지만 명시.

캐싱:
- 5분 TTL django-redis. 키는 정렬된 쿼리스트링 기반.
- bbox 좌표가 부동소수라 hit rate는 낮지만 동일 viewport 반복 조작 시 효과 있음.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from django.contrib.gis.geos import Polygon
from django.core.cache import cache
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import RentDeal
from .serializers import RentDealPinSerializer

# ---- 상수 ----
DEFAULT_LIMIT = 200
MAX_LIMIT = 500

# total 정확 카운트 상한. 이보다 많으면 "+" 표기로 잘라 비싼 count() 회피.
# 현재 적재 19,807건이라 5*MAX_LIMIT=2,500이면 대부분 케이스 정확함.
TOTAL_COUNT_CAP_MULTIPLIER = 5

# deal_type 화이트리스트. RentDeal.DEAL_TYPE_CHOICES (5종) + "all".
ALLOWED_DEAL_TYPES = {"apt", "officetel", "villa", "dagagu", "danok", "all"}

# 캐시 TTL (SPEC 14.3: API 응답 5분 캐싱).
CACHE_TTL_SECONDS = 300


def _parse_bbox(raw: Optional[str]) -> tuple[float, float, float, float]:
    """
    `bbox=lng1,lat1,lng2,lat2` 파싱.

    SW(lng1,lat1) + NE(lng2,lat2). WGS84 (SRID 4326) 가정.
    검증:
      - 4개 콤마분리 float
      - lng1 < lng2, lat1 < lat2
      - 서울 권역 sanity (lng 124~132, lat 33~39) — 대략적 한반도 박스
    """
    if not raw:
        raise ValidationError({"bbox": "bbox 파라미터는 필수입니다 (lng1,lat1,lng2,lat2)."})

    parts = [p.strip() for p in raw.split(",")]
    if len(parts) != 4:
        raise ValidationError(
            {"bbox": "bbox는 lng1,lat1,lng2,lat2 4개 값이어야 합니다."}
        )

    try:
        lng1, lat1, lng2, lat2 = (float(p) for p in parts)
    except (TypeError, ValueError) as exc:
        raise ValidationError({"bbox": "bbox 좌표는 숫자여야 합니다."}) from exc

    if lng1 >= lng2 or lat1 >= lat2:
        raise ValidationError(
            {"bbox": "SW(lng1,lat1)가 NE(lng2,lat2)보다 작아야 합니다."}
        )

    # 한반도 권역 sanity (위경도 뒤바뀜 같은 단순 실수 방지).
    if not (124.0 <= lng1 <= 132.0 and 124.0 <= lng2 <= 132.0):
        raise ValidationError({"bbox": "경도(lng)는 124~132 범위여야 합니다 (서울 권역)."})
    if not (33.0 <= lat1 <= 39.0 and 33.0 <= lat2 <= 39.0):
        raise ValidationError({"bbox": "위도(lat)는 33~39 범위여야 합니다 (서울 권역)."})

    return lng1, lat1, lng2, lat2


def _parse_date(raw: Optional[str], key: str) -> Optional[date]:
    """`YYYY-MM-DD` 파싱. 없으면 None."""
    if not raw:
        return None
    try:
        return datetime.strptime(raw, "%Y-%m-%d").date()
    except ValueError as exc:
        raise ValidationError(
            {key: f"{key} 파라미터는 YYYY-MM-DD 형식이어야 합니다."}
        ) from exc


def _parse_limit(raw: Optional[str]) -> int:
    """`limit` 파싱. default 200, max 500. 음수/0은 ValidationError."""
    if raw is None:
        return DEFAULT_LIMIT
    try:
        value = int(raw)
    except (TypeError, ValueError) as exc:
        raise ValidationError({"limit": "limit는 정수여야 합니다."}) from exc
    if value <= 0:
        raise ValidationError({"limit": "limit는 1 이상이어야 합니다."})
    return min(value, MAX_LIMIT)


def _parse_deal_type(raw: Optional[str]) -> str:
    """`deal_type` 파싱. 미지정 또는 'all'은 'all'로 정규화."""
    if raw is None or raw == "":
        return "all"
    if raw not in ALLOWED_DEAL_TYPES:
        allowed = ", ".join(sorted(ALLOWED_DEAL_TYPES))
        raise ValidationError(
            {"deal_type": f"deal_type은 다음 중 하나여야 합니다: {allowed}."}
        )
    return raw


@extend_schema(
    tags=["transactions"],
    summary="bbox 내 전월세 실거래 핀 (메인 지도용)",
    description=(
        "메인 지도(SPEC 6.1)에서 현재 viewport 내 실거래 핀을 조회. "
        "geom이 null인 거래는 응답에서 제외(RDS 통합 후 7.4M 모두 좌표 보유 — 안전 가드). "
        "limit + 1 fetch 패턴으로 has_more 단순 판정. "
        "total은 표시용 별도 count (상한 cap 적용 시 has_more_total=true)."
    ),
    parameters=[
        OpenApiParameter(
            name="bbox",
            type=OpenApiTypes.STR,
            location=OpenApiParameter.QUERY,
            required=True,
            description=(
                "lng1,lat1,lng2,lat2 (SW + NE 코너, WGS84). "
                "예: `126.95,37.55,127.00,37.58`."
            ),
        ),
        OpenApiParameter(
            name="deal_type",
            type=OpenApiTypes.STR,
            location=OpenApiParameter.QUERY,
            required=False,
            description="apt | officetel | villa | dagagu | danok | all (기본: all)",
        ),
        OpenApiParameter(
            name="from",
            type=OpenApiTypes.DATE,
            location=OpenApiParameter.QUERY,
            required=False,
            description="YYYY-MM-DD. 지정 시 deal_date >= from.",
        ),
        OpenApiParameter(
            name="to",
            type=OpenApiTypes.DATE,
            location=OpenApiParameter.QUERY,
            required=False,
            description="YYYY-MM-DD. 지정 시 deal_date <= to.",
        ),
        OpenApiParameter(
            name="limit",
            type=OpenApiTypes.INT,
            location=OpenApiParameter.QUERY,
            required=False,
            description=f"기본 {DEFAULT_LIMIT}, 최대 {MAX_LIMIT}.",
        ),
    ],
    responses={
        200: {
            "type": "object",
            "properties": {
                "items": {
                    "type": "array",
                    "items": {"$ref": "#/components/schemas/RentDealPin"},
                },
                "has_more": {
                    "type": "boolean",
                    "description": "limit 컷에 걸렸는지 여부 (다음 페이지 존재 시 true).",
                },
                "total": {
                    "type": "integer",
                    "description": (
                        "필터 조건과 일치하는 전체 건수 (geom null 제외). "
                        f"{DEFAULT_LIMIT * TOTAL_COUNT_CAP_MULTIPLIER}을 초과하면 cap 값 반환."
                    ),
                },
                "has_more_total": {
                    "type": "boolean",
                    "description": "total이 cap에 의해 잘렸는지. true면 실제 건수 > total.",
                },
            },
        }
    },
)
class TransactionsBboxView(APIView):
    """
    GET /api/transactions/bbox

    bbox 내 RentDeal 핀 조회. 응답 형식:
        {
            "items": [RentDealPinSerializer 결과 ...],
            "has_more": bool,        # limit + 1 패턴
            "total": int,            # cap 적용된 표시용 카운트
            "has_more_total": bool   # total이 cap에 잘렸는지
        }

    인증/권한: 공개 (`AllowAny`). settings.REST_FRAMEWORK 기본값 그대로.
    페이지네이션: 비활성 (직접 limit 처리).
    """

    pagination_class = None

    def get(self, request: Request) -> Response:
        # ---- 파라미터 파싱 ----
        lng1, lat1, lng2, lat2 = _parse_bbox(request.query_params.get("bbox"))
        deal_type = _parse_deal_type(request.query_params.get("deal_type"))
        date_from = _parse_date(request.query_params.get("from"), "from")
        date_to = _parse_date(request.query_params.get("to"), "to")
        limit = _parse_limit(request.query_params.get("limit"))

        # ---- 캐시 키 (정렬된 정규형) ----
        cache_key = (
            "tx_bbox:"
            f"{lng1:.6f},{lat1:.6f},{lng2:.6f},{lat2:.6f}|"
            f"dt={deal_type}|from={date_from}|to={date_to}|lim={limit}"
        )
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached, status=status.HTTP_200_OK)

        # ---- 쿼리 ----
        # Polygon.from_bbox는 srid=None으로 만들어지므로 명시 설정.
        bbox_poly = Polygon.from_bbox((lng1, lat1, lng2, lat2))
        bbox_poly.srid = 4326

        qs = (
            RentDeal.objects.select_related("dong")
            .filter(geom__isnull=False, geom__within=bbox_poly)
        )
        if deal_type != "all":
            qs = qs.filter(deal_type=deal_type)
        if date_from is not None:
            qs = qs.filter(deal_date__gte=date_from)
        if date_to is not None:
            qs = qs.filter(deal_date__lte=date_to)

        qs = qs.order_by("-deal_date", "-id")

        # ---- has_more 판정용 limit + 1 fetch ----
        rows = list(qs[: limit + 1])
        has_more = len(rows) > limit
        items = rows[:limit]

        # ---- total 카운트 (cap 적용) ----
        # cap+1 까지만 정확하게 카운트해서 비싼 풀카운트 회피.
        # 현재 적재 1.9만건 규모라 풀카운트도 빠르지만 미래 대비.
        total_cap = limit * TOTAL_COUNT_CAP_MULTIPLIER
        total = qs[: total_cap + 1].count()
        has_more_total = total > total_cap
        if has_more_total:
            total = total_cap

        payload = {
            "items": RentDealPinSerializer(items, many=True).data,
            "has_more": has_more,
            "total": total,
            "has_more_total": has_more_total,
        }

        cache.set(cache_key, payload, timeout=CACHE_TTL_SECONDS)
        return Response(payload, status=status.HTTP_200_OK)
