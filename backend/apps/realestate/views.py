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

설계 원칙:
- bbox가 너무 크면 limit (default 200, max 500) 으로 자동 컷. 명시적 에러 X.
- limit + 1 fetch → has_more 단순 페이지네이션. cursor 없음 (학부 데모 충분).
- N+1 회피: select_related("dong").
- geom__isnull=False 필수 (RDS 통합 후 7.4M 거래는 모두 좌표 보유, 안전 가드).
- ordering: -deal_date (최신순). RentDeal.Meta.ordering이 동일하지만 명시.

캐싱:
- 5분 TTL django-redis. 키는 정렬된 쿼리스트링 기반.
- bbox 좌표가 부동소수라 hit rate는 낮지만 동일 viewport 반복 조작 시 효과 있음.
- 자취촌 지수는 426동 통째 dict 캐시 (date 단위 키, 5h TTL).
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

from apps.neighborhoods.models import Dong
from apps.regions.models import AdongPopulation

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

# 426동 통째 dict 캐시 TTL (5시간). date 단위 캐시 키와 결합돼 매일 갱신됨.
DERIVED_CACHE_TTL_SECONDS = 5 * 60 * 60

# 캐시 키 버전 (응답 모양 변경 시 bump)
DERIVED_CACHE_VERSION = "v1"


