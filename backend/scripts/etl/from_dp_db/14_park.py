"""[TEMP] DP_DB park + park_adong + park_ldong -> SLGI 임시 ETL.

단계 6에서 1회 실행. 추후 실 초기 적재 ETL(별도 plan)로 대체 필요.

매핑:
- park (id PK, name, category, area_m2, boundary, location) 1:1
- park_adong (park_id, adong_code) [pk] 1:1
- park_ldong (park_id, ldong_code) [pk] 1:1
의존성: adong (04), ldong (03).
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import batch_insert, connect_dp_db, connect_slgi, verify_count


SELECT_PARK = """
SELECT id, name, category, area_m2,
       ST_AsEWKT(boundary), ST_AsEWKT(location)
FROM park
"""

INSERT_PARK = """
INSERT INTO park (id, name, category, area_m2, boundary, location)
VALUES (%s, %s, %s, %s, ST_GeomFromEWKT(%s), ST_GeomFromEWKT(%s))
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    area_m2 = EXCLUDED.area_m2,
    boundary = EXCLUDED.boundary,
    location = EXCLUDED.location
"""

SELECT_PA = "SELECT park_id, adong_code FROM park_adong"
INSERT_PA = """
INSERT INTO park_adong (park_id, adong_code)
VALUES (%s, %s)
ON CONFLICT (park_id, adong_code) DO NOTHING
"""

SELECT_PL = "SELECT park_id, ldong_code FROM park_ldong"
INSERT_PL = """
INSERT INTO park_ldong (park_id, ldong_code)
VALUES (%s, %s)
ON CONFLICT (park_id, ldong_code) DO NOTHING
"""


def main() -> int:
    with connect_dp_db() as src, connect_slgi() as dst:
        with src.cursor() as cur:
            cur.execute(SELECT_PARK)
            rows = cur.fetchall()
        n = batch_insert(dst, INSERT_PARK, rows)
        print(f"[14_park] park inserted/upserted {n} rows")
        verify_count(src, dst, "park")

        with src.cursor() as cur:
            cur.execute(SELECT_PA)
            rows = cur.fetchall()
        n = batch_insert(dst, INSERT_PA, rows)
        print(f"[14_park] park_adong inserted {n} rows")
        verify_count(src, dst, "park_adong")

        with src.cursor() as cur:
            cur.execute(SELECT_PL)
            rows = cur.fetchall()
        n = batch_insert(dst, INSERT_PL, rows)
        print(f"[14_park] park_ldong inserted {n} rows")
        verify_count(src, dst, "park_ldong")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
