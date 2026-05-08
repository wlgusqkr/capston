"""
Amenity + Store 모델 — SPEC 섹션 10 + RDS 통합 확장.

기존 `Amenity`는 화면용 derived 테이블이라 그대로 유지.
Phase 1에서 RDS의 raw 상가 테이블 3종을 1:1로 추가:
- BusinessCategory : RDS `business_category` 247행 (소상공인 카테고리 마스터)
- KsciCategory     : RDS `ksci_category` 1,196행 (한국표준산업분류 마스터)
- Store            : RDS `store` 534,977행 (상가 raw)

기존 11개 카테고리 화이트리스트는 ETL 후 `Store.category_id IN (...)` 쿼리로 표현.

데이터 출처(SPEC 14):
- 'sba'        : 소상공인진흥공단 상가(상권)정보 (data.go.kr 15012005)
- 'seoul_park' : 서울시 도시공원 정보 (data.seoul.go.kr)
"""

from django.contrib.gis.db import models as gis_models
from django.contrib.postgres.indexes import GistIndex
from django.db import models


# ---------------------------------------------------------------------------
# 기존 Amenity (화면용 derived) — 손대지 않음
# ---------------------------------------------------------------------------
CATEGORY_CHOICES = [
    ("convenience", "편의점"),
    ("mart", "마트"),
    ("restaurant", "음식점"),
    ("cafe", "카페"),
    ("studycafe", "스터디카페"),
    ("hospital", "병원"),
    ("pharmacy", "약국"),
    ("laundry", "세탁소"),
    ("oliveyoung", "올리브영"),
    ("park", "공원"),
    ("etc", "기타"),
]

SOURCE_CHOICES = [
    ("sba", "소상공인진흥공단"),
    ("seoul_park", "서울시 도시공원"),
]


class Amenity(models.Model):
    """편의시설 한 건 (화면용 derived). Phase 1 손대지 않음."""

    dong = models.ForeignKey(
        "neighborhoods.Dong",
        on_delete=models.PROTECT,
        related_name="amenities",
        help_text="사전 매핑된 행정동 (적재 시 spatial join으로 결정)",
    )
    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        help_text="시설 카테고리 (편의점/카페/공원 등)",
    )
    name = models.CharField(max_length=200, help_text="시설 명칭 (예: 'GS25 충무로점')")
    geom = gis_models.PointField(
        srid=4326,
        help_text="시설 위치 (WGS84). GiST 인덱스.",
    )
    external_id = models.CharField(
        max_length=64,
        unique=True,
        null=True,
        blank=True,
        help_text="원천 ID. 소상공인 API의 bizesId 또는 공원 자체 ID. 공원은 null 허용.",
    )
    source = models.CharField(
        max_length=20,
        choices=SOURCE_CHOICES,
        help_text="데이터 출처. 'sba' 또는 'seoul_park'.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "amenity"
        verbose_name = "생활시설"
        verbose_name_plural = "생활시설"
        indexes = [
            models.Index(fields=["dong", "category"]),
            models.Index(fields=["category"]),
            GistIndex(fields=["geom"], name="amenity_geom_gist_idx"),
        ]

    def __str__(self) -> str:
        return f"[{self.category}] {self.name}"


# ---------------------------------------------------------------------------
# Phase 1 신규: RDS raw 테이블 1:1 매핑
# ---------------------------------------------------------------------------


class BusinessCategory(models.Model):
    """소상공인 카테고리. RDS `business_category` 247행."""

    subcategory_code = models.CharField(
        max_length=20, primary_key=True, help_text="소분류 코드 (RDS PK)"
    )
    subcategory_name = models.CharField(max_length=100, blank=True, help_text="소분류명")
    middle_category_code = models.CharField(max_length=20, blank=True, help_text="중분류 코드")
    middle_category_name = models.CharField(max_length=100, blank=True, help_text="중분류명")
    main_category_code = models.CharField(max_length=20, blank=True, help_text="대분류 코드")
    main_category_name = models.CharField(max_length=100, blank=True, help_text="대분류명")

    class Meta:
        db_table = "business_category"
        verbose_name = "소상공인 카테고리"
        verbose_name_plural = "소상공인 카테고리"
        ordering = ["subcategory_code"]
        indexes = [
            models.Index(fields=["middle_category_code"]),
            models.Index(fields=["main_category_code"]),
        ]

    def __str__(self) -> str:
        return f"[{self.subcategory_code}] {self.subcategory_name}"


class KsciCategory(models.Model):
    """한국표준산업분류. RDS `ksci_category` 1,196행."""

    ksci_code = models.CharField(
        max_length=20, primary_key=True, help_text="KSCI 코드 (RDS PK)"
    )
    subcategory_name = models.CharField(max_length=200, blank=True, help_text="소분류명")
    class_name = models.CharField(max_length=200, blank=True, help_text="세분류명")
    subclass_name = models.CharField(max_length=200, blank=True, help_text="세세분류명")
    middle_category_name = models.CharField(max_length=200, blank=True, help_text="중분류명")
    main_category_name = models.CharField(max_length=200, blank=True, help_text="대분류명")

    class Meta:
        db_table = "ksci_category"
        verbose_name = "한국표준산업분류"
        verbose_name_plural = "한국표준산업분류"
        ordering = ["ksci_code"]

    def __str__(self) -> str:
        return f"[{self.ksci_code}] {self.subcategory_name}"


class Store(models.Model):
    """상가. RDS `store` 534,977행."""

    id = models.CharField(
        max_length=64, primary_key=True, help_text="상가 ID (RDS store.id)"
    )
    name = models.CharField(max_length=300, blank=True, help_text="상호명")
    branch_name = models.CharField(max_length=200, blank=True, help_text="지점명")

    category = models.ForeignKey(
        BusinessCategory,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="stores",
        db_column="category_code",
        help_text="소상공인 소분류 (RDS store.category_code → BusinessCategory.subcategory_code)",
    )
    ksci = models.ForeignKey(
        KsciCategory,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="stores",
        db_column="ksci_code",
        help_text="한국표준산업분류 (RDS ksci_code)",
    )

    dong = models.ForeignKey(
        "neighborhoods.Dong",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="stores",
        db_column="adong_code",
        to_field="code",
        help_text="행정동 (RDS adong_code → Dong.code)",
    )
    ldong = models.ForeignKey(
        "regions.Ldong",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="stores",
        db_column="ldong_code",
        help_text="법정동 (RDS ldong_code)",
    )

    address = models.CharField(max_length=500, blank=True, help_text="주소")
    location = gis_models.PointField(
        srid=4326, null=True, blank=True, help_text="상가 위치 (WGS84)"
    )

    class Meta:
        db_table = "store"
        verbose_name = "상가"
        verbose_name_plural = "상가"
        indexes = [
            models.Index(fields=["dong"]),
            models.Index(fields=["ldong"]),
            models.Index(fields=["category"]),
            models.Index(fields=["ksci"]),
            GistIndex(fields=["location"], name="store_location_gist_idx"),
        ]

    def __str__(self) -> str:
        base = self.name or self.id
        return f"{base} ({self.branch_name})" if self.branch_name else base
