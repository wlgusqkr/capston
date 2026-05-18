"""[TEMP] DP_DB business_category -> SLGI 임시 ETL.

단계 6에서 1회 실행. 추후 실 초기 적재 ETL(별도 plan)로 대체 필요.

매핑: business_category (subcategory_code PK) 1:1.
store 적재 (09)의 선행 마스터.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import batch_insert, connect_dp_db, connect_slgi, verify_count


SELECT_SQL = """
SELECT main_category_code, main_category_name,
       middle_category_code, middle_category_name,
       subcategory_code, subcategory_name
FROM business_category
"""

INSERT_SQL = """
INSERT INTO business_category
  (main_category_code, main_category_name,
   middle_category_code, middle_category_name,
   subcategory_code, subcategory_name)
VALUES (%s, %s, %s, %s, %s, %s)
ON CONFLICT (subcategory_code) DO UPDATE SET
    main_category_code = EXCLUDED.main_category_code,
    main_category_name = EXCLUDED.main_category_name,
    middle_category_code = EXCLUDED.middle_category_code,
    middle_category_name = EXCLUDED.middle_category_name,
    subcategory_name = EXCLUDED.subcategory_name
"""


def main() -> int:
    with connect_dp_db() as src, connect_slgi() as dst:
        with src.cursor() as cur:
            cur.execute(SELECT_SQL)
            rows = cur.fetchall()
        n = batch_insert(dst, INSERT_SQL, rows)
        print(f"[07_business_category] inserted/upserted {n} rows")
        verify_count(src, dst, "business_category")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
