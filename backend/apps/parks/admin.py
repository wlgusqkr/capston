"""parks 앱 admin."""

from django.contrib import admin

from .models import Park, ParkDong, ParkLdong


@admin.register(Park)
class ParkAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "category", "area_m2")
    list_filter = ("category",)
    search_fields = ("id", "name")
    readonly_fields = ("boundary", "location")


@admin.register(ParkDong)
class ParkDongAdmin(admin.ModelAdmin):
    list_display = ("park", "dong")
    search_fields = ("park__name", "dong__name", "dong__gu")
    list_select_related = ("park", "dong")
    list_per_page = 100


@admin.register(ParkLdong)
class ParkLdongAdmin(admin.ModelAdmin):
    list_display = ("park", "ldong")
    search_fields = ("park__name", "ldong__name")
    list_select_related = ("park", "ldong")
    list_per_page = 100
