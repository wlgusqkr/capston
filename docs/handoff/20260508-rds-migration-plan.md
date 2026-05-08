# Task: 팀원 RDS(dp_db) → 운영 DB(slgi) 데이터 통합 — 계획안 v2 (최종)

작성일: 2026-05-08
상태: **결정 완료 — Phase 1 (backend-engineer) 위임 직전**

---

## 0. 요약

팀원 RDS(`dp_db`)의 24개 테이블에 적재된 공공데이터(행정 단위/인구/지표/실거래/상권/교통/혼잡도/공원/카테고리)를 **양·정밀도 손실 없이** 운영 DB(`slgi`, GeoDjango)로 옮긴다. 기존 Django 모델은 거의 건드리지 않고, RDS 형상에 1:1 가깝게 대응되는 **신규 모델 11개**를 추가하여 적재한다. 점수(score_*) 재계산은 후속 작업으로 분리.

---

## 1. 확정 결정 사항

| # | 항목 | 결정 |
|---|---|---|
| 1 | 운영 DB 접속 | SSH 터널(`wlgusqkr22@34.47.101.188`) 또는 VM 내부 실행 |
| 2 | RentDeal 좌표 | RDS `location` 그대로 (지번 단위 1점, SPEC 14.2 정책 자동 충족 — RDS도 동일 정책으로 적재됨을 검증 완료) |
| 3 | 행정/법정동 모델 | 기존 `neighborhoods.Dong`(=행정동) 그대로 사용 + 신규 `regions.Ldong`(=법정동) 추가 |
| 4 | `housing_type` | RDS 한글 7종 raw 그대로 보존 + 영문 enum 5종 derived (다가구/단독 분리, 다세대+연립+연립다세대 → "연립다세대"로 통합) |

검증된 사실:
- RDS의 `rent_deal.location`은 **(ldong_code, jibun) 그룹별로 좌표 1개** — distinct=1 (헬리오시티 5,155건 모두 단일 POINT 확인)
- RDS의 `adong.boundary` = MULTIPOLYGON, `adong.location` = POINT, SRID 4326 → Django Dong 모델과 호환

---

## 2. 신규 모델 11종 (Django 측 추가)

> 모두 RDS 비즈니스 키를 PK로 그대로 사용. `db_table`도 RDS 테이블명과 동일하게 맞춰 ETL 단순화.

### 2.1 `apps/regions/` 신규 앱 (마스터 + 인접 + 인구)

| 모델 | db_table | RDS 출처 | 행수 | PK |
|---|---|---|---|---|
| `Seoul` | `seoul` | seoul | 1 | code |
| `Gu` | `gu` | gu | 25 | gu_code |
| `Ldong` | `ldong` | ldong | 467 | ldong_code |
| `GuAdjacency` | `adjacent_gu` | adjacent_gu | 108 | (gu1, gu2) 복합 |
| `LdongAdjacency` | `adjacent_ldong` | adjacent_ldong | 1,948 | (l1, l2) 복합 |
| `AdongAdjacency` | `adjacent_adong` | adjacent_adong | 2,444 | (a1, a2) 복합 |
| `LdongPopulation` | `ldong_population` | ldong_population | 20,548 | (ldong, date) |
| `AdongPopulation` | `adong_population` | adong_population | 18,744 | (dong, date) — Dong FK |

**공통 필드 (Seoul/Gu/Ldong):** `code(PK)`, `name`, `area_m2(numeric)`, `boundary(MultiPolygonField, srid=4326)`, `location(PointField, srid=4326)`. Ldong은 `gu(FK→Gu)` 추가.

**Adjacency 공통:** `dong_a/b` 또는 `code_a/b` 두 컬럼, `unique_together`. `code_a < code_b`로 정규화 또는 양방향 한 줄로 보존(원본 그대로).

**Population 공통:** `date`, `total_population`, `household_count`, `male_population`, `female_population`. 다 NULL 허용.

> `AdongAdjacency`/`AdongPopulation`은 Dong을 FK로 잡되 **adong_code → Dong.code** lookup으로 ETL이 매핑.

### 2.2 `apps/metrics/` 신규 앱

| 모델 | db_table | RDS 출처 | 행수 |
|---|---|---|---|
| `Metric` | `metric` | metric | 35 |
| `GuMetric` | `gu_metric` | gu_metric | 40,450 |
| `SeoulMetric` | `seoul_metric` | seoul_metric | 1,625 |

**Metric:** `metric_code(PK)`, `name`, `unit`, `category`, `cycle`, `is_generated(bool)`, `generation_method`, `source_agency`, `source_table`, `source_item`, `source_classification_code`, `remarks(text)`.

