# Backend Phase 1 — RDS 통합 모델 + 마이그레이션 작성

작성일: 2026-05-08
상태: **완료** — 마이그레이션 파일 생성 + `manage.py check` 통과 + `makemigrations --check --dry-run` 통과
선행 문서: `docs/handoff/20260508-rds-migration-plan.md`

---

## 완료된 작업

1. 신규 앱 3개 생성: `apps/regions/`, `apps/metrics/`, `apps/parks/`
2. 신규 모델 14개 작성 (계획서 표 기준 Adjacency 3종 풀어 세움)
3. 기존 모델 4종 확장: `realestate.RentDeal`, `amenities` (Store 등 3종 추가), `transit.SubwayStation/BusStop` + 혼잡도 2종, `neighborhoods.Dong` (code unique 추가 — FK 의존성 위함)
4. `config/settings/base.py` `INSTALLED_APPS` 갱신
5. 각 앱 admin 등록 (간단 ModelAdmin)
6. 마이그레이션 파일 7개 생성 + `python manage.py check` 통과

---

## 추가/변경된 파일 경로 (전체)

### 신규 앱 — `apps/regions/`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/regions/__init__.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/regions/apps.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/regions/models.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/regions/admin.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/regions/migrations/__init__.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/regions/migrations/0001_initial.py`

### 신규 앱 — `apps/metrics/`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/metrics/__init__.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/metrics/apps.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/metrics/models.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/metrics/admin.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/metrics/migrations/__init__.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/metrics/migrations/0001_initial.py`

### 신규 앱 — `apps/parks/`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/parks/__init__.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/parks/apps.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/parks/models.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/parks/admin.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/parks/migrations/__init__.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/parks/migrations/0001_initial.py`

### 기존 앱 확장
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/neighborhoods/models.py` (Dong.code → unique=True)
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/neighborhoods/migrations/0002_alter_dong_code.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/realestate/models.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/realestate/migrations/0002_rentdeal_contract_end_date_rentdeal_contract_type_and_more.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/amenities/models.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/amenities/admin.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/amenities/migrations/0002_kscicategory_businesscategory_store.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/transit/models.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/transit/admin.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/transit/migrations/0002_buscongestion_subwaycongestion_and_more.py`

### 설정
- `/Users/bagjihyeon/Desktop/School/capston/backend/config/settings/base.py` (INSTALLED_APPS에 regions/metrics/parks 추가)

---

## 모델 → RDS 테이블 db_table 매핑 (Phase 2 ETL용)

> Phase 2 data-pipeline 스크립트가 `INSERT … SELECT`로 단순 복사 가능하도록 db_table을 RDS와 1:1 정렬했다.

### regions 앱 (8 모델)

| Django 모델 | db_table | RDS 테이블 | PK |
|---|---|---|---|
| `regions.Seoul` | `seoul` | `seoul` | `code` |
| `regions.Gu` | `gu` | `gu` | `gu_code` |
| `regions.Ldong` | `ldong` | `ldong` | `ldong_code` |
| `regions.GuAdjacency` | `adjacent_gu` | `adjacent_gu` | (auto id) + UQ(gu_code_a, gu_code_b) |
| `regions.LdongAdjacency` | `adjacent_ldong` | `adjacent_ldong` | (auto id) + UQ(ldong_code_a, ldong_code_b) |
| `regions.AdongAdjacency` | `adjacent_adong` | `adjacent_adong` | (auto id) + UQ(adong_code_a, adong_code_b) |
| `regions.LdongPopulation` | `ldong_population` | `ldong_population` | (auto id) + UQ(ldong_code, date) |
| `regions.AdongPopulation` | `adong_population` | `adong_population` | (auto id) + UQ(adong_code, date) |

### metrics 앱 (3 모델)

| Django 모델 | db_table | RDS 테이블 | PK |
|---|---|---|---|
| `metrics.Metric` | `metric` | `metric` | `metric_code` |
| `metrics.GuMetric` | `gu_metric` | `gu_metric` | (auto id) + UQ(gu_code, date, metric_code) |
| `metrics.SeoulMetric` | `seoul_metric` | `seoul_metric` | (auto id) + UQ(seoul_code, date, metric_code) |

### parks 앱 (3 모델)

| Django 모델 | db_table | RDS 테이블 | PK |
|---|---|---|---|
| `parks.Park` | `park` | `park` | `id` (varchar) |
| `parks.ParkDong` | `park_adong` | `park_adong` | (auto id) + UQ(park_id, adong_code) |
| `parks.ParkLdong` | `park_ldong` | `park_ldong` | (auto id) + UQ(park_id, ldong_code) |

