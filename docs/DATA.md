# 데이터 출처와 사용 방식

슬기로운 자취생활 — 어떤 공공데이터를 어디서 받아 어떻게 가공해 화면에 띄우는지의 단일 진실.

서비스 단위는 모두 **행정동** (서울시 425개). 모든 점수·집계는 동 단위로 사전 계산되어 PostgreSQL/PostGIS 한 곳에 적재된다. API 호출 시 가중치만 받아 합산.

마지막 갱신: 2026-05-04 — 25개 자치구 전 적재 완료.

---

## 1. 데이터 출처

| 출처 | 데이터셋 ID | 키 환경변수 | 갱신 주기 | 사용 분야 |
|------|------|------|------|------|
| data.go.kr (국토교통부) | 15126473 — 연립다세대 전월세 | `DATA_GO_KR_API_KEY` | 월 | 실거래가 |
| data.go.kr (국토교통부) | 15126472 — 단독다가구 전월세 | (동일 키) | 월 | 실거래가 |
| data.go.kr (국토교통부) | 15126475 — 오피스텔 전월세 | (동일 키) | 월 | 실거래가 |
| data.go.kr (소상공인진흥공단) | 15012005 — 상가(상권)정보 | (동일 키) | 분기 | 편의시설 (편의점, 마트, 음식점, 카페, 병원, 약국 등) |
| data.seoul.go.kr (서울 열린데이터광장) | `subwayStationMaster` | `SEOUL_OPEN_API_KEY` | 비정기 | 지하철역 좌표 |
| data.seoul.go.kr (서울 열린데이터광장) | `busStopLocationXyInfo` | (동일 키) | 비정기 | 버스 정류장 좌표 |
| data.seoul.go.kr (서울 열린데이터광장) | `SearchParkInfoService` | (동일 키) | 비정기 | 도시공원 좌표 |
| api.vworld.kr (국토지리정보원) | 주소 → 좌표 지오코딩 | `VWORLD_API_KEY` | — | 실거래 지번 좌표 변환 |
| 통계청 SGIS / 국가공간정보포털 | 행정동 GeoJSON | (불필요) | 연 1회 | 동 경계 폴리곤 |

> data.go.kr 인증키 1개로 위 4개 데이터셋(15126473/472/475 + 15012005)을 모두 호출.

---

## 2. DB 적재 현황 (2026-05-04 기준)

| 테이블 | 건수 | 단위 | 비고 |
|---|---:|---|---|
| `dong` | 425 | 행정동 | 서울 25개 구 |
| `rent_deal` | 123,012 | 거래 | 최근 6개월 (2025-11 ~ 2026-04) |
| `amenity` | 165,280 | 매장/공원 | 25개 구 + 도시공원 127개 |
| `subway_station` | 527 | 역×노선 | 서울교통공사 노선 + 광역철도 |
| `bus_stop` | 11,220 | 정류장 | 서울 시내버스 |
| `nearest_subway` | 1,275 | (동×rank) | 동 centroid 기준 top-3 사전계산 |
| `jibun_geocode_cache` | 36,021 | 지번 | VWorld 호출 결과 영구 캐시 |

**rent_deal — 유형별**

| deal_type | count | 기간 |
|---|---:|---|
| villa (연립다세대) | 62,517 | 2025-11 ~ 2026-04 |
| officetel (오피스텔) | 43,156 | 2025-11 ~ 2026-04 |
| danok (단독·다가구) | 17,339 | 2025-11 ~ 2026-04 |

**amenity — 카테고리별** (소상공인 코드 매핑)

| category | count | 매핑 규칙 |
|---|---:|---|
| restaurant | 94,742 | `indsMclsCd ∈ {I201,I202,I203,I204,I210}` (한·중·일·양·분식) |
| cafe | 21,205 | `indsSclsCd == 'I21201'` |
| hospital | 18,078 | `indsMclsCd ∈ {Q101, Q102}` (병원 + 의원) |
| mart | 9,978 | `indsSclsCd ∈ {G20404, G20509}` (슈퍼마켓 + 식료품) |
| convenience | 9,394 | `indsSclsCd == 'G20405'` |
| pharmacy | 5,247 | `indsSclsCd == 'G21501'` |
| laundry | 4,938 | `indsMclsCd == 'S203'` |
| studycafe | 1,185 | `bizesNm` 에 "스터디" 포함 (공식 코드 없음) |
| oliveyoung | 386 | `bizesNm` 에 "올리브영" 포함 |
| park | 127 | 서울시 도시공원 정보 (별도 API) |

---

## 3. 데이터셋별 상세

### 3.1 실거래가 (전월세)

