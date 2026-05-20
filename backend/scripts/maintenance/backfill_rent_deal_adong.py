"""Backfill rent_deal.adong_code and clean unreliable rent_deal.location values.

Rules:
- Map by ldong only when an ldong is fully covered by exactly one adong, or is
  effectively identical to one adong.
- For non 단독/다가구 rows that still have a trustworthy point, map by the
  point's containing adong.
- Keep adong_code NULL for 단독/다가구 unless the ldong-level rule mapped it.
- Set all 단독/다가구 location values to NULL because their API source does not
  expose precise addresses.
- Do not trust point values equal to the row's ldong centroid for location-based
  adong mapping.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from time import monotonic

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from _django import setup

setup()

from django.db import connection  # noqa: E402


def run_sql(label: str, sql: str) -> int:
    start = monotonic()
    with connection.cursor() as cur:
        cur.execute(sql)
        rowcount = cur.rowcount
    elapsed = monotonic() - start
    print(f"[{label}] rowcount={rowcount:,} elapsed={elapsed:.1f}s")
    return rowcount


def print_counts(label: str) -> None:
    with connection.cursor() as cur:
        cur.execute(
            """
            SELECT
              COUNT(*) AS total,
              COUNT(*) FILTER (WHERE adong_code IS NOT NULL) AS mapped,
              COUNT(*) FILTER (WHERE location IS NULL) AS location_null,
              COUNT(*) FILTER (
                WHERE housing_type IN ('단독', '다가구') AND location IS NOT NULL
              ) AS detached_location_not_null
            FROM rent_deal
            """
        )
        total, mapped, location_null, detached_location_not_null = cur.fetchone()
    print(
        f"[{label}] total={total:,} mapped={mapped:,} "
        f"location_null={location_null:,} detached_location_not_null={detached_location_not_null:,}"
    )


RESET_ADONG_SQL = "UPDATE rent_deal SET adong_code = NULL WHERE adong_code IS NOT NULL"

NULL_DETACHED_LOCATION_SQL = """
UPDATE rent_deal
SET location = NULL
WHERE housing_type IN ('단독', '다가구')
  AND location IS NOT NULL
"""

CREATE_EXACT_MAP_SQL = """
DROP TABLE IF EXISTS tmp_rent_deal_ldong_adong_exact;
CREATE TEMP TABLE tmp_rent_deal_ldong_adong_exact AS
SELECT ldong_code, adong_code
FROM rent_deal_ldong_adong_map
WHERE adong_code IS NOT NULL;

CREATE INDEX tmp_rent_deal_ldong_adong_exact_ldong_idx
    ON tmp_rent_deal_ldong_adong_exact(ldong_code);
"""

MAP_EXACT_LDONG_SQL = """
UPDATE rent_deal r
SET adong_code = m.adong_code
FROM tmp_rent_deal_ldong_adong_exact m
WHERE r.ldong_code = m.ldong_code
  AND r.adong_code IS NULL
"""

CREATE_LOCATION_MAP_SQL = """
DROP TABLE IF EXISTS tmp_rent_deal_location_adong;
CREATE TEMP TABLE tmp_rent_deal_location_adong AS
SELECT r.id, MIN(a.adong_code) AS adong_code
FROM rent_deal r
JOIN ldong l ON l.ldong_code = r.ldong_code
JOIN adong a
  ON a.gu_code = l.gu_code
 AND a.boundary && r.location
 AND ST_Covers(a.boundary, r.location)
WHERE r.adong_code IS NULL
  AND r.location IS NOT NULL
  AND r.housing_type NOT IN ('단독', '다가구')
  AND NOT (
    l.location IS NOT NULL
    AND ST_Equals(r.location, l.location)
  )
GROUP BY r.id
HAVING COUNT(*) = 1;

CREATE INDEX tmp_rent_deal_location_adong_id_idx
    ON tmp_rent_deal_location_adong(id);
"""

MAP_LOCATION_SQL = """
UPDATE rent_deal r
SET adong_code = m.adong_code
FROM tmp_rent_deal_location_adong m
WHERE r.id = m.id
  AND r.adong_code IS NULL
"""

ANALYZE_SQL = "ANALYZE rent_deal"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--no-reset", action="store_true", help="Do not clear existing adong_code first.")
    args = parser.parse_args()

    print_counts("before")
    if not args.no_reset:
        run_sql("reset_adong", RESET_ADONG_SQL)
    run_sql("null_detached_location", NULL_DETACHED_LOCATION_SQL)
    run_sql("create_exact_map", CREATE_EXACT_MAP_SQL)
    run_sql("map_exact_ldong", MAP_EXACT_LDONG_SQL)
    run_sql("create_location_map", CREATE_LOCATION_MAP_SQL)
    run_sql("map_location", MAP_LOCATION_SQL)
    run_sql("analyze", ANALYZE_SQL)
    print_counts("after")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