### amenities 앱 (3 신규)

| Django 모델 | db_table | RDS 테이블 | PK |
|---|---|---|---|
| `amenities.BusinessCategory` | `business_category` | `business_category` | `subcategory_code` |
| `amenities.KsciCategory` | `ksci_category` | `ksci_category` | `ksci_code` |
| `amenities.Store` | `store` | `store` | `id` (varchar) |

### transit 앱 (2 신규 + 2 확장)

| Django 모델 | db_table | RDS 테이블 | PK |
|---|---|---|---|
| `transit.SubwayStation` (확장) | `subway_station` | `subway_station` | (auto id), `external_id` unique |
| `transit.BusStop` (확장) | `bus_stop` | `bus_stop` | (auto id), `external_id` unique |
| `transit.SubwayCongestion` | `subway_congestion` | `subway_congestion` | (auto id) + UQ(station_id, day_type, direction, express_yn, time) |
| `transit.BusCongestion` | `bus_congestion` | `bus_congestion` | (auto id) + UQ(bus_stop_id, date, time) |

### realestate 앱 (확장)

| Django 모델 | db_table | RDS 테이블 | PK |
|---|---|---|---|
| `realestate.RentDeal` (확장) | `rent_deal` | `rent_deal` | (auto id), `external_id`(=RDS id) unique |

---

## PK / FK / UNIQUE 제약 한눈에

### 비즈니스 키 PK (RDS와 동일)
- `Seoul.code`, `Gu.gu_code`, `Ldong.ldong_code`
- `Metric.metric_code`
- `Park.id`
- `BusinessCategory.subcategory_code`, `KsciCategory.ksci_code`, `Store.id`

### Auto BigInt PK + 비즈니스 unique
- `RentDeal.id` (auto) + `external_id` unique (RDS id) + `external_hash` unique (legacy, nullable)
- `SubwayStation.id` (auto) + `external_id` unique (RDS id) + UQ(name, line) (기존)
- `BusStop.id` (auto) + `external_id` unique (RDS id)

### Auto BigInt PK + UNIQUE_TOGETHER
- `GuAdjacency` UQ(gu_a, gu_b)
- `LdongAdjacency` UQ(ldong_a, ldong_b)
- `AdongAdjacency` UQ(dong_a, dong_b)
- `LdongPopulation` UQ(ldong, date)
- `AdongPopulation` UQ(dong, date)
- `GuMetric` UQ(gu, date, metric)
- `SeoulMetric` UQ(seoul, date, metric)
- `ParkDong` UQ(park, dong)
- `ParkLdong` UQ(park, ldong)
- `SubwayCongestion` UQ(station, day_type, direction, express_yn, time)
- `BusCongestion` UQ(bus_stop, date, time)

### FK to_field="code" 사용 모델 (Dong을 비즈니스 키로 참조)
- `regions.AdongAdjacency.dong_a/dong_b`
- `regions.AdongPopulation.dong`
- `parks.ParkDong.dong`
- `amenities.Store.dong`
- `transit.SubwayStation.dong`, `transit.BusStop.dong`

> 이를 위해 `neighborhoods.Dong.code`에 `unique=True`를 추가했다 (마이그레이션 `neighborhoods/0002_alter_dong_code.py`). FK의 `to_field`는 unique 컬럼만 가능하기 때문. 기존 데이터에 code 중복이 있으면 migrate가 실패할 수 있으므로 Phase 2 직전에 점검 필요.

### Spatial 인덱스 (GiST)
- `Gu.boundary`, `Ldong.boundary`, `Park.boundary`, `Park.location`, `Store.location`, `Subway.geom`, `Bus.geom`, `RentDeal.geom`, `Amenity.geom` (기존)

### 시계열 인덱스 (BRIN)
- `BusCongestion.date` — 8M 행 시계열 효율화

---

## DEAL_TYPE_CHOICES 변경 — 기존 데이터 영향

```python
# 기존 (Phase 0)
DEAL_TYPE_CHOICES = [("apt", ...), ("officetel", ...), ("villa", ...), ("danok", "단독다가구")]

# Phase 1
DEAL_TYPE_CHOICES = [("apt", ...), ("officetel", ...), ("villa", ...),
                     ("dagagu", "다가구"),  # 신규 분리
                     ("danok", "단독")]      # 라벨만 변경: 단독다가구 → 단독
```

