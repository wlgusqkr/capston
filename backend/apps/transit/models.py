"""
Transit 모델 — SPEC 섹션 10.

- SubwayStation : 서울시 지하철역 마스터 (~284개)
- BusStop       : 서울시 버스 정류장 (~12,000개), 행정동에 사전 매핑
- NearestSubway : 행정동별 가까운 지하철역 top-3 사전 계산 캐시 (SPEC 섹션 6.3 교통 카드)

데이터 출처: data.seoul.go.kr (지하철역 위치 / 버스 정류장 위치).
"""

from django.contrib.gis.db import models as gis_models
from django.contrib.postgres.indexes import GistIndex
from django.db import models


class SubwayStation(models.Model):
    """지하철역 (역명 + 노선 단위로 unique)."""

    name = models.CharField(max_length=50, help_text="역명 (예: '충무로')")
    line = models.CharField(max_length=20, help_text="노선 (예: '3호선')")
    external_id = models.CharField(
        max_length=32,
        null=True,
        blank=True,
        help_text="서울 OpenAPI 역 ID (있으면)",
    )
    geom = gis_models.PointField(srid=4326, help_text="역 위치 (WGS84). GiST 인덱스.")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "subway_station"
        verbose_name = "지하철역"
        verbose_name_plural = "지하철역"
        unique_together = [("name", "line")]
        indexes = [
            GistIndex(fields=["geom"], name="subway_geom_gist_idx"),
        ]
        ordering = ["line", "name"]

    def __str__(self) -> str:
        return f"{self.name}({self.line})"


class BusStop(models.Model):
    """버스 정류장."""

    dong = models.ForeignKey(
        "neighborhoods.Dong",
        on_delete=models.PROTECT,
        related_name="bus_stops",
        help_text="사전 매핑된 행정동",
    )
    name = models.CharField(max_length=100, help_text="정류장 명칭")
    arsId = models.CharField(
        max_length=10,
        blank=True,
        help_text="정류소번호 (서울 BIS arsId)",
    )
    geom = gis_models.PointField(srid=4326, help_text="정류장 위치 (WGS84). GiST 인덱스.")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "bus_stop"
        verbose_name = "버스 정류장"
        verbose_name_plural = "버스 정류장"
        indexes = [
            models.Index(fields=["dong"]),
            GistIndex(fields=["geom"], name="busstop_geom_gist_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.arsId})" if self.arsId else self.name


class NearestSubway(models.Model):
    """행정동별 가까운 지하철역 사전 계산 캐시.

    rank 1~3, 동별 정확히 3행. 동 패널/상세에서 매번 PostGIS distance 계산하지 않도록.
    """

    dong = models.ForeignKey(
        "neighborhoods.Dong",
        on_delete=models.CASCADE,
        related_name="nearest_subways",
    )
    station = models.ForeignKey(
        SubwayStation,
        on_delete=models.CASCADE,
        related_name="dong_rankings",
    )
    rank = models.PositiveSmallIntegerField(help_text="1~3")
    distance_m = models.FloatField(help_text="동 centroid → 역 직선 거리 (m)")

    class Meta:
        db_table = "nearest_subway"
        verbose_name = "가까운 지하철역 (사전계산)"
        verbose_name_plural = "가까운 지하철역 (사전계산)"
        unique_together = [("dong", "rank")]
        ordering = ["dong", "rank"]

    def __str__(self) -> str:
        return f"{self.dong} #{self.rank} {self.station} ({self.distance_m:.0f}m)"
