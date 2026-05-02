"""
서울 행정동 GeoJSON 파일을 Dong 모델로 적재.

GeoJSON FeatureCollection 가정. 각 Feature 속성에서 다음을 추출한다:
  - name 후보: ADM_NM / EMD_KOR_NM / adm_nm / name
  - code 후보: ADM_CD / adm_cd / EMD_CD
  - gu 후보: SIG_KOR_NM / GU_NM / 또는 name에서 분리

slug는 영문 알파벳/숫자 조합으로 자동 생성 (이름 + code 끝 4자리).
geom은 Polygon → MultiPolygon으로 자동 변환.

실행:
  python manage.py load_dongs path/to/seoul_dongs.geojson [--reset]

10단계(data-pipeline)에서 실제 GeoJSON과 함께 사용. 그 전에는
seed_dummy_dongs를 사용한다.
"""

from __future__ import annotations

import json
from pathlib import Path

from django.contrib.gis.geos import GEOSGeometry, MultiPolygon
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.text import slugify

from apps.neighborhoods.models import Dong


NAME_KEYS = ("ADM_NM", "adm_nm", "EMD_KOR_NM", "emd_kor_nm", "name", "NAME")
CODE_KEYS = ("ADM_CD", "adm_cd", "EMD_CD", "emd_cd", "code", "ADM_CD8")
GU_KEYS = ("SIG_KOR_NM", "sig_kor_nm", "GU_NM", "gu", "SGG_NM")


def _pick(props: dict, keys: tuple[str, ...]) -> str | None:
    for k in keys:
        v = props.get(k)
        if v:
            return str(v)
    return None


def _to_multipolygon(geom: GEOSGeometry) -> MultiPolygon:
    """Polygon이면 MultiPolygon으로 감싼다."""
    if geom.geom_type == "MultiPolygon":
        return geom  # type: ignore[return-value]
    if geom.geom_type == "Polygon":
        mp = MultiPolygon(geom, srid=geom.srid or 4326)
        return mp
    raise CommandError(f"지원하지 않는 geometry 타입: {geom.geom_type}")


class Command(BaseCommand):
    help = "행정동 GeoJSON 파일을 Dong 모델에 적재한다."

    def add_arguments(self, parser):
        parser.add_argument("path", type=str, help="GeoJSON 파일 경로")
        parser.add_argument(
            "--reset",
            action="store_true",
            help="실행 전 모든 Dong 데이터 삭제",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        path = Path(options["path"])
        if not path.exists():
            raise CommandError(f"파일이 존재하지 않습니다: {path}")

        if options["reset"]:
            deleted, _ = Dong.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"reset: {deleted}개 행 삭제"))

        with path.open("r", encoding="utf-8") as f:
            fc = json.load(f)

        features = fc.get("features", [])
        if not features:
            raise CommandError("FeatureCollection.features가 비어 있습니다.")

        created = 0
        updated = 0
        skipped = 0

        for feat in features:
            props = feat.get("properties", {}) or {}
            geom_raw = feat.get("geometry")
            if not geom_raw:
                skipped += 1
                continue

            name = _pick(props, NAME_KEYS)
            code = _pick(props, CODE_KEYS) or ""
            if not name:
                skipped += 1
                continue

            # 구 추출: 없으면 name에서 분리 시도 (예: "중구 필동")
            gu = _pick(props, GU_KEYS)
            if not gu and " " in name:
                parts = name.split(" ", 1)
                gu, name = parts[0], parts[1]
            gu = gu or "(미상)"

            try:
                geom = GEOSGeometry(json.dumps(geom_raw))
                if not geom.srid:
                    geom.srid = 4326
                multipoly = _to_multipolygon(geom)
                centroid = multipoly.centroid
                area_km2 = multipoly.transform(5179, clone=True).area / 1_000_000  # m^2 → km^2
            except Exception as exc:  # noqa: BLE001
                self.stderr.write(self.style.WARNING(f"  geometry 파싱 실패: {name} - {exc}"))
                skipped += 1
                continue

            slug = slugify(name)
            if code:
                slug = f"{slug}-{code[-4:]}" if slug else f"dong-{code}"
            if not slug:
                slug = f"dong-{created + updated + 1}"

            obj, was_created = Dong.objects.update_or_create(
                code=code or slug,
                defaults={
                    "slug": slug,
                    "name": name,
                    "gu": gu,
                    "geom": multipoly,
                    "centroid": centroid,
                    "area_km2": float(area_km2),
                },
            )
            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(self.style.SUCCESS(
            f"완료: 생성 {created}개, 갱신 {updated}개, 건너뜀 {skipped}개"
        ))
        self.stdout.write(
            self.style.WARNING(
                "주의: score_rent/amenity/transit는 0으로 초기화되었습니다. "
                "data-pipeline 단계에서 별도 계산 후 갱신하세요."
            )
        )
