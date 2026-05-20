"""[TEMP] DP_DB bus_congestion (~8M) -> SLGI 임시 ETL.

단계 6에서 1회 실행. 추후 실 초기 적재 ETL(별도 plan)로 대체 필요.

매핑: bus_congestion (bus_stop_id, date, time) [pk] 1:1.
의존성: bus_stop (11).

대용량 (~8M). server-side cursor + execute_batch 스트리밍 패턴.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import connect_dp_db, connect_slgi, stream_and_insert, verify_count


SELECT_SQL = "SELECT bus_stop_id, date, time, congestion FROM bus_congestion"

INSERT_SQL = """
INSERT INTO bus_congestion (bus_stop_id, date, time, congestion)
VALUES (%s, %s, %s, %s)
ON CONFLICT (bus_stop_id, date, time) DO UPDATE SET
    congestion = EXCLUDED.congestion
"""


def main() -> int:
    with connect_dp_db() as src, connect_slgi() as dst:
        n = stream_and_insert(
            src, dst, SELECT_SQL, INSERT_SQL,
            fetch_size=10000, batch_size=10000, label="bus_congestion",
        )
        print(f"[13_bus_congestion] inserted/upserted {n} rows")
        verify_count(src, dst, "bus_congestion")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
