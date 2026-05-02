"""
프로젝트 URL 라우팅.

API는 /api/ 하위. 도메인별 URL은 각 앱의 urls.py에 위임.
"""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    # API
    path("api/", include("apps.neighborhoods.urls")),
    # allauth는 9단계(카카오 소셜 로그인) 활성화 시 다음 라인 사용:
    # path("api/auth/", include("allauth.urls")),
]
