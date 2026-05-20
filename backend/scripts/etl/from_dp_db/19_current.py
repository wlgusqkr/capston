"""[TEMP] DP_DB current_seoul + current_gu + current_ldong + current_adong -> SLGI.

단계 6에서 1회 실행. 추후 실 초기 적재 ETL(별도 plan)로 대체 필요.

매핑: current_* 4 테이블 (각 단위별 PK, score_rent/amenity/transit) 1:1.
의존성: seoul (01), gu (02), ldong (03), adong (04).
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import batch_insert, connect_dp_db, connect_slgi, verify_count


SELECT_CS = "SELECT code, score_rent, score_amenity, score_transit FROM current_seoul"
INSERT_CS = """
INSERT INTO current_seoul (code, score_rent, score_amenity, score_transit)
VALUES (%s, %s, %s, %s)
ON CONFLICT (code) DO UPDATE SET
    score_rent = EXCLUDED.score_rent,
    score_amenity = EXCLUDED.score_amenity,
    score_transit = EXCLUDED.score_transit
"""

SELECT_CG = "SELECT gu_code, score_rent, score_amenity, score_transit FROM current_gu"
INSERT_CG = """
INSERT INTO current_gu (gu_code, score_rent, score_amenity, score_transit)
VALUES (%s, %s, %s, %s)
ON CONFLICT (gu_code) DO UPDATE SET
    score_rent = EXCLUDED.score_rent,
    score_amenity = EXCLUDED.score_amenity,
    score_transit = EXCLUDED.score_transit
"""

SELECT_CL = "SELECT ldong_code, score_rent, score_amenity, score_transit FROM current_ldong"
INSERT_CL = """
INSERT INTO current_ldong (ldong_code, score_rent, score_amenity, score_transit)
VALUES (%s, %s, %s, %s)
ON CONFLICT (ldong_code) DO UPDATE SET
    score_rent = EXCLUDED.score_rent,
    score_amenity = EXCLUDED.score_amenity,
    score_transit = EXCLUDED.score_transit
"""

SELECT_CA = "SELECT adong_code, score_rent, score_amenity, score_transit FROM current_adong"
INSERT_CA = """
INSERT INTO current_adong (adong_code, score_rent, score_amenity, score_transit)
VALUES (%s, %s, %s, %s)
ON CONFLICT (adong_code) DO UPDATE SET
    score_rent = EXCLUDED.score_rent,
    score_amenity = EXCLUDED.score_amenity,
    score_transit = EXCLUDED.score_transit
"""


def _copy_table(src, dst, label, select_sql, insert_sql, table):
    with src.cursor() as cur:
        cur.execute(select_sql)
        rows = cur.fetchall()
    n = batch_insert(dst, insert_sql, rows)
    print(f"[19_current] {label} inserted/upserted {n} rows")
    verify_count(src, dst, table)


def main() -> int:
    with connect_dp_db() as src, connect_slgi() as dst:
        _copy_table(src, dst, "current_seoul", SELECT_CS, INSERT_CS, "current_seoul")
        _copy_table(src, dst, "current_gu",    SELECT_CG, INSERT_CG, "current_gu")
        _copy_table(src, dst, "current_ldong", SELECT_CL, INSERT_CL, "current_ldong")
        _copy_table(src, dst, "current_adong", SELECT_CA, INSERT_CA, "current_adong")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
