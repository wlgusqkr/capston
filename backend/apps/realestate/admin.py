"""RentDeal / JibunGeocodeCache admin."""

from django.contrib import admin

from .models import JibunGeocodeCache, RentDeal


@admin.register(RentDeal)
class RentDealAdmin(admin.ModelAdmin):
    list_display = (
        "deal_date",
        "deal_type",
        "dong",
        "area_m2",
        "deposit",
        "monthly_rent",
        "jibun",
    )
    list_filter = ("deal_type", "dong__gu")
    search_fields = ("jibun", "dong__name", "dong__gu", "external_hash")
    readonly_fields = ("geom", "external_hash", "created_at")
    list_select_related = ("dong",)
    list_per_page = 50
    date_hierarchy = "deal_date"
    fieldsets = (
        ("기본", {"fields": ("dong", "deal_type", "deal_date")}),
        ("계약", {"fields": ("area_m2", "deposit", "monthly_rent", "floor", "build_year")}),
        ("위치", {"fields": ("jibun", "geom")}),
        ("적재 메타", {"fields": ("external_hash", "created_at")}),
    )


@admin.register(JibunGeocodeCache)
class JibunGeocodeCacheAdmin(admin.ModelAdmin):
    list_display = ("jibun_text", "created_at")
    search_fields = ("jibun_text",)
    readonly_fields = ("geom", "created_at")
    list_per_page = 100
