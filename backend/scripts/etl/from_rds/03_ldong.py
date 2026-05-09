"""03 — RDS.ldong (467행) → local.ldong (1:1, gu_code FK)."""

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
                SELECT ldong_code, gu_code, name, area_m2,
                       ST_AsEWKT(boundary), ST_AsEWKT(location)
                FROM ldong
                """
            )
            rows = rcur.fetchall()

        with local.cursor() as lcur:
            for ldong_code, gu_code, name, area_m2, boundary, location in rows:
                lcur.execute(
                    """
                    INSERT INTO ldong (ldong_code, gu_code, name, area_m2, boundary, location)
                    VALUES (%s, %s, %s, %s, ST_GeomFromEWKT(%s), ST_GeomFromEWKT(%s))
                    ON CONFLICT (ldong_code) DO UPDATE SET
                        gu_code = EXCLUDED.gu_code,
                        name = EXCLUDED.name,
                        area_m2 = EXCLUDED.area_m2,
                        boundary = EXCLUDED.boundary,
                        location = EXCLUDED.location
                    """,
                    (ldong_code, gu_code, name, area_m2, boundary, location),
                )
        local.commit()
        print(f"[03_ldong] upserted {len(rows)} rows")
        verify_count(rds, local, "ldong")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
