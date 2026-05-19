"""행정동별/법정동별 가장 가까운 지하철역 top-3 사전 계산.

sub-plan 4.5D 정합:
- NearestSubwayAdong (adong 기반) + NearestSubwayLdong (ldong 기반) 양쪽 적재.
- 환승역 중복 제거: (단위, station_name) MIN distance.
- distance = ST_Distance(geography, geography) — 측지선 m.
- 단위별 항상 3행 lock (rank 1,2,3).

또한 legacy NearestSubway(neighborhoods.Dong FK) 도 함께 적재 (capston frontend 호환,
lock D). Dong.centroid 기반.

알고리즘
--------
ROW_NUMBER() OVER PARTITION BY 단위_code ORDER BY MIN(distance) per station_name.
각 행정동/법정동/legacy dong에 대해 station_name(환승역 그룹) 기준 top-3.

멱등
----
TRUNCATE → INSERT all. 두 번 돌려도 결과 동일.

Usage
-----
    python scripts/scoring/compute_nearest_subway.py
"""

from __future__ import annotations

import sys

from _django import setup

setup()

from django.db import connection, transaction  # noqa: E402

from apps.public_data.regions.models import Adong, Ldong  # noqa: E402
from apps.public_data.subway.models import (  # noqa: E402
    NearestSubway,
    NearestSubwayAdong,
    NearestSubwayLdong,
    SubwayStation,
)
from apps.service.neighborhoods.models import Dong  # noqa: E402


# NearestSubwayAdong: schema.dbml line 449~459
# (adong_code, station_name) 단위 MIN distance + ROW_NUMBER top-3.
SQL_ADONG = """
INSERT INTO nearest_subway_adong (adong_code, rank, station_name, distance_m)
SELECT adong_code, rank, station_name, distance_m
FROM (
    SELECT
        a.adong_code AS adong_code,
        s.name AS station_name,
        MIN(ST_Distance(s.location::geography, a.boundary::geography)) AS distance_m,
        ROW_NUMBER() OVER (
            PARTITION BY a.adong_code
            ORDER BY MIN(ST_Distance(s.location::geography, a.boundary::geography))
        ) AS rank
    FROM adong a
    CROSS JOIN subway_station s
    GROUP BY a.adong_code, s.name
) ranked
WHERE rank <= 3;
"""

# NearestSubwayLdong: schema.dbml line 463~473
SQL_LDONG = """
INSERT INTO nearest_subway_ldong (ldong_code, rank, station_name, distance_m)
SELECT ldong_code, rank, station_name, distance_m
FROM (
    SELECT
        l.ldong_code AS ldong_code,
        s.name AS station_name,
        MIN(ST_Distance(s.location::geography, l.boundary::geography)) AS distance_m,
        ROW_NUMBER() OVER (
            PARTITION BY l.ldong_code
            ORDER BY MIN(ST_Distance(s.location::geography, l.boundary::geography))
        ) AS rank
    FROM ldong l
    CROSS JOIN subway_station s
    GROUP BY l.ldong_code, s.name
) ranked
WHERE rank <= 3;
"""

# legacy NearestSubway(neighborhoods.Dong FK): Dong.centroid 기반 ROW_NUMBER.
# capston frontend 호환 (lock D). station FK 보존.
SQL_LEGACY = """
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
    n_adong = Adong.objects.count()
    n_ldong = Ldong.objects.count()
    n_dong = Dong.objects.count()
    n_station = SubwayStation.objects.count()
    if n_station == 0 or (n_adong == 0 and n_ldong == 0 and n_dong == 0):
        print(
            f"[ERROR] adong={n_adong}, ldong={n_ldong}, dong={n_dong}, "
            f"station={n_station} — ETL 먼저 실행"
        )
        return 1
    print(
        f"[INFO] adong={n_adong}, ldong={n_ldong}, dong={n_dong}, "
        f"station={n_station} — 거리 계산"
    )

    with transaction.atomic():
        with connection.cursor() as cur:
            # Adong 단위.
            if n_adong > 0:
                cur.execute("TRUNCATE TABLE nearest_subway_adong")
                cur.execute(SQL_ADONG)
                cur.execute("SELECT COUNT(*) FROM nearest_subway_adong")
                n_ad = cur.fetchone()[0]
                print(f"[OK] nearest_subway_adong: {n_ad} rows (예상 {n_adong * 3})")

            # Ldong 단위.
            if n_ldong > 0:
                cur.execute("TRUNCATE TABLE nearest_subway_ldong")
                cur.execute(SQL_LDONG)
                cur.execute("SELECT COUNT(*) FROM nearest_subway_ldong")
                n_ld = cur.fetchone()[0]
                print(f"[OK] nearest_subway_ldong: {n_ld} rows (예상 {n_ldong * 3})")

            # legacy Dong (capston frontend 호환 lock D).
            if n_dong > 0:
                cur.execute("TRUNCATE TABLE nearest_subway RESTART IDENTITY")
                cur.execute(SQL_LEGACY)
                cur.execute("SELECT COUNT(*) FROM nearest_subway")
                n_lg = cur.fetchone()[0]
                print(f"[OK] nearest_subway (legacy): {n_lg} rows (예상 {n_dong * 3})")

    return 0


if __name__ == "__main__":
    sys.exit(main())
