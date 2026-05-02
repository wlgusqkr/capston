"""
서울 안 임의 행정동 5개 시드.

GeoJSON이 아직 없으므로(10단계 data-pipeline에서 적재 예정), 메인 지도/패널
데모가 가능하도록 5개 동을 넣는다. 점수는 일부러 다양하게 분포시켜 가중치
슬라이더 효과를 시연할 수 있게 한다.

실행: python manage.py seed_dummy_dongs [--reset]
"""

from __future__ import annotations

from django.contrib.gis.geos import MultiPolygon, Point, Polygon
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.neighborhoods.models import Dong


# (slug, name, gu, code, lat, lng, score_rent, score_amenity, score_transit)
# 각 동의 점수는 의도적으로 다양하게:
#  - pildong:    교통 매우 좋음, 시설 보통, 월세 비쌈 → transit 슬라이더 올리면 1위
#  - hoegidong:  교통 보통, 시설 좋음, 월세 저렴 → 균형형
#  - seogyodong: 교통 좋음, 시설 매우 좋음, 월세 비쌈 → amenity 올리면 1위
#  - yeoksamdong: 교통 좋음, 시설 좋음, 월세 매우 비쌈 → rent 올리면 하위
#  - jamsildong: 교통 좋음, 시설 좋음, 월세 보통 → 종합 평균
DUMMY_DONGS: list[tuple[str, str, str, str, float, float, float, float, float]] = [
    ("pildong",     "필동",   "중구",     "1114060500", 37.5589, 126.9954, 35.0, 55.0, 90.0),
    ("hoegidong",   "회기동", "동대문구", "1123070500", 37.5917, 127.0533, 80.0, 75.0, 60.0),
    ("seogyodong",  "서교동", "마포구",   "1144060500", 37.5512, 126.9223, 30.0, 92.0, 78.0),
    ("yeoksamdong", "역삼동", "강남구",   "1168010100", 37.5009, 127.0364, 15.0, 80.0, 85.0),
    ("jamsildong",  "잠실동", "송파구",   "1171010100", 37.5121, 127.0823, 60.0, 78.0, 75.0),
]


def _square_polygon(lat: float, lng: float, side_deg: float = 0.005) -> MultiPolygon:
    """centroid 주변 작은 사각형 (약 ~500m 사이드) MultiPolygon 생성."""
    half = side_deg / 2
    coords = [
        (lng - half, lat - half),
        (lng + half, lat - half),
        (lng + half, lat + half),
        (lng - half, lat + half),
        (lng - half, lat - half),
    ]
    poly = Polygon(coords)
    poly.srid = 4326
    mp = MultiPolygon(poly, srid=4326)
    return mp


class Command(BaseCommand):
    help = "더미 행정동 5개를 데이터베이스에 적재한다 (개발/데모용)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="기존 더미 슬러그 삭제 후 재생성",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options["reset"]:
            slugs = [row[0] for row in DUMMY_DONGS]
            deleted, _ = Dong.objects.filter(slug__in=slugs).delete()
            self.stdout.write(self.style.WARNING(f"reset: {deleted}개 더미 동 삭제"))

        created = 0
        updated = 0
        for (slug, name, gu, code, lat, lng, sr, sa, st) in DUMMY_DONGS:
            geom = _square_polygon(lat, lng)
            centroid = Point(lng, lat, srid=4326)
            obj, was_created = Dong.objects.update_or_create(
                slug=slug,
                defaults={
                    "name": name,
                    "gu": gu,
                    "code": code,
                    "geom": geom,
                    "centroid": centroid,
                    "area_km2": 0.25,  # 0.5km x 0.5km
                    "score_rent": sr,
                    "score_amenity": sa,
                    "score_transit": st,
                },
            )
            if was_created:
                created += 1
            else:
                updated += 1
            self.stdout.write(
                f"  {'+' if was_created else '~'} {gu} {name} "
                f"(rent={sr}, amenity={sa}, transit={st})"
            )

        self.stdout.write(self.style.SUCCESS(
            f"완료: 생성 {created}개, 갱신 {updated}개 (총 {created + updated}개)"
        ))
