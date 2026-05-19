"""
RentDeal 관련 뷰.

엔드포인트:
- GET /api/transactions/bbox?bbox=lng1,lat1,lng2,lat2
                            &deal_type=apt|officetel|villa|dagagu|danok|all
                            &from=YYYY-MM-DD&to=YYYY-MM-DD
                            &limit=200
  → 메인 지도 bbox 내 실거래 핀 (SPEC 6.1)
- GET /api/dongs/<slug>/derived-indices
  → 자취촌 지수(0~100) + 계약 활발도 (SPEC 4.5)

sub-plan 4.5B 정합:
- RentDeal.dong FK 제거 → ldong FK 단일.
- 컬럼명 변경: deal_date → contract_date, build_year → construction_year.
- deal_type 영문 enum 컬럼 제거 → housing_type 한글 raw 단일.
  쿼리 파라미터/응답 dict 'deal_type'은 영문 enum 그대로 보존 (frontend lock 1).
  → DEAL_TYPE_TO_HOUSING_TYPE으로 영문 ↔ 한글 변환.
- N+1 회피: select_related("ldong", "ldong__gu").
- /derived-indices는 행정동 단위 집계인데 rent_deal에는 adong_code 컬럼이 없다
  (schema.dbml lock). 임시로 ldong → Adong 매핑이 정립되기 전까지 본 view는
  Dong.code(=adong_code) 단위로 계산 불가 → 4.5C 단계에서 ldong-단위 또는
  adong↔ldong 매핑 도입 후 재구성. 본 sub-plan에서는 view 시그니처/응답 구조를
  유지하되 sample/aggregation 로직만 housing_type/contract_date에 맞춰 갱신한다.

설계 원칙:
- bbox가 너무 크면 limit (default 200, max 500) 으로 자동 컷.
- limit + 1 fetch → has_more 단순 페이지네이션.
- N+1 회피: select_related("ldong", "ldong__gu").
- location__isnull=False 필수.
- ordering: -contract_date (최신순).

캐싱:
- 5분 TTL django-redis.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Optional

from django.contrib.gis.geos import Polygon
from django.core.cache import cache
from django.db.models import Count, Q
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

# sub-plan 7G-B2 (결정 6A): Dong → Adong 치환 + null fallback 단순화.
# Adong.adong_code를 직접 사용하여 dong.id → dong.code 매핑 우회.
from apps.public_data.regions.models import Adong
from apps.public_data.populations.models import AdongPopulation

from apps.public_data.rent_deal.models import (
    DEAL_TYPE_TO_HOUSING_TYPE,
    RentDeal,
)

from .serializers import RentDealPinSerializer

# ---- 상수 ----
DEFAULT_LIMIT = 200
MAX_LIMIT = 500

# total 정확 카운트 상한.
TOTAL_COUNT_CAP_MULTIPLIER = 5

# deal_type 화이트리스트 (응답/요청 영문 enum 5종 + "all"). lock 1.
ALLOWED_DEAL_TYPES = {"apt", "officetel", "villa", "dagagu", "danok", "all"}

# 캐시 TTL (SPEC 14.3: API 응답 5분 캐싱).
CACHE_TTL_SECONDS = 300


def _parse_bbox(raw: Optional[str]) -> tuple[float, float, float, float]:
    """
    `bbox=lng1,lat1,lng2,lat2` 파싱.
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

    if not (124.0 <= lng1 <= 132.0 and 124.0 <= lng2 <= 132.0):
        raise ValidationError({"bbox": "경도(lng)는 124~132 범위여야 합니다 (서울 권역)."})
    if not (33.0 <= lat1 <= 39.0 and 33.0 <= lat2 <= 39.0):
        raise ValidationError({"bbox": "위도(lat)는 33~39 범위여야 합니다 (서울 권역)."})

    return lng1, lat1, lng2, lat2


def _parse_date(raw: Optional[str], key: str) -> Optional[date]:
    """`YYYY-MM-DD` 파싱."""
    if not raw:
        return None
    try:
        return datetime.strptime(raw, "%Y-%m-%d").date()
    except ValueError as exc:
        raise ValidationError(
            {key: f"{key} 파라미터는 YYYY-MM-DD 형식이어야 합니다."}
        ) from exc


