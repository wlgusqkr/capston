"""04 — RDS.adong (426행) → local.dong (행정동, neighborhoods.Dong).

매핑 (계획서 매핑 사전):
- adong_code → code
- name      → name
- gu_code   → Gu lookup → gu (string, 구 이름)
- area_m2   → area_km2 = area_m2 / 1_000_000
- boundary  → geom
- location  → centroid
- slug 생성: f"{gu_slug}-{name_slug}" (Django slugify 한글 OK).
- score_rent/amenity/transit = 0.0 (Phase 4에서 재계산)

Dong은 PROTECT FK가 5종(rent_deal.RentDeal, store.Store 등)이므로
삭제는 절대 하지 말고 ON CONFLICT(code) DO UPDATE만.
"""

from __future__ import annotations

import sys
from pathlib import Path

from django.utils.text import slugify  # type: ignore  # Django 의존, .venv에 설치돼 있음

sys.path.insert(0, str(Path(__file__).parent))
from _common import connect, make_argparser, verify_count


def make_slug(gu_name: str, dong_name: str, used: set[str]) -> str:
    """행정동 slug 생성. 충돌 시 -2, -3 접미.

    Django slugify는 allow_unicode=True여야 한글 살림.
    """
    base = slugify(f"{gu_name}-{dong_name}", allow_unicode=True)
    if not base:
        base = f"d-{abs(hash((gu_name, dong_name))) % 100000:05d}"
    cand = base
    n = 2
    while cand in used:
        cand = f"{base}-{n}"
        n += 1
    used.add(cand)
    return cand


def main() -> int:
    args = make_argparser(__doc__).parse_args()

    with connect(args.rds_dsn) as rds, connect(args.local_dsn) as local:
        # gu_code → gu_name 룩업 (한 번에 25개)
        with local.cursor() as lcur:
            lcur.execute("SELECT gu_code, name FROM gu")
            gu_name_map = dict(lcur.fetchall())

            # 기존 slug 수집 (멱등 재실행 시 본인 slug는 충돌이지만 다른 row와 충돌 회피)
            lcur.execute("SELECT code, slug FROM dong")
            existing_code_slug = dict(lcur.fetchall())

        used_slugs: set[str] = set(existing_code_slug.values())

        with rds.cursor() as rcur:
            rcur.execute(
                """
                SELECT adong_code, gu_code, name, area_m2,
                       ST_AsEWKT(boundary), ST_AsEWKT(location)
                FROM adong
                """
            )
            rows = rcur.fetchall()

        inserted = updated = 0
        with local.cursor() as lcur:
            for adong_code, gu_code, name, area_m2, boundary, location in rows:
                gu_name = gu_name_map.get(gu_code, "")
                area_km2 = float(area_m2) / 1_000_000 if area_m2 is not None else 0.0

                # slug: 본인 row가 이미 있으면 그 slug 재사용. 아니면 새로 생성.
                if adong_code in existing_code_slug:
                    slug = existing_code_slug[adong_code]
                else:
                    slug = make_slug(gu_name, name, used_slugs)

                lcur.execute(
                    """
                    INSERT INTO dong
                        (slug, name, gu, code, geom, centroid, area_km2,
                         score_rent, score_amenity, score_transit,
                         created_at, updated_at)
                    VALUES (%s, %s, %s, %s,
                            ST_GeomFromEWKT(%s), ST_GeomFromEWKT(%s),
                            %s, 0.0, 0.0, 0.0,
                            NOW(), NOW())
                    ON CONFLICT (code) DO UPDATE SET
                        name = EXCLUDED.name,
                        gu = EXCLUDED.gu,
                        geom = EXCLUDED.geom,
                        centroid = EXCLUDED.centroid,
                        area_km2 = EXCLUDED.area_km2,
                        updated_at = NOW()
                    RETURNING (xmax = 0)  -- TRUE if inserted, FALSE if updated
                    """,
                    (slug, name, gu_name, adong_code, boundary, location, area_km2),
                )
                is_insert = lcur.fetchone()[0]
                if is_insert:
                    inserted += 1
                else:
                    updated += 1
        local.commit()
        print(f"[04_dong] inserted={inserted} updated={updated} total={len(rows)}")
        verify_count(rds, local, "dong", rds_table="adong")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
