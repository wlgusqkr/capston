"""
Amenity admin.

PointField는 GISModelAdmin 위젯이 무겁기 때문에, list 화면은 평범한 ModelAdmin으로
유지하고 geom은 readonly text로 표시한다.
"""

from django.contrib import admin

from .models import Amenity, BusinessCategory, KsciCategory, Store


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


@admin.register(BusinessCategory)
class BusinessCategoryAdmin(admin.ModelAdmin):
    list_display = (
        "subcategory_code",
        "subcategory_name",
        "middle_category_name",
        "main_category_name",
    )
    search_fields = (
        "subcategory_code",
        "subcategory_name",
        "middle_category_name",
        "main_category_name",
    )
    list_per_page = 100


@admin.register(KsciCategory)
class KsciCategoryAdmin(admin.ModelAdmin):
    list_display = (
        "ksci_code",
        "subcategory_name",
        "middle_category_name",
        "main_category_name",
    )
    search_fields = ("ksci_code", "subcategory_name", "main_category_name")
    list_per_page = 100


@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "branch_name", "category", "dong", "ldong")
    list_filter = ("category__main_category_name",)
    search_fields = ("id", "name", "branch_name", "address")
    list_select_related = ("category", "ksci", "dong", "ldong")
    readonly_fields = ("location",)
    list_per_page = 50
