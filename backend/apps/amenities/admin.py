"""
Amenity admin.

PointField는 GISModelAdmin 위젯이 무겁기 때문에, list 화면은 평범한 ModelAdmin으로
유지하고 geom은 readonly text로 표시한다.
"""

from django.contrib import admin

from .models import Amenity


@admin.register(Amenity)
class AmenityAdmin(admin.ModelAdmin):
    list_display = ("category", "name", "dong", "source", "external_id", "updated_at")
    list_filter = ("category", "source", "dong__gu")
    search_fields = ("name", "external_id", "dong__name", "dong__gu")
    readonly_fields = ("geom", "created_at", "updated_at")
    list_select_related = ("dong",)
    list_per_page = 50
    fieldsets = (
        ("기본", {"fields": ("dong", "category", "name")}),
        ("출처", {"fields": ("source", "external_id")}),
        ("위치 (read-only)", {"fields": ("geom",)}),
        ("타임스탬프", {"fields": ("created_at", "updated_at")}),
    )
