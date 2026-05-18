"""13 — subway_congestion (65,561행) → local.

RDS station_id (varchar, = SubwayStation.external_id 값)
→ local.SubwayStation 의 bigint id 로 lookup 후 station_id 컬럼에 채움.

UQ = (station_id, day_type, direction, express_yn, time).
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import Progress, connect, fetch_in_batches, make_argparser, verify_count


def main() -> int:
    args = make_argparser(__doc__).parse_args()

    with connect(args.rds_dsn) as rds, connect(args.local_dsn) as local:
        # external_id (varchar) → bigint id 매핑
        with local.cursor() as lcur:
            lcur.execute(
                "SELECT external_id, id FROM subway_station WHERE external_id IS NOT NULL"
            )
            ext_to_id = dict(lcur.fetchall())
        print(f"[13] subway_station lookup: {len(ext_to_id)} entries")

        with rds.cursor() as cnt_cur:
            cnt_cur.execute("SELECT COUNT(*) FROM subway_congestion")
            total = cnt_cur.fetchone()[0]

        with rds.cursor(name="subway_cong_cur") as rcur:
            rcur.itersize = args.batch_size
            rcur.execute(
                """
                SELECT station_id, day_type, direction, express_yn, time, congestion
                FROM subway_congestion
                """
            )
            prog = Progress(total, "subway_congestion", step=10000)
            skipped = 0
            with local.cursor() as lcur:
                for batch in fetch_in_batches(rcur, args.batch_size):
                    coerced = []
                    for ext_sid, day_type, direction, express_yn, t, cong in batch:
                        bigint_id = ext_to_id.get(ext_sid)
                        if bigint_id is None:
                            skipped += 1
                            continue
                        coerced.append(
                            (bigint_id, day_type, direction, express_yn, t, cong)
                        )
                    if coerced:
                        lcur.executemany(
                            """
                            INSERT INTO subway_congestion
                              (station_id, day_type, direction, express_yn, time, congestion)
                            VALUES (%s, %s, %s, %s, %s, %s)
                            ON CONFLICT (station_id, day_type, direction, express_yn, time)
                            DO UPDATE SET congestion = EXCLUDED.congestion
                            """,
                            coerced,
                        )
                        local.commit()
                    prog.add(len(batch))
            prog.finish()
            print(f"[13] subway_congestion skipped (station not found): {skipped}")

        verify_count(rds, local, "subway_congestion")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
