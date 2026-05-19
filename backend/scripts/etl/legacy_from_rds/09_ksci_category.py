"""09 — ksci_category (1,196행) → local."""

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
                SELECT ksci_code, subcategory_name, class_name, subclass_name,
                       middle_category_name, main_category_name
                FROM ksci_category
                """
            )
            rows = rcur.fetchall()
        coerced = [
            (k, sn or "", cn or "", scn or "", mn or "", man or "")
            for (k, sn, cn, scn, mn, man) in rows
        ]
        with local.cursor() as lcur:
            lcur.executemany(
                """
                INSERT INTO ksci_category
                  (ksci_code, subcategory_name, class_name, subclass_name,
                   middle_category_name, main_category_name)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (ksci_code) DO UPDATE SET
                  subcategory_name = EXCLUDED.subcategory_name,
                  class_name = EXCLUDED.class_name,
                  subclass_name = EXCLUDED.subclass_name,
                  middle_category_name = EXCLUDED.middle_category_name,
                  main_category_name = EXCLUDED.main_category_name
                """,
                coerced,
            )
        local.commit()
        print(f"[09] ksci_category upserted: {len(coerced)}")
        verify_count(rds, local, "ksci_category")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
