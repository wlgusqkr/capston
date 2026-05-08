"""
행정 단위 마스터 + 인접 + 인구 모델 (Phase 1 — RDS 통합용).

RDS(`dp_db`) 측 24 테이블 중 행정 단위/인접/인구에 해당하는 8개를 1:1로 매핑한다.
- Seoul / Gu / Ldong         : 마스터 (boundary + location)
- GuAdjacency / LdongAdjacency / AdongAdjacency : 양방향 인접 row 그대로 보존
- LdongPopulation / AdongPopulation : 일자별 인구·세대 수 시계열

기존 `apps.neighborhoods.Dong`(=행정동)은 그대로 유지한다. AdongAdjacency /
AdongPopulation은 Dong을 FK로 잡는다 (ETL이 RDS adong_code → Dong.code lookup
으로 채움).

DB 정책 (계획서 1·2):
- 모든 boundary는 MultiPolygonField(srid=4326)
- 모든 location/centroid는 PointField(srid=4326)
- PK는 RDS 비즈니스 키를 그대로 사용 (code 컬럼)
- db_table은 RDS 테이블명과 동일하게 맞춰 ETL을 INSERT…SELECT로 단순화
- Adjacency는 양방향 row 둘 다 보존 (RDS 형상 그대로) — unique_together만 적용
"""

from django.contrib.gis.db import models as gis_models
from django.contrib.postgres.indexes import GistIndex
from django.db import models


# ---------------------------------------------------------------------------
# 1. Seoul / Gu / Ldong — 마스터 (boundary + location)
# ---------------------------------------------------------------------------


class Seoul(models.Model):
    """서울시 1행. RDS `seoul` 테이블."""

    code = models.CharField(max_length=10, primary_key=True, help_text="서울시 코드 (RDS seoul.code)")
    name = models.CharField(max_length=50, help_text="이름 (예: '서울특별시')")
    area_m2 = models.DecimalField(
        max_digits=20, decimal_places=4, null=True, blank=True, help_text="면적 (m^2)"
    )
    boundary = gis_models.MultiPolygonField(
        srid=4326, null=True, blank=True, help_text="서울시 경계 (WGS84)"
    )
    location = gis_models.PointField(
        srid=4326, null=True, blank=True, help_text="중심점 (WGS84)"
    )

    class Meta:
        db_table = "seoul"
        verbose_name = "서울"
        verbose_name_plural = "서울"

    def __str__(self) -> str:
        return self.name


class Gu(models.Model):
    """자치구 25개. RDS `gu` 테이블."""

    gu_code = models.CharField(
        max_length=10, primary_key=True, help_text="자치구 코드 (RDS gu.gu_code)"
    )
    name = models.CharField(max_length=50, help_text="구 이름 (예: '중구')")
    area_m2 = models.DecimalField(
        max_digits=20, decimal_places=4, null=True, blank=True, help_text="면적 (m^2)"
    )
    boundary = gis_models.MultiPolygonField(
        srid=4326, null=True, blank=True, help_text="구 경계 (WGS84)"
    )
    location = gis_models.PointField(
        srid=4326, null=True, blank=True, help_text="중심점 (WGS84)"
    )

    class Meta:
        db_table = "gu"
        verbose_name = "자치구"
        verbose_name_plural = "자치구"
        ordering = ["gu_code"]
        indexes = [
            GistIndex(fields=["boundary"], name="gu_boundary_gist_idx"),
        ]

    def __str__(self) -> str:
        return self.name


