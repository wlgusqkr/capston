# backend/scripts/ — 공공데이터 적재 파이프라인

10단계 (보너스) 산출물. 실 데이터 적재 **뼈대**.
키가 들어오면 fetch 함수 본문 + 모델만 채우면 즉시 동작하도록 골격을 맞춰 둠.

---

## 폴더 구조 (단계 4A 이후)

| 폴더 | 목적 |
|---|---|
| `etl/` | 초기 적재 (initial load). `seed/`(행정동 매핑 등), `legacy_from_rds/`(팀원 RDS 참고용), 추후 `from_dp_db/`(DP_DB → SLGI 임시 ETL, 단계 4B) |
| `update/` | 일일 업데이트 fetch (공공데이터 API). idempotent 설계. |
| `scoring/` | 점수 산식 + 보조 산출 (NearestSubway 캐시 등). |
| `validate/` | 스키마/데이터 품질/공간 데이터 검증 placeholder. |

루트 유지 파일: `_django.py` (공통 setup helper), `__init__.py`, 본 `README.md`.

## 스크립트 목록

| 파일 | 목적 | 필요 키 | 모델 의존 |
|---|---|---|---|
| `_django.py` | Django setup helper, 환경변수 검증 | — | — |
| `etl/seed/build_dong_mapping.py` | 행정동 GeoJSON 검증 + 법정동→행정동 매핑 CSV 생성 | — | Dong |
| `update/fetch_realestate.py` | 국토부 실거래가 (전월세) 수집 | `DATA_GO_KR_API_KEY` | RentDeal |
| `update/fetch_amenities.py` | 소상공인진흥공단 상가정보 수집 | `DATA_GO_KR_API_KEY` (동일 키) | Amenity |
| `update/fetch_transit.py` | 지하철역/버스 정류장 좌표 수집 | `SEOUL_OPEN_API_KEY` | SubwayStation/BusStop |
| `scoring/compute_nearest_subway.py` | 가까운 지하철역 사전계산 (NearestSubway 캐시) | — | SubwayStation/Dong |
| `scoring/compute_scores.py` | 점수 계산 (SPEC 11.2) | — | 위 모델들 |

---

## 키 받는 방법

### 1. data.go.kr 인증키 (`DATA_GO_KR_API_KEY`) — 1개로 4개 데이터셋 사용

data.go.kr 인증키는 **계정 단위**로 발급. 한 키로 그 계정에서 활용 승인된 모든 API에 접근. 즉:

- 키 1개 (`.env` 의 `DATA_GO_KR_API_KEY` 1개 값)
- 활용신청 4번 (각 데이터셋 페이지에서 한 번씩 클릭)

**신청 절차**

1. <https://www.data.go.kr/> 회원가입
2. 아래 4개 데이터셋 페이지에서 각각 "활용신청" 클릭 (사유 동일하게 복붙 OK)
   - 15126473 — 국토교통부_연립다세대 전월세 자료
   - 15126472 — 국토교통부_단독/다가구 전월세 자료
   - 15126475 — 국토교통부_오피스텔 전월세 자료
   - 15012005 — 소상공인진흥공단_상가(상권)정보
3. 보통 자동승인(수분). 마이페이지 > 인증키 발급현황에서 같은 키 1개 확인.
4. 그 키를 `.env` 의 `DATA_GO_KR_API_KEY` 에 저장. **반드시 일반 인증키(Decoding)** — Encoding 키는 URL 인코딩 한 번 더 들어가서 깨짐.

**일일 트래픽**: 활용신청 시 설정 (기본 10,000회/일). 우리는 25개 구 × 6개월 = ~150콜이라 여유.

### 2. 서울 열린데이터광장 (`SEOUL_OPEN_API_KEY`)

- URL: <https://data.seoul.go.kr/>
- 회원가입 → 마이페이지 → "인증키 신청" → 일반 인증키 발급 (샘플 인증키 아님)
- 사용 데이터셋
  - "서울교통공사_노선별 지하철역 정보" 또는 "서울시 지하철역 위치정보"
  - "서울특별시_정류소 정보 조회 서비스"

### 3. VWorld (`VWORLD_API_KEY`) — 선택

- URL: <https://www.vworld.kr/>
- 좌표 변환/지오코딩 보조용. 매물 단위 호출 금지 (SPEC 14.2). 역/정류장 좌표 누락 시 백업.

### 4. 행정동 GeoJSON / 법정동 매핑 CSV — 키 불필요

- 행정동 GeoJSON
  - 국가공간정보포털 <https://www.nsdi.go.kr/>: '행정구역(읍면동)' 검색
  - 또는 통계청 SGIS <https://sgis.kostat.go.kr/>
