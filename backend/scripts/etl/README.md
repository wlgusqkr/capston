# scripts/etl/ — 초기 적재 (initial load)

SLGI DB 초기 적재용 스크립트.

- `seed/` — 행정동 매핑 등 시드 데이터 생성/검증
- `legacy_from_rds/` — 팀원 RDS → local slgi 흐름 (참고용 레거시, 단계 4 이후 정리 예정)
- 추후 `from_dp_db/` — DP_DB → SLGI 1회용 임시 ETL (단계 4B에서 작성)
