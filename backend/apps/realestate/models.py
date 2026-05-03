"""
RentDeal / JibunGeocodeCache — SPEC 섹션 10, 14.2.

전월세 실거래는 4개 데이터셋(연립다세대 / 단독다가구 / 오피스텔 / 아파트)을 합쳐
RentDeal 한 테이블로 적재한다. deal_type으로 구분.

지오코딩 규칙(SPEC 14.2):
- VWorld 지오코딩은 **지번(법정동 + 지번 단위) 중심점**까지만 허용.
- 매물(건물) 단위 정밀 좌표는 저장 금지.
- RentDeal.geom은 동일 지번을 공유하는 모든 거래가 같은 점을 가리킨다.
- JibunGeocodeCache로 지번→좌표 캐시를 두어 재호출을 줄인다.
"""

from django.contrib.gis.db import models as gis_models
from django.contrib.postgres.indexes import GistIndex
from django.db import models


DEAL_TYPE_CHOICES = [
    ("apt", "아파트"),
    ("officetel", "오피스텔"),
    ("villa", "연립다세대"),
    ("danok", "단독다가구"),
]


class RentDeal(models.Model):
    """전/월세 실거래 한 건."""

    dong = models.ForeignKey(
        "neighborhoods.Dong",
        on_delete=models.PROTECT,
        related_name="rent_deals",
        help_text="법정동→행정동 매핑 후 결정된 행정동",
    )
    deal_type = models.CharField(
        max_length=20,
        choices=DEAL_TYPE_CHOICES,
        help_text="거래 유형 (아파트/오피스텔/연립다세대/단독다가구)",
    )
    deal_date = models.DateField(help_text="계약일 (API의 dealYear/Month/Day 조합)")
    area_m2 = models.FloatField(help_text="전용면적 (m^2)")
    deposit = models.PositiveIntegerField(help_text="보증금 (만원)")
    monthly_rent = models.PositiveIntegerField(
        help_text="월세 (만원). 0이면 전세.",
    )
    floor = models.SmallIntegerField(null=True, blank=True, help_text="층 (지하 음수)")
    build_year = models.PositiveSmallIntegerField(
        null=True, blank=True, help_text="건축 연도"
    )
    jibun = models.CharField(
        max_length=64,
        blank=True,
        help_text="'법정동 + 지번' 원문 (예: '필동2가 84-1')",
    )
    geom = gis_models.PointField(
        srid=4326,
        null=True,
        blank=True,
        help_text="지번 중심점 (VWorld 지오코딩). 매물 단위 정밀 좌표 금지 (SPEC 14.2).",
    )
    external_hash = models.CharField(
        max_length=64,
        unique=True,
        help_text="멱등 적재용 deal key 해시 (재실행 시 중복 차단)",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "rent_deal"
        verbose_name = "전월세 실거래"
        verbose_name_plural = "전월세 실거래"
        indexes = [
            models.Index(fields=["dong", "deal_date"]),
            models.Index(fields=["deal_type", "deal_date"]),
            GistIndex(fields=["geom"], name="rentdeal_geom_gist_idx"),
        ]
        ordering = ["-deal_date"]

    def __str__(self) -> str:
        return (
            f"{self.deal_date} [{self.deal_type}] "
            f"{self.dong.name if self.dong_id else '?'} "
            f"{self.deposit}/{self.monthly_rent}"
        )


class JibunGeocodeCache(models.Model):
    """지번→좌표 캐시 (VWorld 지오코딩 재호출 회피)."""

    jibun_text = models.CharField(
        max_length=128,
        primary_key=True,
        help_text="정규화된 지번 문자열 (예: '서울특별시 중구 필동2가 84-1')",
    )
    geom = gis_models.PointField(srid=4326, help_text="지번 중심점 (WGS84)")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "jibun_geocode_cache"
        verbose_name = "지번 지오코딩 캐시"
        verbose_name_plural = "지번 지오코딩 캐시"

    def __str__(self) -> str:
        return self.jibun_text
