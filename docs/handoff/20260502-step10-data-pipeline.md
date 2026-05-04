# Task: 10단계 (보너스) — 공공데이터 적재 파이프라인 골격

작성: 2026-05-02
SPEC 7 (우선순위), 11.2 (점수 정규화), 14.2 (데이터 처리) 기반.
1~9단계 백엔드/프론트 완료, 더미 5개 동 운영 중. 사용자가 공공 API 키를 아직 발급받지 않은 시점.

---

## 완료된 작업

### Phase 1 — Django setup helper

- `backend/scripts/__init__.py`
- `backend/scripts/_django.py`
  - `setup()`: 스크립트가 `cd backend && python scripts/X.py` 패턴으로 standalone 실행될 때 `sys.path` + `DJANGO_SETTINGS_MODULE` 자동 설정.
  - `require_env(name, hint)`: 키 누락 시 한국어 에러 + hint + README 안내 출력 후 `SystemExit(1)`.

### Phase 2 — fetch 골격 4개 + mapping 1개

모두 키 누락 시 친절한 에러 + exit 1, 키가 있어도 실 호출 대신 `[DRY]` 출력만 (실 호출 본문은 응답 키 매핑 필요해서 placeholder). DB 쓰기는 모델 부재로 `_persist_dryrun()` 만 호출.

- `backend/scripts/fetch_realestate.py`
  - 국토부 실거래가 (data.go.kr 15126473/472/475)
  - 서울 25개 자치구 LAWD_CD 하드코딩
  - `--months N --deal-type {villa|house|officetel|all} --dry-run --limit N`
  - `clip_outliers(rows, columns)` IQR 1.5배 클리핑 (numpy)
  - 모델 의존: `apps.realestate.RentDeal` (미존재)

- `backend/scripts/fetch_amenities.py`
  - 소상공인진흥공단 상가(상권)정보 (data.go.kr 15012005)
  - 표준산업분류 → SPEC 6.3 카테고리 매핑 테이블 (`CATEGORY_MAP`)
  - `aggregate_by_category(rows)` 카운트
  - 모델 의존: `apps.amenities.Amenity` (미존재)

- `backend/scripts/fetch_transit.py`
  - 서울 열린데이터광장 지하철역/버스 정류장
  - `--target {subway|bus|nearest|all}` — `nearest` 만 키 불필요
  - `precompute_nearest_subway(top_k=3)` — PostGIS ST_Distance 의사코드 주석
  - 모델 의존: `apps.transit.SubwayStation`, `BusStop` (미존재)

- `backend/scripts/build_dong_mapping.py`
  - 행정동 GeoJSON → `(adm_cd, adm_nm)` 리스트
  - 행안부 법정동→행정동 매핑 CSV → 법정동 1개 ↔ 가장 큰 비율 행정동 1개 축약
  - 출력: `bjd_to_adm_primary.csv`
  - 키 불필요. GeoJSON 파일만 있으면 동작.

### Phase 3 — 점수 계산 (SPEC 11.2)

- `backend/scripts/compute_scores.py`
  - `--mode check`: 필수 모델 4개 존재 여부 + Dong 적재 행 수 출력. 실행 OK.
  - `--mode dummy`: 5개 더미 동의 score_* 가 0 인 경우만 결정적 값으로 채움 (idempotent, 비파괴). seed_dummy_dongs 가 이미 처리하므로 일반적으로 NO-OP.
  - `--mode real`: RentDeal/Amenity/Subway/BusStop 모델 추가 후 사용. 본문에 의사코드 주석 (백분위 변환 + bulk_update).

### Phase 4 — README

- `backend/scripts/README.md`
  - 키 받는 방법 (URL + 절차):
    - 국토부 실거래가 (data.go.kr)
    - 소상공인 상가정보 (data.go.kr / sg.sbiz.or.kr)
    - 서울 열린데이터 (data.seoul.go.kr)
    - VWorld (vworld.kr)
    - 행정동 GeoJSON (nsdi.go.kr / SGIS)
    - 법정동 매핑 CSV (행안부)
  - 실행 순서 (build_dong_mapping → load_dongs → fetch_* → compute_scores)
  - 현 상태에서 동작하는 명령 목록
  - 후속 작업 (모델 추가 5단계)
  - 설계 원칙 요약 (idempotent, IQR 클리핑, 단순 cron)

---

## 산출물 (절대 경로)

- `/Users/bagjihyeon/Desktop/School/capston/backend/scripts/__init__.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/scripts/_django.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/scripts/build_dong_mapping.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/scripts/fetch_realestate.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/scripts/fetch_amenities.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/scripts/fetch_transit.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/scripts/compute_scores.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/scripts/README.md`

`.env.example` 은 3단계에서 이미 `MOLIT_API_KEY / SBA_API_KEY / SEOUL_OPEN_API_KEY / VWORLD_API_KEY` placeholder 포함. 추가 변경 없음.

---

## 검증 결과 (실제 실행 출력)