- 법정동 ↔ 행정동 매핑 CSV
  - 공공데이터포털 "행정안전부_지역별 행정동 코드"
  - 또는 행안부 자료실의 '법정동/행정동 변환표' (엑셀, CSV 변환 필요)

---

## .env 에 추가할 항목

기존 `backend/.env.example` 에 이미 placeholder 포함됨. 키 받으면 `.env` 의 빈 값 채우기:

```env
DATA_GO_KR_API_KEY=     # 국토부 실거래가 + 소상공인 상가 (1개 키)
SEOUL_OPEN_API_KEY=     # 지하철역·버스 정류장 (별도 사이트)
VWORLD_API_KEY=         # 지오코딩(역/정류장 백업), 매물 단위 호출 금지
```

---

## 실행 순서 (실 데이터 채울 때)

```bash
# 0. 가상환경 활성화 (uv 또는 venv)
cd backend
source .venv/bin/activate

# 1. 행정동 GeoJSON 검증 + 매핑 CSV 생성
python scripts/etl/seed/build_dong_mapping.py /path/to/seoul_dongs.geojson \
    --bjd-mapping /path/to/bjd_to_adm.csv \
    --output bjd_to_adm_primary.csv

# 2. Dong 테이블에 426개 행정동 적재 (기존 management 명령)
python manage.py load_dongs /path/to/seoul_dongs.geojson

# 3. 키 환경변수 export (또는 .env 사용)
export DATA_GO_KR_API_KEY=...    # 실거래가 + 상가, 1개 키
export SEOUL_OPEN_API_KEY=...

# 4. 데이터 수집 (각 1~수십 분 소요)
python scripts/update/fetch_realestate.py --months 12 --deal-type all
python scripts/update/fetch_amenities.py
python scripts/update/fetch_transit.py --target all

# 5. 점수 계산
python scripts/scoring/compute_nearest_subway.py
python scripts/scoring/compute_scores.py --mode real
```

---

## 현 상태에서 동작하는 것

키가 아직 없어도 다음은 동작합니다:

```bash
# 키 누락 시 친절한 에러 메시지 + exit 1
python scripts/update/fetch_realestate.py
python scripts/update/fetch_amenities.py
python scripts/update/fetch_transit.py --target subway

# 모델 존재 점검 (현재 미존재 모델 확인용)
python scripts/scoring/compute_scores.py --mode check

# 더미 5개 동 점수 sanity 갱신 (이미 seed_dummy_dongs 가 처리하므로 보통 NO-OP)
python scripts/scoring/compute_scores.py --mode dummy

# GeoJSON 파일이 있으면 코드/이름 추출 (키 불필요)
python scripts/etl/seed/build_dong_mapping.py /path/to/seoul_dongs.geojson
```

---

## 후속 작업 (10단계 이후)

실 데이터 적재 전에 모델 정의가 필요합니다. SPEC 섹션 10 기준:

1. `backend/apps/realestate/` 앱 생성
   - `RentDeal(dong, deal_type, deal_date, area_m2, deposit, monthly_rent)`
2. `backend/apps/amenities/` 앱 생성
   - `Amenity(dong, category, name, location)`
3. `backend/apps/transit/` 앱 생성
   - `SubwayStation(name, line, location)`
   - `BusStop(dong, location)`
4. `config/settings/base.py` `INSTALLED_APPS` 등록
5. `python manage.py makemigrations && python manage.py migrate`
6. 본 디렉토리의 `_persist_dryrun` → `_persist_db` 활성화 (각 fetch_*.py 하단에 주석으로 의사코드 포함)
7. `compute_scores.py` 의 `_compute_real()` 본문 채우기 (백분위 변환 + bulk_update)

---

## 설계 원칙 (CLAUDE.md / SPEC 14.2 / data-pipeline 규칙)

- 모든 스크립트는 **Django ORM 직접 사용** (백엔드 API 호출 X). 같은 DB(`DATABASE_URL`)에 쓴다.
- 마이크로서비스 분리 금지. Kafka/Airflow 도입 금지. 단순 cron + 본 스크립트로 충분.
- 매물 단위 지오코딩 금지 — 법정동 단위 사전 매핑(`build_dong_mapping.py`) 만 사용.
- 이상치 처리: IQR 1.5배 클리핑 (`fetch_realestate.clip_outliers`). 보증금 0, 월세 5000만+ 같은 명백한 노이즈는 사전 컷.
- 거래량 3건 미만 동/월은 점수 계산 시 점 생략.
- idempotent: `update_or_create` 또는 외부 ID 키로 재실행 가능.
- 실행 주기 권장: 전월세/편의시설/교통 모두 월 1회 cron. GitHub Actions 가능하나 학부 데모는 수동 실행도 OK.