def _parse_limit(raw: Optional[str]) -> int:
    """`limit` 파싱."""
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
    """`deal_type` 파싱. 응답 lock 1 — 영문 enum 그대로."""
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
        "메인 지도(SPEC 6.1) bbox 내 실거래 핀 조회. "
        "sub-plan 4.5B: ldong FK 단일, housing_type 한글 raw, contract_date로 컬럼명 정합. "
        "응답 dict key는 보존 (deal_type/date/dong_name/gu — serializer source 매핑)."
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
            description="YYYY-MM-DD. 지정 시 contract_date >= from.",
        ),
        OpenApiParameter(
            name="to",
            type=OpenApiTypes.DATE,
            location=OpenApiParameter.QUERY,
            required=False,
            description="YYYY-MM-DD. 지정 시 contract_date <= to.",
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
                "has_more": {"type": "boolean"},
                "total": {"type": "integer"},
                "has_more_total": {"type": "boolean"},
            },
        }
    },
)
class TransactionsBboxView(APIView):
    """
    GET /api/transactions/bbox

    bbox 내 RentDeal 핀 조회. sub-plan 4.5B 정합:
    - select_related("ldong", "ldong__gu")로 N+1 회피.
    - contract_date/housing_type 컬럼명 정합.
    - 응답 dict key는 RentDealPinSerializer가 source 매핑으로 보존.
    """

    pagination_class = None

    def get(self, request: Request) -> Response:
        # ---- 파라미터 파싱 ----
        lng1, lat1, lng2, lat2 = _parse_bbox(request.query_params.get("bbox"))
        deal_type = _parse_deal_type(request.query_params.get("deal_type"))
        date_from = _parse_date(request.query_params.get("from"), "from")
        date_to = _parse_date(request.query_params.get("to"), "to")
        limit = _parse_limit(request.query_params.get("limit"))

        # ---- 캐시 키 ----
        cache_key = (
            "tx_bbox:"
            f"{lng1:.6f},{lat1:.6f},{lng2:.6f},{lat2:.6f}|"
            f"dt={deal_type}|from={date_from}|to={date_to}|lim={limit}"
        )
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached, status=status.HTTP_200_OK)

        # ---- 쿼리 ----
        bbox_poly = Polygon.from_bbox((lng1, lat1, lng2, lat2))
        bbox_poly.srid = 4326

        qs = (
            RentDeal.objects.select_related("ldong", "ldong__gu")
            .filter(location__isnull=False, location__within=bbox_poly)
        )
        if deal_type != "all":
            # 응답 영문 enum (lock 1) → 한글 raw로 변환해서 DB 필터.
            housing_type_kr = DEAL_TYPE_TO_HOUSING_TYPE.get(deal_type)
            if housing_type_kr is not None:
                qs = qs.filter(housing_type=housing_type_kr)
        if date_from is not None:
            qs = qs.filter(contract_date__gte=date_from)
        if date_to is not None:
            qs = qs.filter(contract_date__lte=date_to)

        qs = qs.order_by("-contract_date", "-id")

        # ---- has_more 판정용 limit + 1 fetch ----
        rows = list(qs[: limit + 1])
        has_more = len(rows) > limit
        items = rows[:limit]

        # ---- total 카운트 (cap 적용) ----
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


# ---------------------------------------------------------------------------
# 대시보드 §4.5 — 파생 지표 (자취촌 지수 + 계약 활발도)
# ---------------------------------------------------------------------------

# 자취촌 지수 가중치 (SPEC §4.5)
STUDIO_W_NON_APT = 0.5
STUDIO_W_SMALL = 0.3
STUDIO_W_MONTHLY_NORM = 0.2

# 소형 면적 임계값 (m²) — SPEC §4.5
SMALL_AREA_M2 = 25.0

# 최근 12개월 윈도우 (SPEC §4.5)
WINDOW_DAYS = 365

# 426동 통째 dict 캐시 TTL (5시간).
DERIVED_CACHE_TTL_SECONDS = 5 * 60 * 60

# 캐시 키 버전 (응답 모양 변경 시 bump)
DERIVED_CACHE_VERSION = "v1"


