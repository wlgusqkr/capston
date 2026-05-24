"""08 — business_category (247행) → local."""

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
                SELECT subcategory_code, subcategory_name,
                       middle_category_code, middle_category_name,
                       main_category_code, main_category_name
                FROM business_category
                """
            )
            rows = rcur.fetchall()
        coerced = [
            (sc, sn or "", mc or "", mn or "", mac or "", man or "")
            for (sc, sn, mc, mn, mac, man) in rows
        ]
        with local.cursor() as lcur:
            lcur.executemany(
                """
                INSERT INTO business_category
                  (subcategory_code, subcategory_name,
                   middle_category_code, middle_category_name,
                   main_category_code, main_category_name)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (subcategory_code) DO UPDATE SET
                  subcategory_name = EXCLUDED.subcategory_name,
                  middle_category_code = EXCLUDED.middle_category_code,
                  middle_category_name = EXCLUDED.middle_category_name,
                  main_category_code = EXCLUDED.main_category_code,
                  main_category_name = EXCLUDED.main_category_name
                """,
                coerced,
            )
        local.commit()
        print(f"[08] business_category upserted: {len(coerced)}")
        verify_count(rds, local, "business_category")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
