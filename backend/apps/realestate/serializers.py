"""
RentDeal 시리얼라이저.

- RentDealPinSerializer: SPEC 섹션 6.1 메인 지도 핀.
  GET /api/transactions/bbox 응답의 한 항목.
  geom (PointField)을 lat / lng 두 필드로 펼쳐 줘서 프론트가 단순.
"""

from __future__ import annotations

from rest_framework import serializers

from .models import RentDeal
from .utils import convert_to_monthly


class RentDealPinSerializer(serializers.ModelSerializer):
    """
    실거래 핀 한 건.

    응답 형식 (Phase 1 frontend가 그대로 소비):
        {
            "id": 12345,
            "date": "2026-04-15",
            "deal_type": "officetel",
            "area_m2": 23.4,
            "deposit": 5000,
            "monthly_rent": 50,
            "converted_rent": 75,    # 신규 — 환산월세 (만원, 보증금 환산 포함)
            "lat": 37.5663,
            "lng": 126.9783,
            "jibun": "필동 1-1",
            "dong_name": "필동",
            "gu": "중구",
        }

    `lat`/`lng`는 PointField geom의 y/x. SRID 4326 (WGS84) 가정.
    `geom is null` row는 사전 필터링되었다고 가정 (view에서 처리).
    `converted_rent` 는 표준식 monthly + deposit × 0.005 (만원, 정수 반올림).
    """

    date = serializers.DateField(source="deal_date")
    lat = serializers.SerializerMethodField()
    lng = serializers.SerializerMethodField()
    converted_rent = serializers.SerializerMethodField()
    dong_name = serializers.CharField(source="dong.name", read_only=True)
    gu = serializers.CharField(source="dong.gu", read_only=True)

    class Meta:
        model = RentDeal
        fields = (
            "id",
            "date",
            "deal_type",
            "area_m2",
            "deposit",
            "monthly_rent",
            "converted_rent",
            "lat",
            "lng",
            "jibun",
            "dong_name",
            "gu",
        )

    def get_lat(self, obj: RentDeal) -> float:
        # PointField: x=lng, y=lat. geom__isnull=False로 view에서 필터링됨.
        return round(obj.geom.y, 6)

    def get_lng(self, obj: RentDeal) -> float:
        return round(obj.geom.x, 6)

    def get_converted_rent(self, obj: RentDeal) -> int:
        """환산월세 (만원, 정수). 보증금 환산 계수 0.005/월 (연 6%)."""
        return round(convert_to_monthly(obj.deposit, obj.monthly_rent))
