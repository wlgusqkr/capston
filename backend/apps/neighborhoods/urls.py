"""
neighborhoods 앱 URL.

마운트 위치: config/urls.py 의 path("api/", include("apps.neighborhoods.urls"))
즉, 여기서는 'dongs/...' 형태로 작성.
"""

from django.urls import path

from .views import DongScoresView

app_name = "neighborhoods"

urlpatterns = [
    # GET /api/dongs/scores
    path("dongs/scores", DongScoresView.as_view(), name="dong-scores"),
]
