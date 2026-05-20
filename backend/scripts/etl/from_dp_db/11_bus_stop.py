"""[TEMP] DP_DB bus_stop -> SLGI 임시 ETL.

단계 6에서 1회 실행. 추후 실 초기 적재 ETL(별도 plan)로 대체 필요.

매핑: bus_stop (id PK) 1:1. location은 NULL 허용 (가상/차고지/미정차).
의존성: adong (04), ldong (03).
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import batch_insert, connect_dp_db, connect_slgi, verify_count


SELECT_SQL = """
SELECT id, stop_number, name, ldong_code, adong_code,
       ST_AsEWKT(location)
FROM bus_stop
"""

INSERT_SQL = """
INSERT INTO bus_stop (id, stop_number, name, ldong_code, adong_code, location)
VALUES (%s, %s, %s, %s, %s,
        CASE WHEN %s IS NULL THEN NULL ELSE ST_GeomFromEWKT(%s) END)
ON CONFLICT (id) DO UPDATE SET
    stop_number = EXCLUDED.stop_number,
    name = EXCLUDED.name,
    ldong_code = EXCLUDED.ldong_code,
    adong_code = EXCLUDED.adong_code,
    location = EXCLUDED.location
"""


def main() -> int:
    with connect_dp_db() as src, connect_slgi() as dst:
        with src.cursor() as cur:
            cur.execute(SELECT_SQL)
            rows = cur.fetchall()
        # location_ewkt 두 번 (CASE WHEN check + ST_GeomFromEWKT 인자)
        coerced = [
            (rid, snum, nm, lc, ac, geom, geom)
            for (rid, snum, nm, lc, ac, geom) in rows
        ]
        n = batch_insert(dst, INSERT_SQL, coerced, batch_size=5000)
        print(f"[11_bus_stop] inserted/upserted {n} rows")
        verify_count(src, dst, "bus_stop")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
