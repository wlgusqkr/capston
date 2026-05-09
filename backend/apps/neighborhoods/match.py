"""Phase 5 — 메인 지도 자취 거래량 분포 (Studio Match).

`/dong/:slug/explore`(Phase 4.8)와 동일한 base filter 를 받아 한 번에 모든 동에
대해 GROUP BY count + ratio 정규화. 메인 지도 히트맵의 'match 모드' 가 이 응답으로
색칠된다.

데이터 = 국토부 실거래 (rent_deal) 최근 N개월. 현재 매물 재고가 아닌 과거 거래량
분포 (eng-review #18, codex outside voice).

엔드포인트
----------
- GET /api/dongs/match-counts?<filters>     (DongMatchCountsView)
    응답: { filters_applied, total_matched, min_sample, dongs[] }
- GET /api/dongs/<slug>/match-detail?<filters>  (DongMatchDetailView)
    응답: { dong, filters_applied, count, avg_converted_rent, avg_deposit,
            match_ratio, period_total }

성능 / 캐시
----------
- SQL: rent_deal GROUP BY dong_id  + base filter 7건. (dong_id, deal_date) +
  (deal_type, deal_date) 인덱스 활용.
- Redis 5분 TTL. 캐시 키 = sha1(canonicalized filters) — default 와 같은 필드
  omit 으로 캐시 효율 ↑ (eng-review #10).

ratio 정규화 (eng-review #3)
---------------------------
log scale + min_sample (default 10):
    ratio = log1p(count) / log1p(max_count) * 100
    count < min_sample → ratio = 0
극단 outlier 동(예: 5,000건 vs 50건)이 100 vs 1 로 과장되지 않게.
"""

from __future__ import annotations

import hashlib
import json
import math
from datetime import date
from typing import Any

from django.core.cache import cache
from django.db.models import Avg, Count, F, Value
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.realestate.models import RentDeal

from .explore import (
    PERIOD_TO_DAYS,
    apply_base_filters,
    parse_base_filters,
)
from .models import Dong


# 표본 부족 동 임계 (eng-review #3)
MIN_SAMPLE = 10

# Redis cache TTL (sec)
CACHE_TTL = 300

# 환산월세 SQL expression (apps.realestate.utils 와 동일 계수 0.005)
CONVERTED_EXPR = F("monthly_rent") + F("deposit") * Value(0.005)


def canonicalize_filters(filters: dict[str, Any]) -> str:
    """필터 dict → 정렬·default omit 한 sha1 캐시 키 (eng-review #10)."""
    canonical: dict[str, Any] = {}
    for k in sorted(filters):
        v = filters[k]
        if isinstance(v, (list, tuple)):
            v = ",".join(sorted(map(str, v)))
        canonical[k] = v
    payload = json.dumps(canonical, ensure_ascii=False, sort_keys=True)
    return hashlib.sha1(payload.encode("utf-8")).hexdigest()


def _normalize_ratio(count: int, max_count: int) -> float:
    """log scale 정규화 0~100. count<MIN_SAMPLE 또는 max==0 → 0."""
    if count < MIN_SAMPLE or max_count <= 0:
        return 0.0
    return round(math.log1p(count) / math.log1p(max_count) * 100, 1)


# ---------------------------------------------------------------------------
# match-counts (전체 동 카운트)
# ---------------------------------------------------------------------------


