"""18 — Store + Park raw → Amenity (화면용 derived) 적재.

Phase 1 RDS 통합 후 Amenity는 비어있고 raw는 Store / Park 에 보유. 본 스크립트는
SPEC 6.3 amenity 카드와 score_amenity 카테고리 가중 계산을 위해 Store.category_code
및 Park 모델로부터 Amenity 11개 카테고리를 derived 적재한다.

매핑 사전 (Store.category_code → 11종)
--------------------------------------
- G20405                      → convenience (편의점)
- G20404                      → mart        (슈퍼마켓)
- I21201                      → cafe        (카페)
- R10202                      → studycafe   (독서실/스터디 카페)
- G21501                      → pharmacy    (약국)
- S20901, S20902              → laundry     (세탁소·셀프 빨래방)
- M11101                      → hospital    (동물병원)
- prefix 'Q10'                → hospital    (종합/일반/치과/한방/요양/의원 18종)
- prefix 'I20'                → restaurant  (한식·중식·일식·양식·동남아 등)
- prefix 'I21' (단 I21201 X)  → restaurant  (빵/떡/피자/분식/주점 등)
- name LIKE '%올리브영%'        → oliveyoung  (브랜드 검색, 카테고리 매핑보다 우선)

Park → Amenity
--------------
Park 1,886개 → category='park', source='seoul_park', external_id=park.id,
geom=park.location (centroid). dong_id 는 ParkDong 첫 매칭.

멱등
----
Amenity.external_id unique 제약 사용. ON CONFLICT DO UPDATE 로 두 번 돌려도 안전.

Usage
-----
    python scripts/etl/from_rds/18_amenity_from_store.py
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import Progress, connect, fetch_in_batches, make_argparser


# 정확 매칭 카테고리 (subcategory_code → 우리 11종)
EXACT_CATEGORY_MAP: dict[str, str] = {
    "G20405": "convenience",
    "G20404": "mart",
    "I21201": "cafe",
    "R10202": "studycafe",
    "G21501": "pharmacy",
    "S20901": "laundry",
    "S20902": "laundry",
    "M11101": "hospital",
}


def map_store_category(code: str | None, name: str | None) -> str | None:
    """Store.category_code + name → 우리 11종.  매칭 실패는 None (적재 제외)."""
    name_str = (name or "").strip()
    # 브랜드 검색 우선 (G47811 = 의약품·의료용 기구·화장품 ... 안에 올리브영이 있음)
    if "올리브영" in name_str:
        return "oliveyoung"
    if not code:
        return None
    code = code.strip()
    if code in EXACT_CATEGORY_MAP:
        return EXACT_CATEGORY_MAP[code]
    if code.startswith("Q10"):
        return "hospital"
    if code.startswith("I20"):
        return "restaurant"
    if code.startswith("I21") and code != "I21201":
        return "restaurant"
    return None


# ---- INSERT SQL ---------------------------------------------------------
SQL_INSERT_FROM_STORE = """
INSERT INTO amenity (dong_id, category, name, geom, external_id, source, created_at, updated_at)
VALUES (%s, %s, %s, ST_GeomFromEWKT(%s), %s, 'sba', NOW(), NOW())
ON CONFLICT (external_id) DO UPDATE SET
    dong_id = EXCLUDED.dong_id,
    category = EXCLUDED.category,
    name = EXCLUDED.name,
    geom = EXCLUDED.geom,
    source = EXCLUDED.source,
    updated_at = NOW()
"""

SQL_INSERT_FROM_PARK = """
INSERT INTO amenity (dong_id, category, name, geom, external_id, source, created_at, updated_at)
VALUES (%s, 'park', %s, ST_GeomFromEWKT(%s), %s, 'seoul_park', NOW(), NOW())
ON CONFLICT (external_id) DO UPDATE SET
    dong_id = EXCLUDED.dong_id,
    name = EXCLUDED.name,
    geom = EXCLUDED.geom,
    updated_at = NOW()
