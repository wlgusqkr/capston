# Task: Phase 0a Step 2 — fetch_transit.py 본문 + Nearest 사전계산

`docs/handoff/20260503-phase0a-kickoff.md` 섹션 4 Step 2 완료. 모델은 Step 1a 에서 이미 만들어진 `apps.transit.{SubwayStation, BusStop, NearestSubway}` 사용.

## 완료된 작업

### 1) `_fetch_subway` + `_ingest_subway`
- 서울 OpenAPI `subwayStationMaster` 호출 (1000건/페이지 페이지네이션 — 단일 호출로도 충분).
- 응답 필드: `BLDN_ID`, `BLDN_NM` (역명), `ROUTE` (노선), `LAT`, `LOT`. **WGS84 (EPSG:4326) 그대로 제공** — 좌표 변환 불요.
- (name, line) unique key 로 `update_or_create` 멱등.
- 환승역(예: 충무로 3호선/4호선)은 다른 row 로 따로 적재 — Nearest top-3 에서 같은 역명이 노선 별로 나올 수 있음(현 결과 합리).

### 2) `_fetch_bus_stops` + `_ingest_bus_stops`
- 서울 OpenAPI `busStopLocationXyInfo` 페이지네이션 (1000건/페이지 × 12회). 호출 사이 0.2s sleep.
- 응답 필드: `STOPS_NO` (= arsId), `STOPS_NM`, `XCRD` (lng), `YCRD` (lat). **WGS84 그대로**.
- 좌표 → `Dong.objects.filter(geom__contains=Point)` 로 행정동 매핑. 매핑 실패 정류장은 skip(서울 외곽/경계).
- `arsId` 기준 `update_or_create` 멱등.
- `--limit N` 옵션으로 샘플 적재 가능 (테스트용).

### 3) `precompute_nearest_subway`
- Dong centroid 별로 raw SQL `ST_Distance(s.geom::geography, centroid::geography)` + `ORDER BY s.geom <-> centroid` (KNN GiST) `LIMIT 3`.
- 정확한 미터 거리 (geography cast). degree-to-m 근사 X.
- 트랜잭션 안에서 `NearestSubway.objects.all().delete()` 후 `bulk_create` (3000건씩 flush) — 멱등.
- 결과: 425 dong × rank 1~3 = **1275 row**.

### 4) CLI
- `--target subway|bus|nearest|all` (기존 패턴 유지).
- `--limit N` (`bus` 전용) 추가.
- `setup()` 후에야 ORM import 가능하도록 import 순서 정리 (`# noqa: E402`).

## 산출물

### 변경 파일
- `/Users/bagjihyeon/Desktop/School/capston/backend/scripts/fetch_transit.py` (placeholder → 실 구현)

### 신규/생성된 데이터
- `subway_station` 527 rows (원본 783 중 서울 박스 외 256개 skip — 진접선/중앙선 외곽 등)
- `bus_stop` 11220 rows (원본 11237 중 17개 skip — 행정동 폴리곤 외부)
- `nearest_subway` 1275 rows (425 dong × top 3)

## 실행 명령

```bash
cd backend && source .venv/bin/activate
set -a && source .env && set +a

python scripts/fetch_transit.py --target subway          # ~5s
python scripts/fetch_transit.py --target bus --limit 1000  # 샘플
python scripts/fetch_transit.py --target bus             # ~3분 (12 페이지)
python scripts/fetch_transit.py --target nearest         # ~10s
python scripts/fetch_transit.py --target all             # 위 모두 순차
```

## API 호출 횟수 (전체 1회 적재 기준)

| 단계 | 엔드포인트 | 호출 수 |
|---|---|---|
| subway | subwayStationMaster | 1 |
| bus | busStopLocationXyInfo | 12 (1000 × 12) |
| nearest | (PostGIS only) | 0 |
| **합계** | | **13** |

서울 OpenAPI 일일 1000회 한도 내 충분. cron: 분기 1회 권장.

## 좌표계 정보

- **subway 응답 LAT/LOT**: WGS84 (EPSG:4326) 직접 제공. 변환 불요.
- **bus 응답 XCRD/YCRD**: WGS84 (EPSG:4326) 직접 제공. 변환 불요.
- (참고: 일부 다른 서울 API는 EPSG:5181/5174 였지만, 위 두 엔드포인트는 4326.)

## 검증

```python
from apps.transit.models import SubwayStation, BusStop, NearestSubway
print(SubwayStation.objects.count(), BusStop.objects.count(), NearestSubway.objects.count())
# 527 11220 1275
```

거리 sanity 통과 sample:
- 중구 명동: 을지로입구(2호선) 297m → 명동(4호선) 350m → 종각(1호선) 725m
- 중구 필동: 충무로(4호선) 489m → 충무로(3호선) 514m → 명동(4호선) 811m
- 중구 광희동: 동대문역사문화공원(5호선) 164m → 동대문역사문화공원(4호선) 376m
- 마포구 공덕동: 애오개(5호선) 519m → 공덕(5호선) 769m
- 동대문구 용신동: 제기동(1호선) 359m

모든 거리 단위가 미터 (degree-혼동 없음).

## 다음 작업자에게 전달할 것

### compute_scores.py / data-pipeline 에게
- `score_transit` 계산 시 `NearestSubway` rank=1 의 `distance_m` 을 walk-min 환산 (도보 80m/min) + `BusStop` 카운트 가중합.
- 행정동별 정류장 카운트는 `Dong.bus_stops.count()` 한 번이면 충분 (인덱스 있음).

### backend-engineer 에게
- 동 상세 패널 API에서 `dong.nearest_subways.select_related('station').order_by('rank')[:3]` 으로 즉시 응답 가능 — 지연 없음.
- 사용자 점수(Phase 2 커널 점수)에서는 `SubwayStation.objects.annotate(d=Distance('geom', user_point, spheroid=True)).order_by('d')[:3]` 식으로 동적 조회 (커널 사이즈 σ=300m 안에서 ST_DWithin 1000m 컷).

## 미완 / 알려진 이슈

- 서울 OpenAPI는 분당/일별 호출 한도 명시 X — 실제 부하 없을 거지만 분기 1회 cron 권장 (정류장 신설/폐지 반영).
- `subway_station` 의 `external_id` 는 서울 API의 `BLDN_ID`. 다른 노선 API와는 매칭이 안 될 수 있음 — 외부 통합이 필요할 때 (name, line) 키 위주로 활용.
- 17개 정류장이 서울 행정동 폴리곤 외부로 skip — 대부분 한강/경계선 위 (서울 외곽 환승 정류장). 의미 있는 손실 X.
- `subway_station.skipped` 256개는 진접선/중앙선/경의중앙선 등 광역철도 비서울 구간 — 의도된 필터.
- `precompute_nearest_subway` 는 데이터 변경 시 전량 재계산 (~10s). 증분 갱신 필요 시 별도 구현.
