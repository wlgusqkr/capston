"""
realestate 앱 URL.

마운트 위치: config/urls.py 의 path("api/", include("apps.realestate.urls"))
즉, 여기서는 'transactions/...' 형태로 작성.
"""

from django.urls import path

from .views import TransactionsBboxView

app_name = "realestate"

urlpatterns = [
    # GET /api/transactions/bbox?bbox=lng1,lat1,lng2,lat2&...
    path("transactions/bbox", TransactionsBboxView.as_view(), name="transactions-bbox"),
]
