# [TEMP] from_dp_db — DP_DB -> SLGI 1회용 임시 ETL

본 디렉터리는 단계 6에서 **1회만** 실행하기 위한 임시 ETL이다. 추후 실 초기 적재 ETL은 별도 plan으로 작성·교체된다.

## 위치 / 흐름

- 원천: DP_DB 로컬 docker (`docs/schema.dbml` 기준 36 테이블 중 33 테이블)
- 대상: SLGI docker container (단계 2에서 동일 스키마로 모델 정합)
- 흐름: `SELECT FROM dp_db -> INSERT INTO slgi` 단순 패턴
- 멱등: 모든 스크립트 `ON CONFLICT (...) DO UPDATE/NOTHING`

## 적재 제외 (G-6 / G-8 결정)

- `users`, `user_preference`, `user_favorite` : SLGI 신규 등록 — DP_DB 측 적재 0
- SLGI 측 `dong` 테이블 (lock D) : 본 ETL 적재 X. 기존 capston seed 또는 별도 처리
- 레거시 `nearest_subway` 단일 테이블 : 본 ETL 적재 X (adong/ldong 분해 후 사용)

## 환경변수 (필수)

```
DP_DB_DSN=postgresql://USER:PASS@HOST:5432/dp_db
SLGI_DSN=postgresql://USER:PASS@HOST:5433/slgi
```

하드코딩 0. 단계 5 docker network 결정 후 호스트명 갱신.

## 실행 순서 (의존성 기준)

```
01_seoul.py
02_gu.py             # gu + adjacent_gu
03_ldong.py          # ldong + adjacent_ldong
04_adong.py          # adong + adjacent_adong
05_population.py     # ldong_population + adong_population
06_metric.py         # metric + gu_metric + seoul_metric
07_business_category.py
08_ksci_category.py
09_store.py
10_subway_station.py
11_bus_stop.py
12_subway_congestion.py
13_bus_congestion.py    # ~8M, streaming
14_park.py              # park + park_adong + park_ldong
15_univ.py              # univ + univ_adong + univ_ldong
16_library.py           # library + library_hours
17_rent_deal.py         # ~7.4M, streaming
18_amenity.py           # amenity + amenity_adong + amenity_ldong
19_current.py           # current_seoul/gu/ldong/adong (4 테이블)
20_nearest_subway.py    # nearest_subway_adong + nearest_subway_ldong
```

## 일괄 실행 (예시 — PowerShell)

```powershell
$env:DP_DB_DSN = "postgresql://..."
$env:SLGI_DSN  = "postgresql://..."
Get-ChildItem -Filter "[0-9][0-9]_*.py" | Sort-Object Name | ForEach-Object {
    python $_.FullName
}
```

## 검증 (단계 6에서 실행)

- 각 스크립트 마지막에 `verify_count` PRE/POST 행수 출력
- DP_DB row count == SLGI row count (diff=0) 기대
- diff>0 발생 시 schema 정합/FK/CHECK 위반 점검

## 주의

- 본 ETL은 **1회용**. `git rm` 또는 `.archive/` 이동은 단계 6 PASS 이후 별도 처리.
- 모든 스크립트 docstring에 `[TEMP]` 마커 포함.
- Django ORM 사용 0 — psycopg2 직접 사용.