def _compute_all_dongs_derived(today: date) -> dict[str, dict]:
    """
    서울 426개 행정동의 파생 지표를 한 번에 계산.

    sub-plan 4.5B 정합:
    - RentDeal.dong FK 제거 → ldong FK만 존재.
    - rent_deal에는 adong_code 컬럼이 없으므로 (schema.dbml lock) 직접 dong_id
      group_by 불가. 본 view는 adong/ldong 매핑이 정립되기 전까지 임시로
      ldong 단위로 raw 집계만 수행하고, dong-slug 단위 응답은 ldong-name
      매칭 fallback으로 구성한다. 정밀 매핑은 4.5C에서 처리.
    - 따라서 본 view 응답 구조는 보존하되 일부 동의 score가 ldong-단위
      raw 집계에 의존하게 된다 (응답 dict key 0 변경, frontend 영향 없음).

    반환: {slug: {studio_index: {...}, activity: {...}}, ...}
    """
    cutoff = today - timedelta(days=WINDOW_DAYS)

    # 1) 행정동 마스터 (Adong + Gu join). sub-plan 7G-B2 (결정 6A): Dong → Adong 직접 사용.
    dongs = list(Adong.objects.select_related("gu").all())
    total_dongs = len(dongs)

    # 2) ldong_code별 RentDeal 집계 (최근 12개월).
    # rent_deal에는 adong_code가 없으므로 ldong_code 단위 raw 집계.
    base = RentDeal.objects.filter(contract_date__gte=cutoff)
    agg_rows = list(
        base.values("ldong_id").annotate(
            total=Count("id"),
            non_apt=Count("id", filter=~Q(housing_type="아파트")),
            small=Count("id", filter=Q(area_m2__lte=SMALL_AREA_M2)),
            monthly=Count("id", filter=Q(monthly_rent__gt=0)),
        )
    )

    # 3) ldong-단위 집계 → adong(=행정동) slug에 매핑.
    # rent_deal.ldong_code(법정동) → Adong(행정동) 매핑이 없어 임시로
    # 코드 prefix가 동일한 동에 할당하지 않는다 (행정동≠법정동).
    # 4.5C에서 adong↔ldong N:M 매핑 도입 후 보강.
    # 본 sub-plan에서는 응답 구조만 보장 — 모든 동에 score=None으로 폴백.
    _ = agg_rows  # 통계 보존 — 4.5C에서 사용 예정

    # 4) 최신 인구 per 행정동 (DISTINCT ON adong_id).
    # sub-plan 7G-B2 (결정 6A): adong_code 직접 키. Dong.id 매핑 단계 제거.
    pop_rows = list(
        AdongPopulation.objects
        .order_by("adong_id", "-date")
        .distinct("adong_id")
        .values("adong_id", "total_population")
    )
    pop_by_adong_code: dict[str, Optional[int]] = {
        r["adong_id"]: r["total_population"] for r in pop_rows
    }

    # 5) 결과 dict (slug → payload) — sub-plan 4.5B 임시 null 폴백.
    # rent_deal-side 정확 매핑은 4.5C에서 처리. 응답 dict 구조는 보존.
    result: dict[str, dict] = {}
    for d in dongs:
        pop = pop_by_adong_code.get(d.adong_code)
        result[d.slug] = {
            "dong": {"slug": d.slug, "name": d.name, "gu": d.gu.name},
            "studio_index": {
                "score": None,
                "percentile": None,
                "rank": None,
                "total_dongs": total_dongs,
                "breakdown": {
                    "non_apt_ratio": None,
                    "small_area_ratio": None,
                    "monthly_deal_normalized": None,
                },
                "formula": (
                    "0.5 × 비아파트 비율 + 0.3 × ≤25㎡ 비율 + 0.2 × 월세 계약 건수 "
                    "정규화 (서울 동별 min-max). sub-plan 4.5B 임시 null "
                    "— rent_deal adong 매핑이 정립되는 4.5C에서 활성화."
                ),
            },
            "activity": {
                "deals_per_1000": None,
                "deals_12m": 0,
                "population": pop,
                "percentile": None,
                "rank": None,
                "total_dongs": total_dongs,
            },
        }

    return result


@extend_schema(
    tags=["dongs"],
    summary="자취촌 지수 + 계약 활발도 (대시보드 §4.5)",
    description=(
        "한 행정동의 파생 지표 2종을 반환한다.\n\n"
        "sub-plan 4.5B 임시: rent_deal에 adong_code가 없으므로 (schema.dbml lock) "
        "정확한 adong-단위 집계는 4.5C에서 활성화. 응답 dict key는 보존 "
        "(score/breakdown 일시적 null)."
    ),
)
class DongDerivedIndicesView(APIView):
    """
    GET /api/dongs/<slug>/derived-indices

    sub-plan 4.5B: 응답 dict key 구조 보존. score/percentile/rank는 null 폴백.
    """

    def get(self, request: Request, slug: str) -> Response:
        today = date.today()
        cache_key = f"derived_indices_all_dongs:{DERIVED_CACHE_VERSION}:{today.isoformat()}"

        all_indices = cache.get(cache_key)
        if all_indices is None:
            all_indices = _compute_all_dongs_derived(today)
            cache.set(cache_key, all_indices, timeout=DERIVED_CACHE_TTL_SECONDS)

        payload = all_indices.get(slug)
        if payload is None:
            # sub-plan 7G-B2 (결정 6A): Dong → Adong.
            if not Adong.objects.filter(slug=slug).exists():
                raise NotFound({"detail": "동을 찾을 수 없습니다."})
            cache.delete(cache_key)
            all_indices = _compute_all_dongs_derived(today)
            cache.set(cache_key, all_indices, timeout=DERIVED_CACHE_TTL_SECONDS)
            payload = all_indices.get(slug)
            if payload is None:
                raise NotFound({"detail": "동을 찾을 수 없습니다."})

        return Response(payload, status=status.HTTP_200_OK)