def _compute_all_dongs_derived(today: date) -> dict[str, dict]:
    """
    서울 426개 행정동의 파생 지표를 한 번에 계산.

    반환: {slug: {studio_index: {...}, activity: {...}}, ...}

    구현 노트:
    - RentDeal.dong은 FK to Dong (default PK = id, int).
    - AdongPopulation.dong은 FK to Dong (to_field='code'). dong_id 컬럼에 code 문자열이 들어감.
    - 따라서 Dong.id ↔ Dong.code 매핑이 필요.
    - 모든 426동을 fetch 후 in-memory dict로 조인.

    성능:
    - RentDeal 12개월 윈도우 ~61만 행. 3개 group-by 쿼리 (count/non-apt/small) ≒ 3~5초.
    - AdongPopulation 최신 DISTINCT ON ≒ 300ms.
    - 5시간 캐시로 보호 (date 단위 키, 매일 자동 갱신).
    """
    cutoff = today - timedelta(days=WINDOW_DAYS)

    # 1) 426개 동 마스터 (id, code, slug, name, gu)
    dongs = list(
        Dong.objects.all().only("id", "code", "slug", "name", "gu")
    )
    total_dongs = len(dongs)
    id_to_dong = {d.id: d for d in dongs}
    code_to_dong = {d.code: d for d in dongs}

    # 2) 동별 RentDeal 집계 (최근 12개월)
    # 한 번의 쿼리로 conditional Count.
    # housing_type='아파트' 외는 모두 비아파트로 카운트.
    base = RentDeal.objects.filter(deal_date__gte=cutoff)
    agg_rows = list(
        base.values("dong_id").annotate(
            total=Count("id"),
            non_apt=Count("id", filter=~Q(housing_type="아파트")),
            small=Count("id", filter=Q(area_m2__lte=SMALL_AREA_M2)),
            # 월세 계약 (monthly_rent > 0). 전세(=0) 제외 — SPEC "월세 계약 건수".
            monthly=Count("id", filter=Q(monthly_rent__gt=0)),
        )
    )
    by_dong_id: dict[int, dict] = {
        r["dong_id"]: {
            "total": r["total"],
            "non_apt": r["non_apt"],
            "small": r["small"],
            "monthly": r["monthly"],
        }
        for r in agg_rows
    }

    # 3) 최신 인구 per 동 (DISTINCT ON dong_id).
    pop_rows = list(
        AdongPopulation.objects
        .order_by("dong_id", "-date")
        .distinct("dong_id")
        .values("dong_id", "total_population")
    )
    # AdongPopulation.dong_id = Dong.code (to_field='code') → Dong.id로 변환
    pop_by_dong_id: dict[int, Optional[int]] = {}
    for r in pop_rows:
        code = r["dong_id"]
        d = code_to_dong.get(code)
        if d is None:
            continue
        pop_by_dong_id[d.id] = r["total_population"]

    # 4) 컴포넌트 계산 (per dong_id)
    # 동별 raw 값을 모은 다음, 정규화/순위는 별도 패스.
    studio_raw: dict[int, dict] = {}
    monthly_counts: dict[int, int] = {}

    for d in dongs:
        a = by_dong_id.get(d.id)
        if a is None or a["total"] == 0:
            # 12개월간 거래 0건이면 자취촌 지수 계산 불가 → null
            studio_raw[d.id] = {
                "total": 0,
                "non_apt_ratio": None,
                "small_ratio": None,
                "monthly_count": 0,
            }
            monthly_counts[d.id] = 0
            continue
        total = a["total"]
        non_apt_ratio = a["non_apt"] / total
        small_ratio = a["small"] / total
        studio_raw[d.id] = {
            "total": total,
            "non_apt_ratio": non_apt_ratio,
            "small_ratio": small_ratio,
            "monthly_count": a["monthly"],
        }
        monthly_counts[d.id] = a["monthly"]

    # 5) 월세 계약 건수 min-max 정규화 (서울 426개 동 기준)
    counts = list(monthly_counts.values())
    m_min = min(counts) if counts else 0
    m_max = max(counts) if counts else 0
    m_range = m_max - m_min

    # 6) 자취촌 지수 score 계산
    studio_score_by_id: dict[int, Optional[float]] = {}
    studio_components_by_id: dict[int, dict] = {}
    for d in dongs:
        raw = studio_raw[d.id]
        if raw["total"] == 0 or raw["non_apt_ratio"] is None:
            studio_score_by_id[d.id] = None
            studio_components_by_id[d.id] = {
                "non_apt_ratio": None,
                "small_area_ratio": None,
                "monthly_deal_normalized": None,
            }
            continue
        if m_range > 0:
            m_norm = (raw["monthly_count"] - m_min) / m_range
        else:
            m_norm = 0.0
        score = (
            STUDIO_W_NON_APT * raw["non_apt_ratio"]
            + STUDIO_W_SMALL * raw["small_ratio"]
            + STUDIO_W_MONTHLY_NORM * m_norm
        ) * 100.0
        studio_score_by_id[d.id] = score
        studio_components_by_id[d.id] = {
            "non_apt_ratio": round(raw["non_apt_ratio"], 4),
            "small_area_ratio": round(raw["small_ratio"], 4),
            "monthly_deal_normalized": round(m_norm, 4),
        }

    # 7) 자취촌 지수 percentile/rank (null 제외)
    scored_ids = [did for did, s in studio_score_by_id.items() if s is not None]
    score_sorted = sorted(
        scored_ids, key=lambda did: studio_score_by_id[did], reverse=True
    )
    n_scored = len(score_sorted)
    studio_rank: dict[int, Optional[int]] = {}
    studio_pct: dict[int, Optional[int]] = {}
    # 동률은 같은 rank를 부여 (1, 2, 2, 4 식).
    for i, did in enumerate(score_sorted):
        s = studio_score_by_id[did]
        # higher rank (count of dongs strictly greater) + 1
        rank = 1 + sum(
            1 for x in scored_ids if studio_score_by_id[x] is not None
            and studio_score_by_id[x] > s
        )
        # 위 계산은 O(n²) — 426동이면 18만 비교, 1ms 미만. 단순함 유지.
        studio_rank[did] = rank
        # percentile: 상위 X% → "백분위 100-X" 의미가 가독성 좋음.
        #   percentile = 100 - round(rank / n_scored * 100)
        # 예: rank 1 → 100, rank n → 0 근사.
        studio_pct[did] = max(0, min(100, round(100 - (rank - 1) / n_scored * 100)))

    # 8) 계약 활발도 계산 (12개월 전체 계약 건수 / 인구 × 1000)
    activity_value_by_id: dict[int, Optional[float]] = {}
    deals_12m_by_id: dict[int, int] = {}
    population_by_id: dict[int, Optional[int]] = {}
    for d in dongs:
        deals = by_dong_id.get(d.id, {}).get("total", 0)
        pop = pop_by_dong_id.get(d.id)
        deals_12m_by_id[d.id] = deals
        population_by_id[d.id] = pop
        if pop is None or pop <= 0:
            activity_value_by_id[d.id] = None
        else:
            activity_value_by_id[d.id] = deals / pop * 1000.0

    # 9) 계약 활발도 percentile/rank
    act_ids = [did for did, v in activity_value_by_id.items() if v is not None]
    act_sorted = sorted(act_ids, key=lambda did: activity_value_by_id[did], reverse=True)
    n_act = len(act_sorted)
    activity_rank: dict[int, Optional[int]] = {}
    activity_pct: dict[int, Optional[int]] = {}
    for did in act_sorted:
        v = activity_value_by_id[did]
        rank = 1 + sum(
            1 for x in act_ids if activity_value_by_id[x] is not None
            and activity_value_by_id[x] > v
        )
        activity_rank[did] = rank
        activity_pct[did] = max(0, min(100, round(100 - (rank - 1) / n_act * 100)))

    # 10) 결과 dict (slug → payload) 조립
    result: dict[str, dict] = {}
    for d in dongs:
        s_score = studio_score_by_id[d.id]
        s_rank = studio_rank.get(d.id)
        s_pct = studio_pct.get(d.id)
        s_comp = studio_components_by_id[d.id]

        a_val = activity_value_by_id[d.id]
        a_rank = activity_rank.get(d.id)
        a_pct = activity_pct.get(d.id)

        result[d.slug] = {
            "dong": {"slug": d.slug, "name": d.name, "gu": d.gu},
            "studio_index": {
                "score": round(s_score, 2) if s_score is not None else None,
                "percentile": s_pct,
                "rank": s_rank,
                "total_dongs": total_dongs,
                "breakdown": s_comp,
                "formula": (
                    "0.5 × 비아파트 비율 + 0.3 × ≤25㎡ 비율 + 0.2 × 월세 계약 건수 "
                    "정규화 (서울 동별 min-max)"
                ),
            },
            "activity": {
                "deals_per_1000": round(a_val, 2) if a_val is not None else None,
                "deals_12m": deals_12m_by_id[d.id],
                "population": population_by_id[d.id],
                "percentile": a_pct,
                "rank": a_rank,
                "total_dongs": total_dongs,
            },
        }

    return result


