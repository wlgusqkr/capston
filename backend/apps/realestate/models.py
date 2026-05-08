"""
RentDeal / JibunGeocodeCache — SPEC 섹션 10, 14.2 + RDS 통합 확장.

전월세 실거래는 4개 데이터셋(연립다세대 / 단독다가구 / 오피스텔 / 아파트)을 합쳐
RentDeal 한 테이블로 적재한다. deal_type으로 구분.

지오코딩 규칙(SPEC 14.2):
- VWorld 지오코딩은 **지번(법정동 + 지번 단위) 중심점**까지만 허용.
- 매물(건물) 단위 정밀 좌표는 저장 금지.
- RentDeal.geom은 동일 지번을 공유하는 모든 거래가 같은 점을 가리킨다.
- JibunGeocodeCache로 지번→좌표 캐시를 두어 재호출을 줄인다.

RDS 통합 (Phase 1, 계획서 3.1):
- 컬럼 8개 신규: external_id / housing_type / house_name / contract_end_date /
  contract_type / renewal_request_right_used / previous_deposit / previous_monthly_rent
- ldong FK 신규 (RDS ldong_code 매핑)
- DEAL_TYPE_CHOICES를 5종(apt/officetel/villa/dagagu/danok)으로 확장. villa 라벨은
  '연립다세대'(다세대+연립+연립다세대 통합), 다가구는 dagagu로 분리, 단독은 danok 라벨만 변경.
- external_hash는 nullable로 변경 (신규 적재는 external_id로 멱등 보장).

기존 데이터의 `deal_type='danok'`(단독다가구 통합) 레코드는 마이그레이션 시점에 그대로
두고, ETL이 RDS raw로 덮어쓸 때 재분류된다.
"""

from django.contrib.gis.db import models as gis_models
from django.contrib.postgres.indexes import GistIndex
from django.db import models


DEAL_TYPE_CHOICES = [
    ("apt", "아파트"),
    ("officetel", "오피스텔"),
    ("villa", "연립다세대"),  # 다세대+연립+연립다세대 통합
    ("dagagu", "다가구"),  # 다가구 분리 (Phase 1 신규)
    ("danok", "단독"),  # 단독 (라벨 변경: 단독다가구 → 단독)
]


class RentDeal(models.Model):
    """전/월세 실거래 한 건."""

    # RDS PK 보존 (auto PK는 그대로 유지하여 기존 호환)
    # RDS rent_deal.id 는 character varying(60) (예: '23010600A170325004') — CharField 필수.
    external_id = models.CharField(
        max_length=64,
        unique=True,
        null=True,
        blank=True,
        help_text="RDS rent_deal.id (Phase 1 신규). 신규 적재는 이 값으로 멱등 보장.",
    )

    # 행정동 (기존) + 법정동 (Phase 1 신규)
    dong = models.ForeignKey(
        "neighborhoods.Dong",
        on_delete=models.PROTECT,
        related_name="rent_deals",
        help_text="법정동→행정동 매핑 후 결정된 행정동. RDS adong_code 또는 location ST_Contains 백필.",
    )
    ldong = models.ForeignKey(
        "regions.Ldong",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="rent_deals",
        help_text="법정동 (Phase 1 신규). RDS ldong_code 직접 매핑.",
    )

    # 거래 유형 / 주거 유형
    deal_type = models.CharField(
        max_length=20,
        choices=DEAL_TYPE_CHOICES,
        help_text="거래 유형 (영문 enum 5종). RDS housing_type 한글 → 영문 derived.",
    )
    housing_type = models.CharField(
        max_length=30,
        blank=True,
        help_text="RDS housing_type 한글 raw (예: '아파트', '다가구', '연립다세대'). Phase 1 신규.",
    )

    # 계약 정보
    deal_date = models.DateField(help_text="계약일 (API의 dealYear/Month/Day 조합)")
    contract_end_date = models.DateField(
        null=True, blank=True, help_text="계약 종료일 (Phase 1 신규)"
    )
    contract_type = models.CharField(
        max_length=20, blank=True, help_text="계약 구분 (신규/갱신 등). Phase 1 신규."
    )
    renewal_request_right_used = models.BooleanField(
        null=True, blank=True, help_text="갱신요구권 사용 여부. Phase 1 신규."
    )

    # 면적 / 금액
    area_m2 = models.FloatField(help_text="전용면적 (m^2)")
    deposit = models.PositiveIntegerField(help_text="보증금 (만원)")
    monthly_rent = models.PositiveIntegerField(
        help_text="월세 (만원). 0이면 전세.",
    )
    previous_deposit = models.PositiveIntegerField(
        null=True, blank=True, help_text="종전 계약 보증금 (만원). Phase 1 신규."
    )
    previous_monthly_rent = models.PositiveIntegerField(
        null=True, blank=True, help_text="종전 계약 월세 (만원). Phase 1 신규."
    )

    # 건물 메타
    floor = models.SmallIntegerField(null=True, blank=True, help_text="층 (지하 음수)")
    build_year = models.PositiveSmallIntegerField(
        null=True, blank=True, help_text="건축 연도"
    )
    house_name = models.CharField(
        max_length=200, blank=True, help_text="건물명 (RDS house_name). Phase 1 신규."
    )

    # 위치
    jibun = models.CharField(
        max_length=64,
        blank=True,
        help_text="'법정동 + 지번' 원문 (예: '필동2가 84-1')",
    )
    geom = gis_models.PointField(
        srid=4326,
        null=True,
        blank=True,
        help_text="지번 중심점. RDS location 그대로 (SPEC 14.2 정책 충족).",
    )

    # 멱등 / 메타
    external_hash = models.CharField(
        max_length=64,
        unique=True,
        null=True,
        blank=True,
        help_text=(
            "기존 적재용 deal key 해시 (Phase 1 이전 데이터 호환). "
            "신규 적재는 external_id 사용."
        ),
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "rent_deal"
        verbose_name = "전월세 실거래"
        verbose_name_plural = "전월세 실거래"
        indexes = [
            models.Index(fields=["dong", "deal_date"]),
            models.Index(fields=["ldong", "deal_date"]),
            models.Index(fields=["deal_type", "deal_date"]),
            models.Index(fields=["housing_type"]),
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
