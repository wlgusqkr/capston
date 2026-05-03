"""Transit admin (지하철역 / 버스 정류장 / 가까운 역 캐시)."""

from django.contrib import admin

from .models import BusStop, NearestSubway, SubwayStation


@admin.register(SubwayStation)
class SubwayStationAdmin(admin.ModelAdmin):
    list_display = ("name", "line", "external_id", "updated_at")
    list_filter = ("line",)
    search_fields = ("name", "line", "external_id")
    readonly_fields = ("geom", "created_at", "updated_at")
    list_per_page = 50


@admin.register(BusStop)
class BusStopAdmin(admin.ModelAdmin):
    list_display = ("name", "arsId", "dong", "updated_at")
    list_filter = ("dong__gu",)
    search_fields = ("name", "arsId", "dong__name", "dong__gu")
    readonly_fields = ("geom", "created_at", "updated_at")
    list_select_related = ("dong",)
    list_per_page = 50


@admin.register(NearestSubway)
class NearestSubwayAdmin(admin.ModelAdmin):
    list_display = ("dong", "rank", "station", "distance_m")
    list_filter = ("rank", "dong__gu")
    search_fields = ("dong__name", "dong__gu", "station__name")
    list_select_related = ("dong", "station")
    list_per_page = 100