"""


def main() -> int:
    args = make_argparser(__doc__).parse_args()

    with connect(args.local_dsn) as local:
        # ---- 0) Dong.code → Dong.id 매핑 (Store/Park 의 adong_code 가 to_field='code' 라
        #         Amenity.dong_id (default int) 로 변환 필요)
        with local.cursor() as cur:
            cur.execute("SELECT code, id FROM dong")
            code_to_id: dict[str, int] = dict(cur.fetchall())
        print(f"[18] Dong.code → id lookup: {len(code_to_id)} entries")

        # ---- 1) Store → Amenity ---------------------------------------------
        # 11종 카테고리 매핑되는 row 만 가져옴. dong이 NULL 이면 skip (Amenity는 NOT NULL).
        with local.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM store WHERE adong_code IS NOT NULL")
            store_total = cur.fetchone()[0]
        print(f"[18] store rows with adong_code: {store_total:,}")

        sql_select = """
            SELECT id, name, COALESCE(branch_name, ''), category_code, adong_code,
                   ST_AsEWKT(location)
            FROM store
            WHERE adong_code IS NOT NULL
        """

        # 535k rows × ~200B ≈ 100MB — 메모리 적재 OK. server cursor 회피.
        t0 = time.monotonic()
        with local.cursor() as scur:
            scur.execute(sql_select)
            store_rows = scur.fetchall()
        print(f"[18] fetched {len(store_rows):,} store rows in {time.monotonic()-t0:.1f}s")

        with local.cursor() as wcur:
            prog = Progress(len(store_rows), "store→amenity", step=50_000)
            inserted = 0
            skipped_no_category = 0
            skipped_no_dong = 0
            skipped_no_geom = 0
            cat_counts: dict[str, int] = {}

            t0 = time.monotonic()
            # 배치 단위로 처리 (메모리 한 번에 fetchall 했지만 INSERT 는 배치)
            for i in range(0, len(store_rows), args.batch_size):
                batch = store_rows[i : i + args.batch_size]
                rows = []
                for ext_id, name, branch, code, adong_code, geom in batch:
                    # 매핑
                    cat = map_store_category(code, name)
                    if not cat:
                        skipped_no_category += 1
                        continue
                    # dong lookup
                    dong_id = code_to_id.get(adong_code)
                    if dong_id is None:
                        skipped_no_dong += 1
                        continue
                    if not geom:
                        skipped_no_geom += 1
                        continue
                    # name + branch
                    full_name = f"{name} {branch}".strip() if branch else name
                    full_name = (full_name or "")[:200]
                    rows.append(
                        (dong_id, cat, full_name, geom, ext_id)
                    )
                    cat_counts[cat] = cat_counts.get(cat, 0) + 1
                if rows:
                    wcur.executemany(SQL_INSERT_FROM_STORE, rows)
                    inserted += len(rows)
                    local.commit()
                prog.add(len(batch))
            prog.finish()
            elapsed = time.monotonic() - t0
            del store_rows  # free memory
            print(
                f"[18] store→amenity: inserted={inserted:,}, "
                f"skipped(no_cat={skipped_no_category:,}, "
                f"no_dong={skipped_no_dong:,}, no_geom={skipped_no_geom:,})  "
                f"elapsed={elapsed:.1f}s"
            )
            print("  카테고리별 카운트:")
            for cat in sorted(cat_counts.keys()):
                print(f"    {cat:<12s} {cat_counts[cat]:>8,}")

        # ---- 2) Park → Amenity ----------------------------------------------
        # ParkDong 다대다 → 첫 매칭 dong 1개를 사용 (Amenity 는 1:N).
        with local.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM park")
            park_total = cur.fetchone()[0]
        print(f"\n[18] park rows: {park_total:,}")

        sql_park = """
            SELECT p.id, p.name, ST_AsEWKT(p.location),
                   (
                       SELECT pd.adong_code
                       FROM park_adong pd
                       WHERE pd.park_id = p.id
                       ORDER BY pd.adong_code
                       LIMIT 1
                   ) AS adong_code
            FROM park p
        """

        with local.cursor() as cur:
            cur.execute(sql_park)
            park_rows = cur.fetchall()

        with local.cursor() as wcur:
            inserted_park = 0
            skipped_park_no_dong = 0
            skipped_park_no_geom = 0
            rows = []
            for park_id, name, geom, adong_code in park_rows:
                if not geom:
                    skipped_park_no_geom += 1
                    continue
                dong_id = code_to_id.get(adong_code) if adong_code else None
                if dong_id is None:
                    skipped_park_no_dong += 1
                    continue
                # external_id 충돌 회피: Store.id 와 Park.id 가 겹칠 가능성에 대비 prefix.
                ext = f"park:{park_id}"
                rows.append((dong_id, (name or "")[:200], geom, ext))
            if rows:
                wcur.executemany(SQL_INSERT_FROM_PARK, rows)
                inserted_park = len(rows)
                local.commit()
        print(
            f"[18] park→amenity: inserted={inserted_park:,}, "
            f"skipped(no_dong={skipped_park_no_dong:,}, "
            f"no_geom={skipped_park_no_geom:,})"
        )

        # ---- 3) 최종 검증 ----------------------------------------------------
        with local.cursor() as cur:
            cur.execute(
                """
                SELECT category, COUNT(*)
                FROM amenity
                GROUP BY category
                ORDER BY 2 DESC
                """
            )
            print("\n[18] amenity 카테고리 분포:")
            for cat, n in cur.fetchall():
                print(f"    {cat:<12s} {n:>8,}")
            cur.execute("SELECT COUNT(*) FROM amenity")
            print(f"  total amenity rows: {cur.fetchone()[0]:,}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
