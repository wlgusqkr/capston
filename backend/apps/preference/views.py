"""
선호 학습 (SPEC 6.5, 11.4) 관련 뷰.

엔드포인트:
- GET /api/preference/pairs?count=5
  → 비교용 동네 쌍 N개 반환 (정보량 최대화 휴리스틱)
- POST /api/preference/submit
  body: {"comparisons": [{"won": slug_a, "lost": slug_b}, ...]}
  → {"w_rent": int, "w_amenity": int, "w_transit": int} (합 100)

7단계는 무상태 API. UserPreference 모델 저장은 9단계(인증)에서 추가.
"""

from __future__ import annotations

from itertools import combinations

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.neighborhoods.detail_dummy import NEAREST_STATIONS_FALLBACK
from apps.neighborhoods.models import Dong

from .optimizer import estimate_weights, to_integer_percent


# 기본 가중치 (SPEC 6.1 — 첫 진입 시 33/33/34)
DEFAULT_WEIGHTS = {"rent": 33 / 100, "amenity": 33 / 100, "transit": 34 / 100}

# 한국어 라벨 매핑 (DongSummarySerializer.amenity_level과 일관)
AMENITY_LABEL_KO: dict[str, str] = {
    "sufficient": "충분",
    "normal": "보통",
    "lacking": "부족",
}


# ---------------------------------------------------------------------------
# 카드 변환 — 동 1개 → 비교 카드 dict
# ---------------------------------------------------------------------------


def _amenity_level(score_amenity: float) -> str:
    """DongSummarySerializer.get_amenity_level과 동일 임계값."""
    if score_amenity >= 70:
        return "sufficient"
    if score_amenity >= 40:
        return "normal"
    return "lacking"


def _transit_min(slug: str) -> int:
    """가장 가까운 역의 도보 분 (NEAREST_STATIONS_FALLBACK 1위). 없으면 더미 10분."""
    stations = NEAREST_STATIONS_FALLBACK.get(slug)
    if stations:
        return int(stations[0]["walking_min"])
    return 10


def _build_card(dong: Dong, weights: dict[str, float]) -> dict:
    """
    SPEC 6.5 모달의 동 카드 한 장.
    rent_avg는 DongSummarySerializer 룰 재사용 (120 - score_rent),
    amenity_label은 한국어, transit_min은 NEAREST_STATIONS_FALLBACK 1위.
    """
    rent_avg = max(0, int(120 - dong.score_rent))
    transit_min = _transit_min(dong.slug)
    level = _amenity_level(dong.score_amenity)
    score = round(
        dong.composite_score(
            w_rent=weights["rent"],
            w_amenity=weights["amenity"],
            w_transit=weights["transit"],
        ),
        2,
    )
    return {
        "slug": dong.slug,
        "name": dong.name,
        "gu": dong.gu,
        "rent_avg": rent_avg,
        "transit_min": transit_min,
        "amenity_label": AMENITY_LABEL_KO[level],
        "score": score,
    }


# ---------------------------------------------------------------------------
# 쌍 선택 알고리즘
# ---------------------------------------------------------------------------


