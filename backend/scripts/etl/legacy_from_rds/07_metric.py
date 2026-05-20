"""07 — metric 마스터 + seoul_metric + gu_metric → local."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import Progress, connect, fetch_in_batches, make_argparser, verify_count


def main() -> int:
    args = make_argparser(__doc__).parse_args()

    with connect(args.rds_dsn) as rds, connect(args.local_dsn) as local:
        # metric 마스터 (35행)
        with rds.cursor() as rcur:
            rcur.execute(
                """
                SELECT metric_code, name, unit, category, cycle, is_generated,
                       generation_method, source_agency, source_table, source_item,
                       source_classification_code, remarks
                FROM metric
                """
            )
            rows = rcur.fetchall()
        # NULL → '' coercion (모델은 blank=True지만 NOT NULL 기본은 charfield. blank=True면 빈문자 허용).
        # 실제 마이그레이션 보면 default ''인 char 컬럼이라 None 그대로 넣으면 안 됨. coalesce.
        coerced = [
            (
                code,
                name or "",
                unit or "",
                category or "",
                cycle or "",
                bool(is_generated) if is_generated is not None else False,
                gen_method or "",
                src_agency or "",
                src_table or "",
                src_item or "",
                src_class or "",
                remarks or "",
            )
            for (code, name, unit, category, cycle, is_generated, gen_method,
                 src_agency, src_table, src_item, src_class, remarks) in rows
        ]
        with local.cursor() as lcur:
            lcur.executemany(
                """
                INSERT INTO metric
                  (metric_code, name, unit, category, cycle, is_generated,
                   generation_method, source_agency, source_table, source_item,
                   source_classification_code, remarks)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (metric_code) DO UPDATE SET
                  name = EXCLUDED.name,
                  unit = EXCLUDED.unit,
                  category = EXCLUDED.category,
                  cycle = EXCLUDED.cycle,
                  is_generated = EXCLUDED.is_generated,
                  generation_method = EXCLUDED.generation_method,
                  source_agency = EXCLUDED.source_agency,
                  source_table = EXCLUDED.source_table,
                  source_item = EXCLUDED.source_item,
                  source_classification_code = EXCLUDED.source_classification_code,
                  remarks = EXCLUDED.remarks
                """,
                coerced,
            )
        local.commit()
        print(f"[07] metric upserted: {len(coerced)}")

        # seoul_metric (1,625)
        with rds.cursor(name="seoul_metric_cur") as rcur:
            rcur.execute(
                "SELECT seoul_code, date, metric_code, value FROM seoul_metric"
            )
            with rds.cursor() as cnt_cur:
                cnt_cur.execute("SELECT COUNT(*) FROM seoul_metric")
                total = cnt_cur.fetchone()[0]
            prog = Progress(total, "seoul_metric", step=500)
            with local.cursor() as lcur:
                for batch in fetch_in_batches(rcur, args.batch_size):
                    lcur.executemany(
                        """
                        INSERT INTO seoul_metric (seoul_code, date, metric_code, value)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT (seoul_code, date, metric_code) DO UPDATE SET
                          value = EXCLUDED.value
                        """,
                        batch,
                    )
                    local.commit()
                    prog.add(len(batch))
            prog.finish()

        # gu_metric (40,450)
        with rds.cursor(name="gu_metric_cur") as rcur:
            rcur.execute("SELECT gu_code, date, metric_code, value FROM gu_metric")
            with rds.cursor() as cnt_cur:
                cnt_cur.execute("SELECT COUNT(*) FROM gu_metric")
                total = cnt_cur.fetchone()[0]
            prog = Progress(total, "gu_metric", step=5000)
            with local.cursor() as lcur:
                for batch in fetch_in_batches(rcur, args.batch_size):
                    lcur.executemany(
                        """
                        INSERT INTO gu_metric (gu_code, date, metric_code, value)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT (gu_code, date, metric_code) DO UPDATE SET
                          value = EXCLUDED.value
                        """,
                        batch,
                    )
                    local.commit()
                    prog.add(len(batch))
            prog.finish()

        verify_count(rds, local, "metric")
        verify_count(rds, local, "seoul_metric")
        verify_count(rds, local, "gu_metric")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
