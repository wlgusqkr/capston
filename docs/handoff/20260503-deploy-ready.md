# Task: 배포 직전 종합 핸드오프 (post-/clear 새 세션용)

이 문서는 **/clear 직후 새 세션이 읽고 바로 이어가기 위한 컨텍스트**다.
2026-05-03 기준, 슬기로운 자취생활 capstone, 마감 2026-06-05 (D-33).

먼저 `docs/SPEC.md` + `docs/DESIGN_SYSTEM.md` + `CLAUDE.md`를 정독한 뒤 본 문서를 읽을 것.

---

## 1. 현 상태 (한 문장)

**기능 완성도 데모 가능 수준 + 환산 월세 시스템 정직성 확보 + UI polish 통과. 다음은 EC2 배포 + 발표 피드백 수집.**

작업 트리 clean. 9개 atomic commit 완료 (2026-05-03 세션 분).

---

## 2. 오늘 들어간 커밋 (최신 → 과거)

```
a34a8a7 feat(map): replace pin dots with always-visible price chips
674523a feat(preference): use converted rent in pairs and learning
a77e40e feat(map): hover preview, deeper zoom, converted rent in preference
19778d9 fix(compare): use rent_converted_avg as primary rent metric
7f72554 feat(rent): surface converted-monthly rent across compare/detail/sidebar/pin
b243bfb feat(realestate): expose converted-monthly rent (보증금 환산)
c62ff0b docs(design): sync DESIGN_SYSTEM.md primary button radius to subtle (8px)
3c9e0ce feat(compare): honest comparison — drop placeholder rows
53401c6 style(design): bundle 5 quick wins from deep audit
```

세션 이전 주요 커밋 (Phase 0a/1/2):

```
382ed18 feat(map): transaction pin layer + kernel score panel
509372b feat(api): transactions/bbox + score/point endpoints
97391c1 feat(scripts): real-data fetchers and compute_scores --mode real
bc24416 feat(backend): add amenities/transit/realestate apps and models
```

---

## 3. 의미 단위로 그룹핑한 변경

### A) 백엔드 데이터 레이어 (Phase 0a — 이전 세션)
- 3개 앱: `apps/amenities`, `apps/transit`, `apps/realestate`
- 모델 6종 + 마이그레이션 + admin
- 적재: Amenity 165,280 / Subway 527 / Bus 11,220 / NearestSubway 1,275 / RentDeal 27,050(geom 73.2%) / JibunGeocodeCache 5,723
- Dong 425개 점수: `score_rent` / `score_amenity` / `score_transit` (백분위)

### B) 백엔드 API (Phase 1a + 2a — 이전 세션)
- `GET /api/transactions/bbox` — RentDeal pin 조회 (5분 캐시, 200/has_more)
- `POST /api/score/point` — Gaussian σ=300m kernel scoring (110~244ms)

### C) 프론트엔드 메인 지도 (Phase 1b + 2b — 이전 세션)
- TransactionPinLayer + TransactionPanel + TransactionFilters
- KernelScoreLayer + KernelScorePanel
- 3-panel mutual exclusion (Dong/Transaction/Kernel)

### D) 디자인 audit + fix (오늘 세션 1번 라운드)
- Quick Wins 5종: 로고 "슬슬" 중복 해소 / 메인 sr-only h1 추가 / Times font fallback 제거 / disabled 검색창 제거 / login pill→subtle radius
- Compare 페이지 "honest" 처리: 더미 4행 삭제 → 진짜 데이터 4행 + provenance footer
- DESIGN_SYSTEM.md ↔ 코드 radius 명세 동기화 (DESIGN_SYSTEM.md가 그동안 untracked였음 — force-add로 정합성 회복)

### E) 전월세 환산 시스템 (오늘 세션 2번 라운드 — **가장 중요한 도메인 작업**)
- 표준식: `환산월세 = 월세(만원) + 보증금(만원) × 0.005` (서울 평균 6%/년)
- Util 단일 진실: `backend/apps/realestate/utils.convert_to_monthly` ↔ `frontend/src/lib/rent.ts.convertToMonthly`
- API 신규 필드: `RentDealPin.converted_rent`, `CompareItem.rent_converted_avg`, `PairCard.rent_converted`
- `compute_scores._converted_rent` 새 공식 적용 → score_rent 일부 동에서 크게 이동 (성산2동 88.3 → 9.7. 정직한 결과)
- UI 노출: Compare(primary 메트릭), DongDetail 거래표, Sidebar 라벨, TransactionPanel, PreferenceModal pair card 모두

