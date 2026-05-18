"""[TEMP] DP_DB metric + gu_metric + seoul_metric -> SLGI 임시 ETL.

단계 6에서 1회 실행. 추후 실 초기 적재 ETL(별도 plan)로 대체 필요.

매핑:
- metric (metric_code PK, 카탈로그 항목) 1:1
- gu_metric (gu_code, date, metric_code) [pk], value 1:1
- seoul_metric (seoul_code, date, metric_code) [pk], value 1:1
의존성: gu (02), seoul (01), metric (자기 자신 먼저).
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import batch_insert, connect_dp_db, connect_slgi, verify_count


SELECT_METRIC = """
SELECT metric_code, name, unit, category, cycle,
       is_generated, generation_method,
       source_agency, source_table, source_item,
       source_classification_code, remarks
FROM metric
"""

INSERT_METRIC = """
INSERT INTO metric
  (metric_code, name, unit, category, cycle,
   is_generated, generation_method,
   source_agency, source_table, source_item,
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
"""

SELECT_GU_METRIC = "SELECT gu_code, date, metric_code, value FROM gu_metric"

INSERT_GU_METRIC = """
INSERT INTO gu_metric (gu_code, date, metric_code, value)
VALUES (%s, %s, %s, %s)
ON CONFLICT (gu_code, date, metric_code) DO UPDATE SET
    value = EXCLUDED.value
"""

SELECT_SEOUL_METRIC = "SELECT seoul_code, date, metric_code, value FROM seoul_metric"

INSERT_SEOUL_METRIC = """
INSERT INTO seoul_metric (seoul_code, date, metric_code, value)
VALUES (%s, %s, %s, %s)
ON CONFLICT (seoul_code, date, metric_code) DO UPDATE SET
    value = EXCLUDED.value
"""


def main() -> int:
    with connect_dp_db() as src, connect_slgi() as dst:
        with src.cursor() as cur:
            cur.execute(SELECT_METRIC)
            rows = cur.fetchall()
        n = batch_insert(dst, INSERT_METRIC, rows)
        print(f"[06_metric] metric inserted/upserted {n} rows")
        verify_count(src, dst, "metric")

        with src.cursor() as cur:
            cur.execute(SELECT_GU_METRIC)
            rows = cur.fetchall()
        n = batch_insert(dst, INSERT_GU_METRIC, rows, batch_size=5000)
        print(f"[06_metric] gu_metric inserted/upserted {n} rows")
        verify_count(src, dst, "gu_metric")

        with src.cursor() as cur:
            cur.execute(SELECT_SEOUL_METRIC)
            rows = cur.fetchall()
        n = batch_insert(dst, INSERT_SEOUL_METRIC, rows, batch_size=5000)
        print(f"[06_metric] seoul_metric inserted/upserted {n} rows")
        verify_count(src, dst, "seoul_metric")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
