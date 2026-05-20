"""[TEMP] DP_DB univ + univ_adong + univ_ldong -> SLGI 임시 ETL.

단계 6에서 1회 실행. 추후 실 초기 적재 ETL(별도 plan)로 대체 필요.

매핑:
- univ (id PK, name, school_type, boundary, location) 1:1
- univ_adong (univ_id, adong_code) [pk] 1:1
- univ_ldong (univ_id, ldong_code) [pk] 1:1
의존성: adong (04), ldong (03).
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import batch_insert, connect_dp_db, connect_slgi, verify_count


SELECT_UNIV = """
SELECT id, name, school_type,
       ST_AsEWKT(boundary), ST_AsEWKT(location)
FROM univ
"""

INSERT_UNIV = """
INSERT INTO univ (id, name, school_type, boundary, location)
VALUES (%s, %s, %s, ST_GeomFromEWKT(%s), ST_GeomFromEWKT(%s))
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    school_type = EXCLUDED.school_type,
    boundary = EXCLUDED.boundary,
    location = EXCLUDED.location
"""

SELECT_UA = "SELECT univ_id, adong_code FROM univ_adong"
INSERT_UA = """
INSERT INTO univ_adong (univ_id, adong_code)
VALUES (%s, %s)
ON CONFLICT (univ_id, adong_code) DO NOTHING
"""

SELECT_UL = "SELECT univ_id, ldong_code FROM univ_ldong"
INSERT_UL = """
INSERT INTO univ_ldong (univ_id, ldong_code)
VALUES (%s, %s)
ON CONFLICT (univ_id, ldong_code) DO NOTHING
"""


def main() -> int:
    with connect_dp_db() as src, connect_slgi() as dst:
        with src.cursor() as cur:
            cur.execute(SELECT_UNIV)
            rows = cur.fetchall()
        n = batch_insert(dst, INSERT_UNIV, rows)
        print(f"[15_univ] univ inserted/upserted {n} rows")
        verify_count(src, dst, "univ")

        with src.cursor() as cur:
            cur.execute(SELECT_UA)
            rows = cur.fetchall()
        n = batch_insert(dst, INSERT_UA, rows)
        print(f"[15_univ] univ_adong inserted {n} rows")
        verify_count(src, dst, "univ_adong")

        with src.cursor() as cur:
            cur.execute(SELECT_UL)
            rows = cur.fetchall()
        n = batch_insert(dst, INSERT_UL, rows)
        print(f"[15_univ] univ_ldong inserted {n} rows")
        verify_count(src, dst, "univ_ldong")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
