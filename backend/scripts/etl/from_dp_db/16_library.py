"""[TEMP] DP_DB library + library_hours -> SLGI 임시 ETL.

단계 6에서 1회 실행. 추후 실 초기 적재 ETL(별도 plan)로 대체 필요.

매핑:
- library (id PK, name, library_type, remark, location, ldong_code, adong_code) 1:1
- library_hours (library_id, day_type) [pk], time_open, time_close, is_irregular 1:1
의존성: adong (04), ldong (03).
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import batch_insert, connect_dp_db, connect_slgi, verify_count


SELECT_LIB = """
SELECT id, name, library_type, remark,
       ST_AsEWKT(location), ldong_code, adong_code
FROM library
"""

INSERT_LIB = """
INSERT INTO library
  (id, name, library_type, remark, location, ldong_code, adong_code)
VALUES (%s, %s, %s, %s, ST_GeomFromEWKT(%s), %s, %s)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    library_type = EXCLUDED.library_type,
    remark = EXCLUDED.remark,
    location = EXCLUDED.location,
    ldong_code = EXCLUDED.ldong_code,
    adong_code = EXCLUDED.adong_code
"""

SELECT_LH = """
SELECT library_id, day_type, time_open, time_close, is_irregular
FROM library_hours
"""

INSERT_LH = """
INSERT INTO library_hours
  (library_id, day_type, time_open, time_close, is_irregular)
VALUES (%s, %s, %s, %s, %s)
ON CONFLICT (library_id, day_type) DO UPDATE SET
    time_open = EXCLUDED.time_open,
    time_close = EXCLUDED.time_close,
    is_irregular = EXCLUDED.is_irregular
"""


def main() -> int:
    with connect_dp_db() as src, connect_slgi() as dst:
        with src.cursor() as cur:
            cur.execute(SELECT_LIB)
            rows = cur.fetchall()
        n = batch_insert(dst, INSERT_LIB, rows)
        print(f"[16_library] library inserted/upserted {n} rows")
        verify_count(src, dst, "library")

        with src.cursor() as cur:
            cur.execute(SELECT_LH)
            rows = cur.fetchall()
        n = batch_insert(dst, INSERT_LH, rows)
        print(f"[16_library] library_hours inserted/upserted {n} rows")
        verify_count(src, dst, "library_hours")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
