"""[TEMP] DP_DB adong + adjacent_adong -> SLGI 임시 ETL.

단계 6에서 1회 실행. 추후 실 초기 적재 ETL(별도 plan)로 대체 필요.

매핑:
- adong (adong_code PK, gu_code FK, name, slug, area_m2, boundary, location) 1:1
- adjacent_adong (adong1_code, adong2_code) [pk] 1:1
의존성: gu (02 선행).
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import batch_insert, connect_dp_db, connect_slgi, verify_count


SELECT_ADONG = """
SELECT adong_code, gu_code, name, slug, area_m2,
       ST_AsEWKT(boundary), ST_AsEWKT(location)
FROM adong
"""

INSERT_ADONG = """
INSERT INTO adong (adong_code, gu_code, name, slug, area_m2, boundary, location)
VALUES (%s, %s, %s, %s, %s, ST_GeomFromEWKT(%s), ST_GeomFromEWKT(%s))
ON CONFLICT (adong_code) DO UPDATE SET
    gu_code = EXCLUDED.gu_code,
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    area_m2 = EXCLUDED.area_m2,
    boundary = EXCLUDED.boundary,
    location = EXCLUDED.location
"""

SELECT_ADJ = "SELECT adong1_code, adong2_code FROM adjacent_adong"

INSERT_ADJ = """
INSERT INTO adjacent_adong (adong1_code, adong2_code)
VALUES (%s, %s)
ON CONFLICT (adong1_code, adong2_code) DO NOTHING
"""


def main() -> int:
    with connect_dp_db() as src, connect_slgi() as dst:
        with src.cursor() as cur:
            cur.execute(SELECT_ADONG)
            rows = cur.fetchall()
        n = batch_insert(dst, INSERT_ADONG, rows)
        print(f"[04_adong] adong inserted/upserted {n} rows")
        verify_count(src, dst, "adong")

        with src.cursor() as cur:
            cur.execute(SELECT_ADJ)
            adj_rows = cur.fetchall()
        n_adj = batch_insert(dst, INSERT_ADJ, adj_rows)
        print(f"[04_adong] adjacent_adong inserted {n_adj} rows")
        verify_count(src, dst, "adjacent_adong")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
