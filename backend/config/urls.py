"""
프로젝트 URL 라우팅.

API는 /api/ 하위. 도메인별 URL은 각 앱의 urls.py에 위임.

9단계: 사용자 명시로 allauth/카카오 비활성화. 표준 Django username/password
세션 인증만 사용. /api/auth/{register,login,logout} 및 /api/users/me 등은
apps.users.urls에서 한꺼번에 제공한다.
"""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    # API
    path("api/", include("apps.neighborhoods.urls")),
    path("api/", include("apps.preference.urls")),
    path("api/", include("apps.users.urls")),
]
