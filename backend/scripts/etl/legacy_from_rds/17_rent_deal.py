"""17 — rent_deal (~7.4M행) → local. 가장 큰 / 복잡한 테이블.

매핑:
- RDS id (varchar(60)) → external_id (CharField(64), unique)
- housing_type (한글) — 그대로 보존
- deal_type (영문 derived):
    아파트→apt, 오피스텔→officetel, 다세대/연립/연립다세대→villa,
    다가구→dagagu, 단독→danok
- ldong_code → ldong FK
- location → geom
- dong FK (PROTECT, NOT NULL): 2단계 매핑
    1) INSERT 시점에 ldong → 대표 dong fallback (메모리 lookup) 사용.
    2) 모든 INSERT 후 geom 있는 row에 ST_Contains 로 정확한 dong 으로 UPDATE.
  fallback도 실패하면 skip + 카운트 (rare; ldong→dong 매칭 한 번이라도 있으면 OK).
- contract_date → deal_date
- construction_year → build_year
- house_name, contract_end_date, contract_type, renewal_request_right_used,
  previous_deposit, previous_monthly_rent 1:1
- area_m2, floor, deposit, monthly_rent, jibun 1:1
- external_hash = NULL (legacy 호환만)

샘플 모드: --limit 10000.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import Progress, connect, fetch_in_batches, make_argparser, verify_count


HOUSING_TYPE_TO_DEAL_TYPE = {
    "아파트": "apt",
    "오피스텔": "officetel",
    "다세대": "villa",
    "연립": "villa",
    "연립다세대": "villa",
    "다가구": "dagagu",
    "단독": "danok",
}


def derive_deal_type(housing_type: str | None) -> str:
    """RDS housing_type 한글 → 영문 enum 5종. unknown은 'villa' 폴백."""
    if not housing_type:
        return "villa"
    return HOUSING_TYPE_TO_DEAL_TYPE.get(housing_type.strip(), "villa")


SQL_INSERT = """
INSERT INTO rent_deal
  (external_id, deal_type, housing_type, ldong_id, dong_id,
   geom,
   deal_date, contract_end_date, contract_type, renewal_request_right_used,
   area_m2, deposit, monthly_rent,
   previous_deposit, previous_monthly_rent,
   floor, build_year, house_name, jibun,
   external_hash, created_at)
VALUES
  (%s, %s, %s, %s, %s,
   ST_GeomFromEWKT(%s),
   %s, %s, %s, %s,
   %s, %s, %s,
   %s, %s,
   %s, %s, %s, %s,
   NULL, NOW())
ON CONFLICT (external_id) DO UPDATE SET
  deal_type = EXCLUDED.deal_type,
  housing_type = EXCLUDED.housing_type,
  ldong_id = EXCLUDED.ldong_id,
  dong_id = EXCLUDED.dong_id,
  geom = EXCLUDED.geom,
  deal_date = EXCLUDED.deal_date,
  contract_end_date = EXCLUDED.contract_end_date,
  contract_type = EXCLUDED.contract_type,
  renewal_request_right_used = EXCLUDED.renewal_request_right_used,
  area_m2 = EXCLUDED.area_m2,
  deposit = EXCLUDED.deposit,
  monthly_rent = EXCLUDED.monthly_rent,
  previous_deposit = EXCLUDED.previous_deposit,
  previous_monthly_rent = EXCLUDED.previous_monthly_rent,
  floor = EXCLUDED.floor,
  build_year = EXCLUDED.build_year,
  house_name = EXCLUDED.house_name,
  jibun = EXCLUDED.jibun
