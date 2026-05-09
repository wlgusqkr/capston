"""11 — subway_station (400행) → local.

매핑:
- RDS id (varchar) → external_id (CharField unique)
- name, line 1:1
- adong_code → dong FK (db_column='adong_code', to_field='code')
- ldong_code → ldong FK (db_column='ldong_code')
- location → geom
- Django auto bigint id 별도 생성됨

멱등 키 = external_id (unique). ON CONFLICT (external_id).
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import connect, make_argparser, verify_count


def main() -> int:
    args = make_argparser(__doc__).parse_args()

    with connect(args.rds_dsn) as rds, connect(args.local_dsn) as local:
        with rds.cursor() as rcur:
            rcur.execute(
                """
                SELECT id, name, line, adong_code, ldong_code, ST_AsEWKT(location)
                FROM subway_station
                """
            )
            rows = rcur.fetchall()

        with local.cursor() as lcur:
            for ext_id, name, line, adong, ldong, geom in rows:
                lcur.execute(
                    """
                    INSERT INTO subway_station
                      (external_id, name, line, adong_code, ldong_code, geom,
                       created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, ST_GeomFromEWKT(%s), NOW(), NOW())
                    ON CONFLICT (external_id) DO UPDATE SET
                      name = EXCLUDED.name,
                      line = EXCLUDED.line,
                      adong_code = EXCLUDED.adong_code,
                      ldong_code = EXCLUDED.ldong_code,
                      geom = EXCLUDED.geom,
                      updated_at = NOW()
                    """,
                    (ext_id, name, line, adong, ldong, geom),
                )
        local.commit()
        print(f"[11] subway_station upserted: {len(rows)}")
        verify_count(rds, local, "subway_station")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
