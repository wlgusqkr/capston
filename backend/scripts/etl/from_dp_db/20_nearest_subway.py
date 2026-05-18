"""[TEMP] DP_DB nearest_subway_adong + nearest_subway_ldong -> SLGI 임시 ETL.

단계 6에서 1회 실행. 추후 실 초기 적재 ETL(별도 plan)로 대체 필요.

매핑:
- nearest_subway_adong (adong_code, rank) [pk], station_name, distance_m 1:1
- nearest_subway_ldong (ldong_code, rank) [pk], station_name, distance_m 1:1
의존성: adong (04), ldong (03).
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import batch_insert, connect_dp_db, connect_slgi, verify_count


SELECT_NA = """
SELECT adong_code, rank, station_name, distance_m
FROM nearest_subway_adong
"""

INSERT_NA = """
INSERT INTO nearest_subway_adong (adong_code, rank, station_name, distance_m)
VALUES (%s, %s, %s, %s)
ON CONFLICT (adong_code, rank) DO UPDATE SET
    station_name = EXCLUDED.station_name,
    distance_m = EXCLUDED.distance_m
"""

SELECT_NL = """
SELECT ldong_code, rank, station_name, distance_m
FROM nearest_subway_ldong
"""

INSERT_NL = """
INSERT INTO nearest_subway_ldong (ldong_code, rank, station_name, distance_m)
VALUES (%s, %s, %s, %s)
ON CONFLICT (ldong_code, rank) DO UPDATE SET
    station_name = EXCLUDED.station_name,
    distance_m = EXCLUDED.distance_m
"""


def main() -> int:
    with connect_dp_db() as src, connect_slgi() as dst:
        with src.cursor() as cur:
            cur.execute(SELECT_NA)
            rows = cur.fetchall()
        n = batch_insert(dst, INSERT_NA, rows)
        print(f"[20_nearest_subway] nearest_subway_adong inserted/upserted {n} rows")
        verify_count(src, dst, "nearest_subway_adong")

        with src.cursor() as cur:
            cur.execute(SELECT_NL)
            rows = cur.fetchall()
        n = batch_insert(dst, INSERT_NL, rows)
        print(f"[20_nearest_subway] nearest_subway_ldong inserted/upserted {n} rows")
        verify_count(src, dst, "nearest_subway_ldong")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