**GuMetric/SeoulMetric:** `(region_fk, date, metric_fk)` 복합 PK, `value(numeric)`.

### 2.3 `apps/parks/` 신규 앱

| 모델 | db_table | RDS 출처 | 행수 |
|---|---|---|---|
| `Park` | `park` | park | 1,886 |
| `ParkDong` | `park_adong` | park_adong | 2,353 |
| `ParkLdong` | `park_ldong` | park_ldong | 2,316 |

**Park:** `id(PK, varchar)`, `name`, `category(varchar)`, `area_m2`, `boundary(MultiPolygon, 4326)`, `location(Point, 4326)`.

**ParkDong:** `(park, dong)` 복합 PK (다대다 — 한 공원이 여러 행정동에 걸침).
**ParkLdong:** `(park, ldong)` 복합 PK.

---

## 3. 기존 모델 확장 (4종)

### 3.1 `realestate.RentDeal` 확장

| 컬럼 | 변경 | 출처 |
|---|---|---|
| `id` (auto PK) | **유지** (기존 호환). 별도 `external_id`로 RDS PK 보존 |
| `external_id` (NEW, unique) | RDS `rent_deal.id` |
| `housing_type` (NEW) | RDS `housing_type` 한글 그대로 (예: "아파트", "다가구") |
| `deal_type` (기존) | choices 확장: `apt/officetel/villa/dagagu/danok` (5종). villa 라벨 = "연립다세대" |
| `ldong` (NEW FK→Ldong) | RDS `ldong_code` |
| `dong` (기존 FK→Dong) | location → ST_Contains(Dong.geom)로 백필 |
| `house_name` (NEW) | RDS `house_name` |
| `contract_end_date` (NEW) | RDS 동명 |
| `contract_type` (NEW) | RDS 동명 |
| `renewal_request_right_used` (NEW, bool) | RDS 동명 |
| `previous_deposit` (NEW) | RDS 동명 |
| `previous_monthly_rent` (NEW) | RDS 동명 |
| `external_hash` (기존) | 유지하되 nullable로 변경 (신규 적재는 external_id로 충분) |
| `geom` (기존) | RDS `location` 그대로 |

`DEAL_TYPE_CHOICES` 확장:
```python
DEAL_TYPE_CHOICES = [
    ("apt", "아파트"),
    ("officetel", "오피스텔"),
    ("villa", "연립다세대"),   # 다세대+연립+연립다세대 통합
    ("dagagu", "다가구"),       # 신규 분리
    ("danok", "단독"),          # 라벨 변경 (단독다가구 → 단독)
]
```

기존 데이터의 `deal_type='danok'`(단독다가구 통합)은 마이그레이션 시점에 `house_name`/`area_m2` 기반 휴리스틱이 어려우니 **그대로 두고 ETL이 RDS raw로 덮어쓰는 시점에 재분류**.

### 3.2 `amenities` 앱 확장 (Store/BusinessCategory/KsciCategory 신규)

기존 `Amenity` 모델은 그대로 두고 새 모델 3종 추가:

| 모델 | db_table | RDS 출처 | 행수 |
|---|---|---|---|
| `BusinessCategory` | `business_category` | business_category | 247 |
| `KsciCategory` | `ksci_category` | ksci_category | 1,196 |
| `Store` | `store` | store | 534,977 |

**BusinessCategory:** `subcategory_code(PK)`, `subcategory_name`, `middle_category_code/name`, `main_category_code/name`.
**KsciCategory:** `ksci_code(PK)`, `subcategory_name`, `class_name`, `subclass_name`, `middle_category_name`, `main_category_name`.
**Store:** `id(PK)`, `name`, `branch_name`, `category(FK→BusinessCategory)`, `ksci(FK→KsciCategory)`, `dong(FK→Dong)`, `ldong(FK→Ldong)`, `address`, `location(Point, 4326)`.

> 기존 11개 카테고리 화이트리스트는 ETL 후 `Store.category_id IN (...)` 쿼리로 표현 가능. `Amenity` 적재는 본 단계에서 안 함.

### 3.3 `transit.SubwayStation` / `BusStop` 컬럼 보강 + 혼잡도 2종 신규

`SubwayStation` 추가/변경:
- `external_id`: nullable → unique (RDS id 사용)
- `dong` (NEW, nullable FK→Dong) — RDS adong_code
- `ldong` (NEW, nullable FK→Ldong) — RDS ldong_code

`BusStop` 추가/변경:
- `dong` 기존 FK 유지 — RDS adong_code 매핑 (95% 커버, 5%는 좌표→ST_Contains 보강)
- `ldong` (NEW, nullable FK→Ldong)
- `arsId` 그대로 = RDS `stop_number`
- `external_id` (NEW) = RDS `id` (bus_stop의 PK)