### F) 핀 UX 변경 (오늘 세션 3번 라운드)
- maxZoom 18 → 19
- 줌별 핀 사이즈 동적 (6/7/9px at z13/15/17)
- **호갱노노 스타일 가격 chip** — `<CircleMarker>` 점 제거하고 `<Marker icon={L.divIcon}>` 가격 chip이 marker 자체
- chip variant: compact/standard/expanded (zoom 13-14 / 15-16 / 17+)
- selected coral, panel OPEN 시 다른 chip dim (opacity 0.4)

### G) Preference Modal 환산
- pair API에 `rent_converted` 추가
- 학습 로직(pref/submit)도 환산 기반 (score_rent 사용 — 자동 일관)
- PairCard 표시 "평균 환산 월세" + "보증금 환산" 보조라벨

---

## 4. 데모 시나리오 (지금 동작 확인된 흐름)

1. http://127.0.0.1:5173/ 메인 지도 — 히트맵 + 사이드바 가중치
2. 줌 13+ 확대 → 가격 chip 항상 표시 (점 X). z19까지 확대 가능
3. chip 클릭 → 우측 TransactionPanel (같은 jibun 거래 list)
4. 빈 지도 클릭 → KernelScorePanel (Gaussian 점수 + 가중치 슬라이더 + 학교 통학)
5. 사이드바 "5번 비교로 자동 추천" → PreferenceModal (환산값 표시)
6. /compare?dongs=A,B,C — 4행 honest table (종합/환산월세/생활시설/교통)
7. /dong/{slug} — 동 상세 (차트, 거래표, 편의시설 그리드, 비슷한 동네)

---

## 5. 다음 작업: EC2 배포 + 피드백 수집

### 5.1 배포 결정 (CLAUDE.md "모놀리식 단일 서버" 정합)

**구성 (한 EC2 안):**
- Nginx — 80/443 + React build static 서빙 + `/api/*` reverse proxy
- Gunicorn — Django WSGI (3~4 worker)
- PostgreSQL 15 + PostGIS 3.x — 같은 머신
- Redis — 같은 머신 (5분 캐시)
- certbot — Let's Encrypt HTTPS

**인스턴스: t3.small (2 vCPU / 2GB RAM, ~$15/mo)**. t2.micro는 빠듯.

**OS: Ubuntu 22.04 LTS** — `apt install python3-gdal libgdal-dev`로 GeoDjango 한 줄 해결 (로컬 macOS의 GDAL_LIBRARY_PATH 고생 없음)

**데이터 이전: pg_dump local → scp → pg_restore EC2**. fetch 스크립트 재실행 X (VWorld 5,629콜 등 API 쿼터 낭비 X)

**도메인: nip.io 트릭** (`ec2-public-ip.nip.io`) — 무료, HTTPS 가능

### 5.2 다음 세션 첫 행동

1. backend-engineer에 위임: `docs/DEPLOYMENT.md` + `nginx/site.conf` + `systemd/gunicorn.service` 템플릿 작성
2. EC2 launch (사용자 직접 — AWS console)
3. SSH로 환경 셋업 (Python, Postgres, nginx, certbot)
4. 코드 git clone + .env 복사 + migrate
5. pg_dump local → scp → pg_restore EC2
6. `npm run build` → nginx static root
7. systemd unit 활성
8. 도메인 (nip.io) + HTTPS
9. 발표용 URL 손에 들고 실제 시연 → 피드백 수집

### 5.3 피드백 수집 채널

- 카카오톡: 자취하는 친구/동기 5~10명에게 URL 공유 + 1주일 사용
- Google Form 또는 Notion으로 짧은 피드백 (3~5문항)
- 발표 직전 1주일 polish 시간 확보

---

## 6. 알려진 잔여 갭 (의도적 보류, 발표 후 polish PR로)

| 갭 | 위험도 | 보류 이유 |
|---|---|---|
| `/dong/{slug}` URL이 7자리 행정동 코드 | 중 | 데이터 425행 + 라우팅 호환성 위험. 시연에서 "왜 숫자야?" 응답 가능 |
| `/404` 페이지 황량 (텍스트 한 줄) | 낮 | 사용자가 일부러 잘못 가야 보임 |
| Sidebar 월세 상한 슬라이더 실제 필터 미연결 | 중 | 라벨은 환산으로 바꿨지만 backend 필터 호출 안 됨. 깊이 작업 필요 |
| chip 겹침 z-priority 단순 | 낮 | 줌 19까지 분산 가능. 클러스터링 라이브러리 도입은 스코프 초과 |
| DongDetail 차트 환산 라인 | 낮 | 백엔드가 보증금 평균을 같이 노출해야 가능. 차트는 raw 라벨 유지 |
| 비슷한 동네 카드 빈약 | 낮 | feature scope creep |
| 카카오 소셜 로그인 키 미발급 | 낮 | 시간 남으면 |
| 3D / 임베딩 (SPEC 9, 10) | 낮 | 명세 우선순위 9, 10번. 현재까지 임팩트 더 큼 |
| Card vs Modal radius / Badge vs chip 불일치 (design-system-keeper 후속 가치) | 낮 | 디자인 시스템 미세 정합 |