"""


def main() -> int:
    args = make_argparser(__doc__).parse_args()

    with connect(args.rds_dsn) as rds, connect(args.local_dsn) as local:
        # ---- 1단계: lookup 테이블 두 개 메모리 적재 ----
        # (a) ldong_code → 대표 dong.id (fallback)
        with local.cursor() as lcur:
            lcur.execute(
                """
                SELECT DISTINCT ON (l.ldong_code) l.ldong_code, d.id
                FROM ldong l
                JOIN dong d ON ST_Intersects(l.boundary, d.geom)
                ORDER BY l.ldong_code,
                         ST_Area(ST_Intersection(l.boundary, d.geom)) DESC
                """
            )
            ldong_to_dong_id = dict(lcur.fetchall())
        print(f"[17] ldong→dong fallback: {len(ldong_to_dong_id)} entries")

        # (b) ldong_code → ldong row 존재 확인용 set (FK validation)
        with local.cursor() as lcur:
            lcur.execute("SELECT ldong_code FROM ldong")
            valid_ldongs = {r[0] for r in lcur.fetchall()}
        print(f"[17] valid ldong codes: {len(valid_ldongs)}")

        # ---- 2단계: row count ----
        with rds.cursor() as cnt_cur:
            if args.limit:
                cnt_cur.execute(
                    f"SELECT LEAST(COUNT(*), {args.limit}) FROM rent_deal"
                )
            else:
                cnt_cur.execute("SELECT COUNT(*) FROM rent_deal")
            total = cnt_cur.fetchone()[0]
        print(f"[17] rent_deal target rows: {total:,}")

        # ---- 3단계: 스트리밍 INSERT (dong = fallback) ----
        sql = """
            SELECT id, housing_type, ldong_code, jibun, house_name,
                   area_m2, floor, construction_year,
                   deposit, monthly_rent,
                   contract_date, contract_end_date, contract_type,
                   renewal_request_right_used,
                   previous_deposit, previous_monthly_rent,
                   ST_AsEWKT(location)
            FROM rent_deal
        """
        if args.limit:
            sql += f" LIMIT {args.limit}"

        with rds.cursor(name="rent_deal_cur") as rcur:
            rcur.itersize = args.batch_size
            rcur.execute(sql)
            prog = Progress(total, "rent_deal", step=100_000)
            skipped_no_dong = 0
            skipped_bad_ldong = 0
            inserted_total = 0
            with local.cursor() as lcur:
                for batch in fetch_in_batches(rcur, args.batch_size):
                    coerced = []
                    for row in batch:
                        (
                            ext_id, housing_type, ldong_code, jibun, house_name,
                            area_m2, floor, construction_year,
                            deposit, monthly_rent,
                            contract_date, contract_end_date, contract_type,
                            renewal_used, prev_deposit, prev_monthly_rent,
                            geom_ewkt,
                        ) = row

                        # ldong 유효성 — RDS에 있는데 local ldong에 없으면 skip (드물다)
                        if ldong_code not in valid_ldongs:
                            skipped_bad_ldong += 1
                            continue
                        fallback_dong = ldong_to_dong_id.get(ldong_code)
                        if fallback_dong is None:
                            skipped_no_dong += 1
                            continue

                        deal_type = derive_deal_type(housing_type)
                        coerced.append(
                            (
                                ext_id,
                                deal_type,
                                housing_type or "",
                                ldong_code,
                                fallback_dong,
                                geom_ewkt,
                                contract_date,
                                contract_end_date,
                                contract_type or "",
                                renewal_used,
                                float(area_m2) if area_m2 is not None else 0.0,
                                int(deposit) if deposit is not None else 0,
                                int(monthly_rent) if monthly_rent is not None else 0,
                                int(prev_deposit) if prev_deposit is not None else None,
                                int(prev_monthly_rent) if prev_monthly_rent is not None else None,
                                floor,
                                construction_year,
                                house_name or "",
                                jibun or "",
                            )
                        )
                    if coerced:
                        lcur.executemany(SQL_INSERT, coerced)
                        inserted_total += len(coerced)
                        local.commit()
                    prog.add(len(batch))
            prog.finish()
            print(
                f"[17] rent_deal inserted/upserted: {inserted_total:,}, "
                f"skipped: bad_ldong={skipped_bad_ldong}, "
                f"no_dong_fallback={skipped_no_dong}"
            )

        # ---- 4단계: dong 정밀 보정 ----
        # 전체 7.4M 단일 UPDATE 는 PG 옵티마이저가 nested loop 으로 빠지면 비쌈 (40분+).
        # 별도 스크립트 17b_rent_deal_dong_correction.py 로 ldong 단위 청크 처리.
        print(
            "[17] INSERT 완료. dong 정밀 보정은 17b_rent_deal_dong_correction.py 로 "
            "별도 실행하세요 (ldong 단위 청크):\n"
            "  .venv/bin/python scripts/etl/from_rds/17b_rent_deal_dong_correction.py"
        )

        verify_count(rds, local, "rent_deal")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