**스크립트**: `backend/scripts/fetch_realestate.py`

**처리 절차**
1. **자치구(LAWD_CD) × 월 단위** XML 호출 — 25개 구 × 6개월 × 3 deal_type = 450 호출
2. 응답 파싱 → 법정동명(`umdNm`), 지번, 면적, 보증금, 월세, 계약일 추출
3. **지오코딩**: 지번 단위로만 VWorld에 좌표 요청. 매물(건물) 단위 정밀 좌표는 사용하지 않음 — `JibunGeocodeCache` 에 영구 캐시
4. **행정동 매핑**: PostGIS spatial join (`Dong.geom__contains=point`). 좌표 실패 시 같은 구 내 같은 이름 행정동 fallback
5. **사전 컷**: `deposit==0 AND monthly_rent==0` skip / `monthly_rent > 5000만` skip
6. **이상치 클리핑**: IQR 1.5배 (area_m2 / deposit / monthly_rent 각각)
7. `RentDeal.update_or_create(external_hash=...)` — 멱등 적재

**환산식 (전월세 통일 비교)**
```python
converted_rent = monthly_rent + deposit * 0.005   # 만원/월
```
계수 0.005 = 연 6% 전월세전환률 / 12개월. 국토부 공시 서울 평균 4~6%에 정렬. 이 값이 점수 계산 + 차트 + 비교에서 모두 동일하게 사용됨 (`apps/realestate/utils.py:convert_to_monthly` 단일 진실).

**주요 한계**
- 단독·다가구는 응답에 지번이 없는 경우가 많아 좌표 없이 적재 (skip 비율 ↑)
- 거래량 3건 미만 동은 점수 계산 시 fallback (구 평균 → 서울 중위)

### 3.2 편의시설 (소상공인 상가 + 도시공원)

**스크립트**: `backend/scripts/fetch_amenities.py`

**처리 절차**
1. **상가**: `divId=signguCd` 로 자치구 1회 호출당 ~24k건 페이지네이션 수신
2. 응답에 `lon/lat` (WGS84) 포함 — 별도 지오코딩 불필요
3. SBA의 `adongCd` 와 `Dong.code` 가 다른 체계라 코드 직접 매핑 불가 → 좌표 → `Dong.geom__contains` spatial join 으로 행정동 결정
4. SPEC 6.3 의 10개 카테고리로 매핑 (위 표 참고). 매핑 안 되는 업종은 skip
5. **공원**: 서울시 별도 API로 133개 도시공원 좌표 수신, 같은 spatial join

**가중치** (점수 계산용 — `compute_scores.AMENITY_WEIGHTS`)
```
convenience  0.20    가장 가중. 자취 1순위
hospital     0.15
mart         0.10
restaurant   0.10
cafe         0.10
studycafe    0.10
pharmacy     0.10
laundry      0.05
oliveyoung   0.05
park         0.05
```

### 3.3 교통 (지하철 + 버스)

**스크립트**: `backend/scripts/fetch_transit.py`

**처리 절차**
1. **지하철**: `subwayStationMaster` 1회 호출(~783 row) → `(name, line)` 단위 `update_or_create`
2. **버스 정류장**: `busStopLocationXyInfo` 페이지네이션 (1000/page) → 좌표 `Dong.geom__contains` spatial join → 서울 외부는 skip
3. **NearestSubway**: 모든 `Dong.centroid` 에서 ST_Distance(geography) 로 가장 가까운 지하철역 top-3 사전계산 (raw SQL)

**점수 가중 배분** — 도시형 표준
```
TRANSIT_W_SUBWAY  0.60
TRANSIT_W_BUS     0.40

지하철: 1000m 이내일 때만 점수 (0m=1.0, 1000m+=0.0 선형)
버스:   log1p(count) / log1p(50) — 50개=만점 클램프
```

### 3.4 행정동 경계 (Dong)

**스크립트**: `backend/apps/neighborhoods/management/commands/load_dongs.py`

**소스 파일**: `backend/data/seoul_dongs.geojson` (통계청 SGIS)

**모델**
```python
class Dong:
    slug          # URL-safe 식별자 (e.g. "1108083")
    name          # "동선동"
    gu            # "성북구"
    code          # 8자리 행정동 코드
    geom          # MultiPolygon (경계)
    centroid      # Point (대표 좌표)
    area_km2
    score_rent / score_amenity / score_transit  # 0~100, compute_scores 가 갱신
```

---

## 4. 점수 계산 알고리즘

**스크립트**: `backend/scripts/compute_scores.py --mode real`

