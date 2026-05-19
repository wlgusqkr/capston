"""[TEMP] DP_DB subway_congestion -> SLGI 임시 ETL.

단계 6에서 1회 실행. 추후 실 초기 적재 ETL(별도 plan)로 대체 필요.

매핑: subway_congestion (station_id, day_type, direction, express_yn, time) [pk] 1:1.
의존성: subway_station (10).
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import batch_insert, connect_dp_db, connect_slgi, verify_count


SELECT_SQL = """
SELECT station_id, day_type, direction, express_yn, time, congestion
FROM subway_congestion
"""

INSERT_SQL = """
INSERT INTO subway_congestion
  (station_id, day_type, direction, express_yn, time, congestion)
VALUES (%s, %s, %s, %s, %s, %s)
ON CONFLICT (station_id, day_type, direction, express_yn, time) DO UPDATE SET
    congestion = EXCLUDED.congestion
"""


def main() -> int:
    with connect_dp_db() as src, connect_slgi() as dst:
        with src.cursor() as cur:
            cur.execute(SELECT_SQL)
            rows = cur.fetchall()
        n = batch_insert(dst, INSERT_SQL, rows, batch_size=5000)
        print(f"[12_subway_congestion] inserted/upserted {n} rows")
        verify_count(src, dst, "subway_congestion")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
