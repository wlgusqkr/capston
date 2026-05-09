# Phase 4 — 행정동 점수 재계산 (SPEC 11.2)

작성일: 2026-05-09
상태: **완료** — 426개 행정동 score_rent / score_amenity / score_transit 갱신
선행 문서: `docs/handoff/20260508-phase2-etl.md`

---

## 완료된 작업

1. `backend/scripts/compute_nearest_subway.py` 신규 — 동별 가까운 SubwayStation top-3 사전계산. PostGIS `ST_Distance(geography)` + `ROW_NUMBER() OVER PARTITION` SQL 한 방.
2. `backend/scripts/compute_scores.py` 갱신:
   - `_collect_rent_metrics`: 7.4M RentDeal을 `Avg(monthly_rent + deposit*0.005)` SQL aggregation으로 (메모리 안전).
   - `_collect_amenity_metrics`: Amenity 모델 대신 **Store + ParkDong** 카운트 기반. `dong__id` join으로 to_field='code' FK 우회.
   - `_collect_transit_metrics`: NearestSubway 캐시(rank=1 distance) + BusStop count. 기존 알고리즘 그대로.
3. 426개 Dong의 score_rent / amenity / transit bulk_update.

---

## 산출물

- `backend/scripts/compute_nearest_subway.py` (신규, 95 줄)
- `backend/scripts/compute_scores.py` (수정 — import/docstring/2 함수 갱신)

---

## 실행 결과

### NearestSubway (426 dongs × 400 stations → top-3)

| rank | min  | avg  | max  |
|---|---:|---:|---:|
| 1 | 34m | 623m | 3,114m |
| 2 | 99m | 921m | 3,297m |
| 3 | 164m | 1,147m | 4,320m |

총 1,278 row (= 426 × 3). 1km 초과 동: 평창동(3,114m), 시흥2동(2,346m), 부암동(1,957m), 대학동(1,823m), 세곡동(1,760m) 등.

### 점수 분포

| score | min | max | mean | std |
|---|---:|---:|---:|---:|
| score_rent | 0.0 | 100.0 | 50.0 | 28.9 |
| score_amenity | 0.0 | 100.0 | 50.0 | 28.9 |
| score_transit | 0.0 | 100.0 | 50.0 | 28.9 |

**거래량 ≥3건 동: 426 / 426** (RDS 7.4M 거래로 모든 행정동이 충분한 데이터 보유 — fallback 0건).

### 패턴 검증

상위 score_amenity (시설 풍부):
- 강남구 역삼1동 A=100, 마포구 서교동(홍대) A=99.8, 금천구 가산동 A=99.5
- 종로구 종로1·2·3·4가동 A=99.3, 서초구 서초3동 A=99.1

하위 score_transit (지하철 외곽):
- 용산구 이촌2동 T=0.0, 중랑구 망우3동 T=0.2, 금천구 독산2동 T=0.6
- 성동구 송정동 T=0.6, 양천구 신월1동 T=1.2

trade-off 잘 드러남:
- 강남구 압구정동 R=1.6 (비싸다) / A=97.9 (시설 풍부)
- 금천구 독산4동 R=99.3 (저렴) / T=2.0 (지하철 멀다)
- 마포구 서교동 R=65 / A=99.8 / T=89.2 (균형)

---

## 알고리즘 정리 (실제 적용)

### score_rent
1. 환산월세 = `monthly_rent + deposit * 0.005` (`apps.realestate.utils.convert_to_monthly` 와 동일 계수).
2. 동별 평균 (RentDeal SQL aggregation, n>=3).
3. 백분위 invert → 저렴할수록 100.

### score_amenity
1. 동별 Store 카운트 (`dong__id` join, `dong IS NOT NULL`).
2. 동별 Park 카운트 (ParkDong 다대다 → 동당 평균 5~6 공원).
3. 가중합: `log1p(store) * 0.8 + log1p(park) * 0.2`. log scale 이유는 store(수십~수천)와 park(0~10) 스케일 차이 흡수.
4. 백분위.

> **카테고리 가중(편의점/카페/병원 등) 미적용** — RDS 통합 후 Amenity 모델은 derived view로 빠지고 raw는 Store가 보유. business_category 247개 → 11종 매핑은 추후 별도 PR. 지금은 Store 전체 카운트로 단순화.

### score_transit
1. NearestSubway rank=1 distance → `1 - dist/1000` 클램프 (0~1).
2. BusStop count → `log1p(n) / log1p(50)` 클램프 (0~1).
3. 가중합: `0.6 * subway + 0.4 * bus`.
4. 백분위.

---

## 알려진 제약 / 다음 PR 후보

1. **카테고리 가중 amenity** — SPEC 11.2의 본 의도. business_category(247) ↔ 11종 매핑 사전을 만들면 정밀해짐. 현재는 단순 카운트.
2. **Amenity 모델 derived view 채우기** — 동 상세 화면 카테고리 카드(SPEC 6.3)는 Amenity 테이블 기대. Store에서 카테고리 매핑된 row만 추출해 Amenity에 적재하는 ETL이 다음 단계.
3. **score_safety / score_population 등 추가 점수** — RDS의 metric/seoul_metric/gu_metric 데이터 활용 가능. 지표 35종 보유.
4. **NearestSubway 거리 = 직선 거리** — 도보/대중교통 시간이 아님. 학부 프로젝트 단순화.

---

## 재실행 명령

```bash
cd /Users/bagjihyeon/Desktop/School/capston/backend
.venv/bin/python scripts/compute_nearest_subway.py    # 캐시 채우기 (멱등)
.venv/bin/python scripts/compute_scores.py --mode real
```

두 스크립트 모두 멱등 — 두 번 돌려도 결과 동일.
