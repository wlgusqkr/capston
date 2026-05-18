"""[TEMP] DP_DB ldong_population + adong_population -> SLGI 임시 ETL.

단계 6에서 1회 실행. 추후 실 초기 적재 ETL(별도 plan)로 대체 필요.

매핑:
- ldong_population (ldong_code, date) [pk], + total/household/male/female 1:1
- adong_population (adong_code, date) [pk], + total/household/male/female 1:1
의존성: ldong (03), adong (04).
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import batch_insert, connect_dp_db, connect_slgi, verify_count


SELECT_LP = """
SELECT ldong_code, date, total_population, household_count,
       male_population, female_population
FROM ldong_population
"""

INSERT_LP = """
INSERT INTO ldong_population
  (ldong_code, date, total_population, household_count,
   male_population, female_population)
VALUES (%s, %s, %s, %s, %s, %s)
ON CONFLICT (ldong_code, date) DO UPDATE SET
    total_population = EXCLUDED.total_population,
    household_count = EXCLUDED.household_count,
    male_population = EXCLUDED.male_population,
    female_population = EXCLUDED.female_population
"""

SELECT_AP = """
SELECT adong_code, date, total_population, household_count,
       male_population, female_population
FROM adong_population
"""

INSERT_AP = """
INSERT INTO adong_population
  (adong_code, date, total_population, household_count,
   male_population, female_population)
VALUES (%s, %s, %s, %s, %s, %s)
ON CONFLICT (adong_code, date) DO UPDATE SET
    total_population = EXCLUDED.total_population,
    household_count = EXCLUDED.household_count,
    male_population = EXCLUDED.male_population,
    female_population = EXCLUDED.female_population
"""


def main() -> int:
    with connect_dp_db() as src, connect_slgi() as dst:
        with src.cursor() as cur:
            cur.execute(SELECT_LP)
            rows = cur.fetchall()
        n = batch_insert(dst, INSERT_LP, rows, batch_size=5000)
        print(f"[05_population] ldong_population inserted/upserted {n} rows")
        verify_count(src, dst, "ldong_population")

        with src.cursor() as cur:
            cur.execute(SELECT_AP)
            rows = cur.fetchall()
        n = batch_insert(dst, INSERT_AP, rows, batch_size=5000)
        print(f"[05_population] adong_population inserted/upserted {n} rows")
        verify_count(src, dst, "adong_population")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
