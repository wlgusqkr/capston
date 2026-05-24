"""[TEMP] DP_DB seoul -> SLGI seoul 임시 ETL.

단계 6에서 1회 실행. 추후 실 초기 적재 ETL(별도 plan)로 대체 필요.

매핑: seoul (code PK, name, area_m2, boundary, location) 1:1.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import batch_insert, connect_dp_db, connect_slgi, verify_count


SELECT_SQL = """
SELECT code, name, area_m2,
       ST_AsEWKT(boundary) AS boundary_ewkt,
       ST_AsEWKT(location) AS location_ewkt
FROM seoul
"""

INSERT_SQL = """
INSERT INTO seoul (code, name, area_m2, boundary, location)
VALUES (%s, %s, %s, ST_GeomFromEWKT(%s), ST_GeomFromEWKT(%s))
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    area_m2 = EXCLUDED.area_m2,
    boundary = EXCLUDED.boundary,
    location = EXCLUDED.location
"""


def main() -> int:
    with connect_dp_db() as src, connect_slgi() as dst:
        with src.cursor() as cur:
            cur.execute(SELECT_SQL)
            rows = cur.fetchall()
        inserted = batch_insert(dst, INSERT_SQL, rows)
        print(f"[01_seoul] inserted/upserted {inserted} rows")
        verify_count(src, dst, "seoul")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