```text
$ python scripts/fetch_realestate.py --help
usage: fetch_realestate.py [-h] [--months MONTHS] [--deal-type {villa,house,officetel,all}] [--dry-run] [--limit LIMIT]
... (모든 옵션 정상)

$ python scripts/fetch_realestate.py            # 키 없음
[ERROR] 환경 변수 MOLIT_API_KEY 가 설정되지 않았습니다.
        data.go.kr 에서 '국토교통부 실거래가 정보' 활용 신청 후 일반 인증키(Decoding) 사용
        backend/scripts/README.md 의 '필요 키' 항목을 확인하세요.
exit=1

$ python scripts/fetch_amenities.py             # 키 없음
[ERROR] 환경 변수 SBA_API_KEY ... (동일 형식)
exit=1

$ python scripts/fetch_transit.py --target subway   # 키 없음
[ERROR] 환경 변수 SEOUL_OPEN_API_KEY ...
exit=1

$ python scripts/fetch_transit.py --target nearest  # 키 불필요 (PostGIS만)
[DRY] would compute top-3 nearest subway stations per Dong (PostGIS ST_Distance)
실 적재를 위해서는 SubwayStation/BusStop 모델 추가 필요.

$ python scripts/compute_scores.py --mode check
실 데이터 적재에 필요한 모델 존재 여부:
  [MISSING] realestate.RentDeal
  [MISSING] amenities.Amenity
  [MISSING] transit.SubwayStation
  [MISSING] transit.BusStop
Dong 적재 상태: 5 개 행
실 데이터 모드 사용 불가. 다음 단계: ...

$ python scripts/compute_scores.py --mode dummy
[OK] dummy mode: 더미 동 5개 점검, 0개 갱신.

$ python scripts/compute_scores.py --mode real
[ERROR] 실 데이터 모드는 RentDeal/Amenity/Subway/BusStop 모델 추가 후 사용 가능합니다.
exit=1

$ python scripts/build_dong_mapping.py /tmp/nonexistent.geojson
[ERROR] GeoJSON 파일이 없습니다: /tmp/nonexistent.geojson
exit=1
```

---

## 다음 작업자에게 전달할 것

### A. 키 받으면 즉시 할 수 있는 것

1. `.env` 의 `MOLIT_API_KEY`, `SBA_API_KEY`, `SEOUL_OPEN_API_KEY` 채우기.
2. 행정동 GeoJSON 다운로드 (nsdi.go.kr) → `python scripts/build_dong_mapping.py <path>` 동작 확인.
3. `python manage.py load_dongs <path>` 로 Dong 테이블에 426개 적재 (3단계 management 명령 이미 존재).

### B. 모델 추가 단계 (실 데이터 적재 활성화)

각 fetch_*.py 의 `_persist_db` 의사코드 주석을 보면 정확한 호출 형태가 적혀 있음. 새 backend-engineer 작업으로 위임 권장:

1. `apps/realestate/` 앱 + `RentDeal` 모델
2. `apps/amenities/` 앱 + `Amenity` 모델
3. `apps/transit/` 앱 + `SubwayStation`, `BusStop` 모델
4. `INSTALLED_APPS` 등록, makemigrations, migrate
5. 각 fetch 스크립트의 `_persist_dryrun` → `_persist_db` 교체
6. `compute_scores.py` `_compute_real()` 본문 채우기 (numpy/scipy 백분위 + bulk_update)

### C. fetch 함수 본문 (응답 파싱) 미완

각 fetch 스크립트의 `parse_xml`, `fetch_one_month`, `fetch_dong`, `fetch_subway_stations`, `fetch_bus_stops` 는 `# TODO` 주석 + 의사코드만 있음. 실제 API 응답 키는 한 번 호출해서 첫 페이지 인쇄 후 매핑 확정 필요. 키 받으면 `--dry-run` 모드를 "실호출 + print" 로 잠시 바꿔 응답 구조 파악 후 본문 작성.

### D. 자동화 스케줄

- 전월세/편의시설/교통: 월 1회 cron 또는 GitHub Actions 권장.
- 행정동 GeoJSON, 법정동 매핑: 1회성 (행정 개편 발생 시 갱신).
- 학부 데모 마감(6/5)까지는 수동 실행 1~2회로 충분.

---

## 알려진 이슈 / 결정사항

1. **모델 미존재로 실 적재 불가** — 3개 앱(realestate/amenities/transit) 추가가 선결과제. 본 10단계는 그 전 단계로 골격만 마련.
2. **법정동 매핑 1:N 단순화** — `collapse_to_primary()` 가 가장 큰 비율 행정동 1개로 축약. 정확한 분배(가중치 기반)는 추후 점수 계산에서 필요시 도입. 학부 데모 수준에서는 1:1 충분.
3. **키 받기 전 실호출 시도 안 함** — 사용자 명시 지시. 또한 일부 API는 활용신청 승인까지 1일 소요될 수 있음.
4. **OS 별 GDAL 경로** — 3단계 핸드오프와 동일. macOS는 `.env` 의 `GDAL_LIBRARY_PATH` 명시 필요. Linux는 보통 자동 탐지 OK.
5. **scipy 이미 설치** — 7단계에서 가중치 추정용으로 이미 `pyproject.toml` 에 포함. 점수 계산용 백분위에도 그대로 사용 가능.
6. **pandas/geopandas 미설치** — 본 골격은 numpy + 표준 라이브러리만 사용. 실 적재 시 대용량(연립다세대만 월 1만+ 건) 처리에 pandas 가 편하면 `pyproject.toml` 에 추가 후 사용. 학부 규모면 numpy + dict comprehension 로도 충분.

---

## 미완 / 후속 작업

- [ ] 3개 앱 모델 추가 (backend-engineer)
- [ ] fetch_*.py `parse_xml/fetch_*` 본문 (실 API 응답 받은 후 키 매핑 확정)
- [ ] `compute_scores.py --mode real` 본문 (모델 추가 후)
- [ ] cron / GitHub Actions 스케줄 설정 (배포 단계)
