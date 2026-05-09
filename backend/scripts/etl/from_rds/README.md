# RDS → local slgi ETL (Phase 2)

팀원 RDS(`dp_db`)에 적재된 24개 테이블을 운영 DB(`slgi`, GeoDjango 모델)로
손실 없이 복사하는 standalone 스크립트 모음.

## 환경

```
Python 3.12
psycopg 3.x (이미 .venv 설치됨)
local PostGIS 16
RDS PostgreSQL 18 (read-only)
```

운영 DB 접속은 환경변수 또는 CLI 인자로 받음. **홈서버 이관 시 환경변수만 바꾸면 그대로 재사용 가능**.

```bash
export RDS_DSN="host=... port=5432 dbname=dp_db user=... password=..."
export LOCAL_DSN="host=... port=5432 dbname=slgi user=... password=..."
```

기본값 (검증됨):
- RDS: `capstonedesign.c5yi4uwikm7d.ap-northeast-2.rds.amazonaws.com:5432/dp_db` (backend_reader)
- LOCAL: `localhost:5433/slgi` (slgi/slgi)

## 실행 순서 (FK 의존성)

```
01_seoul.py                 → seoul (1)
02_gu.py                    → gu (25)
03_ldong.py                 → ldong (467)
04_dong.py                  → dong (행정동, 426)
05_adjacency.py             → adjacent_gu/ldong/adong (108/1948/2444)
06_population.py            → ldong_population/adong_population (20548/18744)
07_metric.py                → metric/seoul_metric/gu_metric (35/1625/40450)
08_business_category.py     → business_category (247)
09_ksci_category.py         → ksci_category (1196)
10_store.py                 → store (534977)
11_subway_station.py        → subway_station (400)
12_bus_stop.py              → bus_stop (15429) + 좌표 백필
13_subway_congestion.py     → subway_congestion (65561)
14_bus_congestion.py        → bus_congestion (~8M)
15_park.py                  → park (1886)
16_park_dong.py             → park_adong/park_ldong (2353/2316)
17_rent_deal.py             → rent_deal (~7.4M) + ST_Contains dong 보정
```

전체 일괄:

```bash
cd /Users/bagjihyeon/Desktop/School/capston/backend
for s in 01_seoul 02_gu 03_ldong 04_dong 05_adjacency 06_population 07_metric \
         08_business_category 09_ksci_category 10_store 11_subway_station \
         12_bus_stop 13_subway_congestion 14_bus_congestion 15_park 16_park_dong \
         17_rent_deal; do
  echo "=== $s ==="
  .venv/bin/python scripts/etl/from_rds/${s}.py || break
done
```

큰 테이블 샘플 검증:

```bash
.venv/bin/python scripts/etl/from_rds/14_bus_congestion.py --limit 10000
.venv/bin/python scripts/etl/from_rds/17_rent_deal.py --limit 10000
```

## 멱등성

모든 스크립트는 `INSERT ... ON CONFLICT (...) DO UPDATE/NOTHING`. 두 번 돌려도 데이터 손상 없음.

- 비즈니스 키 PK 테이블: `ON CONFLICT (pk) DO UPDATE SET ...`
- 다대다 / 시계열: `ON CONFLICT (uniq_cols) DO UPDATE SET value` 또는 DO NOTHING

## CLI 옵션

```
--rds-dsn DSN        RDS DSN (env RDS_DSN 또는 검증된 기본값)
--local-dsn DSN      Local DSN
--limit N            RDS에서 가져올 row 상한 (개발용 샘플)
--batch-size N       배치 크기 (default 10000)
```

## 디자인 노트

1. **Geometry**: RDS에서 `ST_AsEWKT(col)`로 텍스트 export → local에서 `ST_GeomFromEWKT(%s)` 로 캐스팅. PG18→PG16 binary EWKB도 호환되지만 디버깅 편의상 EWKT.
2. **FK lookup**: RDS의 varchar id (subway_station/bus_stop) → Django auto bigint id 매핑은 메모리 dict 한 번 적재 후 사용.
3. **dong 매핑 (rent_deal)**: 2-pass — 1) ldong→대표 dong fallback INSERT, 2) ST_Contains UPDATE 보정.
4. **bus_stop 좌표 백필**: adong_code IS NULL인 5%를 좌표 → ST_Contains(Dong.geom, geom) 으로 채움.
5. **검증**: 각 스크립트 끝에 RDS vs LOCAL `COUNT(*)` 비교 출력.

## 알려진 이슈

- `metrics.Metric.metric_code` 모델이 `max_length=20` 이었으나 RDS에 26자 코드(`POP_ELDERLY_RATIO_FORECAST` 등)가 있어 30으로 늘리는 마이그레이션 추가 (`metrics/0002_extend_metric_code_length.py`).
- 큰 테이블 (rent_deal/bus_congestion) 전체 적재는 30분~2시간 소요. 샘플(--limit)로 동작 검증 후 전체 실행 권장.

## 다음 단계

Phase 4 — `Dong.score_rent/amenity/transit` 재계산 (SPEC 11.2 정규화). 별도 PR.
