# Task: Phase 0a Step 1a — Amenity / Transit / RentDeal 모델 + 마이그레이션 + admin

`docs/handoff/20260503-phase0a-kickoff.md` 섹션 4 Step 1~3 의 데이터 레이어 골격(모델만) 구현.
SPEC `docs/SPEC.md` 섹션 10 (모델), 14.2 (지오코딩 규칙) 준수.

## 완료된 작업

### 1) 새 앱 3개 신설
- `apps.amenities` — `Amenity`
- `apps.transit` — `SubwayStation`, `BusStop`, `NearestSubway`
- `apps.realestate` — `RentDeal`, `JibunGeocodeCache`

각 앱:
- `apps.py` 에 `default_auto_field = BigAutoField`, `name = "apps.<app>"`, `verbose_name` 설정
- `__init__.py`, `migrations/__init__.py` 빈 파일
- `models.py` + `admin.py` 작성
- `INSTALLED_APPS` 등록 완료

### 2) 모델 요점
- 모든 PointField는 SRID 4326 + GiST 인덱스(`django.contrib.postgres.indexes.GistIndex`).
- `Amenity.dong`, `BusStop.dong`, `RentDeal.dong` 은 `on_delete=PROTECT` (실수 삭제 방지).
- `NearestSubway.dong` 은 `CASCADE` (캐시 테이블이라 동 삭제 시 같이 사라져도 됨).
- `Amenity.category` 영문 value + 한국어 라벨 11개 (`convenience/mart/restaurant/cafe/studycafe/hospital/pharmacy/laundry/oliveyoung/park/etc`).
- `RentDeal.external_hash` `unique=True` 로 멱등 적재 보장.
- `RentDeal.geom` null 허용(지오코딩 실패/대기 케이스). 매물 단위 정밀 좌표 금지(SPEC 14.2).
- `JibunGeocodeCache.jibun_text` 가 PK — 정규화된 지번 문자열로 자연 키 사용.

### 3) Admin
- 세 앱 모두 `admin.ModelAdmin` 기반(GISModelAdmin은 list가 무거워 회피).
- PointField 는 readonly text 로 표시.
- 흔히 쓰는 필터(category / 구 / deal_type / line / rank) + search_fields 등록.
- `list_select_related` 로 N+1 방지.

## 산출물

### 새로 만든 파일
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/amenities/__init__.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/amenities/apps.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/amenities/models.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/amenities/admin.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/amenities/migrations/__init__.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/amenities/migrations/0001_initial.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/transit/__init__.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/transit/apps.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/transit/models.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/transit/admin.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/transit/migrations/__init__.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/transit/migrations/0001_initial.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/realestate/__init__.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/realestate/apps.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/realestate/models.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/realestate/admin.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/realestate/migrations/__init__.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/realestate/migrations/0001_initial.py`

### 수정한 파일
- `/Users/bagjihyeon/Desktop/School/capston/backend/config/settings/base.py`
  - `LOCAL_APPS` (line 71~78): `apps.amenities`, `apps.transit`, `apps.realestate` 3줄 추가

### 마이그레이션 파일 번호
- `apps/amenities/migrations/0001_initial.py`  → `Amenity`
- `apps/transit/migrations/0001_initial.py`     → `SubwayStation`, `BusStop`, `NearestSubway`
- `apps/realestate/migrations/0001_initial.py`  → `JibunGeocodeCache`, `RentDeal`

## migrate 실행 결과

```
Operations to perform:
  Apply all migrations: admin, amenities, auth, contenttypes, neighborhoods,
  preference, realestate, sessions, transit, users
Running migrations:
  Applying amenities.0001_initial... OK
  Applying realestate.0001_initial... OK
  Applying transit.0001_initial... OK
```

추가 검증:
- `python manage.py check` → `System check identified no issues (0 silenced).`
- `python manage.py makemigrations --dry-run` → `No changes detected`
- `from apps.amenities.models import Amenity; ...` 6개 모델 import OK

## 다음 작업자에게 전달할 것

### data-pipeline 에게
- `backend/scripts/fetch_amenities.py` 본문 채울 때:
  - `Amenity.external_id` 는 `unique` 라 `update_or_create(external_id=..., defaults={...})` 로 멱등 처리.
  - 공원은 `external_id` null 허용. 카테고리 value `"park"`, source `"seoul_park"`.
  - 적재 시점에 spatial join: `Dong.objects.get(geom__contains=Point(lng, lat, srid=4326))` 으로 `dong_fk` 결정.
- `backend/scripts/fetch_transit.py`:
  - `SubwayStation.unique_together = (name, line)` → `update_or_create(name=..., line=..., defaults={...})`.
  - `BusStop` 도 동일하게 `dong` 사전 매핑.
  - `NearestSubway` 사전 계산: `Dong.centroid` 기준 `SubwayStation` top-3 → 동마다 정확히 3행 (`unique_together = (dong, rank)`).
- `backend/scripts/fetch_realestate.py`:
  - `RentDeal.external_hash` 는 멱등 키. 추천 조합: `sha256(deal_type + jibun + deal_date + area_m2 + deposit + monthly_rent + floor)`.
  - `geom` 채우려면 `JibunGeocodeCache` 먼저 lookup, miss 면 VWorld 호출 후 캐시 저장.
  - **매물 단위 정밀 좌표 저장 금지(SPEC 14.2).** 같은 지번 거래는 모두 같은 점.

### backend-engineer 다음 단계
- 모델 단계 끝났으니 fetch 스크립트가 들어오면 admin 에서 적재 sanity check 가능.
- `/api/transactions/bbox` 등 API 작업은 적재 후 진행.

## 미완 / 알려진 이슈
- `pharmacy` 라벨이 모델 작성 중 인코딩 실수로 잠시 `약약국` 으로 들어갔다가 `약국` 으로 정정했음. 현재 파일은 `("pharmacy", "약국")` 로 정상.
- `BusStop.arsId` 필드명은 camelCase(서울 BIS API 명명 그대로). Django 컨벤션 위반이지만 외부 API 매핑 명확성 우선.
- `RentDeal.geom` null 허용 — 지오코딩이 비동기적으로 채워지는 것을 가정. 점수 계산 시점에 `geom__isnull=True` 케이스 처리 필요(거래량 카운트는 OK, 핀 표시는 제외).
- `NearestSubway` 는 `unique_together=(dong, rank)` 만 있고 `(dong, station)` unique 는 없음. 동일 동에서 같은 역이 rank 2,3 으로 중복 들어갈 가능성 있으나 `precompute_nearest_subway` 가 distinct 보장하면 됨.
