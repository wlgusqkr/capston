# scripts/update/ — 일일 업데이트 fetch

공공데이터 API에서 일일 갱신 데이터를 fetch 하는 스크립트. 모든 스크립트는 idempotent (재실행 안전) 설계.

## 범위 (단계 4 시점)

| 스크립트 | 데이터 | 갱신 주기 | idempotent 키 |
| --- | --- | --- | --- |
| `fetch_realestate.py` | 국토교통부 실거래가(전월세) | 월 단위 (직전 N개월 슬라이딩) | `RentDeal.external_hash` (sha1) |
| `fetch_amenities.py` | 편의시설 원천 (store/park/library/...) | 월/분기 | source_table + source_id |
| `fetch_transit.py` | 지하철 / 버스 정류장 | 월 | source_id |

## 공통 규칙

- 환경변수: `DATA_GO_KR_API_KEY` (공공데이터포털), `VWORLD_API_KEY` (지오코딩).
- 좌표계: 원천 좌표계 → EPSG:4326 변환 후 적재.
- `--dry-run` 옵션 필수 (호출/카운트만, DB 미접근).
- 재실행 시 중복 적재 방지 — `update_or_create` 또는 `INSERT ... ON CONFLICT`.

## 지오코딩 정책 (sub-plan 4D lock)

- 별도 지오코딩 캐시 테이블 도입 X.
- V-World 호출 결과는 `RentDeal.location` 등 본 테이블에 직접 INSERT.
- 호출 실패 / jibun 부재 (단독·다가구) → ldong centroid fallback 또는 NULL.
- `geocode_jibun` 본 구현은 일일 업데이트 본격 가동 전 별도 plan에서 채움.

## 입력 lock

- 단계 8(일일 업데이트 cron) plan 진입 시 스케줄링/로그/실패 알림 정책 lock.
- 본 단계(4)에서는 적재 골격 + README 만.