def _select_pairs(dongs: list[Dong], count: int) -> list[tuple[Dong, Dong]]:
    """
    정보량 최대화 휴리스틱.

    축(rent / amenity / transit) 별로 점수 차가 가장 큰 동 쌍을 우선 선택.
    축 라운드 로빈으로 count 개를 채운다 — 같은 축이라도 차순위 쌍을 골라
    한쪽 축에 편중되지 않게.

    동 5개 (n=5)면 가능한 쌍은 10. 같은 쌍 중복은 회피하지만, count > 10이면
    축별 우선순위에 따라 결국 다 소진하고 부족분은 라운드 로빈으로 반복 허용.
    더미 환경에서도 항상 count 개 반환을 보장.
    """
    if len(dongs) < 2:
        return []

    # 모든 가능한 (i, j) 쌍 (i < j)
    pairs = list(combinations(range(len(dongs)), 2))

    # 축별로 (|차이|, i, j) 내림차순 정렬한 인덱스 리스트 생성
    axes = [
        ("score_rent", lambda d: d.score_rent),
        ("score_amenity", lambda d: d.score_amenity),
        ("score_transit", lambda d: d.score_transit),
    ]
    axis_pairs: list[list[tuple[int, int]]] = []
    for _, getter in axes:
        ranked = sorted(
            pairs,
            key=lambda ij, g=getter: abs(g(dongs[ij[0]]) - g(dongs[ij[1]])),
            reverse=True,
        )
        axis_pairs.append(ranked)

    # 라운드 로빈으로 축을 돌면서 다음 쌍 뽑기. 중복은 일단 회피.
    seen: set[tuple[int, int]] = set()
    selected: list[tuple[int, int]] = []
    cursors = [0, 0, 0]
    axis_idx = 0
    # 충분한 시도 횟수 (모든 쌍을 한 바퀴 다 돌고도 안 차면 중복 허용으로 fallback)
    max_attempts = len(pairs) * len(axes) + count
    attempts = 0
    while len(selected) < count and attempts < max_attempts:
        ranked = axis_pairs[axis_idx]
        while cursors[axis_idx] < len(ranked) and ranked[cursors[axis_idx]] in seen:
            cursors[axis_idx] += 1
        if cursors[axis_idx] < len(ranked):
            ij = ranked[cursors[axis_idx]]
            cursors[axis_idx] += 1
            seen.add(ij)
            selected.append(ij)
        axis_idx = (axis_idx + 1) % len(axes)
        attempts += 1

    # 부족분은 첫 축 기준 가장 차이 큰 쌍부터 다시 (중복 허용 — 더미 환경 보호)
    while len(selected) < count:
        ij = axis_pairs[0][len(selected) % len(axis_pairs[0])]
        selected.append(ij)

    return [(dongs[i], dongs[j]) for i, j in selected]


# ---------------------------------------------------------------------------
# 뷰
# ---------------------------------------------------------------------------


@extend_schema(
    tags=["preference"],
    summary="선호 학습용 동네 쌍 (SPEC 6.5)",
    description="정보량 최대화 휴리스틱으로 양극단 쌍 우선 N개 반환.",
    parameters=[
        OpenApiParameter(
            name="count",
            type=OpenApiTypes.INT,
            location=OpenApiParameter.QUERY,
            required=False,
            description="반환할 쌍 개수 (1~20, default 5).",
        ),
    ],
)
class PreferencePairsView(APIView):
    """
    GET /api/preference/pairs?count=5

    SPEC 6.5 — 5번 비교용 쌍을 반환. 응답:
      {"pairs": [{"left": <card>, "right": <card>}, ...]}
    """

    pagination_class = None

    def get(self, request: Request) -> Response:
        # count 파라미터 (기본 5, 1~20 범위)
        raw = request.query_params.get("count", "5")
        try:
            count = int(raw)
        except (TypeError, ValueError) as exc:
            raise ValidationError({"count": "정수여야 합니다."}) from exc
        if not 1 <= count <= 20:
            raise ValidationError({"count": "1~20 범위여야 합니다."})

        dongs = list(
            Dong.objects.only(
                "slug",
                "name",
                "gu",
                "score_rent",
                "score_amenity",
                "score_transit",
            )
        )
        if len(dongs) < 2:
            raise ValidationError(
                {"detail": "비교할 동이 부족합니다 (최소 2개 필요)."}
            )

        pair_indices = _select_pairs(dongs, count)
        pairs = [
            {
                "left": _build_card(left, DEFAULT_WEIGHTS),
                "right": _build_card(right, DEFAULT_WEIGHTS),
            }
            for left, right in pair_indices
        ]
        return Response({"pairs": pairs}, status=status.HTTP_200_OK)


