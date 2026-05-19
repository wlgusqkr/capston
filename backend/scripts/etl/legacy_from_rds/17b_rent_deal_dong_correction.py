"""17b — rent_deal.dong_id 정밀 보정 (ST_Contains).

17_rent_deal 의 INSERT 단계는 ldong→대표 dong fallback 으로 dong_id 채움.
좌표 ST_Contains 로 정확한 dong 으로 다시 매핑.

전체 7.4M 단일 UPDATE 는 너무 비싸 (40분+). ldong 단위 청크 처리:
- 각 ldong_code 별로 UPDATE … WHERE r.ldong_id = '...' AND r.dong_id <> ST_Contains.
- 467 ldong → 평균 16k row/ldong → UPDATE 한 번에 1~2초.
- 멱등 (재실행 시 변경 없는 row는 WHERE 절로 skip).

진행률: ldong 수 / 467.
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import connect, make_argparser


def main() -> int:
    args = make_argparser(__doc__).parse_args()

    with connect(args.local_dsn) as local:
        with local.cursor() as lcur:
            lcur.execute("SELECT ldong_code FROM ldong ORDER BY ldong_code")
            ldongs = [r[0] for r in lcur.fetchall()]
        print(f"[17b] processing {len(ldongs)} ldongs")

        total_corrected = 0
        start = time.monotonic()
        for i, ldong_code in enumerate(ldongs, 1):
            with local.cursor() as lcur:
                lcur.execute(
                    """
                    UPDATE rent_deal r
                    SET dong_id = sub.dong_id
                    FROM (
                        SELECT r2.id AS rd_id, d.id AS dong_id
                        FROM rent_deal r2
                        JOIN dong d ON ST_Contains(d.geom, r2.location)
                        WHERE r2.ldong_id = %s
                          AND r2.location IS NOT NULL
                    ) sub
                    WHERE r.id = sub.rd_id
                      AND r.dong_id <> sub.dong_id
                    """,
                    (ldong_code,),
                )
                changed = lcur.rowcount
                total_corrected += changed
            local.commit()

            elapsed = time.monotonic() - start
            avg = elapsed / i
            eta = avg * (len(ldongs) - i)
            sys.stdout.write(
                f"\r[17b] ldong {i:>4}/{len(ldongs)} "
                f"({i/len(ldongs)*100:5.1f}%) "
                f"corrected={total_corrected:>9,} "
                f"avg={avg:.2f}s/ldong eta={eta:>5.0f}s"
            )
            sys.stdout.flush()
        sys.stdout.write("\n")

        print(f"[17b] total corrected: {total_corrected:,}")

        # 검증: 모든 rent_deal 이 dong과 일관된 좌표 관계인지 (location 있는 row 한정)
        with local.cursor() as lcur:
            lcur.execute(
                """
                SELECT COUNT(*) FROM rent_deal r
                LEFT JOIN dong d ON r.dong_id = d.id
                WHERE r.location IS NOT NULL
                  AND NOT ST_Contains(d.geom, r.location)
                """
            )
            mismatch = lcur.fetchone()[0]
            lcur.execute("SELECT COUNT(*) FROM rent_deal WHERE location IS NOT NULL")
            with_location = lcur.fetchone()[0]
        print(
            f"[17b] verify: {mismatch:,}/{with_location:,} rows where dong "
            f"does NOT contain location (likely on boundary or fallback-only)"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
