"""교통(지하철역, 버스 정류장) 적재 + 행정동별 가까운 역 사전계산 — 골격.

데이터 출처
-----------
- 서울 열린데이터광장 (data.seoul.go.kr): 지하철역 좌표, 버스 정류소 좌표
  - 예: '서울교통공사_노선별 지하철역 정보', '서울시 정류소 정보 조회'
- VWorld (vworld.kr): 좌표 변환/지오코딩 백업 (SPEC 14.2 — 매물 단위 지오코딩 금지, 역/정류장은 OK)

처리
----
1. 지하철역: API → SubwayStation (name, line, location).
2. 버스 정류장: API → BusStop (location). 행정동 폴리곤과 ST_Within 으로 매칭하여 dong FK.
3. 각 행정동별 가까운 역 3개를 사전 계산 (SPEC 6.3 교통 섹션).
   PostGIS ST_Distance 사용. 결과는 Dong 모델 또는 별도 캐시 테이블.

CURRENT STATUS
--------------
**모델 미존재.** apps/transit/SubwayStation, BusStop 미구현.
키 검증 + dry-run 흐름만 제공.

Usage
-----
    export SEOUL_OPEN_API_KEY=...
    python scripts/fetch_transit.py --target subway
    python scripts/fetch_transit.py --target bus
    python scripts/fetch_transit.py --target nearest    # 가까운 역 3개 사전 계산
"""

from __future__ import annotations

import argparse
import sys

from _django import require_env, setup

setup()


SUBWAY_ENDPOINT = "http://openapi.seoul.go.kr:8088/{key}/json/subwayStationMaster/1/1000/"
BUS_STOP_ENDPOINT = "http://openapi.seoul.go.kr:8088/{key}/json/busStopLocationXyInfo/1/1000/"


def fetch_subway_stations(api_key: str) -> list[dict]:
    """지하철역 좌표 풀 받기 — placeholder."""

    print(f"[DRY] would call subwayStationMaster with key={api_key[:6]}...")
    return []


def fetch_bus_stops(api_key: str) -> list[dict]:
    """버스 정류장 좌표 풀 받기 — placeholder.

    1000개씩 페이지네이션 필요 (서울 전체 약 12000개).
    """

    print(f"[DRY] would call busStopLocationXyInfo with key={api_key[:6]}...")
    return []


def precompute_nearest_subway(top_k: int = 3) -> None:
    """행정동 centroid → 가까운 지하철역 top-K 사전 계산.

    실 구현 시 PostGIS:
        SELECT s.id, ST_Distance(d.centroid::geography, s.location::geography) AS dist_m
        FROM dong d, subway_station s
        WHERE d.id = %s
        ORDER BY d.centroid <-> s.location
        LIMIT 3;

    결과는 별도 NearestSubway(dong, station, rank, distance_m) 테이블에 저장.
    """

    print("[DRY] would compute top-3 nearest subway stations per Dong (PostGIS ST_Distance)")


def main() -> int:
    parser = argparse.ArgumentParser(description="교통 데이터 적재/전처리 골격")
    parser.add_argument(
        "--target",
        choices=["subway", "bus", "nearest", "all"],
        default="all",
        help="subway/bus 적재 또는 nearest 사전계산",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if args.target in ("subway", "bus", "all"):
        api_key = require_env(
            "SEOUL_OPEN_API_KEY",
            hint="data.seoul.go.kr 회원가입 후 '인증키 신청'에서 발급. 일반 인증키(샘플 인증키 아님).",
        )
    else:
        api_key = ""  # nearest only — 키 불필요

    # 적어도 Dong 테이블이 있어야 nearest 계산 가능
    from apps.neighborhoods.models import Dong  # noqa: E402

    if args.target in ("nearest", "all") and not Dong.objects.exists():
        print("[WARN] Dong 테이블이 비어 있습니다. nearest 계산 SKIP.")
        return 1

    if args.target in ("subway", "all"):
        rows = fetch_subway_stations(api_key)
        print(f"  subway stations seen: {len(rows)} (DB 적재 SKIP — SubwayStation 모델 미존재)")

    if args.target in ("bus", "all"):
        rows = fetch_bus_stops(api_key)
        print(f"  bus stops seen: {len(rows)} (DB 적재 SKIP — BusStop 모델 미존재)")

    if args.target in ("nearest", "all"):
        precompute_nearest_subway(top_k=3)

    print("\n실 적재를 위해서는 SubwayStation/BusStop 모델 추가 필요.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
