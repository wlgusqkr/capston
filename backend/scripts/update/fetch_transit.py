"""교통(지하철역, 버스 정류장) 적재 + 행정동별 가까운 역 사전계산.

데이터 출처
-----------
- 서울 열린데이터광장 (data.seoul.go.kr)
  - subwayStationMaster (지하철역 마스터, 783 rows: 역×노선)
  - busStopLocationXyInfo (서울시 버스 정류장 좌표, ~11,200 rows)
  좌표는 WGS84 (EPSG:4326) 그대로 제공 — 추가 변환 없음.

처리 흐름
----------
1. SubwayStation: API → name/line 단위로 update_or_create.
2. BusStop: API → 좌표 → Dong polygon containment → dong FK.
   서울 외부 정류장은 skip (containment 실패 케이스).
3. NearestSubway: 모든 Dong centroid → ST_Distance(geography) 로 top-3 사전계산.
   raw SQL 사용해서 정확한 미터 단위 거리 보장.

CLI
---
    python scripts/fetch_transit.py --target subway
    python scripts/fetch_transit.py --target bus
    python scripts/fetch_transit.py --target bus --limit 1000
    python scripts/fetch_transit.py --target nearest
    python scripts/fetch_transit.py --target all
"""

from __future__ import annotations

import argparse
import sys
import time
from typing import Iterable

import requests

from _django import require_env, setup

setup()

# Django/PostGIS — setup() 이후에만 import 가능.
from django.contrib.gis.geos import Point  # noqa: E402
from django.db import connection, transaction  # noqa: E402

from apps.neighborhoods.models import Dong  # noqa: E402
from apps.transit.models import BusStop, NearestSubway, SubwayStation  # noqa: E402


SUBWAY_ENDPOINT_TMPL = (
    "http://openapi.seoul.go.kr:8088/{key}/json/subwayStationMaster/{start}/{end}/"
)
BUS_ENDPOINT_TMPL = (
    "http://openapi.seoul.go.kr:8088/{key}/json/busStopLocationXyInfo/{start}/{end}/"
)

PAGE_SIZE = 1000  # 서울 OpenAPI 한 호출당 최대 1000건


# ---------------------------------------------------------------------------
# Subway
# ---------------------------------------------------------------------------

def _fetch_subway(api_key: str) -> list[dict]:
    """지하철역 전체 목록 (역×노선 단위, ~783).

    페이지네이션: 1000개 단일 호출이면 충분하지만 일반화해서 페이지 루프.
    """

    out: list[dict] = []
    start = 1
    while True:
        end = start + PAGE_SIZE - 1
        url = SUBWAY_ENDPOINT_TMPL.format(key=api_key, start=start, end=end)
        r = requests.get(url, timeout=15)
        r.raise_for_status()
        body = r.json().get("subwayStationMaster") or {}
        result = body.get("RESULT", {})
        if result.get("CODE", "").startswith("ERROR"):
            raise RuntimeError(f"Seoul API error: {result}")
        rows = body.get("row", []) or []
        out.extend(rows)
        total = int(body.get("list_total_count", 0))
        if not rows or start + len(rows) > total:
            break
        start += len(rows)
    return out


def _ingest_subway(rows: Iterable[dict]) -> dict[str, int]:
    """SubwayStation upsert. (name, line) unique."""

    created = updated = skipped = 0
    for r in rows:
        name = (r.get("BLDN_NM") or "").strip()
        line = (r.get("ROUTE") or "").strip()
        ext_id = (r.get("BLDN_ID") or "").strip() or None
        try:
            lat = float(r["LAT"])
            lng = float(r["LOT"])
        except (KeyError, TypeError, ValueError):
            skipped += 1
            continue
        if not name or not line:
            skipped += 1
            continue
        # 좌표 sanity (서울 대략 위경도 박스)
        if not (37.4 <= lat <= 37.7 and 126.7 <= lng <= 127.2):
            skipped += 1
            continue
        obj, was_created = SubwayStation.objects.update_or_create(
            name=name,
            line=line,
            defaults={
                "external_id": ext_id,
                "geom": Point(lng, lat, srid=4326),
            },
        )
        if was_created:
            created += 1
        else:
            updated += 1
    return {"created": created, "updated": updated, "skipped": skipped}


# ---------------------------------------------------------------------------
# Bus stops
# ---------------------------------------------------------------------------

def _fetch_bus_stops(api_key: str, limit: int | None = None) -> list[dict]:
    """버스 정류장 페이지네이션 fetch.

    서울 전체 ~11,200개. limit 지정 시 거기까지만.
    """

    out: list[dict] = []
    start = 1
    while True:
        end = start + PAGE_SIZE - 1
        url = BUS_ENDPOINT_TMPL.format(key=api_key, start=start, end=end)
        r = requests.get(url, timeout=20)
        r.raise_for_status()
        body = r.json().get("busStopLocationXyInfo") or {}
        result = body.get("RESULT", {})
        if result.get("CODE", "").startswith("ERROR"):
            raise RuntimeError(f"Seoul API error: {result}")
        rows = body.get("row", []) or []
        out.extend(rows)
        total = int(body.get("list_total_count", 0))
        if limit is not None and len(out) >= limit:
            out = out[:limit]
            break
        if not rows or start + len(rows) > total:
            break
        start += len(rows)
        # 서울 OpenAPI는 분당 호출 한도가 있어 약간의 sleep
        time.sleep(0.2)
    return out