신규:

| 모델 | db_table | RDS 출처 | 행수 |
|---|---|---|---|
| `SubwayCongestion` | `subway_congestion` | subway_congestion | 65,561 |
| `BusCongestion` | `bus_congestion` | bus_congestion | ~8M |

**SubwayCongestion:** `(station, day_type, direction, express_yn, time)` 복합 PK, `congestion(numeric NOT NULL)`. day_type/direction/express_yn은 한글값(평일/토요일/일요일, 상선/하선, 일반/급행) 그대로.

**BusCongestion:** `(bus_stop, date, time)` 복합 PK, `congestion(numeric)`. **8M → BRIN 인덱스 권장**, 시간순 적재.

---

## 4. 작업 순서

### 4.1 Phase 1 — 스키마 (backend-engineer)

신규 앱 3개 생성 → 모델 11개 + 기존 모델 4종 확장 → makemigrations → 로컬 migrate 검증.

산출물:
- `backend/apps/regions/{models,admin,apps}.py` + migrations
- `backend/apps/metrics/{models,admin,apps}.py` + migrations
- `backend/apps/parks/{models,admin,apps}.py` + migrations
- 기존 `realestate/amenities/transit` 모델 수정 + migrations
- `config/settings/base.py`의 `INSTALLED_APPS` 갱신
- 핸드오프 문서 `docs/handoff/20260508-phase1-models.md`

검증:
- `python manage.py makemigrations --check --dry-run` 통과
- `python manage.py migrate` 로컬에서 정상 적용
- 기존 마이그레이션 영향 분석 (RentDeal `deal_type` choices 변경)

### 4.2 Phase 2 — ETL (data-pipeline, 별도 위임)

`backend/scripts/etl/from_rds/` 디렉터리에 18개 스크립트:

```
01_seoul.py / 02_gu.py / 03_ldong.py / 04_adong→dong.py
05_adjacency_gu.py / 06_adjacency_ldong.py / 07_adjacency_adong.py
08_population_ldong.py / 09_population_adong.py
10_metric_master.py / 11_metric_seoul.py / 12_metric_gu.py
13_business_category.py / 14_ksci_category.py / 15_store.py
16_subway_station.py / 17_bus_stop.py
18_subway_congestion.py / 19_bus_congestion.py
20_park.py / 21_park_dong.py
22_rent_deal.py
```

전송 방식: psycopg COPY 우선(rent_deal/bus_congestion). 멱등 보장(`ON CONFLICT DO NOTHING|UPDATE`).

### 4.3 Phase 3 — 정합성 검증

각 테이블 row count = RDS ±0.5%. PostGIS 샘플 spatial join. 기존 API 정상 응답.

### 4.4 Phase 4 — score 재계산 (별도 PR)

raw 데이터 적재 완료 후 SPEC 11.2 정규화로 `Dong.score_rent/amenity/transit` 재계산.

---

## 5. 위험 & 완화

| 위험 | 완화 |
|---|---|
| 운영 DB 디스크 (rent_deal 7.4M + bus_congestion 8M ~ 5–8GB) | Phase 1 직후 VM 디스크 확인 (`df -h`) |
| bus_congestion 8M 적재 시간 | COPY + BRIN, 1–2시간 예상 |
| RDS PG18 / slgi PG 버전 차이 | EWKB 직접 INSERT 우회 |
| FK 의존성 깊음 | 스크립트 실행 순서 강제 + 부분 commit |
| 기존 `RentDeal.deal_type='danok'` 데이터 충돌 | 마이그레이션 시 일단 유지, ETL이 RDS raw로 덮어씀 |

---

## 산출물

- 본 계획서 (`docs/handoff/20260508-rds-migration-plan.md`)
- `/tmp/inspect_db.py`, `/tmp/inspect_samples.py`, `/tmp/check_rentdeal_coord.py` — 검증 스크립트

## 다음 작업

1. **backend-engineer** → Phase 1 (모델/마이그레이션) — 본 위임 직후
2. **data-pipeline** → Phase 2 (ETL 스크립트)
3. **backend-engineer** → Phase 4 (점수 재계산, 별도 PR)

## 미완 / 알려진 이슈

- 운영 DB(slgi)는 외부 5433 차단 — 실제 PG/PostGIS 버전, 디스크 여유는 Phase 2 직전 SSH로 확인.
- Park의 RDS `boundary` 타입 확인 필요 (POLYGON vs MULTIPOLYGON). Phase 1 작업 중 점검.
