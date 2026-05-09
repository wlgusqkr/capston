"""01 — RDS.seoul (1행) → local.seoul (1:1).

PK = code. 컬럼 5종 1:1.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import connect, make_argparser, upsert_many, verify_count


def main() -> int:
    args = make_argparser(__doc__).parse_args()

    with connect(args.rds_dsn) as rds, connect(args.local_dsn) as local:
        with rds.cursor() as rcur:
            rcur.execute(
                """
                SELECT code, name, area_m2,
                       ST_AsEWKT(boundary), ST_AsEWKT(location)
                FROM seoul
                """
            )
            rows = rcur.fetchall()

        # geom은 별도 SQL로 ST_GeomFromEWKT 캐스팅 — executemany 어려우므로 row 단위.
        with local.cursor() as lcur:
            for code, name, area_m2, boundary_ewkt, location_ewkt in rows:
                lcur.execute(
                    """
                    INSERT INTO seoul (code, name, area_m2, boundary, location)
                    VALUES (%s, %s, %s, ST_GeomFromEWKT(%s), ST_GeomFromEWKT(%s))
                    ON CONFLICT (code) DO UPDATE SET
                        name = EXCLUDED.name,
                        area_m2 = EXCLUDED.area_m2,
                        boundary = EXCLUDED.boundary,
                        location = EXCLUDED.location
                    """,
                    (code, name, area_m2, boundary_ewkt, location_ewkt),
                )
        local.commit()

        print(f"[01_seoul] upserted {len(rows)} rows")
        verify_count(rds, local, "seoul")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
