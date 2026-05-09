"""SPEC 6.3 동 상세 응답을 실 DB 데이터로 만드는 빌더.

Phase 4.5 후속. detail_dummy.build_dummy_detail 의 monthly_trend/recent_deals/
amenity counts/nearest_stations/bus stop_count 를 RentDeal/Amenity/NearestSubway/
BusStop 실 쿼리로 교체. reviews 와 similar_dongs 는 데이터 부재/점수 기반이라
detail_dummy 의 helper 를 그대로 재사용.

응답 형식은 detail_dummy.build_dummy_detail 과 100% 동일 (DongDetail 타입 호환).
"""

from __future__ import annotations

from collections import defaultdict
from datetime import date

from django.db.models import Avg, Count, F, Value

from apps.amenities.models import Amenity
from apps.realestate.models import RentDeal
from apps.transit.models import BusStop, NearestSubway

from .detail_dummy import (
    SEOUL_AVG_BASELINE,
    _amenity_level,
    _build_reviews,
    _build_similar_dongs,
    _format_month,
    _round1,
)
from .models import Dong
from .summary import generate_summary


# ---------------------------------------------------------------------------
# Real-data helpers
# ---------------------------------------------------------------------------


# RentDeal.deal_type (영문 5종) → monthly_trend 차트 키.
# apt 는 차트 시리즈에 미포함이라 누락 — 응답에 키가 없어도 프론트는 무시.
TREND_KEYS = ("villa", "dagagu", "danok", "officetel")

# Amenity 11종 → SPEC 6.3 화면 8 카테고리 (한글 라벨).
# 병원·약국 은 hospital + pharmacy 합산. park/etc 는 화면 미노출.
AMENITY_DISPLAY: list[tuple[str, list[str], float]] = [
    # (label, internal_keys, density_target_weight — _build_amenities 와 동일 의도)
    ("편의점", ["convenience"], 0.95),
    ("카페", ["cafe"], 1.10),
    ("음식점", ["restaurant"], 1.40),
    ("마트", ["mart"], 0.30),
    ("병원·약국", ["hospital", "pharmacy"], 0.55),
    ("스터디카페", ["studycafe"], 0.25),
    ("세탁소", ["laundry"], 0.20),
    ("올리브영", ["oliveyoung"], 0.15),
]


