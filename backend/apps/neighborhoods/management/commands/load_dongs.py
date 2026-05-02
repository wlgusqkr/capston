"""
서울 행정동 GeoJSON 파일을 Dong 모델로 적재.

지원 GeoJSON 형식:
  raqoon886/Local_HangJeongDong (adm_nm/adm_cd/sggnm/sidonm)
  통계청/행안부 표준 (ADM_NM/ADM_CD/SIG_KOR_NM)
  EMD 형식 (EMD_KOR_NM/EMD_CD)

slug는 행정동 코드(adm_cd)를 그대로 사용 → URL 안전 + 유일성 보장.

옵션:
  --reset       전체 Dong 삭제 후 적재
  --seed-scores slug 해시 기반으로 score_rent/amenity/transit 채우기

실행:
  python manage.py load_dongs path/to/seoul_dongs.geojson --reset --seed-scores
"""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

from django.contrib.gis.geos import GEOSGeometry, MultiPolygon
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.neighborhoods.models import Dong


NAME_KEYS = ("ADM_NM", "adm_nm", "EMD_KOR_NM", "emd_kor_nm", "name", "NAME")
CODE_KEYS = ("ADM_CD", "adm_cd", "EMD_CD", "emd_cd", "code", "ADM_CD8")
GU_KEYS = ("SIG_KOR_NM", "sig_kor_nm", "GU_NM", "gu", "SGG_NM", "sggnm", "SGGNM")
SIDO_KEYS = ("SIDO_NM", "sido_nm", "sidonm", "SIDONM")


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


def _extract_dong_name(full_name: str, sido: str | None, gu: str | None) -> str:
    """
    "서울특별시 종로구 사직동" → "사직동" (sido + gu prefix 제거)
    "종로구 사직동" → "사직동"
    "사직동" → "사직동"
    """
    cleaned = full_name.strip()
    for prefix in (sido, gu):
        if prefix and cleaned.startswith(prefix + " "):
            cleaned = cleaned[len(prefix) + 1 :].strip()
    # 공백이 여러 개 남아 있으면 마지막 토큰
    parts = cleaned.split()
    if len(parts) >= 2:
        # ex: "강남구 역삼1동" 같은 경우 이미 처리됐을 텐데, 그래도 마지막을 dong으로
        return parts[-1]
    return cleaned or full_name


def _seed_scores(slug: str) -> tuple[float, float, float]:
    """slug 해시 기반으로 결정적 점수 (rent/amenity/transit) 0~100 생성."""
    h = hashlib.md5(slug.encode("utf-8")).hexdigest()
    a = int(h[:4], 16) / 0xFFFF
    b = int(h[4:8], 16) / 0xFFFF
    c = int(h[8:12], 16) / 0xFFFF
    # 너무 극단적이지 않게 25~95 범위로 매핑
    score_rent = round(25 + a * 70, 1)
    score_amenity = round(25 + b * 70, 1)
    score_transit = round(25 + c * 70, 1)
    return score_rent, score_amenity, score_transit


class Command(BaseCommand):
    help = "행정동 GeoJSON 파일을 Dong 모델에 적재한다."

    def add_arguments(self, parser):
        parser.add_argument("path", type=str, help="GeoJSON 파일 경로")
        parser.add_argument(
            "--reset",
            action="store_true",
            help="실행 전 모든 Dong 데이터 삭제",
        )
        parser.add_argument(
            "--seed-scores",
            action="store_true",
            help="slug 해시 기반 결정적 점수(rent/amenity/transit, 25~95) 채우기",
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

        seed_scores = options["seed_scores"]

        created = 0
        updated = 0
        skipped = 0

        for feat in features:
            props = feat.get("properties", {}) or {}
            geom_raw = feat.get("geometry")
            if not geom_raw:
                skipped += 1
                continue

            full_name = _pick(props, NAME_KEYS)
            code = _pick(props, CODE_KEYS) or ""
            if not full_name:
                skipped += 1
                continue

            sido = _pick(props, SIDO_KEYS)
            gu = _pick(props, GU_KEYS)
            # 시/구 prefix 제거해서 순수 동 이름만 추출
            name = _extract_dong_name(full_name, sido, gu)
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

            # slug = code (URL 안전, 유일성 보장). code 없으면 dong-N 폴백.
            if code:
                # adm_cd는 숫자만이지만 안전하게 비-슬러그 문자 제거
                slug = re.sub(r"[^A-Za-z0-9_-]", "", code) or f"dong-{created + updated + 1}"
            else:
                slug = f"dong-{created + updated + 1}"

            defaults = {
                "slug": slug,
                "name": name,
                "gu": gu,
                "geom": multipoly,
                "centroid": centroid,
                "area_km2": float(area_km2),
            }
            if seed_scores:
                sr, sa, st = _seed_scores(slug)
                defaults.update(score_rent=sr, score_amenity=sa, score_transit=st)

            obj, was_created = Dong.objects.update_or_create(
                code=code or slug,
                defaults=defaults,
            )
            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(self.style.SUCCESS(
            f"완료: 생성 {created}개, 갱신 {updated}개, 건너뜀 {skipped}개"
        ))
        if not seed_scores:
            self.stdout.write(
                self.style.WARNING(
                    "주의: score_rent/amenity/transit는 그대로 입니다. "
                    "히트맵 시연이 필요하면 --seed-scores 옵션을 함께 쓰세요."
                )
            )