---

## 7. 절대 깨지면 안 되는 invariants

- **SPEC 14.2**: 매물 단위 정밀 좌표 금지 — RentDeal.geom = 지번 중심점만
- **환산률 0.005/월 (6%/년)**: backend `apps.realestate.utils` ↔ frontend `lib/rent.ts` 같은 값. 변경 시 양쪽 동시
- **디자인 시스템 외 색/폰트/radius 추가 금지** — `docs/DESIGN_SYSTEM.md` 단일 진실 (이번 세션에 force-add됨, 이제 git tracked)
- **localStorage / sessionStorage 사용 금지** — React state로
- **거래량 3건 미만 동 fallback** — 구 평균 → 서울 중위
- **모놀리식 단일 서버** — 마이크로서비스, Kafka, ES 도입 금지

---

## 8. 환경 / 키 상태

`backend/.env` (사용자가 채워 놓음, .env.example 참고):
- `DATABASE_URL` — PostgreSQL+PostGIS
- `GDAL_LIBRARY_PATH`, `GEOS_LIBRARY_PATH` — macOS 로컬용 (EC2에선 불필요)
- `DATA_GO_KR_API_KEY` — 국토부 + 소상공인 (1개 키)
- `SEOUL_OPEN_API_KEY` — 지하철 + 버스 + 공원
- `VWORLD_API_KEY` — 백엔드 지오코딩
- `KAKAO_*` — 보류 (미발급)
- `REDIS_URL` — 5분 캐시

`frontend/.env`:
- `VITE_API_URL=http://localhost:8000/api`
- `VITE_VWORLD_API_KEY` — 프론트 타일 (도메인 제한)

**EC2 배포 시 변경할 env:**
- `DJANGO_DEBUG=False`
- `DJANGO_ALLOWED_HOSTS=<ec2-domain>`
- `DJANGO_CORS_ALLOWED_ORIGINS=<https URL>`
- `VITE_API_URL=https://<도메인>/api`
- `VITE_VWORLD_API_KEY` 도메인 화이트리스트 추가 (vworld.kr 콘솔)

---

## 9. 핸드오프 인덱스 (오늘 세션 산출)

`docs/handoff/`:
- `20260503-phase0a-1-2-complete.md` — Phase 0a/1/2 종합 (이전 세션)
- `20260503-design-quickwins.md` — Quick Wins 5종
- `20260503-honest-compare.md` — Compare 더미 데이터 처리
- `20260503-design-system-radius-sync.md` — DESIGN_SYSTEM.md 동기화
- `20260503-rent-conversion-backend.md` — 환산 백엔드
- `20260503-rent-conversion-frontend.md` — 환산 프론트
- `20260503-preference-converted-rent.md` — preference 환산
- `20260503-pin-hover-zoom-uxpolish.md` — hover + zoom + pref card
- `20260503-pin-chip-marker.md` — 가격 chip = marker
- **`20260503-deploy-ready.md`** — 본 문서 (post-/clear 진입점)

`.gitignore`에 `docs/handoff/`가 들어있을 가능성 — 확인 필요. 본 문서는 git tracked 여야 다음 세션이 본다. 안 되면 ad-hoc 위치로.

---

## 10. 다음 세션 첫 행동 (post-/clear)

1. `docs/SPEC.md` 정독 (특히 §6.1 메인 지도, §11 점수, §14.2 지오코딩)
2. `docs/DESIGN_SYSTEM.md` 정독
3. `CLAUDE.md` 정독 (sub-agent 위임 규칙)
4. **본 문서 정독** (가장 중요 — 다른 핸드오프는 참조용)
5. `git log --oneline -10` 으로 최근 커밋 흐름 파악
6. `git status --porcelain` → clean 확인
7. **사용자에게 "EC2 배포 진행할까요?" 질문** — backend-engineer에게 deploy 가이드 위임할지 확정
8. 위임 시: `docs/DEPLOYMENT.md` + nginx config + systemd unit 작성

---

## 11. 가장 흔한 실수 방지

- backend agent dispatch 시 SPEC + 직전 핸드오프 doc 둘 다 정독 강제
- frontend agent에게 백엔드 응답 필드명 명시 (race condition 방지)
- atomic commit 구조 유지 (1 commit = 1 의미 단위)
- 디자인 결정은 design-system-keeper 또는 PM이 결정 후 frontend-engineer가 구현
- compute_scores 변경 시 양쪽(backend util + frontend rent.ts) 계수 동기화