def _real_real_estate(dong: Dong, today: date) -> dict:
    """SPEC 6.3 섹션 2 — 부동산 시세 (RentDeal SQL aggregation)."""
    # ---- 1) 최근 6개월 monthly_trend (deal_type별 평균 monthly_rent) ----
    # 6개월 전 1일 기준
    start_year, start_month = today.year, today.month - 5
    while start_month <= 0:
        start_month += 12
        start_year -= 1
    start = date(start_year, start_month, 1)

    # SQL: GROUP BY 월 + deal_type, 거래 3건 미만은 None
    # PG: TO_CHAR(deal_date, 'YYYY-MM')
    rows = list(
        RentDeal.objects.filter(dong_id=dong.id, deal_date__gte=start)
        .extra(select={"month": "TO_CHAR(deal_date, 'YYYY-MM')"})
        .values("month", "deal_type")
        .annotate(avg_rent=Avg("monthly_rent"), n=Count("id"))
    )
    # (month, deal_type) → (avg, n)
    by_key: dict[tuple[str, str], tuple[float, int]] = {}
    for r in rows:
        by_key[(r["month"], r["deal_type"])] = (float(r["avg_rent"] or 0), r["n"])

    # 6개월 month 라벨 만들기 (오래된 → 최신)
    months: list[str] = []
    cur = date(today.year, today.month, 1)
    seq: list[date] = []
    for _ in range(6):
        seq.append(cur)
        prev_month = cur.month - 1 or 12
        prev_year = cur.year if cur.month != 1 else cur.year - 1
        cur = date(prev_year, prev_month, 1)
    seq.reverse()
    months = [_format_month(d) for d in seq]

    monthly_trend = []
    for m in months:
        entry: dict = {"month": m}
        for key in TREND_KEYS:
            rec = by_key.get((m, key))
            # 거래 3건 미만 → null (SPEC 14.2)
            if rec is None or rec[1] < 3:
                entry[key] = None
            else:
                entry[key] = _round1(rec[0])
        monthly_trend.append(entry)

    # ---- 2) 보증금 대역별 평균 월세 ----
    # 5 대역: '0' (0~250), '500' (250~750), '1000' (750~1500),
    #        '2000' (1500~2500), '3000+' (2500+)
    # 거래 5건 미만 대역은 fallback (전체 동 평균 또는 0)
    BAND_RANGES = [
        ("0", 0, 250),
        ("500", 250, 750),
        ("1000", 750, 1500),
        ("2000", 1500, 2500),
        ("3000+", 2500, 10**9),
    ]
    deposit_band_avg = []
    for label, lo, hi in BAND_RANGES:
        agg = RentDeal.objects.filter(
            dong_id=dong.id, deposit__gte=lo, deposit__lt=hi
        ).aggregate(avg=Avg("monthly_rent"), n=Count("id"))
        if agg["n"] and agg["n"] >= 5 and agg["avg"] is not None:
            avg = max(5.0, _round1(float(agg["avg"])))
        else:
            avg = 0.0  # 데이터 부족 — 프론트가 0이면 회색 처리
        deposit_band_avg.append({"band": label, "avg_monthly_rent": avg})

    # ---- 3) 최근 실거래 5건 ----
    recent_qs = (
        RentDeal.objects.filter(dong_id=dong.id)
        .order_by("-deal_date", "-id")
        .values("deal_date", "housing_type", "deal_type", "area_m2", "deposit", "monthly_rent")[:5]
    )
    recent_deals = []
    for r in recent_qs:
        # type 라벨: housing_type(한글 raw) 우선, 없으면 deal_type 매핑
        type_label = r["housing_type"] or {
            "apt": "아파트",
            "officetel": "오피스텔",
            "villa": "연립다세대",
            "dagagu": "다가구",
            "danok": "단독",
        }.get(r["deal_type"], r["deal_type"])
        recent_deals.append({
            "date": r["deal_date"].isoformat(),
            "type": type_label,
            "area_m2": _round1(float(r["area_m2"])),
            "deposit": int(r["deposit"]),
            "monthly_rent": int(r["monthly_rent"]),
        })

    return {
        "monthly_trend": monthly_trend,
        "deposit_band_avg": deposit_band_avg,
        "recent_deals": recent_deals,
    }


def _real_amenities(dong: Dong) -> list[dict]:
    """SPEC 6.3 섹션 3 — 8 카테고리 카운트 (Amenity 실 쿼리)."""
    counts: dict[str, int] = defaultdict(int)
    qs = (
        Amenity.objects.filter(dong_id=dong.id)
        .values("category")
        .annotate(n=Count("id"))
    )
    for r in qs:
        counts[r["category"]] = r["n"]

    level = _amenity_level(dong.score_amenity)
    area = max(0.1, dong.area_km2 or 0.25)

    out = []
    for label, internal_keys, _weight in AMENITY_DISPLAY:
        cnt = sum(counts.get(k, 0) for k in internal_keys)
        density = round(cnt / area, 1)
        out.append({
            "category": label,
            "count": cnt,
            "density_per_km2": density,
            "level": level,
        })
    return out


