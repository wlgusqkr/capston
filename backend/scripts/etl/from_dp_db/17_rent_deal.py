"""[TEMP] DP_DB rent_deal (~7.4M) -> SLGI 임시 ETL.

단계 6에서 1회 실행. 추후 실 초기 적재 ETL(별도 plan)로 대체 필요.

매핑: rent_deal (id PK, ~7.4M 행) 1:1 (schema.dbml DP_DB <-> SLGI 단계 2 정합 후 동일 스키마).
의존성: ldong (03).

대용량. server-side cursor + execute_batch 스트리밍 패턴. location NULL 허용.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import connect_dp_db, connect_slgi, stream_and_insert, verify_count


SELECT_SQL = """
SELECT id, housing_type, ldong_code, jibun, house_name,
       area_m2, floor, construction_year,
       deposit, monthly_rent,
       contract_date, contract_end_date, contract_type,
       renewal_request_right_used,
       previous_deposit, previous_monthly_rent,
       CASE
         WHEN housing_type IN ('단독', '다가구') THEN NULL
         WHEN r.location IS NOT NULL AND l.location IS NOT NULL AND ST_Equals(r.location, l.location) THEN NULL
         ELSE ST_AsEWKT(r.location)
       END AS location_ewkt
FROM rent_deal r
JOIN ldong l ON l.ldong_code = r.ldong_code
"""

INSERT_SQL = """
INSERT INTO rent_deal
  (id, housing_type, ldong_code, jibun, house_name,
   area_m2, floor, construction_year,
   deposit, monthly_rent,
   contract_date, contract_end_date, contract_type,
   renewal_request_right_used,
   previous_deposit, previous_monthly_rent,
   location)
VALUES (%s, %s, %s, %s, %s,
        %s, %s, %s,
        %s, %s,
        %s, %s, %s,
        %s,
        %s, %s,
        CASE WHEN %s IS NULL THEN NULL ELSE ST_GeomFromEWKT(%s) END)
ON CONFLICT (id) DO UPDATE SET
    housing_type = EXCLUDED.housing_type,
    ldong_code = EXCLUDED.ldong_code,
    jibun = EXCLUDED.jibun,
    house_name = EXCLUDED.house_name,
    area_m2 = EXCLUDED.area_m2,
    floor = EXCLUDED.floor,
    construction_year = EXCLUDED.construction_year,
    deposit = EXCLUDED.deposit,
    monthly_rent = EXCLUDED.monthly_rent,
    contract_date = EXCLUDED.contract_date,
    contract_end_date = EXCLUDED.contract_end_date,
    contract_type = EXCLUDED.contract_type,
    renewal_request_right_used = EXCLUDED.renewal_request_right_used,
    previous_deposit = EXCLUDED.previous_deposit,
    previous_monthly_rent = EXCLUDED.previous_monthly_rent,
    location = EXCLUDED.location
"""


def _transform(row):
    """SELECT 17개 컬럼 -> INSERT placeholder (location_ewkt 두 번)."""
    (
        rid, housing_type, ldong_code, jibun, house_name,
        area_m2, floor, construction_year,
        deposit, monthly_rent,
        contract_date, contract_end_date, contract_type,
        renewal_used, prev_deposit, prev_monthly_rent,
        geom_ewkt,
    ) = row
    return (
        rid, housing_type, ldong_code, jibun, house_name,
        area_m2, floor, construction_year,
        deposit, monthly_rent,
        contract_date, contract_end_date, contract_type,
        renewal_used, prev_deposit, prev_monthly_rent,
        geom_ewkt, geom_ewkt,
    )


def main() -> int:
    with connect_dp_db() as src, connect_slgi() as dst:
        n = stream_and_insert(
            src, dst, SELECT_SQL, INSERT_SQL,
            transform=_transform,
            fetch_size=10000, batch_size=10000, label="rent_deal",
        )
        print(f"[17_rent_deal] inserted/upserted {n} rows")
        verify_count(src, dst, "rent_deal")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
