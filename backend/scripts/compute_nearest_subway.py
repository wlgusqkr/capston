"""행정동별 가장 가까운 지하철역 top-3 사전 계산.

각 Dong.centroid 에서 SubwayStation.geom 까지 직선 거리 (geography meters) 기준
top-3 를 NearestSubway 캐시 테이블에 적재.

- compute_scores.py 의 score_transit 계산이 이 캐시를 사용한다.
- 화면 SPEC 6.3 교통 카드도 이 테이블을 직접 조회한다.

알고리즘
--------
ROW_NUMBER() OVER PARTITION BY dong_id 로 한 SQL 안에서 끝낸다.
426 dong × 400 station = 170,400 비교 → 1초 안에 완료.

멱등
----
TRUNCATE nearest_subway → INSERT all. 두 번 돌려도 결과 동일.

Usage
-----
    python scripts/compute_nearest_subway.py
"""

from __future__ import annotations

import sys

from _django import setup

setup()

from django.db import connection, transaction  # noqa: E402

from apps.neighborhoods.models import Dong  # noqa: E402
from apps.transit.models import NearestSubway, SubwayStation  # noqa: E402


SQL = """
INSERT INTO nearest_subway (dong_id, station_id, rank, distance_m)
SELECT dong_id, station_id, rank, distance_m
FROM (
    SELECT
        d.id AS dong_id,
        s.id AS station_id,
        ST_Distance(d.centroid::geography, s.geom::geography) AS distance_m,
        ROW_NUMBER() OVER (
            PARTITION BY d.id
            ORDER BY ST_Distance(d.centroid::geography, s.geom::geography)
        ) AS rank
    FROM dong d
    CROSS JOIN subway_station s
) ranked
WHERE rank <= 3;
"""


def main() -> int:
    n_dong = Dong.objects.count()
    n_station = SubwayStation.objects.count()
    if n_dong == 0 or n_station == 0:
        print(f"[ERROR] dong={n_dong}, station={n_station} — ETL 먼저 실행")
        return 1
    print(f"[INFO] {n_dong} dongs × {n_station} stations 거리 계산")

    with transaction.atomic():
        with connection.cursor() as cur:
            cur.execute("TRUNCATE TABLE nearest_subway RESTART IDENTITY")
            cur.execute(SQL)
            cur.execute("SELECT COUNT(*) FROM nearest_subway")
            n_inserted = cur.fetchone()[0]

    print(f"[OK] nearest_subway: {n_inserted} rows (예상 {n_dong * 3})")

    # 거리 분포 요약
    with connection.cursor() as cur:
        cur.execute(
            """
            SELECT
                rank,
                MIN(distance_m)::int  AS min_m,
                AVG(distance_m)::int  AS avg_m,
                MAX(distance_m)::int  AS max_m
            FROM nearest_subway
            GROUP BY rank ORDER BY rank
            """
        )
        for r in cur.fetchall():
            print(f"  rank={r[0]}  min={r[1]:>6}m  avg={r[2]:>6}m  max={r[3]:>6}m")

    # rank=1 거리 1km 초과 동 (지하철 멀리 있는 동) 표본
    with connection.cursor() as cur:
        cur.execute(
            """
            SELECT d.gu, d.name, ns.distance_m::int
            FROM nearest_subway ns
            JOIN dong d ON ns.dong_id = d.id
            WHERE ns.rank = 1 AND ns.distance_m > 1000
            ORDER BY ns.distance_m DESC LIMIT 10
            """
        )
        rows = cur.fetchall()
        if rows:
            print(f"\n  rank=1 가까운 역 1km 초과 동 ({len(rows)}+):")
            for gu, name, dist in rows:
                print(f"    {gu} {name}  {dist}m")

    return 0


if __name__ == "__main__":
    sys.exit(main())