def _real_transit(dong: Dong) -> dict:
    """SPEC 6.3 섹션 4 — 가까운 역 top-3 + 버스 정류장 카운트."""
    # NearestSubway 사전계산 (compute_nearest_subway.py)
    rows = list(
        NearestSubway.objects.filter(dong_id=dong.id)
        .order_by("rank")
        .select_related("station")[:3]
    )
    nearest_stations = []
    for ns in rows:
        # 도보 시간: 직선거리 / 70m/min (1.2배 우회 + 4.8km/h ≈ dummy 패턴 유지)
        walking_min = max(1, int(round(ns.distance_m / 70)))
        nearest_stations.append({
            "rank": ns.rank,
            "name": ns.station.name,
            "line": ns.station.line,
            "walking_min": walking_min,
            "walking_distance_m": int(round(ns.distance_m)),
        })
    # 데이터 부족 (rank=3 이 채워지지 않은 동) — 빈 슬롯은 정보 없음
    while len(nearest_stations) < 3:
        nearest_stations.append({
            "rank": len(nearest_stations) + 1,
            "name": "정보 없음",
            "line": "-",
            "walking_min": 0,
            "walking_distance_m": 0,
        })

    # 버스: stop_count = BusStop.dong=this. route_count는 노선정보 없으니 stop*3 추정.
    # BusStop.dong 은 to_field='code' 라 dong__id join 필요.
    stop_count = BusStop.objects.filter(dong__id=dong.id).count()
    route_count = stop_count * 3  # 단순 추정 (노선 데이터 부재)

    return {
        "nearest_stations": nearest_stations,
        "bus": {
            "stop_count": stop_count,
            "route_count": route_count,
        },
    }


# ---------------------------------------------------------------------------
# Main builder
# ---------------------------------------------------------------------------


def build_real_detail(dong: Dong, weights: dict, today: date | None = None) -> dict:
    """SPEC 6.3 동네 상세 응답 dict — 실 DB 쿼리 기반.

    detail_dummy.build_dummy_detail 과 응답 키/형식 100% 동일. 차이는 값이
    실 DB 에서 계산된다는 점:
    - real_estate.monthly_trend: RentDeal SQL GROUP BY 월/deal_type
    - real_estate.deposit_band_avg: RentDeal 보증금 구간 GROUP BY
    - real_estate.recent_deals: RentDeal 최근 5건
    - amenities: Amenity GROUP BY category (8 카테고리 매핑)
    - transit.nearest_stations: NearestSubway 사전계산
    - transit.bus.stop_count: BusStop count (route_count 는 stop*3 추정)
    - reviews / similar_dongs: 리뷰 raw 데이터 부재 → detail_dummy helper 재사용
    """
    if today is None:
        today = date.today()

    # ---- Hero (Dong 컬럼 직접) ----
    score = round(
        dong.composite_score(
            w_rent=weights["rent"],
            w_amenity=weights["amenity"],
            w_transit=weights["transit"],
        ),
        2,
    )
    summary = generate_summary(
        score_rent=dong.score_rent,
        score_amenity=dong.score_amenity,
        score_transit=dong.score_transit,
    )
    vs_seoul_avg_pct = int(round(score - SEOUL_AVG_BASELINE))
    centroid = {
        "lat": round(dong.centroid.y, 6) if dong.centroid else 0.0,
        "lng": round(dong.centroid.x, 6) if dong.centroid else 0.0,
    }

    # ---- 비슷한 동네 (점수 기반, dummy helper 재사용) ----
    all_dongs = list(
        Dong.objects.only(
            "slug", "name", "gu", "score_rent", "score_amenity", "score_transit"
        )
    )
    similar_dongs = _build_similar_dongs(dong, all_dongs)

    return {
        # 1. Hero
        "slug": dong.slug,
        "name": dong.name,
        "gu": dong.gu,
        "score": score,
        "summary": summary,
        "vs_seoul_avg_pct": vs_seoul_avg_pct,
        "centroid": centroid,
        # 2. 부동산 (실)
        "real_estate": _real_real_estate(dong, today),
        # 3. 편의시설 (실)
        "amenities": _real_amenities(dong),
        # 4. 교통 (실)
        "transit": _real_transit(dong),
        # 5. 리뷰 (데이터 없음 — dummy 그대로)
        "reviews": _build_reviews(dong, today),
        # 6. 비슷한 동네 (점수 기반)
        "similar_dongs": similar_dongs,
    }
