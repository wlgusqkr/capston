# scripts/scoring/ — 점수 산식

행정동(adong) 단위 점수 계산 및 보조 산출(NearestSubway 캐시 등) 스크립트 위치.

## 범위 (단계 4 시점 placeholder)

- 매물 / 동 단위 점수 산식 계산.
- 보조 캐시 (예: `nearest_subway` 사전계산) 재생성.
- 입력: PostGIS 적재 완료된 정규 테이블 (rent_deal / amenity / subway_station 등).
- 출력: `adong_score_current` / `adong_score_history` 등 점수 컬럼/테이블.

## 산식 가이드 (간단)

세 항목으로 구성된 합성 점수 (`score_rent`, `score_amenity`, `score_transit`).

| 항목 | 입력 | 정규화 방향 |
| --- | --- | --- |
| `score_rent` | RentDeal 환산 월세 (월세 + 보증금 × 0.005) | 저렴할수록 ↑ |
| `score_amenity` | AmenityAdong join → 카테고리별 카운트 / 면적 | 많을수록 ↑ |
| `score_transit` | NearestSubway 도보 거리 + BusStop 카운트 | 가깝고 많을수록 ↑ |

`composite_score(w_rent, w_amenity, w_transit)` = 가중 합 (0~100 스케일).

## 현행 보정 스크립트

`recompute_current_adong_transit.py` 는 기존 API/테이블 구조를 유지한 채
`current_adong.score_transit` 만 재계산한다.

- 지하철: `Adong.location` 중심점에서 가장 가까운 `subway_station.location` 까지의
  거리, 1km anchor, 60% 가중.
- 버스: `bus_stop` 행정동별 정류장 수 / `Adong.area_m2` 밀도, `log1p(density)` p95
  anchor, 40% 가중.
- 기본은 dry-run 이며 `--apply` 를 붙일 때만 `current_adong` 을 갱신한다.

```bash
python scripts/scoring/recompute_current_adong_transit.py --slug 강북구-우이동
python scripts/scoring/recompute_current_adong_transit.py
python scripts/scoring/recompute_current_adong_transit.py --apply
```

## 입력 lock

- 단계 7(점수 재계산) plan 진입 시 산식 lock + 구현 채움.
- 본 단계(4)에서는 폴더/README placeholder 만.