- 기존 데이터의 `deal_type='danok'`(단독다가구 통합) 레코드는 마이그레이션이 **그대로 둔다** (값 변환 X).
- Phase 2 ETL이 RDS raw로 덮어쓸 때 `housing_type` 한글 → `deal_type` 영문으로 재분류.
- DB 레벨 choices 강제는 없음 (Django 검증만). DB 자체에는 그냥 max_length=20 varchar라 마이그레이션 충돌 없음.

---

## 검증 결과

### 1. `python manage.py makemigrations` 첫 실행 — 모든 변경 감지

생성된 마이그레이션 (총 7개):
```
neighborhoods/0002_alter_dong_code.py        — Dong.code unique
regions/0001_initial.py                      — 8 모델 (Seoul/Gu/Ldong/Adj×3/Population×2)
metrics/0001_initial.py                      — 3 모델 (Metric/GuMetric/SeoulMetric)
parks/0001_initial.py                        — 3 모델 (Park/ParkDong/ParkLdong)
amenities/0002_kscicategory_businesscategory_store.py — 3 신규
transit/0002_buscongestion_subwaycongestion_and_more.py — 4 변경 + 2 신규
realestate/0002_rentdeal_contract_end_date_rentdeal_contract_type_and_more.py — RentDeal 확장
```

### 2. `python manage.py makemigrations --check --dry-run`

```
No changes detected
```

### 3. `python manage.py check`

```
System check identified no issues (0 silenced).
```

### 4. `python manage.py migrate` (로컬)

**미실행** — 로컬 docker compose가 떠 있지 않음 (Docker daemon down). Phase 2 시작 전에 `docker compose up postgres` 후 실제 migrate 검증을 권장.

검증 스크립트 (Phase 2 작업자가 한 번 돌려볼 것):
```bash
docker compose -f /Users/bagjihyeon/Desktop/School/capston/docker-compose.yml up -d postgres
cd /Users/bagjihyeon/Desktop/School/capston/backend
uv run python manage.py migrate
uv run python manage.py migrate --plan | head -50  # 적용 순서 확인
```

---

## 모델 설계 노트

### 1. boundary는 모두 MultiPolygonField, location은 모두 PointField (SRID 4326)
RDS 검증 결과 PG18 ↔ PG15+PostGIS 간 `geometry` 컬럼은 EWKB로 바이너리 호환. `ST_Multi()` 캐스팅으로 단일 POLYGON도 MULTIPOLYGON으로 통합 가능.

### 2. Adjacency는 양방향 row 둘 다 보존
RDS도 양방향이고 `unique_together(a, b)`로 a==b 자기참조와 (a,b)/(b,a) 중복만 막는다. ETL은 RDS 그대로 INSERT.

### 3. AdongAdjacency / AdongPopulation은 Dong.code FK
`to_field="code"` + `db_column="adong_code"`로 매핑. RDS에서 ETL 시 adong_code → Dong.code 직접 매핑되도록 컬럼명 일치.

### 4. RentDeal — auto PK 유지 + external_id 추가
기존 화면/캐시 호환 위해 BigAutoField PK는 유지. `external_id`(=RDS rent_deal.id, BigInteger, unique)를 신규 적재의 멱등 키로 사용. `external_hash`는 nullable로 완화.

### 5. RentDeal.dong은 PROTECT 유지, ldong은 PROTECT + nullable
RentDeal에서 ldong은 RDS ldong_code로 직접 결정되어 거의 항상 채워지지만 안전을 위해 nullable. dong은 location → ST_Contains 백필.

### 6. SubwayStation/BusStop의 dong/ldong FK는 SET_NULL
혼잡도 데이터는 보존하되 매핑 정보가 깨질 가능성을 고려 (Dong/Ldong 재정비 시).

### 7. BusCongestion BRIN 인덱스
8M 행 시계열에서 B-Tree보다 BRIN이 디스크/메모리 효율적. PG13+에서 multi-minmax도 지원하지만 기본 minmax만으로 충분.

### 8. Store FK on_delete=PROTECT
화면용 amenities.Amenity와 달리 Store는 raw 데이터라 카테고리/동/구 마스터 삭제 시 자동 삭제는 위험. PROTECT.

### 9. metric `value`는 DecimalField(20, 6)
RDS metric value는 인구·금액·비율 등 다양한 스케일이 섞여 있어 정밀도 보존.

---