def _ingest_bus_stops(rows: Iterable[dict]) -> dict[str, int]:
    """BusStop upsert. arsId(=STOPS_NO) 기준 멱등.

    Dong 매핑은 PostGIS containment. 서울 외부 정류장은 skip.
    """

    rows = list(rows)
    created = updated = skipped_coord = skipped_outside = 0
    for r in rows:
        ars = (r.get("STOPS_NO") or "").strip()
        name = (r.get("STOPS_NM") or "").strip()
        try:
            lng = float(r["XCRD"])
            lat = float(r["YCRD"])
        except (KeyError, TypeError, ValueError):
            skipped_coord += 1
            continue
        if not ars or not name:
            skipped_coord += 1
            continue
        if not (37.4 <= lat <= 37.7 and 126.7 <= lng <= 127.2):
            skipped_outside += 1
            continue
        point = Point(lng, lat, srid=4326)
        dong = Dong.objects.filter(geom__contains=point).first()
        if dong is None:
            skipped_outside += 1
            continue
        obj, was_created = BusStop.objects.update_or_create(
            arsId=ars,
            defaults={
                "dong": dong,
                "name": name,
                "geom": point,
            },
        )
        if was_created:
            created += 1
        else:
            updated += 1
    return {
        "created": created,
        "updated": updated,
        "skipped_coord": skipped_coord,
        "skipped_outside_seoul": skipped_outside,
    }


# ---------------------------------------------------------------------------
# Nearest subway precompute (per-Dong top-3, exact meters)
# ---------------------------------------------------------------------------

def precompute_nearest_subway(top_k: int = 3) -> dict[str, int]:
    """Dong centroid → 가장 가까운 SubwayStation top_k 를 NearestSubway 캐시에 채운다.

    정확한 미터 거리: ST_Distance(geom::geography, centroid::geography).
    재실행 시 기존 캐시 삭제 후 재생성 (멱등).
    """

    if not SubwayStation.objects.exists():
        raise RuntimeError("SubwayStation 이 비어 있습니다. 먼저 --target subway 실행.")
    if not Dong.objects.exists():
        raise RuntimeError("Dong 테이블이 비어 있습니다.")

    # bulk delete + bulk create 트랜잭션
    sql = """
        SELECT s.id, ST_Distance(s.geom::geography, %s::geography) AS dist_m
        FROM subway_station s
        ORDER BY s.geom <-> %s
        LIMIT %s;
    """

    total_created = 0
    total_dongs = 0
    with transaction.atomic():
        NearestSubway.objects.all().delete()
        bulk: list[NearestSubway] = []
        for dong in Dong.objects.iterator():
            centroid_wkt = dong.centroid.ewkt  # SRID=4326;POINT(...)
            with connection.cursor() as cur:
                cur.execute(sql, [centroid_wkt, centroid_wkt, top_k])
                rows = cur.fetchall()
            if not rows:
                continue
            for rank, (station_id, dist_m) in enumerate(rows, start=1):
                bulk.append(
                    NearestSubway(
                        dong_id=dong.id,
                        station_id=station_id,
                        rank=rank,
                        distance_m=float(dist_m),
                    )
                )
            total_dongs += 1
            # bulk flush every ~1000 dongs
            if len(bulk) >= 3000:
                NearestSubway.objects.bulk_create(bulk)
                total_created += len(bulk)
                bulk.clear()
        if bulk:
            NearestSubway.objects.bulk_create(bulk)
            total_created += len(bulk)

    return {"dongs": total_dongs, "rows": total_created}


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description="교통 데이터 적재 + 가까운 역 사전계산")
    parser.add_argument(
        "--target",
        choices=["subway", "bus", "nearest", "all"],
        default="all",
        help="subway/bus 적재 또는 nearest 사전계산",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="--target bus 일 때 적재할 정류장 수 상한 (테스트용)",
    )
    args = parser.parse_args()

    needs_seoul_key = args.target in ("subway", "bus", "all")
    api_key = ""
    if needs_seoul_key:
        api_key = require_env(
            "SEOUL_OPEN_API_KEY",
            hint="data.seoul.go.kr 회원가입 후 일반 인증키 발급 (샘플 인증키 X).",
        )

    if not Dong.objects.exists():
        print("[WARN] Dong 테이블이 비어 있습니다. 먼저 load_dongs 적재 필요.")
        return 1

    if args.target in ("subway", "all"):
        print("[subway] fetching subwayStationMaster ...")
        rows = _fetch_subway(api_key)
        print(f"[subway] fetched {len(rows)} rows")
        stats = _ingest_subway(rows)
        print(f"[subway] ingest: {stats}")

    if args.target in ("bus", "all"):
        print(f"[bus] fetching busStopLocationXyInfo (limit={args.limit}) ...")
        rows = _fetch_bus_stops(api_key, limit=args.limit)
        print(f"[bus] fetched {len(rows)} rows")
        stats = _ingest_bus_stops(rows)
        print(f"[bus] ingest: {stats}")

    if args.target in ("nearest", "all"):
        print("[nearest] computing top-3 nearest subway per Dong ...")
        stats = precompute_nearest_subway(top_k=3)
        print(f"[nearest] {stats}")

    print("\nDONE.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
