"""14 — bus_congestion (~8M행) → local.

RDS bus_stop_id (varchar, = BusStop.external_id 값) → local.bus_stop bigint id 매핑.

전략:
1. local.bus_stop 의 (external_id → bigint id) lookup 테이블을 메모리에 적재 (~15k entries).
2. RDS에서 server-side cursor로 100k batch 스트리밍.
3. INSERT 는 ON CONFLICT (bus_stop_id, date, time) DO UPDATE — 멱등.
4. 8M 행 → 1만 row 단위 commit, 100k batch fetch.

샘플 모드: --limit 10000 으로 1만 row만 적재 후 검증 가능.

성능 노트:
- pure executemany는 8M에 30분~2시간 소요. 더 빠르게 하려면 staging table COPY → INSERT
  ON CONFLICT 패턴이 필요하지만, 학부 프로젝트 1회성 ETL이라 단순 executemany로 충분.
- 멱등 재실행 필요 시 ON CONFLICT가 동작.
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
                "SELECT external_id, id FROM bus_stop WHERE external_id IS NOT NULL"
            )
            ext_to_id = dict(lcur.fetchall())
        print(f"[14] bus_stop lookup: {len(ext_to_id)} entries")

        with rds.cursor() as cnt_cur:
            if args.limit:
                cnt_cur.execute(f"SELECT LEAST(COUNT(*), {args.limit}) FROM bus_congestion")
            else:
                cnt_cur.execute("SELECT COUNT(*) FROM bus_congestion")
            total = cnt_cur.fetchone()[0]

        sql = "SELECT bus_stop_id, date, time, congestion FROM bus_congestion"
        if args.limit:
            sql += f" LIMIT {args.limit}"

        with rds.cursor(name="bus_cong_cur") as rcur:
            rcur.itersize = args.batch_size
            rcur.execute(sql)
            prog = Progress(total, "bus_congestion", step=100_000)
            skipped = 0
            with local.cursor() as lcur:
                for batch in fetch_in_batches(rcur, args.batch_size):
                    coerced = []
                    for ext_bid, date, t, cong in batch:
                        bigint_id = ext_to_id.get(ext_bid)
                        if bigint_id is None:
                            skipped += 1
                            continue
                        coerced.append((bigint_id, date, t, cong))
                    if coerced:
                        lcur.executemany(
                            """
                            INSERT INTO bus_congestion (bus_stop_id, date, time, congestion)
                            VALUES (%s, %s, %s, %s)
                            ON CONFLICT (bus_stop_id, date, time)
                            DO UPDATE SET congestion = EXCLUDED.congestion
                            """,
                            coerced,
                        )
                        local.commit()
                    prog.add(len(batch))
            prog.finish()
            print(f"[14] bus_congestion skipped (bus_stop not found): {skipped}")

        verify_count(rds, local, "bus_congestion")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