## 알려진 이슈 / 다음 단계로 전달

### 1. Park.boundary의 RDS 원본 타입 (POLYGON vs MULTIPOLYGON)
계획서 5번 항목. 모델은 일단 `MultiPolygonField`로 정의했고, 단일 POLYGON이 섞여 있다면 ETL에서 `ST_Multi(boundary)`로 캐스팅 후 INSERT 필요. **Phase 2 ETL 작성자가 RDS 샘플 1행 떠보고 결정**.

### 2. Dong.code unique 제약 — 기존 데이터 중복 가능성
neighborhoods/0002_alter_dong_code.py가 적용되려면 기존 `dong` 테이블의 `code` 컬럼에 중복이 없어야 한다. 운영 DB는 외부에서 직접 못 보므로 Phase 2 시작 전에 SSH로 다음 쿼리로 점검 필요:
```sql
SELECT code, COUNT(*) FROM dong GROUP BY code HAVING COUNT(*) > 1;
```
중복이 있으면 마이그레이션 전 정리 또는 unique constraint를 부분 제약으로 완화 필요.

### 3. RDS rent_deal.id 타입
Phase 1 모델에서 `external_id`를 `BigIntegerField`로 잡았다. RDS PK가 bigint이면 OK. **만약 string/uuid라면 모델 타입 변경 필요** — Phase 2 ETL 작업자가 sample row 확인 후 보고.

### 4. BusStop.arsId max_length=10
현재 모델 그대로 둠. RDS `stop_number`가 10자 초과면 max_length 확장 필요.

### 5. SubwayCongestion 텍스트 필드 한글값
`day_type/direction/express_yn`을 한글 그대로 보관(평일/상선/일반 등). DB-level CHECK 제약은 안 걸었음. 선호하면 choices 추가 가능하나 RDS raw 보존 원칙상 그대로 둠.

### 6. 운영 DB(slgi) PostGIS 버전 / 디스크 여유
계획서 5 미완 이슈 그대로. Phase 2 SSH 접속 시 `SELECT PostGIS_Version();`, `df -h` 확인 필요.

### 7. 마이그레이션 명 길이
realestate/transit/amenities Phase 1 마이그레이션 파일명이 길다 (Django 자동 생성). 검토 후 git에 그대로 커밋해도 OK. 사용자가 원하면 짧게 rename 가능 — 단 의존성 참조는 파일명 그대로 들어가므로 한 번에 수정.

### 8. Phase 2 ETL 권장 적용 순서
계획서 4.2의 18 스크립트 순서 그대로. FK 의존성 깊은 모델은:
```
Seoul → Gu → Ldong → Dong(이미 적재) →
Adjacency × 3 → Population × 2 →
Metric → GuMetric/SeoulMetric →
BusinessCategory/KsciCategory → Store →
SubwayStation → BusStop → SubwayCongestion → BusCongestion →
Park → ParkDong/ParkLdong →
RentDeal
```

### 9. score_* 재계산은 본 단계 X
계획서 4.4 Phase 4. Dong.score_rent/amenity/transit는 그대로 두었다. 추후 별도 PR.

---

## 검수 체크리스트 (사용자용)

- [ ] `apps/regions/models.py` — 8 모델 의도대로 정의됨
- [ ] `apps/metrics/models.py` — 3 모델
- [ ] `apps/parks/models.py` — 3 모델
- [ ] `apps/realestate/models.py` — RentDeal 8 컬럼 추가, DEAL_TYPE_CHOICES 5종
- [ ] `apps/amenities/models.py` — Amenity 그대로, Store/카테고리 3종 추가
- [ ] `apps/transit/models.py` — SubwayStation/BusStop 보강, 혼잡도 2종 추가
- [ ] `apps/neighborhoods/models.py` — Dong.code unique=True (FK to_field 위함)
- [ ] `config/settings/base.py` — INSTALLED_APPS에 regions/metrics/parks
- [ ] 마이그레이션 7개 파일 검토
- [ ] 로컬 docker compose 띄워서 `python manage.py migrate` 한 번 통과 확인
- [ ] 기존 Dong.code 중복 검증 후 OK이면 commit

---

## 다음 작업

1. **사용자 검수** → 모델/마이그레이션 검토
2. **로컬 migrate 검증** → docker compose up postgres → migrate
3. **Phase 2 — data-pipeline에게 위임** → ETL 스크립트 18종 작성 (`docs/handoff/20260508-rds-migration-plan.md` 4.2 참고)