@extend_schema(
    tags=["preference"],
    summary="비교 결과 → 가중치 추정 (SPEC 11.4)",
    description=(
        "사용자가 N번 비교한 결과 (won/lost 슬러그 쌍 배열)를 받아 "
        "scipy.optimize SLSQP로 가중치를 추정. 결과는 합 100 정수 %."
    ),
)
class PreferenceSubmitView(APIView):
    """
    POST /api/preference/submit
    body: {"comparisons": [{"won": "slug_a", "lost": "slug_b"}, ...]}

    won/lost 슬러그 → Dong → (score_rent, score_amenity, score_transit) 추출
    → estimate_weights → 정수 % 변환 → 응답.

    응답: {"w_rent": int, "w_amenity": int, "w_transit": int}  (합 100)

    오류:
      - body 형식 불일치 → 400
      - comparisons 빈 배열 → 400
      - won == lost (같은 슬러그) → 400
      - slug 미존재 → 400 (어느 슬러그인지 명시)
    """

    def post(self, request: Request) -> Response:
        data = request.data
        if not isinstance(data, dict):
            raise ValidationError({"detail": "JSON 객체여야 합니다."})

        comparisons_raw = data.get("comparisons")
        if not isinstance(comparisons_raw, list):
            raise ValidationError(
                {"comparisons": "리스트여야 합니다."}
            )
        if len(comparisons_raw) == 0:
            raise ValidationError(
                {"comparisons": "최소 1개 이상의 비교가 필요합니다."}
            )
        # 잠금장치: 너무 많은 비교는 거부 (남용 방지 / 응답 시간 보호)
        if len(comparisons_raw) > 50:
            raise ValidationError(
                {"comparisons": "비교는 최대 50개까지만 처리할 수 있습니다."}
            )

        # 슬러그 수집 + 형식 검증
        slugs_needed: set[str] = set()
        validated: list[tuple[str, str]] = []
        for i, c in enumerate(comparisons_raw):
            if not isinstance(c, dict):
                raise ValidationError(
                    {"comparisons": f"{i}번 항목이 객체가 아닙니다."}
                )
            won = c.get("won")
            lost = c.get("lost")
            if not isinstance(won, str) or not isinstance(lost, str):
                raise ValidationError(
                    {
                        "comparisons": (
                            f"{i}번 항목의 won/lost는 문자열 슬러그여야 합니다."
                        )
                    }
                )
            if won == lost:
                raise ValidationError(
                    {
                        "comparisons": (
                            f"{i}번 항목의 won과 lost가 같은 슬러그입니다 ('{won}')."
                        )
                    }
                )
            validated.append((won, lost))
            slugs_needed.add(won)
            slugs_needed.add(lost)

        # 슬러그 → Dong 일괄 조회 (N+1 방지)
        dong_map: dict[str, Dong] = {
            d.slug: d
            for d in Dong.objects.only(
                "slug", "score_rent", "score_amenity", "score_transit"
            ).filter(slug__in=slugs_needed)
        }
        missing = sorted(slugs_needed - set(dong_map.keys()))
        if missing:
            raise ValidationError(
                {
                    "comparisons": (
                        f"존재하지 않는 동 슬러그: {', '.join(missing)}"
                    )
                }
            )

        # (won_features, lost_features) 튜플 리스트
        comparisons: list[
            tuple[tuple[float, float, float], tuple[float, float, float]]
        ] = []
        for won_slug, lost_slug in validated:
            won = dong_map[won_slug]
            lost = dong_map[lost_slug]
            comparisons.append(
                (
                    (won.score_rent, won.score_amenity, won.score_transit),
                    (lost.score_rent, lost.score_amenity, lost.score_transit),
                )
            )

        weights = estimate_weights(comparisons)
        percent = to_integer_percent(weights)
        return Response(
            {
                "w_rent": percent["rent"],
                "w_amenity": percent["amenity"],
                "w_transit": percent["transit"],
            },
            status=status.HTTP_200_OK,
        )
