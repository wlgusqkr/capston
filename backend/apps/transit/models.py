"""
Subway 모델 — schema.dbml line 216~242 정합 (sub-plan 4.5B).

- SubwayStation : 서울시 지하철역 마스터. PK varchar(20) (schema.dbml).
- SubwayCongestion : 지하철 혼잡도.
- NearestSubway  : legacy (neighborhoods.Dong FK). lock D — 보존.
- NearestSubwayAdong / NearestSubwayLdong : schema.dbml line 449~473 (sub-plan 2L 신설).

sub-plan 4.5B 정합:
- SubwayStation PK: BigAutoField → CharField(max_length=20). 'id varchar(20)'.
- SubwayStation: legacy `dong FK`(neighborhoods.Dong) 제거 → adong/ldong FK 정합.
  schema.dbml ldong_code/adong_code NOT NULL.
- SubwayCongestion: PK (station_id, day_type, direction, express_yn, time).
  station FK는 새 varchar PK에 맞춰 db_column 'station_id' 유지.
"""

from django.contrib.gis.db import models as gis_models
from django.contrib.postgres.indexes import BrinIndex, GistIndex
from django.db import models


# ---------------------------------------------------------------------------
# 마스터
# ---------------------------------------------------------------------------


class SubwayStation(models.Model):
    """지하철역 (RDS subway_station 마스터). schema.dbml line 216~226."""

    # PK: schema.dbml 'id varchar(20)'.
    id = models.CharField(
        max_length=20,
        primary_key=True,
        help_text="역 ID (RDS subway_station.id, varchar(20)).",
    )
    name = models.CharField(max_length=100, help_text="역명 (예: '충무로')")
    line = models.CharField(max_length=20, help_text="노선 (예: '3호선')")
    # 행정동 FK (NOT NULL). schema.dbml line 221.
    adong = models.ForeignKey(
        "regions.Adong",
        on_delete=models.PROTECT,
        related_name="subway_stations",
        db_column="adong_code",
        help_text="행정동 (schema.dbml NOT NULL).",
    )
    # 법정동 FK (NOT NULL). schema.dbml line 220.
    ldong = models.ForeignKey(
        "regions.Ldong",
        on_delete=models.PROTECT,
        related_name="subway_stations",
        db_column="ldong_code",
        help_text="법정동 (schema.dbml NOT NULL, M-1 lock).",
    )
    geom = gis_models.PointField(srid=4326, help_text="역 위치 (WGS84). GiST 인덱스.")

    class Meta:
        db_table = "subway_station"
        verbose_name = "지하철역"
        verbose_name_plural = "지하철역"
        indexes = [
            GistIndex(fields=["location"], name="subway_location_gist_idx"),
            models.Index(fields=["adong"]),
            models.Index(fields=["ldong"]),
            models.Index(fields=["name"]),
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
    geom = gis_models.PointField(
        srid=4326,
        null=True,
        blank=True,
        help_text="정류장 위치 (WGS84). GiST 인덱스. RDS에 NULL 719건 존재.",
    )

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
    """행정동별 가까운 지하철역 사전 계산 캐시 (legacy, neighborhoods.Dong FK).

    sub-plan 4.5B lock D — 보존. SubwayStation PK가 varchar(20)로 바뀜에 따라
    station FK도 varchar로 자동 cast된다 (Django ForeignKey).
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
# NearestSubway v2 — Adong / Ldong (schema.dbml line 449~473)
# ---------------------------------------------------------------------------


class NearestSubwayAdong(models.Model):
    """행정동별 가까운 지하철역 top-3 사전 계산 캐시 (Adong FK 기반)."""

    adong = models.ForeignKey(
        "regions.Adong",
        on_delete=models.CASCADE,
        db_column="adong_code",
        related_name="nearest_subways",
    )
    rank = models.SmallIntegerField(help_text="1~3")
    station_name = models.CharField(max_length=100, help_text="지하철역 이름 (비정규화)")
    distance_m = models.FloatField(help_text="측지선 m (>= 0)")

    class Meta:
        db_table = "nearest_subway_adong"
        verbose_name = "가까운 지하철역 (행정동, 사전계산)"
        verbose_name_plural = "가까운 지하철역 (행정동, 사전계산)"
        unique_together = [("adong", "rank")]
        constraints = [
            models.CheckConstraint(
                check=Q(rank__gte=1, rank__lte=3),
                name="ck_nearest_subway_adong_rank",
            ),
            models.CheckConstraint(
                check=Q(distance_m__gte=0),
                name="ck_nearest_subway_adong_distance",
            ),
        ]
        indexes = [
            models.Index(fields=["station_name"], name="ix_nearest_subway_adong_name"),
        ]
        ordering = ["adong", "rank"]

    def __str__(self) -> str:
        return f"{self.adong_id} #{self.rank} {self.station_name} ({self.distance_m:.0f}m)"


class NearestSubwayLdong(models.Model):
    """법정동별 가까운 지하철역 top-3 사전 계산 캐시 (Ldong FK 기반)."""

    ldong = models.ForeignKey(
        "regions.Ldong",
        on_delete=models.CASCADE,
        db_column="ldong_code",
        related_name="nearest_subways",
    )
    rank = models.SmallIntegerField(help_text="1~3")
    station_name = models.CharField(max_length=100, help_text="지하철역 이름 (비정규화)")
    distance_m = models.FloatField(help_text="측지선 m (>= 0)")

    class Meta:
        db_table = "nearest_subway_ldong"
        verbose_name = "가까운 지하철역 (법정동, 사전계산)"
        verbose_name_plural = "가까운 지하철역 (법정동, 사전계산)"
        unique_together = [("ldong", "rank")]
        constraints = [
            models.CheckConstraint(
                check=Q(rank__gte=1, rank__lte=3),
                name="ck_nearest_subway_ldong_rank",
            ),
            models.CheckConstraint(
                check=Q(distance_m__gte=0),
                name="ck_nearest_subway_ldong_distance",
            ),
        ]
        indexes = [
            models.Index(fields=["station_name"], name="ix_nearest_subway_ldong_name"),
        ]
        ordering = ["ldong", "rank"]

    def __str__(self) -> str:
        return f"{self.ldong_id} #{self.rank} {self.station_name} ({self.distance_m:.0f}m)"


# ---------------------------------------------------------------------------
# 혼잡도 — schema.dbml line 228~239
# ---------------------------------------------------------------------------


class SubwayCongestion(models.Model):
    """지하철 혼잡도.

    schema.dbml PK = (station_id, day_type, direction, express_yn, time).
    day_type/direction/express_yn 한글값 보존.
    """

    station = models.ForeignKey(
        SubwayStation,
        on_delete=models.CASCADE,
        related_name="congestions",
        db_column="station_id",
    )
    day_type = models.CharField(
        max_length=20,
        help_text="평일/토요일/일요일/휴일 (CHECK ck_subway_congestion_day_type 4종)",
    )
    direction = models.CharField(
        max_length=20,
        help_text="상선/하선/내선/외선 (CHECK ck_subway_congestion_direction 4종)",
    )
    express_yn = models.CharField(
        max_length=10,
        help_text="일반/급행 (CHECK ck_subway_congestion_express_yn 2종)",
    )
    time = models.TimeField(help_text="시간대")
    congestion = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        help_text="혼잡도 % (서울교통공사 기준 100=정원, 0~200+ 가능)",
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