3개 sub-score를 동 단위로 사전 계산 → DB에 저장. 종합 점수는 API에서 사용자 가중치(`w_rent`, `w_amenity`, `w_transit`, 합 100)로 합산.

```
score_total = score_rent · w_rent + score_amenity · w_amenity + score_transit · w_transit
```

### 4.1 score_rent (저렴할수록 높음)
1. 동별 최근 6개월 거래의 `converted_rent` 평균 계산
2. 거래 3건 미만 동: 같은 구 평균 → 서울 중위 fallback
3. **백분위 변환** → `100 - 백분위` (저렴=고점)

### 4.2 score_amenity
1. 동별 카테고리별 카운트
2. 각 카테고리 `log1p(count) × 가중치` 합산 (위 가중치 표)
3. 백분위 변환 (높을수록 좋음)

### 4.3 score_transit
1. 가장 가까운 지하철 거리 → `max(0, 1 - dist/1000)` (subway_score)
2. 동 내 버스 정류장 수 → `min(1, log1p(count)/log1p(50))` (bus_score)
3. `0.6 × subway_score + 0.4 × bus_score`
4. 백분위 변환

### 4.4 백분위 정규화
- 동률은 평균 rank
- 모든 점수 0~100, 평균 50, 표준편차 약 28.9 (균등 정규화 결과)

### 4.5 검증 (현재 분포)
```
score_rent     min=0.0  max=100.0  mean=50.0  std=28.9
score_amenity  min=0.0  max=100.0  mean=50.0  std=28.9
score_transit  min=0.0  max=100.0  mean=50.0  std=28.9
```

---

## 5. 파이프라인 스크립트 요약

`backend/scripts/` 의 5개 파이썬 스크립트가 모든 데이터 로딩을 담당. 모두 Django ORM을 직접 사용 (백엔드 API 호출 X), 같은 `DATABASE_URL` 에 쓴다.

| 스크립트 | 역할 | 의존 모델 | 키 |
|---|---|---|---|
| `_django.py` | Django setup, 환경변수 검증 | — | — |
| `build_dong_mapping.py` | 행정동 GeoJSON 검증 | Dong | — |
| `fetch_realestate.py` | 국토부 전월세 적재 + 지오코딩 | RentDeal, JibunGeocodeCache | `DATA_GO_KR_API_KEY`, `VWORLD_API_KEY` |
| `fetch_amenities.py` | 소상공인 상가 + 공원 적재 | Amenity | `DATA_GO_KR_API_KEY`, `SEOUL_OPEN_API_KEY` |
| `fetch_transit.py` | 지하철·버스 + 가까운 역 사전계산 | SubwayStation, BusStop, NearestSubway | `SEOUL_OPEN_API_KEY` |
| `compute_scores.py` | 동별 3개 점수 계산 | 위 모델 전체 | — |

**실행 순서** (실 데이터 풀 적재 시)
```bash
cd backend
uv run python scripts/build_dong_mapping.py data/seoul_dongs.geojson
uv run python manage.py load_dongs data/seoul_dongs.geojson

# 25개 구 풀 적재 (실거래는 약 2.5시간)
for GU in 종로구 중구 용산구 성동구 광진구 동대문구 중랑구 성북구 강북구 도봉구 \
         노원구 은평구 서대문구 마포구 양천구 강서구 구로구 금천구 영등포구 \
         동작구 관악구 서초구 강남구 송파구 강동구; do
  uv run python scripts/fetch_realestate.py --gu "$GU" --months 6
done
uv run python scripts/fetch_amenities.py --target all
uv run python scripts/fetch_transit.py --target all

# 점수 갱신
uv run python scripts/compute_scores.py --mode real
```

**갱신 주기 권장**: 월 1회 cron 또는 GitHub Actions.

데이터의 알려진 한계와 향후 보강 방향은 [`ROADMAP.md §1.1`](ROADMAP.md), [`§3.3 안전 지수`](ROADMAP.md), [`§3.4 자취생 비율`](ROADMAP.md) 참고.

---

## 6. 환경변수 요약

`backend/.env` 에 필수:

```env
# 공공데이터
DATA_GO_KR_API_KEY=    # 4개 데이터셋 (15126473/472/475 + 15012005), 일반 인증키(Decoding)
SEOUL_OPEN_API_KEY=    # data.seoul.go.kr 인증키
VWORLD_API_KEY=        # api.vworld.kr 백엔드 키 (도메인 제한 X)

# Django + DB
DJANGO_SECRET_KEY=...
DATABASE_URL=postgis://slgi:slgi@localhost:5433/slgi
```

키 발급 방법 상세는 `backend/scripts/README.md` 참고.