def compute_match_counts(filters: dict[str, Any], today: date) -> dict[str, Any]:
    """모든 동에 대해 필터 통과 거래수 + ratio. 캐시 hit 시 Redis 응답."""
    cache_key = f"match-counts:{canonicalize_filters(filters)}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    qs = apply_base_filters(RentDeal.objects.all(), filters, today)
    rows = (
        qs.values("dong_id")
        .annotate(cnt=Count("id"))
    )
    counts: dict[int, int] = {r["dong_id"]: r["cnt"] for r in rows if r["dong_id"] is not None}

    # 모든 동 (count 0 도 응답에 포함 — has_data 표시용)
    all_dongs = list(Dong.objects.values("id", "code", "slug"))
    max_count = max(counts.values()) if counts else 0
    total_matched = sum(counts.values())

    dong_items: list[dict[str, Any]] = []
    for d in all_dongs:
        cnt = counts.get(d["id"], 0)
        dong_items.append(
            {
                "code": d["code"],
                "slug": d["slug"],
                "count": cnt,
                "ratio": _normalize_ratio(cnt, max_count),
                # has_data: 동 자체는 적재됐고 (rent_deal 적재 0건도 정상 0건),
                # min_sample 미만은 ratio 0 으로 회색 처리되되 has_data=true
                # (적재 자체는 됐다는 의미). 향후 동 적재 누락 케이스가 생기면
                # 여기서 false 분기.
                "has_data": True,
            }
        )

    response = {
        "filters_applied": filters,
        "total_matched": total_matched,
        "min_sample": MIN_SAMPLE,
        "dongs": dong_items,
    }
    cache.set(cache_key, response, CACHE_TTL)
    return response


class DongMatchCountsView(APIView):
    """GET /api/dongs/match-counts?<filters>"""

    def get(self, request: Request) -> Response:
        filters = parse_base_filters(request)
        data = compute_match_counts(filters, today=date.today())
        return Response(data, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# match-detail (동 패널 KPI 카드)
# ---------------------------------------------------------------------------


def compute_match_detail(dong: Dong, filters: dict[str, Any], today: date) -> dict[str, Any]:
    """단일 동의 매칭 통계 + 분모(같은 동·기간·유형 set 전체).

    매칭률 = (필터 통과 거래) / (같은 동·같은 기간·deal_types set 전체) * 100.
    eng-review #7 정의.
    """
    cache_key = (
        f"match-detail:{dong.id}:{canonicalize_filters(filters)}"
    )
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    # 1) 필터 통과 거래 (이 동 + base filter)
    matched_qs = apply_base_filters(
        RentDeal.objects.filter(dong_id=dong.id), filters, today
    )
    matched_agg = matched_qs.aggregate(
        n=Count("id"),
        avg_rent=Avg(CONVERTED_EXPR),
        avg_deposit=Avg("deposit"),
    )

    # 2) 분모 — 같은 동/기간/deal_types set 전체 (deposit/monthly/area 무관)
    period_qs = RentDeal.objects.filter(
        dong_id=dong.id, deal_type__in=filters["deal_types"]
    )
    days = PERIOD_TO_DAYS[filters["period"]]
    if days is not None:
        from datetime import timedelta
        period_qs = period_qs.filter(deal_date__gte=today - timedelta(days=days))
    period_total = period_qs.count()

    count = int(matched_agg["n"] or 0)
    match_ratio = round(count / period_total * 100, 1) if period_total > 0 else None

    response = {
        "dong": {
            "slug": dong.slug,
            "code": dong.code,
            "name": dong.name,
            "gu": dong.gu,
        },
        "filters_applied": filters,
        "count": count,
        "avg_converted_rent": int(round(float(matched_agg["avg_rent"])))
        if matched_agg["avg_rent"] is not None
        else None,
        "avg_deposit": int(round(float(matched_agg["avg_deposit"])))
        if matched_agg["avg_deposit"] is not None
        else None,
        "match_ratio": match_ratio,
        "period_total": period_total,
    }
    cache.set(cache_key, response, CACHE_TTL)
    return response


class DongMatchDetailView(APIView):
    """GET /api/dongs/<slug>/match-detail?<filters>"""

    def get(self, request: Request, slug: str) -> Response:
        try:
            dong = Dong.objects.only("id", "slug", "code", "name", "gu").get(slug=slug)
        except Dong.DoesNotExist as exc:
            raise NotFound({"detail": "동을 찾을 수 없습니다."}) from exc
        filters = parse_base_filters(request)
        data = compute_match_detail(dong, filters, today=date.today())
        return Response(data, status=status.HTTP_200_OK)
