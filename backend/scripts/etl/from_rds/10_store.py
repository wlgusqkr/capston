"""10 — store (534,977행) → local.

FK 4종 (category_code → BusinessCategory, ksci_code → KsciCategory,
adong_code → Dong.code, ldong_code → Ldong). FK 컬럼명은 db_column으로 일치되어
RDS 컬럼명을 그대로 INSERT 가능.

NULL FK는 그대로 NULL 보존 (모델 nullable).
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import Progress, connect, fetch_in_batches, make_argparser, verify_count


SQL_SELECT = """
SELECT id, name, branch_name, category_code, ksci_code,
       adong_code, ldong_code, address, ST_AsEWKT(location)
FROM store
"""

SQL_UPSERT = """
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


def coerce(row):
    (sid, name, branch, cat, ksci, adong, ldong, addr, geom) = row
    return (
        sid,
        name or "",
        branch or "",
        cat,  # FK nullable
        ksci,
        adong,
        ldong,
        addr or "",
        geom,
    )


def main() -> int:
    args = make_argparser(__doc__).parse_args()

    with connect(args.rds_dsn) as rds, connect(args.local_dsn) as local:
        with rds.cursor() as cnt_cur:
            cnt_cur.execute(
                "SELECT COUNT(*) FROM store"
                + (f" LIMIT {args.limit}" if args.limit else "")
            )
            total = cnt_cur.fetchone()[0]
            if args.limit:
                total = min(total, args.limit)

        sql = SQL_SELECT + (f" LIMIT {args.limit}" if args.limit else "")
        with rds.cursor(name="store_cur") as rcur:
            rcur.itersize = args.batch_size
            rcur.execute(sql)
            prog = Progress(total, "store", step=20000)

            with local.cursor() as lcur:
                for batch in fetch_in_batches(rcur, args.batch_size):
                    coerced = [coerce(r) for r in batch]
                    lcur.executemany(SQL_UPSERT, coerced)
                    local.commit()
                    prog.add(len(batch))
            prog.finish()

        verify_count(rds, local, "store")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
