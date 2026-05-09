"""12 — bus_stop (15,429행) → local.

매핑:
- id (varchar) → external_id
- stop_number → arsId
- adong_code → dong FK (95% 커버, NULL 5%는 좌표 ST_Contains 백필)
- ldong_code → ldong FK
- location → geom

NULL adong을 좌표로 백필: 첫 패스에서 INSERT 모두 끝난 뒤 별도 UPDATE.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import Progress, connect, fetch_in_batches, make_argparser, verify_count


def main() -> int:
    args = make_argparser(__doc__).parse_args()

    with connect(args.rds_dsn) as rds, connect(args.local_dsn) as local:
        with rds.cursor() as cnt_cur:
            cnt_cur.execute("SELECT COUNT(*) FROM bus_stop")
            total = cnt_cur.fetchone()[0]

        with rds.cursor(name="bus_stop_cur") as rcur:
            rcur.itersize = args.batch_size
            rcur.execute(
                """
                SELECT id, stop_number, name, adong_code, ldong_code,
                       ST_AsEWKT(location)
                FROM bus_stop
                """
            )
            prog = Progress(total, "bus_stop", step=2000)
            with local.cursor() as lcur:
                for batch in fetch_in_batches(rcur, args.batch_size):
                    coerced = [
                        (
                            ext_id,
                            stop_no or "",
                            name or "",
                            adong,
                            ldong,
                            geom,
                        )
                        for (ext_id, stop_no, name, adong, ldong, geom) in batch
                    ]
                    lcur.executemany(
                        """
                        INSERT INTO bus_stop
                          (external_id, "arsId", name, adong_code, ldong_code, geom,
                           created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, ST_GeomFromEWKT(%s), NOW(), NOW())
                        ON CONFLICT (external_id) DO UPDATE SET
                          "arsId" = EXCLUDED."arsId",
                          name = EXCLUDED.name,
                          adong_code = EXCLUDED.adong_code,
                          ldong_code = EXCLUDED.ldong_code,
                          geom = EXCLUDED.geom,
                          updated_at = NOW()
                        """,
                        coerced,
                    )
                    local.commit()
                    prog.add(len(batch))
            prog.finish()

        # 백필: adong_code IS NULL인 행을 좌표 → Dong.geom ST_Contains로 채움
        with local.cursor() as lcur:
            lcur.execute("SELECT COUNT(*) FROM bus_stop WHERE adong_code IS NULL")
            null_before = lcur.fetchone()[0]
            print(f"[12] bus_stop NULL adong_code before backfill: {null_before}")

            lcur.execute(
                """
                UPDATE bus_stop b
                SET adong_code = d.code
                FROM dong d
                WHERE b.adong_code IS NULL
                  AND b.geom IS NOT NULL
                  AND ST_Contains(d.geom, b.geom)
                """
            )
            updated = lcur.rowcount
            local.commit()

            lcur.execute("SELECT COUNT(*) FROM bus_stop WHERE adong_code IS NULL")
            null_after = lcur.fetchone()[0]
            print(
                f"[12] bus_stop backfilled adong_code: {updated} updated, "
                f"{null_after} still NULL"
            )

        verify_count(rds, local, "bus_stop")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
