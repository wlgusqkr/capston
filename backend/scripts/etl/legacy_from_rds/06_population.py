"""06 — 인구 시계열 2종 (ldong_population + adong_population) → local.

ldong_population: 컬럼 1:1 (ldong_code, date, total_population, household_count, male, female)
adong_population: 컬럼 1:1 (adong_code → Dong.code FK)
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import Progress, connect, fetch_in_batches, make_argparser, verify_count


def main() -> int:
    args = make_argparser(__doc__).parse_args()

    with connect(args.rds_dsn) as rds, connect(args.local_dsn) as local:
        # ldong_population
        with rds.cursor(name="ldong_pop_cur") as rcur:
            rcur.execute(
                """
                SELECT ldong_code, date, total_population, household_count,
                       male_population, female_population
                FROM ldong_population
                """
            )
            with rds.cursor() as cnt_cur:
                cnt_cur.execute("SELECT COUNT(*) FROM ldong_population")
                total = cnt_cur.fetchone()[0]
            prog = Progress(total, "ldong_population", step=5000)

            with local.cursor() as lcur:
                for batch in fetch_in_batches(rcur, args.batch_size):
                    lcur.executemany(
                        """
                        INSERT INTO ldong_population
                          (ldong_code, date, total_population, household_count,
                           male_population, female_population)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        ON CONFLICT (ldong_code, date) DO UPDATE SET
                          total_population = EXCLUDED.total_population,
                          household_count = EXCLUDED.household_count,
                          male_population = EXCLUDED.male_population,
                          female_population = EXCLUDED.female_population
                        """,
                        batch,
                    )
                    local.commit()
                    prog.add(len(batch))
            prog.finish()

        # adong_population
        with rds.cursor(name="adong_pop_cur") as rcur:
            rcur.execute(
                """
                SELECT adong_code, date, total_population, household_count,
                       male_population, female_population
                FROM adong_population
                """
            )
            with rds.cursor() as cnt_cur:
                cnt_cur.execute("SELECT COUNT(*) FROM adong_population")
                total = cnt_cur.fetchone()[0]
            prog = Progress(total, "adong_population", step=5000)

            with local.cursor() as lcur:
                for batch in fetch_in_batches(rcur, args.batch_size):
                    lcur.executemany(
                        """
                        INSERT INTO adong_population
                          (adong_code, date, total_population, household_count,
                           male_population, female_population)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        ON CONFLICT (adong_code, date) DO UPDATE SET
                          total_population = EXCLUDED.total_population,
                          household_count = EXCLUDED.household_count,
                          male_population = EXCLUDED.male_population,
                          female_population = EXCLUDED.female_population
                        """,
                        batch,
                    )
                    local.commit()
                    prog.add(len(batch))
            prog.finish()

        verify_count(rds, local, "ldong_population")
        verify_count(rds, local, "adong_population")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
