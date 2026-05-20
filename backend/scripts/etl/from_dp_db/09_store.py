"""[TEMP] DP_DB store -> SLGI 임시 ETL.

단계 6에서 1회 실행. 추후 실 초기 적재 ETL(별도 plan)로 대체 필요.

매핑: store (id PK, ~534k 행) 1:1.
의존성: business_category (07), ksci_category (08), adong (04), ldong (03).
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import connect_dp_db, connect_slgi, stream_and_insert, verify_count


SELECT_SQL = """
SELECT id, name, branch_name, category_code, ksci_code,
       adong_code, ldong_code, address, ST_AsEWKT(location)
FROM store
"""

INSERT_SQL = """
INSERT INTO store
  (id, name, branch_name, category_code, ksci_code,
   adong_code, ldong_code, address, location)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s, ST_GeomFromEWKT(%s))
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    branch_name = EXCLUDED.branch_name,
    category_code = EXCLUDED.category_code,
    ksci_code = EXCLUDED.ksci_code,
    adong_code = EXCLUDED.adong_code,
    ldong_code = EXCLUDED.ldong_code,
    address = EXCLUDED.address,
    location = EXCLUDED.location
"""


def main() -> int:
    with connect_dp_db() as src, connect_slgi() as dst:
        n = stream_and_insert(
            src, dst, SELECT_SQL, INSERT_SQL,
            fetch_size=10000, batch_size=5000, label="store",
        )
        print(f"[09_store] inserted/upserted {n} rows")
        verify_count(src, dst, "store")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
