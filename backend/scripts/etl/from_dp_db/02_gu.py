"""[TEMP] DP_DB gu + adjacent_gu -> SLGI 임시 ETL.

단계 6에서 1회 실행. 추후 실 초기 적재 ETL(별도 plan)로 대체 필요.

매핑:
- gu (gu_code PK, name, slug, area_m2, boundary, location) 1:1
- adjacent_gu (gu1_code, gu2_code) [pk] 1:1 (양방향 두 행 모두 보존)
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import batch_insert, connect_dp_db, connect_slgi, verify_count


SELECT_GU = """
SELECT gu_code, name, slug, area_m2,
       ST_AsEWKT(boundary), ST_AsEWKT(location)
FROM gu
"""

INSERT_GU = """
INSERT INTO gu (gu_code, name, slug, area_m2, boundary, location)
VALUES (%s, %s, %s, %s, ST_GeomFromEWKT(%s), ST_GeomFromEWKT(%s))
ON CONFLICT (gu_code) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    area_m2 = EXCLUDED.area_m2,
    boundary = EXCLUDED.boundary,
    location = EXCLUDED.location
"""

SELECT_ADJ = "SELECT gu1_code, gu2_code FROM adjacent_gu"

INSERT_ADJ = """
INSERT INTO adjacent_gu (gu1_code, gu2_code)
VALUES (%s, %s)
ON CONFLICT (gu1_code, gu2_code) DO NOTHING
"""


def main() -> int:
    with connect_dp_db() as src, connect_slgi() as dst:
        # gu
        with src.cursor() as cur:
            cur.execute(SELECT_GU)
            gu_rows = cur.fetchall()
        n_gu = batch_insert(dst, INSERT_GU, gu_rows)
        print(f"[02_gu] gu inserted/upserted {n_gu} rows")
        verify_count(src, dst, "gu")

        # adjacent_gu
        with src.cursor() as cur:
            cur.execute(SELECT_ADJ)
            adj_rows = cur.fetchall()
        n_adj = batch_insert(dst, INSERT_ADJ, adj_rows)
        print(f"[02_gu] adjacent_gu inserted {n_adj} rows")
        verify_count(src, dst, "adjacent_gu")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
