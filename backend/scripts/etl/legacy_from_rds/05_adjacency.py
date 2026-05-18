"""05 — 인접 3종 (gu/ldong/adong) → local.

RDS는 *1_code/*2_code, 우리는 *_code_a/*_code_b. 컬럼명만 다르고 행 그대로.
adjacent_adong은 Dong.code FK이므로 adong_code → Dong.code lookup 자동 (FK 컬럼명 동일).
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import connect, make_argparser, verify_count


def main() -> int:
    args = make_argparser(__doc__).parse_args()

    with connect(args.rds_dsn) as rds, connect(args.local_dsn) as local:
        # ----- adjacent_gu -----
        with rds.cursor() as rcur:
            rcur.execute("SELECT gu1_code, gu2_code FROM adjacent_gu")
            gu_rows = rcur.fetchall()
        with local.cursor() as lcur:
            lcur.executemany(
                """
                INSERT INTO adjacent_gu (gu_code_a, gu_code_b)
                VALUES (%s, %s)
                ON CONFLICT (gu_code_a, gu_code_b) DO NOTHING
                """,
                gu_rows,
            )
        local.commit()
        print(f"[05] adjacent_gu inserted/skip: {len(gu_rows)} rows submitted")

        # ----- adjacent_ldong -----
        with rds.cursor() as rcur:
            rcur.execute("SELECT ldong1_code, ldong2_code FROM adjacent_ldong")
            ldong_rows = rcur.fetchall()
        with local.cursor() as lcur:
            lcur.executemany(
                """
                INSERT INTO adjacent_ldong (ldong_code_a, ldong_code_b)
                VALUES (%s, %s)
                ON CONFLICT (ldong_code_a, ldong_code_b) DO NOTHING
                """,
                ldong_rows,
            )
        local.commit()
        print(f"[05] adjacent_ldong inserted/skip: {len(ldong_rows)} rows submitted")

        # ----- adjacent_adong (FK to Dong.code via to_field='code') -----
        # FK는 db_column이 adong_code_a/_b 이고 to_field=code (unique).
        with rds.cursor() as rcur:
            rcur.execute("SELECT adong1_code, adong2_code FROM adjacent_adong")
            adong_rows = rcur.fetchall()
        with local.cursor() as lcur:
            lcur.executemany(
                """
                INSERT INTO adjacent_adong (adong_code_a, adong_code_b)
                VALUES (%s, %s)
                ON CONFLICT (adong_code_a, adong_code_b) DO NOTHING
                """,
                adong_rows,
            )
        local.commit()
        print(f"[05] adjacent_adong inserted/skip: {len(adong_rows)} rows submitted")

        verify_count(rds, local, "adjacent_gu")
        verify_count(rds, local, "adjacent_ldong")
        verify_count(rds, local, "adjacent_adong")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
