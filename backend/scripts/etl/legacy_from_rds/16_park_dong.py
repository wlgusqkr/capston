"""16 — park_adong + park_ldong → local.

park_adong: park_id 1:1, adong_code → Dong.code FK
park_ldong: park_id 1:1, ldong_code → Ldong FK
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import connect, make_argparser, verify_count


def main() -> int:
    args = make_argparser(__doc__).parse_args()

    with connect(args.rds_dsn) as rds, connect(args.local_dsn) as local:
        # park_adong
        with rds.cursor() as rcur:
            rcur.execute("SELECT park_id, adong_code FROM park_adong")
            rows = rcur.fetchall()
        with local.cursor() as lcur:
            lcur.executemany(
                """
                INSERT INTO park_adong (park_id, adong_code)
                VALUES (%s, %s)
                ON CONFLICT (park_id, adong_code) DO NOTHING
                """,
                rows,
            )
        local.commit()
        print(f"[16] park_adong upserted: {len(rows)}")

        # park_ldong
        with rds.cursor() as rcur:
            rcur.execute("SELECT park_id, ldong_code FROM park_ldong")
            rows = rcur.fetchall()
        with local.cursor() as lcur:
            lcur.executemany(
                """
                INSERT INTO park_ldong (park_id, ldong_code)
                VALUES (%s, %s)
                ON CONFLICT (park_id, ldong_code) DO NOTHING
                """,
                rows,
            )
        local.commit()
        print(f"[16] park_ldong upserted: {len(rows)}")

        verify_count(rds, local, "park_adong")
        verify_count(rds, local, "park_ldong")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
