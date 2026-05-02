"""
Dong 시리얼라이저.

DongScoreSerializer는 SPEC 9의 GET /api/dongs/scores 응답 한 항목 포맷:
[{slug, name, gu, score, lat, lng}, ...]
"""

from rest_framework import serializers

from .models import Dong


class DongScoreSerializer(serializers.ModelSerializer):
    """메인 지도 히트맵용 — 가중합 종합 점수 + 중심점 좌표."""

    score = serializers.SerializerMethodField()
    lat = serializers.SerializerMethodField()
    lng = serializers.SerializerMethodField()

    class Meta:
        model = Dong
        fields = ("slug", "name", "gu", "score", "lat", "lng")

    def get_score(self, obj: Dong) -> float:
        weights = self.context.get("weights", {"rent": 1 / 3, "amenity": 1 / 3, "transit": 1 / 3})
        return round(
            obj.composite_score(
                w_rent=weights["rent"],
                w_amenity=weights["amenity"],
                w_transit=weights["transit"],
            ),
            2,
        )

    def get_lat(self, obj: Dong) -> float:
        # PostGIS PointField: x = lng, y = lat
        return round(obj.centroid.y, 6) if obj.centroid else 0.0

    def get_lng(self, obj: Dong) -> float:
        return round(obj.centroid.x, 6) if obj.centroid else 0.0
