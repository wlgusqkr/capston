"""
neighborhoods 앱 URL.

마운트 위치: config/urls.py 의 path("api/", include("apps.neighborhoods.urls"))
즉, 여기서는 'dongs/...' 형태로 작성.
"""

from django.urls import path

from .match import DongMatchCountsView, DongMatchDetailView
from .views import (
    CompareView,
    DongDetailView,
    DongExploreView,
    DongGuMetricsSeriesView,
    DongGuMetricsView,
    DongPopulationView,
    DongScoresView,
    DongSummaryView,
    KernelScoreView,
)

app_name = "neighborhoods"

urlpatterns = [
    # GET /api/dongs/scores
    path("dongs/scores", DongScoresView.as_view(), name="dong-scores"),
    # GET /api/dongs/match-counts — 메인 지도 자취 거래량 분포 (Phase 5)
    path("dongs/match-counts", DongMatchCountsView.as_view(), name="dong-match-counts"),
    # GET /api/dongs/<slug>/match-detail — 동 패널 매칭 KPI (Phase 5)
    path(
        "dongs/<str:slug>/match-detail",
        DongMatchDetailView.as_view(),
        name="dong-match-detail",
    ),
    # GET /api/dongs/<slug>/summary
    path("dongs/<str:slug>/summary", DongSummaryView.as_view(), name="dong-summary"),
    # GET /api/dongs/<slug>/detail
    path("dongs/<str:slug>/detail", DongDetailView.as_view(), name="dong-detail"),
    # GET /api/dongs/<slug>/explore — 자취 시세 BI 대시보드 (Phase 4.8)
    path("dongs/<str:slug>/explore", DongExploreView.as_view(), name="dong-explore"),
    # GET /api/dongs/<slug>/population — 행정동 인구 시계열 (대시보드 Phase 2)
    path("dongs/<str:slug>/population", DongPopulationView.as_view(), name="dong-population"),
    # GET /api/dongs/<slug>/gu-metrics — 소속 구 지표 + 서울 평균 (대시보드 Phase 2)
    path("dongs/<str:slug>/gu-metrics", DongGuMetricsView.as_view(), name="dong-gu-metrics"),
    # GET /api/dongs/<slug>/gu-metrics/series — 구별 지표 시계열 (대시보드 Phase 4 추이)
    path(
        "dongs/<str:slug>/gu-metrics/series",
        DongGuMetricsSeriesView.as_view(),
        name="dong-gu-metrics-series",
    ),
    # GET /api/compare?slugs=A,B,C
    path("compare", CompareView.as_view(), name="compare"),
    # POST /api/score/point  (Phase 2a — 임의 지점 커널 점수, SPEC 11)
    path("score/point", KernelScoreView.as_view(), name="score-point"),
]
