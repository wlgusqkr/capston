"""
행정동(Dong) 모델 — SPEC 섹션 10.

법정동이 아닌 행정동 단위로만 저장한다 (SPEC 14.2). 점수는 사전 계산하여
score_rent / score_amenity / score_transit 컬럼에 저장하고, API에서는
가중치 조합만 즉시 계산한다 (SPEC 11.1).
"""

from django.contrib.gis.db import models as gis_models
from django.db import models


class Dong(models.Model):
    # 식별자 / 메타
    slug = models.SlugField(
        unique=True,
        max_length=80,
        help_text="URL용 고유 식별자 (예: 'pildong', 'jung-pildong')",
    )
    name = models.CharField(max_length=50, help_text="행정동 이름 (예: '필동')")
    gu = models.CharField(max_length=50, help_text="구 이름 (예: '중구')")
    code = models.CharField(
        max_length=10,
        unique=True,
        help_text="행정동 코드 (행안부, 8~10자리). RDS adong_code와 동일.",
    )

    # 공간 데이터 (PostGIS)
    geom = gis_models.MultiPolygonField(srid=4326, help_text="행정동 경계 폴리곤 (WGS84)")
    centroid = gis_models.PointField(srid=4326, help_text="중심점 (WGS84)")
    area_km2 = models.FloatField(default=0, help_text="면적 (km^2)")

    # 사전 계산된 점수 (0~100). SPEC 11.2 정규화 결과.
    score_rent = models.FloatField(default=0, help_text="전월세 점수 (저렴할수록 높음)")
    score_amenity = models.FloatField(default=0, help_text="생활시설 점수")
    score_transit = models.FloatField(default=0, help_text="교통 점수")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "dong"
        verbose_name = "행정동"
        verbose_name_plural = "행정동"
        ordering = ["gu", "name"]
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["code"]),
            models.Index(fields=["gu"]),
        ]

    def __str__(self) -> str:
        return f"{self.gu} {self.name}"

    # ---------------------------------------------------------------
    # 점수 조합 (SPEC 11.1) — 가중치는 0~1 (정규화된 값) 가정
    # ---------------------------------------------------------------
    def composite_score(self, w_rent: float, w_amenity: float, w_transit: float) -> float:
        return (
            self.score_rent * w_rent
            + self.score_amenity * w_amenity
            + self.score_transit * w_transit
        )
