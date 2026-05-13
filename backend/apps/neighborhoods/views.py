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
- GET /api/dongs/<slug>/population
  → 행정동 인구 시계열 (대시보드 Phase 2)
- GET /api/dongs/<slug>/gu-metrics
  → 소속 구의 최신 지표 + 서울 평균 (대시보드 Phase 2)
"""

from __future__ import annotations

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from datetime import date

from .compare_dummy import build_compare_row, compute_rent_converted_avgs
from .explore import build_explore_response
from .models import Dong
from .score_point import compute_point_score
from .serializers import (
    DongCompareItemSerializer,
    DongDetailSerializer,
    DongScoreSerializer,
    DongSummarySerializer,
    KernelScoreRequestSerializer,
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
            "code",
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

        # 환산월세 평균을 한 번에 사전 계산 (N+1 회피).
        # 같은 구의 RentDeal 만 fetch 하므로 비용 제한적 (5개 구 27,050건 케이스).
        target_dongs = [by_slug[s] for s in slugs]
        rent_converted_map = compute_rent_converted_avgs(target_dongs)

        # 입력 순서 그대로 행 빌드
        rows = [
            build_compare_row(
                by_slug[s],
                weights,
                rent_converted_avg=rent_converted_map.get(s),
            )
            for s in slugs
        ]

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


@extend_schema(
    tags=["dongs"],
    summary="임의 지점 커널 점수 (SPEC 11, Phase 2a)",
    description=(
        "지도 위 임의 클릭 지점(lat/lng)에 대해 가우시안 커널(σ=300m, 1km 컷) "
        "기반의 종합 점수를 계산한다. 내부적으로 amenity 카테고리별 가중합, "
        "가까운 지하철 거리, 1km 버스 정류장 수, 포인트가 속한 행정동의 score_rent "
        "(이미 동 단위 백분위 정규화) 를 조합한다. "
        "school 옵션 지정 시 해당 학교까지의 통학 시간(분, haversine 22km/h)을 함께 반환."
    ),
    request=KernelScoreRequestSerializer,
)
class KernelScoreView(APIView):
    """
    POST /api/score/point

    Request body:
      {
        "lat": 37.5663, "lng": 126.9783,
        "weights": {"rent": 0.3, "amenity": 0.4, "transit": 0.3},
        "school": "동국대"  // optional
      }

    Response:
      {
        "score": 72.4,
        "breakdown": {"rent": 68.2, "amenity": 81.5, "transit": 70.1},
        "nearest": [{category, name, [line], walk_min, distance_m}, ...],
        "radius_counts": {"convenience": 8, "cafe": 12, "hospital": 2, ...},
        "commute_min": 22  // school 미지정 시 null
      }

    오류:
      - lat/lng 범위 벗어남 (한반도 외) → 400
      - weights 음수 또는 모두 0 → 400
      - school 매핑 안 됨 → commute_min: null (오류 아님)
    """

    def post(self, request: Request) -> Response:
        ser = KernelScoreRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        result = compute_point_score(
            lat=data["lat"],
            lng=data["lng"],
            weights=data["weights"],
            school=data.get("school") or None,
        )
        return Response(result, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Phase 4.8 — 자취 시세 BI 대시보드 (`/dong/<slug>/explore`)
# ---------------------------------------------------------------------------


@extend_schema(
    tags=["dongs"],
    summary="자취 시세 BI 대시보드 데이터 (Phase 4.8)",
    description=(
        "한 동의 자취 시장을 깊이 탐색하기 위한 BI 응답. 사용자가 거래유형/기간/"
        "보증금/월세/면적 필터를 자유롭게 조합하면 KPI · 유형별 평균 · 면적-환산"
        "월세 산점도 · 보증금 대역 분포 · 월별 추이 · 페이지네이션된 거래표가 모두 "
        "동기화되어 반환된다. 필터 파라미터/응답 포맷은 backend/apps/neighborhoods/"
        "explore.py 참조."
    ),
    parameters=[
        OpenApiParameter(
            name="deal_types",
            type=OpenApiTypes.STR,
            location=OpenApiParameter.QUERY,
            required=False,
            description="콤마 구분: villa,dagagu,danok,officetel,apt (default 자취 4종)",
        ),
        OpenApiParameter(
            name="period",
            type=OpenApiTypes.STR,
            location=OpenApiParameter.QUERY,
            required=False,
            description="3m | 6m | 12m | 24m | all (default 6m)",
        ),
        OpenApiParameter(
            name="deposit_min",
            type=OpenApiTypes.INT,
            location=OpenApiParameter.QUERY,
            required=False,
            description="만원 (default 0)",
        ),
        OpenApiParameter(
            name="deposit_max",
            type=OpenApiTypes.INT,
            location=OpenApiParameter.QUERY,
            required=False,
            description="만원 (default 50000)",
        ),
        OpenApiParameter(
            name="monthly_min",
            type=OpenApiTypes.INT,
            location=OpenApiParameter.QUERY,
            required=False,
            description="만원 (default 0)",
        ),
        OpenApiParameter(
            name="monthly_max",
            type=OpenApiTypes.INT,
            location=OpenApiParameter.QUERY,
            required=False,
            description="만원 (default 300)",
        ),
        OpenApiParameter(
            name="area_min",
            type=OpenApiTypes.INT,
            location=OpenApiParameter.QUERY,
            required=False,
            description="m² (default 10)",
        ),
        OpenApiParameter(
            name="area_max",
            type=OpenApiTypes.INT,
            location=OpenApiParameter.QUERY,
            required=False,
            description="m² (default 100)",
        ),
        OpenApiParameter(
            name="page",
            type=OpenApiTypes.INT,
            location=OpenApiParameter.QUERY,
            required=False,
            description="1-indexed (default 1)",
        ),
        OpenApiParameter(
            name="page_size",
            type=OpenApiTypes.INT,
            location=OpenApiParameter.QUERY,
            required=False,
            description="default 20, max 100",
        ),
        OpenApiParameter(
            name="sort",
            type=OpenApiTypes.STR,
            location=OpenApiParameter.QUERY,
            required=False,
            description=(
                "date_desc | date_asc | deposit_desc | deposit_asc | "
                "monthly_desc | monthly_asc | converted_desc | converted_asc | "
                "area_desc | area_asc (default date_desc)"
            ),
        ),
    ],
)
class DongExploreView(APIView):
    """GET /api/dongs/<slug>/explore?<filters>"""

    def get(self, request: Request, slug: str) -> Response:
        try:
            dong = Dong.objects.only(
                "id", "slug", "code", "name", "gu"
            ).get(slug=slug)
        except Dong.DoesNotExist as exc:
            raise NotFound({"detail": "동을 찾을 수 없습니다."}) from exc

        data = build_explore_response(dong, request, today=date.today())
        return Response(data, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# 대시보드 Phase 2 — 인구 시계열 + 구별 지표
# ---------------------------------------------------------------------------

from django.core.cache import cache

from apps.regions.models import AdongPopulation, Gu
from apps.metrics.models import GuMetric, Metric, SeoulMetric


def _get_dong_or_404(slug: str) -> Dong:
    """slug로 Dong을 조회. 없으면 404."""
    try:
        return Dong.objects.only("id", "slug", "code", "name", "gu").get(slug=slug)
    except Dong.DoesNotExist as exc:
        raise NotFound({"detail": "동을 찾을 수 없습니다."}) from exc


def _dong_header(dong: Dong) -> dict:
    """공통 dong 식별 dict."""
    return {"slug": dong.slug, "name": dong.name, "gu": dong.gu}


@extend_schema(
    tags=["dongs"],
    summary="행정동 인구 시계열 (대시보드 Phase 2)",
    description=(
        "한 행정동의 인구·세대 시계열 전체를 반환한다. "
        "latest는 가장 최근 행, trend는 날짜 오름차순 전체."
    ),
)
class DongPopulationView(APIView):
    """
    GET /api/dongs/<slug>/population

    응답:
      {
        "dong": { "slug": "...", "name": "...", "gu": "..." },
        "latest": { "date": "...", "total_population": ..., ... },
        "trend": [ { "date": "...", ... }, ... ]
      }
    """

    def get(self, request: Request, slug: str) -> Response:
        dong = _get_dong_or_404(slug)

        cache_key = f"dong_population:{dong.code}"
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached, status=status.HTTP_200_OK)

        rows = (
            AdongPopulation.objects
            .filter(dong=dong.code)
            .order_by("date")
            .values("date", "total_population", "household_count",
                    "male_population", "female_population")
        )
        trend = [
            {
                "date": str(r["date"]),
                "total_population": r["total_population"],
                "household_count": r["household_count"],
                "male_population": r["male_population"],
                "female_population": r["female_population"],
            }
            for r in rows
        ]

        latest = trend[-1] if trend else None

        data = {
            "dong": _dong_header(dong),
            "latest": latest,
            "trend": trend,
        }

        cache.set(cache_key, data, timeout=600)  # 10분 TTL
        return Response(data, status=status.HTTP_200_OK)


@extend_schema(
    tags=["dongs"],
    summary="소속 구의 최신 지표 + 서울 평균 (대시보드 Phase 2)",
    description=(
        "한 행정동이 속한 자치구의 최신 GuMetric 35종을 metric_code별로 반환하고, "
        "동일 metric_code에 대한 SeoulMetric 평균도 함께 반환한다."
    ),
)
class DongGuMetricsView(APIView):
    """
    GET /api/dongs/<slug>/gu-metrics

    응답:
      {
        "dong": { "slug": "...", "name": "...", "gu": "..." },
        "gu_code": "1114000000",
        "gu_name": "중구",
        "date": "2024-12-31",
        "metrics": {
          "SAFETY_GRADE_MEAN": { "value": 3.2, "name": "...", "unit": "점", "category": "안전" },
          ...
        },
        "seoul_avg": {
          "SAFETY_GRADE_MEAN": { "value": 3.5 },
          ...
        }
      }
    """

    def get(self, request: Request, slug: str) -> Response:
        dong = _get_dong_or_404(slug)

        # Dong.gu는 CharField (예: "중구"). Gu.name도 동일 값.
        gu = Gu.objects.filter(name=dong.gu).first()
        if gu is None:
            raise NotFound({"detail": f"구를 찾을 수 없습니다: {dong.gu}"})

        cache_key = f"dong_gu_metrics:{gu.gu_code}"
        cached = cache.get(cache_key)
        if cached is not None:
            # cached 데이터에 dong 헤더만 교체 (같은 구의 다른 동에서도 재사용)
            result = {**cached, "dong": _dong_header(dong)}
            return Response(result, status=status.HTTP_200_OK)

        # 메트릭 메타 사전 로드 (35행)
        metric_meta = {
            m.metric_code: m
            for m in Metric.objects.all()
        }

        # 최신 날짜의 GuMetric 조회
        latest_gm = (
            GuMetric.objects
            .filter(gu=gu)
            .order_by("-date")
            .values_list("date", flat=True)
            .first()
        )
        if latest_gm is None:
            data = {
                "dong": _dong_header(dong),
                "gu_code": gu.gu_code,
                "gu_name": gu.name,
                "date": None,
                "metrics": {},
                "seoul_avg": {},
            }
            return Response(data, status=status.HTTP_200_OK)

        gu_rows = (
            GuMetric.objects
            .filter(gu=gu, date=latest_gm)
            .select_related("metric")
            .only("metric__metric_code", "value")
        )
        metrics_dict = {}
        for row in gu_rows:
            mc = row.metric_id  # metric_code (PK)
            meta = metric_meta.get(mc)
            metrics_dict[mc] = {
                "value": float(row.value) if row.value is not None else None,
                "name": meta.name if meta else mc,
                "unit": meta.unit if meta else "",
                "category": meta.category if meta else "",
            }

        # SeoulMetric — 같은 날짜를 먼저 시도, 없으면 각 metric_code 최신
        seoul_rows = (
            SeoulMetric.objects
            .filter(date=latest_gm)
            .only("metric_id", "value")
        )
        seoul_avg = {}
        for row in seoul_rows:
            seoul_avg[row.metric_id] = {
                "value": float(row.value) if row.value is not None else None,
            }

        # 같은 날짜에 서울 데이터가 없는 metric은 가장 최근 값으로 폴백
        missing_codes = set(metrics_dict.keys()) - set(seoul_avg.keys())
        if missing_codes:
            for mc in missing_codes:
                fallback = (
                    SeoulMetric.objects
                    .filter(metric_id=mc)
                    .order_by("-date")
                    .values_list("value", flat=True)
                    .first()
                )
                if fallback is not None:
                    seoul_avg[mc] = {"value": float(fallback)}

        cacheable = {
            "gu_code": gu.gu_code,
            "gu_name": gu.name,
            "date": str(latest_gm),
            "metrics": metrics_dict,
            "seoul_avg": seoul_avg,
        }
        cache.set(cache_key, cacheable, timeout=300)  # 5분 TTL

        data = {**cacheable, "dong": _dong_header(dong)}
        return Response(data, status=status.HTTP_200_OK)
