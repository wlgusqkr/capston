"""
Transit 모델 — SPEC 섹션 10 + RDS 통합 확장.

- SubwayStation : 서울시 지하철역 마스터 (~284개). RDS subway_station과 1:1.
- BusStop       : 서울시 버스 정류장 (~12,000개), 행정동에 사전 매핑.
- NearestSubway : 행정동별 가까운 지하철역 top-3 사전 계산 캐시.
- SubwayCongestion : 지하철 혼잡도 (RDS subway_congestion 65,561행).
- BusCongestion    : 버스 혼잡도 (RDS bus_congestion ~8M행).

Phase 1 (계획서 3.3):
- SubwayStation: external_id를 unique로 변경 (RDS id), dong/ldong nullable FK 추가
- BusStop: external_id 추가, ldong nullable FK 추가, dong을 nullable로 완화 (95% RDS adong_code 매핑, 5%는 좌표 보강)
- SubwayCongestion / BusCongestion 신규

데이터 출처: data.seoul.go.kr / 팀원 RDS dp_db.
"""

from django.contrib.gis.db import models as gis_models
from django.contrib.postgres.indexes import BrinIndex, GistIndex
from django.db import models


# ---------------------------------------------------------------------------
# 마스터
# ---------------------------------------------------------------------------


class SubwayStation(models.Model):
    """지하철역 (RDS subway_station 마스터)."""

    name = models.CharField(max_length=50, help_text="역명 (예: '충무로')")
    line = models.CharField(max_length=20, help_text="노선 (예: '3호선')")
    external_id = models.CharField(
        max_length=32,
        null=True,
        blank=True,
        unique=True,
        help_text="RDS subway_station.id (Phase 1: unique 제약).",
    )
    dong = models.ForeignKey(
        "neighborhoods.Dong",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subway_stations",
        db_column="adong_code",
        to_field="code",
        help_text="행정동 (Phase 1 신규, RDS adong_code).",
    )
    ldong = models.ForeignKey(
        "regions.Ldong",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subway_stations",
        db_column="ldong_code",
        help_text="법정동 (Phase 1 신규, RDS ldong_code).",
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
            models.Index(fields=["dong"]),
            models.Index(fields=["ldong"]),
        ]
        ordering = ["line", "name"]

    def __str__(self) -> str:
        return f"{self.name}({self.line})"


class BusStop(models.Model):
    """버스 정류장."""

    external_id = models.CharField(
        max_length=32,
        null=True,
        blank=True,
        unique=True,
        help_text="RDS bus_stop.id (Phase 1 신규). RDS PK 1:1.",
    )
    dong = models.ForeignKey(
        "neighborhoods.Dong",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bus_stops",
        db_column="adong_code",
        to_field="code",
        help_text="행정동 (Phase 1: nullable로 완화. RDS 95% 매핑, 5%는 좌표 보강).",
    )
    ldong = models.ForeignKey(
        "regions.Ldong",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bus_stops",
        db_column="ldong_code",
        help_text="법정동 (Phase 1 신규, RDS ldong_code).",
    )
    name = models.CharField(max_length=100, help_text="정류장 명칭")
    arsId = models.CharField(
        max_length=10,
        blank=True,
        help_text="정류소번호 (서울 BIS arsId). RDS stop_number 1:1.",
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
            models.Index(fields=["ldong"]),
            models.Index(fields=["arsId"]),
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


# ---------------------------------------------------------------------------
# 혼잡도 (Phase 1 신규)
# ---------------------------------------------------------------------------


class SubwayCongestion(models.Model):
    """지하철 혼잡도. RDS `subway_congestion` 65,561행.

    PK = (station, day_type, direction, express_yn, time).
    day_type/direction/express_yn은 한글값 그대로 보존:
    - day_type: 평일 / 토요일 / 일요일
    - direction: 상선 / 하선
    - express_yn: 일반 / 급행
    """

    station = models.ForeignKey(
        SubwayStation,
        on_delete=models.CASCADE,
        related_name="congestions",
        db_column="station_id",
    )
    day_type = models.CharField(max_length=10, help_text="평일/토요일/일요일")
    direction = models.CharField(max_length=10, help_text="상선/하선")
    express_yn = models.CharField(max_length=10, help_text="일반/급행")
    time = models.TimeField(help_text="시간대")
    congestion = models.DecimalField(
        max_digits=10, decimal_places=4, help_text="혼잡도 (numeric NOT NULL)"
    )

    class Meta:
        db_table = "subway_congestion"
        verbose_name = "지하철 혼잡도"
        verbose_name_plural = "지하철 혼잡도"
        unique_together = [
            ("station", "day_type", "direction", "express_yn", "time"),
        ]
        indexes = [
            models.Index(fields=["station", "day_type"]),
            models.Index(fields=["day_type", "time"]),
        ]

    def __str__(self) -> str:
        return (
            f"{self.station_id} {self.day_type}/{self.direction}/{self.express_yn} "
            f"{self.time} = {self.congestion}"
        )


class BusCongestion(models.Model):
    """버스 혼잡도. RDS `bus_congestion` ~8M행.

    PK = (bus_stop, date, time). 시간순 적재 + BRIN 인덱스 권장.
    """

    bus_stop = models.ForeignKey(
        BusStop,
        on_delete=models.CASCADE,
        related_name="congestions",
        db_column="bus_stop_id",
    )
    date = models.DateField(help_text="기준일")
    time = models.TimeField(help_text="시간대")
    congestion = models.DecimalField(
        max_digits=10, decimal_places=4, null=True, blank=True, help_text="혼잡도"
    )

    class Meta:
        db_table = "bus_congestion"
        verbose_name = "버스 혼잡도"
        verbose_name_plural = "버스 혼잡도"
        unique_together = [("bus_stop", "date", "time")]
        indexes = [
            # 8M 행 시계열 → BRIN으로 date 범위 스캔 효율화
            BrinIndex(fields=["date"], name="buscongestion_date_brin_idx"),
            models.Index(fields=["bus_stop", "-date"]),
        ]

    def __str__(self) -> str:
        return f"{self.bus_stop_id} {self.date} {self.time} = {self.congestion}"
