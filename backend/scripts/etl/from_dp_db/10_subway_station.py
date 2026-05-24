"""[TEMP] DP_DB subway_station -> SLGI 임시 ETL.

단계 6에서 1회 실행. 추후 실 초기 적재 ETL(별도 plan)로 대체 필요.

매핑: subway_station (id PK) 1:1.
의존성: adong (04), ldong (03).
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import batch_insert, connect_dp_db, connect_slgi, verify_count


SELECT_SQL = """
SELECT id, name, line, ldong_code, adong_code, ST_AsEWKT(location)
FROM subway_station
"""

INSERT_SQL = """
INSERT INTO subway_station (id, name, line, ldong_code, adong_code, location)
VALUES (%s, %s, %s, %s, %s, ST_GeomFromEWKT(%s))
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    line = EXCLUDED.line,
    ldong_code = EXCLUDED.ldong_code,
    adong_code = EXCLUDED.adong_code,
    location = EXCLUDED.location
"""


def main() -> int:
    with connect_dp_db() as src, connect_slgi() as dst:
        with src.cursor() as cur:
            cur.execute(SELECT_SQL)
            rows = cur.fetchall()
        n = batch_insert(dst, INSERT_SQL, rows)
        print(f"[10_subway_station] inserted/upserted {n} rows")
        verify_count(src, dst, "subway_station")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
