# scripts/validate/ — 검증 스크립트

스키마 검증, 데이터 품질 검증, 공간 데이터 검증 등을 모으는 placeholder.

## 범위 (단계 4 시점)

| 카테고리 | 대상 | 예 |
| --- | --- | --- |
| 스키마 검증 | schema.dbml 정합 | 컬럼/제약/인덱스 존재 확인 |
| 데이터 품질 | NULL / 범위 / 분포 | 점수 0~100 범위, 좌표 서울 BBOX |
| 공간 검증 | SRID / GiST 인덱스 | EPSG:4326 강제, geom NOT NULL |
| 재실행성 | idempotent 키 | 중복 적재 0 확인 |

## 단계 별 채움 일정

- **단계 6 (ETL 임시 적재)**: PRE/POST 검증 스크립트 (적재 전 PRE = 정합/스키마, 적재 후 POST = 행수/분포).
- **단계 9 (운영 단계)**: 일일 cron 후 데이터 품질 모니터링.

본 단계(4)에서는 폴더/README placeholder 만.
