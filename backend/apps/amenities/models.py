"""
Amenity 모델 — SPEC 섹션 10.

편의시설(편의점/카페/병원/공원 등) 위치를 행정동(Dong)에 사전 매핑하여 저장한다.
매번 spatial join을 수행하지 않고 적재 시점에 dong FK를 박아 두는 것이 원칙이다.

데이터 출처(SPEC 14):
- 'sba'        : 소상공인진흥공단 상가(상권)정보 (data.go.kr 15012005)
- 'seoul_park' : 서울시 도시공원 정보 (data.seoul.go.kr)
"""

from django.contrib.gis.db import models as gis_models
from django.contrib.postgres.indexes import GistIndex
from django.db import models


# ---------------------------------------------------------------------------
# Category choices (영문 value + 한국어 라벨)
# 소상공인 진흥공단 카테고리 + 공원(park) 추가.
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
    """편의시설 한 건."""

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
            # PostGIS GiST spatial index on geom
            GistIndex(fields=["geom"], name="amenity_geom_gist_idx"),
        ]

    def __str__(self) -> str:
        return f"[{self.category}] {self.name}"
