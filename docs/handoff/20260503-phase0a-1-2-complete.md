# Task: Phase 0a + Phase 1 + Phase 2 완료 종합

2026-05-03 한 세션에 9개 sub-task로 완수. 마감 D-33.

## 완료된 작업
- 백엔드 모델 6개 신설(Amenity/SubwayStation/BusStop/NearestSubway/RentDeal/JibunGeocodeCache) + migrations + admin
- 데이터 적재: Amenity 165,280 / Subway 527 / Bus 11,220 / RentDeal 27,050(geom 73.2%) / JibunGeocodeCache 5,723
- 점수 계산 `compute_scores --mode real` 본문 + 425개 Dong 백분위 적재
- `GET /api/transactions/bbox` (Phase 1a) + 프론트 핀 layer/패널/필터(Phase 1b)
- `POST /api/score/point` (Phase 2a, 110~244ms) + 프론트 클릭 → 커널 점수 패널(Phase 2b)
- 모든 디자인 시스템 토큰 준수, dark mode 부활 X, localStorage 사용 X
- TypeScript strict / `npm run build` 통과

## 산출물 — Phase별 핸드오프 인덱스

| Phase | 산출물 | 핸드오프 doc |
|---|---|---|
| 0a Step 1a | apps.amenities/transit/realestate 모델 6개 + 마이그레이션 | `20260503-phase0a-step1a-models.md` |
| 0a Step 1b | Amenity 165,280 적재 (편의시설 + 공원 127) | `20260503-phase0a-step1b-amenities.md` |
| 0a Step 2 | SubwayStation 527, BusStop 11,220, NearestSubway 1,275 | `20260503-phase0a-step2-transit.md` |
| 0a Step 3 | RentDeal 27,050 (geom 73.2%), JibunGeocodeCache 5,723 | `20260503-phase0a-step3-realestate.md` |
| 0a Step 4 | Dong 425개 score_rent/amenity/transit 백분위 | `20260503-phase0a-step4-scores.md` |
| 1a | `GET /api/transactions/bbox` (5분 캐시, drf-spectacular) | `20260503-phase1a-transactions-api.md` |
| 1b | TransactionPinLayer + TransactionPanel + TransactionFilters | `20260503-phase1b-transaction-pins.md` |
| 2a | `POST /api/score/point` (110~244ms, σ=300m) | `20260503-phase2a-kernel-score.md` |
| 2b | KernelScoreLayer + KernelScorePanel + 가중치/학교 인터랙션 | `20260503-phase2b-kernel-panel.md` |

## 다음 세션이 해야 할 첫 행동
1. **백엔드 재시작 (port 8000)**: `cd backend && python manage.py runserver` — Phase 1a/2a urls 픽업 필요. 현재 띄워진 프로세스는 Phase 0a 시점이라 `/api/transactions/bbox`, `/api/score/point` 둘 다 404.
2. 프론트 띄우고 (`cd frontend && npm run dev`) 통합 시나리오 1회 수행:
   - 메인 → 동 클릭 → 동 패널
   - 줌 13+ → 거래 핀 클릭 → 거래 패널
   - 빈 지점 클릭 → 커널 점수 패널 → 가중치 슬라이더 / 학교 선택
3. git commit 단위 정리 후 conventional commits 형식으로 커밋

## 알려진 이슈 (스코프 외, 후속 결정 필요)
- **score_rent fallback plateau**: 5개 구만 RentDeal 적재 → 나머지 420개 동은 47.8 동률. 25개 구 풀 적재로 자연 해소
- **단독다가구 geom=null 7,243건**: API 응답에 jibun 자체가 없음. 점수에는 영향 없으나 핀에서 빠짐. 행안부 BJD↔ADM 매핑 CSV 도입으로 후속 해결 가능
- **카카오 소셜 로그인**: 키 미발급, 시간 남으면
- **3D / 임베딩**: SPEC 9, 10번. 현재까지 임팩트가 더 크므로 보류
- **kernel raw score 백분위 미적용**: log1p + scale 단순화. 학부 데모 기준 OK

## 새 의존성 / 환경 변수
- 변동 없음. `DATA_GO_KR_API_KEY` / `SEOUL_OPEN_API_KEY` / `VWORLD_API_KEY` 모두 `.env`에 이미 있음
- Redis cache 활용 (이미 설정됨)

## 절대 깨지면 안 되는 invariant
- SPEC 14.2: 매물 단위 정밀 좌표 금지 (RentDeal.geom = 지번 중심점)
- 디자인 시스템 외 색/폰트 추가 금지
- localStorage / sessionStorage 사용 금지
- 거래량 3건 미만 동 → fallback (구 평균 → 서울 중위)
- 백엔드/프론트 둘 다 한 화면 단위로 묶어 배포 (모놀리식)
