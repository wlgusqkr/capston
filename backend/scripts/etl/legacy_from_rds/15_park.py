"""15 — park (1,886행) → local. 1:1.

RDS boundary는 모두 MULTIPOLYGON (검증 완료) — ST_Multi 캐스팅 불필요.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import connect, make_argparser, verify_count


def main() -> int:
    args = make_argparser(__doc__).parse_args()

    with connect(args.rds_dsn) as rds, connect(args.local_dsn) as local:
        with rds.cursor() as rcur:
            rcur.execute(
                """
                SELECT id, name, category, area_m2,
                       ST_AsEWKT(boundary), ST_AsEWKT(location)
                FROM park
                """
            )
            rows = rcur.fetchall()

        with local.cursor() as lcur:
            for park_id, name, category, area_m2, boundary, location in rows:
                lcur.execute(
                    """
                    INSERT INTO park
                      (id, name, category, area_m2, boundary, location)
                    VALUES (%s, %s, %s, %s, ST_GeomFromEWKT(%s), ST_GeomFromEWKT(%s))
                    ON CONFLICT (id) DO UPDATE SET
                      name = EXCLUDED.name,
                      category = EXCLUDED.category,
                      area_m2 = EXCLUDED.area_m2,
                      boundary = EXCLUDED.boundary,
                      location = EXCLUDED.location
                    """,
                    (park_id, name, category or "", area_m2, boundary, location),
                )
        local.commit()
        print(f"[15] park upserted: {len(rows)}")
        verify_count(rds, local, "park")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
