"""02 — RDS.gu (25행) → local.gu (1:1)."""

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
                SELECT gu_code, name, area_m2,
                       ST_AsEWKT(boundary), ST_AsEWKT(location)
                FROM gu
                """
            )
            rows = rcur.fetchall()

        with local.cursor() as lcur:
            for gu_code, name, area_m2, boundary, location in rows:
                lcur.execute(
                    """
                    INSERT INTO gu (gu_code, name, area_m2, boundary, location)
                    VALUES (%s, %s, %s, ST_GeomFromEWKT(%s), ST_GeomFromEWKT(%s))
                    ON CONFLICT (gu_code) DO UPDATE SET
                        name = EXCLUDED.name,
                        area_m2 = EXCLUDED.area_m2,
                        boundary = EXCLUDED.boundary,
                        location = EXCLUDED.location
                    """,
                    (gu_code, name, area_m2, boundary, location),
                )
        local.commit()
        print(f"[02_gu] upserted {len(rows)} rows")
        verify_count(rds, local, "gu")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
