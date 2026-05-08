"""
공원 (Park) 모델 — Phase 1 RDS 통합용.

RDS(`dp_db`) 측 park 1,886행 + park_adong / park_ldong 다대다 관계 테이블을
1:1로 매핑한다. 기존 amenities.Amenity의 'park' 카테고리는 그대로 두고,
이쪽은 raw 적재용.

RDS Park.boundary 타입(POLYGON vs MULTIPOLYGON)은 Phase 2 ETL에서 검증 — 일단
MultiPolygonField로 정의하고 단일 POLYGON은 ST_Multi()로 캐스팅하여 적재 (계획서 5).
"""

from django.contrib.gis.db import models as gis_models
from django.contrib.postgres.indexes import GistIndex
from django.db import models


class Park(models.Model):
    """공원. RDS `park` 1,886행."""

    id = models.CharField(
        max_length=64, primary_key=True, help_text="공원 ID (RDS park.id, varchar)"
    )
    name = models.CharField(max_length=200, help_text="공원 이름")
    category = models.CharField(max_length=50, blank=True, help_text="공원 분류")
    area_m2 = models.DecimalField(
        max_digits=20, decimal_places=4, null=True, blank=True, help_text="면적 (m^2)"
    )
    boundary = gis_models.MultiPolygonField(
        srid=4326, null=True, blank=True, help_text="공원 경계 (WGS84)"
    )
    location = gis_models.PointField(
        srid=4326, null=True, blank=True, help_text="중심점 (WGS84)"
    )

    class Meta:
        db_table = "park"
        verbose_name = "공원"
        verbose_name_plural = "공원"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["category"]),
            GistIndex(fields=["boundary"], name="park_boundary_gist_idx"),
            GistIndex(fields=["location"], name="park_location_gist_idx"),
        ]

    def __str__(self) -> str:
        return self.name


class ParkDong(models.Model):
    """공원-행정동 다대다 매핑. RDS `park_adong` 2,353행."""

    park = models.ForeignKey(
        Park, on_delete=models.CASCADE, related_name="park_dongs", db_column="park_id"
    )
    dong = models.ForeignKey(
        "neighborhoods.Dong",
        on_delete=models.CASCADE,
        related_name="park_dongs",
        db_column="adong_code",
        to_field="code",
    )

    class Meta:
        db_table = "park_adong"
        verbose_name = "공원-행정동 매핑"
        verbose_name_plural = "공원-행정동 매핑"
        unique_together = [("park", "dong")]
        indexes = [
            models.Index(fields=["park"]),
            models.Index(fields=["dong"]),
        ]

    def __str__(self) -> str:
        return f"{self.park_id} ↔ {self.dong_id}"


class ParkLdong(models.Model):
    """공원-법정동 다대다 매핑. RDS `park_ldong` 2,316행."""

    park = models.ForeignKey(
        Park, on_delete=models.CASCADE, related_name="park_ldongs", db_column="park_id"
    )
    ldong = models.ForeignKey(
        "regions.Ldong",
        on_delete=models.CASCADE,
        related_name="park_ldongs",
        db_column="ldong_code",
    )

    class Meta:
        db_table = "park_ldong"
        verbose_name = "공원-법정동 매핑"
        verbose_name_plural = "공원-법정동 매핑"
        unique_together = [("park", "ldong")]
        indexes = [
            models.Index(fields=["park"]),
            models.Index(fields=["ldong"]),
        ]

    def __str__(self) -> str:
        return f"{self.park_id} ↔ {self.ldong_id}"
