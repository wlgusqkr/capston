from django.contrib.gis.admin import GISModelAdmin
from django.contrib import admin

from .models import Dong


@admin.register(Dong)
class DongAdmin(GISModelAdmin):
    list_display = ("gu", "name", "slug", "code", "score_rent", "score_amenity", "score_transit")
    list_filter = ("gu",)
    search_fields = ("name", "gu", "slug", "code")
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        ("식별자", {"fields": ("slug", "code", "name", "gu")}),
        ("공간 데이터", {"fields": ("geom", "centroid", "area_km2")}),
        (
            "점수 (사전 계산)",
            {"fields": ("score_rent", "score_amenity", "score_transit")},
        ),
        ("타임스탬프", {"fields": ("created_at", "updated_at")}),
    )