class Ldong(models.Model):
    """법정동 467개. RDS `ldong` 테이블."""

    ldong_code = models.CharField(
        max_length=10, primary_key=True, help_text="법정동 코드 (RDS ldong.ldong_code)"
    )
    name = models.CharField(max_length=50, help_text="법정동 이름")
    gu = models.ForeignKey(
        Gu,
        on_delete=models.PROTECT,
        related_name="ldongs",
        db_column="gu_code",
        help_text="속한 자치구 (RDS ldong.gu_code)",
    )
    area_m2 = models.DecimalField(
        max_digits=20, decimal_places=4, null=True, blank=True, help_text="면적 (m^2)"
    )
    boundary = gis_models.MultiPolygonField(
        srid=4326, null=True, blank=True, help_text="법정동 경계 (WGS84)"
    )
    location = gis_models.PointField(
        srid=4326, null=True, blank=True, help_text="중심점 (WGS84)"
    )

    class Meta:
        db_table = "ldong"
        verbose_name = "법정동"
        verbose_name_plural = "법정동"
        ordering = ["ldong_code"]
        indexes = [
            models.Index(fields=["gu"]),
            GistIndex(fields=["boundary"], name="ldong_boundary_gist_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.gu.name} {self.name}"


# ---------------------------------------------------------------------------
# 2. Adjacency — Gu / Ldong / Adong (양방향 row 그대로 보존)
# ---------------------------------------------------------------------------


class GuAdjacency(models.Model):
    """자치구 인접. RDS `adjacent_gu` 108행 (양방향 보존)."""

    gu_a = models.ForeignKey(
        Gu, on_delete=models.CASCADE, related_name="adjacency_a", db_column="gu_code_a"
    )
    gu_b = models.ForeignKey(
        Gu, on_delete=models.CASCADE, related_name="adjacency_b", db_column="gu_code_b"
    )

    class Meta:
        db_table = "adjacent_gu"
        verbose_name = "자치구 인접"
        verbose_name_plural = "자치구 인접"
        unique_together = [("gu_a", "gu_b")]
        indexes = [
            models.Index(fields=["gu_a"]),
            models.Index(fields=["gu_b"]),
        ]
        # a == b 방지는 ETL/체크 제약 단계에서 검증.

    def __str__(self) -> str:
        return f"{self.gu_a_id} ↔ {self.gu_b_id}"


class LdongAdjacency(models.Model):
    """법정동 인접. RDS `adjacent_ldong` 1,948행 (양방향 보존)."""

    ldong_a = models.ForeignKey(
        Ldong, on_delete=models.CASCADE, related_name="adjacency_a", db_column="ldong_code_a"
    )
    ldong_b = models.ForeignKey(
        Ldong, on_delete=models.CASCADE, related_name="adjacency_b", db_column="ldong_code_b"
    )

    class Meta:
        db_table = "adjacent_ldong"
        verbose_name = "법정동 인접"
        verbose_name_plural = "법정동 인접"
        unique_together = [("ldong_a", "ldong_b")]
        indexes = [
            models.Index(fields=["ldong_a"]),
            models.Index(fields=["ldong_b"]),
        ]

    def __str__(self) -> str:
        return f"{self.ldong_a_id} ↔ {self.ldong_b_id}"


class AdongAdjacency(models.Model):
    """행정동 인접. RDS `adjacent_adong` 2,444행. Dong FK는 ETL이 adong_code → Dong.code 매핑."""

    dong_a = models.ForeignKey(
        "neighborhoods.Dong",
        on_delete=models.CASCADE,
        related_name="adjacency_a",
        db_column="adong_code_a",
        to_field="code",
    )
    dong_b = models.ForeignKey(
        "neighborhoods.Dong",
        on_delete=models.CASCADE,
        related_name="adjacency_b",
        db_column="adong_code_b",
        to_field="code",
    )

    class Meta:
        db_table = "adjacent_adong"
        verbose_name = "행정동 인접"
        verbose_name_plural = "행정동 인접"
        unique_together = [("dong_a", "dong_b")]
        indexes = [
            models.Index(fields=["dong_a"]),
            models.Index(fields=["dong_b"]),
        ]

    def __str__(self) -> str:
        return f"{self.dong_a_id} ↔ {self.dong_b_id}"


# ---------------------------------------------------------------------------
# 3. Population — 일자별 인구·세대 시계열 (Ldong / Adong)
# ---------------------------------------------------------------------------


class LdongPopulation(models.Model):
    """법정동 인구. RDS `ldong_population` 20,548행. PK = (ldong, date)."""

    ldong = models.ForeignKey(
        Ldong,
        on_delete=models.CASCADE,
        related_name="populations",
        db_column="ldong_code",
    )
    date = models.DateField(help_text="기준일")
    total_population = models.IntegerField(null=True, blank=True, help_text="총 인구")
    household_count = models.IntegerField(null=True, blank=True, help_text="세대 수")
    male_population = models.IntegerField(null=True, blank=True, help_text="남자 인구")
    female_population = models.IntegerField(null=True, blank=True, help_text="여자 인구")

    class Meta:
        db_table = "ldong_population"
        verbose_name = "법정동 인구"
        verbose_name_plural = "법정동 인구"
        unique_together = [("ldong", "date")]
        indexes = [
            models.Index(fields=["ldong", "-date"]),
            models.Index(fields=["date"]),
        ]
        ordering = ["-date"]

    def __str__(self) -> str:
        return f"{self.ldong_id} {self.date} pop={self.total_population}"


class AdongPopulation(models.Model):
    """행정동 인구. RDS `adong_population` 18,744행. PK = (dong, date)."""

    dong = models.ForeignKey(
        "neighborhoods.Dong",
        on_delete=models.CASCADE,
        related_name="populations",
        db_column="adong_code",
        to_field="code",
    )
    date = models.DateField(help_text="기준일")
    total_population = models.IntegerField(null=True, blank=True, help_text="총 인구")
    household_count = models.IntegerField(null=True, blank=True, help_text="세대 수")
    male_population = models.IntegerField(null=True, blank=True, help_text="남자 인구")
    female_population = models.IntegerField(null=True, blank=True, help_text="여자 인구")

    class Meta:
        db_table = "adong_population"
        verbose_name = "행정동 인구"
        verbose_name_plural = "행정동 인구"
        unique_together = [("dong", "date")]
        indexes = [
            models.Index(fields=["dong", "-date"]),
            models.Index(fields=["date"]),
        ]
        ordering = ["-date"]

    def __str__(self) -> str:
        return f"{self.dong_id} {self.date} pop={self.total_population}"