@extend_schema(
    tags=["dongs"],
    summary="자취촌 지수 + 계약 활발도 (대시보드 §4.5)",
    description=(
        "한 행정동의 파생 지표 2종을 반환한다.\n\n"
        "**자취촌 지수** (0~100): 0.5 × 비아파트 비율 + 0.3 × ≤25㎡ 비율 + "
        "0.2 × 월세 계약 건수 정규화 (서울 동별 min-max). 입력은 최근 12개월 rent_deal. "
        "출력에는 서울 426동 중 백분위/순위 포함.\n\n"
        "**계약 활발도**: 최근 12개월 계약 건수 / 인구 × 1000. 인구가 없으면 (=0) "
        "score/rank는 null.\n\n"
        "426동 전체를 한 번에 계산 후 5시간 캐시 (date 단위 키, 매일 자동 갱신). "
        "warm 응답은 dict 조회로 < 100ms."
    ),
)
class DongDerivedIndicesView(APIView):
    """
    GET /api/dongs/<slug>/derived-indices

    응답:
      {
        "dong": { "slug": "...", "name": "...", "gu": "..." },
        "studio_index": {
          "score": 67.3, "percentile": 82, "rank": 76, "total_dongs": 426,
          "breakdown": {
            "non_apt_ratio": 0.71,
            "small_area_ratio": 0.55,
            "monthly_deal_normalized": 0.42
          },
          "formula": "0.5 × 비아파트 비율 + ..."
        },
        "activity": {
          "deals_per_1000": 12.45, "deals_12m": 145, "population": 11647,
          "percentile": 73, "rank": 115, "total_dongs": 426
        }
      }

    빈 데이터 처리:
    - 12개월 거래 0건 → studio_index의 score/percentile/rank/breakdown 모두 null
    - 인구 0 또는 null → activity의 deals_per_1000/percentile/rank null
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
            # slug 존재 안 함 — DB에 진짜 없는지 확인 (캐시 stale 방어)
            if not Dong.objects.filter(slug=slug).exists():
                raise NotFound({"detail": "동을 찾을 수 없습니다."})
            # DB에는 있는데 캐시에 없음 (이론상 발생 불가, 캐시 재생성)
            cache.delete(cache_key)
            all_indices = _compute_all_dongs_derived(today)
            cache.set(cache_key, all_indices, timeout=DERIVED_CACHE_TTL_SECONDS)
            payload = all_indices.get(slug)
            if payload is None:
                raise NotFound({"detail": "동을 찾을 수 없습니다."})

        return Response(payload, status=status.HTTP_200_OK)
