"""[TEMP] DP_DB ldong + adjacent_ldong -> SLGI 임시 ETL.

단계 6에서 1회 실행. 추후 실 초기 적재 ETL(별도 plan)로 대체 필요.

매핑:
- ldong (ldong_code PK, gu_code FK, name, slug, area_m2, boundary, location) 1:1
- adjacent_ldong (ldong1_code, ldong2_code) [pk] 1:1
의존성: gu (02 선행).
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import batch_insert, connect_dp_db, connect_slgi, verify_count


SELECT_LDONG = """
SELECT ldong_code, gu_code, name, slug, area_m2,
       ST_AsEWKT(boundary), ST_AsEWKT(location)
FROM ldong
"""

INSERT_LDONG = """
INSERT INTO ldong (ldong_code, gu_code, name, slug, area_m2, boundary, location)
VALUES (%s, %s, %s, %s, %s, ST_GeomFromEWKT(%s), ST_GeomFromEWKT(%s))
ON CONFLICT (ldong_code) DO UPDATE SET
    gu_code = EXCLUDED.gu_code,
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    area_m2 = EXCLUDED.area_m2,
    boundary = EXCLUDED.boundary,
    location = EXCLUDED.location
"""

SELECT_ADJ = "SELECT ldong1_code, ldong2_code FROM adjacent_ldong"

INSERT_ADJ = """
INSERT INTO adjacent_ldong (ldong1_code, ldong2_code)
VALUES (%s, %s)
ON CONFLICT (ldong1_code, ldong2_code) DO NOTHING
"""


def main() -> int:
    with connect_dp_db() as src, connect_slgi() as dst:
        with src.cursor() as cur:
            cur.execute(SELECT_LDONG)
            rows = cur.fetchall()
        n = batch_insert(dst, INSERT_LDONG, rows)
        print(f"[03_ldong] ldong inserted/upserted {n} rows")
        verify_count(src, dst, "ldong")

        with src.cursor() as cur:
            cur.execute(SELECT_ADJ)
            adj_rows = cur.fetchall()
        n_adj = batch_insert(dst, INSERT_ADJ, adj_rows)
        print(f"[03_ldong] adjacent_ldong inserted {n_adj} rows")
        verify_count(src, dst, "adjacent_ldong")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
