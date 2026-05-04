# Task: Phase 0a 시작 — 데이터 레이어 + 실거래 핀 + 커널 점수

이 문서는 **/clear 직후 새 세션이 읽고 바로 이어가기 위한 컨텍스트 핸드오프**다.
2026-05-03 기준 슬기로운 자취생활 capstone, 마감 2026-06-05 (D-33).

먼저 `docs/SPEC.md` + `docs/DESIGN_SYSTEM.md` + `CLAUDE.md`를 정독한 뒤 본 문서를 읽을 것.

---

## 1. 직전 세션에서 완료된 것

### (a) 디자인 시스템 전면 교체 (완료)
- `docs/DESIGN_SYSTEM.md`가 단일 진실 — Cohere-inspired analytics 미감
- 기존 짙은 청록 primary + 4-color 히트맵 → Near-Black `#17171c` CTA + Pale Green→Deep Forest 5-stop 히트맵으로 전면 마이그레이션
- 변경 파일: `frontend/src/styles/tokens.css`, `globals.css`, UI 프리미티브 9개 (Button/Card/Badge/Score/Input/Select/Slider/Modal/Tooltip), 라우트 5개 + Detail 6개 + Map 컴포넌트 + Onboarding, `lib/colors.ts`
- 디자인 리뷰 (`/design-review`) 완료: 사이드바 provenance 푸터, Leaflet 줌 white pill 픽스 적용
- 관련 커밋: `dc9a37c`, `710a501`, `fe8e5f8`, `015b02f`

### (b) 환경 변수 정리 (완료)
- `MOLIT_API_KEY` + `SBA_API_KEY` → **`DATA_GO_KR_API_KEY`** 1개로 통합 (커밋 `02b36b6`)
- 사용자가 `.env`에 키 모두 채움 (data.go.kr / data.seoul.go.kr / VWorld 발급 완료, 카카오는 보류)

### (c) 활용신청 완료된 데이터셋
**data.go.kr (1개 키, 4번 활용신청):**
- 15126473 연립다세대 전월세
- 15126472 단독/다가구 전월세
- 15126475 오피스텔 전월세
- 15012005 소상공인 상가(상권)정보

**data.seoul.go.kr (1개 키, 3번 활용신청):**
- 지하철역 위치
- 버스 정류장 위치
- 도시공원 정보 ← 신규

**vworld.kr:**
- 프론트 키 (`VITE_VWORLD_API_KEY`) — 지도 타일, 도메인 제한
- 백엔드 키 (`VWORLD_API_KEY`) — 지오코딩, 도메인 제한 X

---

## 2. 현재 모델 / 스크립트 상태

### 존재하는 모델
- `apps/neighborhoods/Dong` — 행정동 (geom polygon, centroid, score_rent/amenity/transit 사전계산 컬럼)

### 미존재 모델 (Phase 0a 대상)
- `apps/amenities/Amenity(dong_fk, category, name, geom: PointField)` — 편의점/카페/병원/공원/…
- `apps/realestate/RentDeal(dong_fk, deal_type, deal_date, area_m2, deposit, monthly_rent, geom: Point)`
- `apps/transit/SubwayStation(name, line, geom: Point)` + `BusStop(dong_fk, geom: Point)` + `NearestSubway(dong, station, rank, distance_m)`

### 스크립트 상태 (모두 dry-run 골격, 본문은 placeholder)
- `backend/scripts/fetch_amenities.py` — `DATA_GO_KR_API_KEY` 사용, 모델 채우면 활성. CATEGORY_MAP에 `park` 카테고리 미포함 (확장 필요)
- `backend/scripts/fetch_realestate.py` — 동일. 25개 구 × 6개월 호출, IQR 1.5배 클리핑 함수(`clip_outliers`) 구현됨
- `backend/scripts/fetch_transit.py` — `SEOUL_OPEN_API_KEY` 사용. 지하철역 + 버스 정류장 + 가까운 역 top-3 사전계산 골격
- `backend/scripts/compute_scores.py` — score 백분위 계산 골격 (`--mode real` 본문 미구현)
- `backend/scripts/fetch_parks.py` — **미존재. 신규 작성 또는 fetch_amenities.py 확장**

---

## 3. 결정된 default (사용자가 다른 의견 없으면 이대로)

| 결정 사항 | 선택 | 이유 |
|---|---|---|
| 공원 추가 | ✅ YES | 자취생 가치 시그널, 반나절 비용. SEOUL_OPEN_API_KEY 재사용 |
| 버스 정류장 적재 | ✅ YES | 지하철+버스 → 더 정확한 transit score |
| 지오코딩 초기 범위 | 데모용 5개 구 (중구·종로구·관악구·마포구·동대문구) | VWorld 한도 회피, 시간 절약. 시간 남으면 확장 |
| 실거래 핀 클러스터링 | Phase 1에서는 ❌ | 줌 레벨 13+ 에서만 raw pin. 클러스터링은 시간 남을 때 |

---

## 4. 진행 계획 (Phase 0a → Phase 1 → Phase 2, 6-7일)

### Phase 0a — 데이터 레이어 (3-4일, blocking)

#### Step 1: Amenity + Park 모델 + 적재 (1.5일)
**위임:** `backend-engineer` (모델·migration·admin) + `data-pipeline` (fetch 본문)
1. `backend/apps/amenities/` 앱 생성: models, migrations, admin, INSTALLED_APPS 등록
   - `Amenity` 모델: `dong_fk`, `category` (CharField with choices including `park`), `name`, `geom` (PointField, GiST index)
2. `fetch_amenities.py` 본문 채우기: 25개 구, paginate, batch upsert (`update_or_create`)
3. 공원 통합: `fetch_amenities.py`에 `_fetch_parks(api_key)` 함수 추가 OR 별도 `fetch_parks.py` 신설 — `data.seoul.go.kr` "도시공원 정보" 호출
4. 검증: 25개 구 dry-run → 실 적재 → SQL 카운트로 sanity check

#### Step 2: Transit 모델 + 적재 (1일)
**위임:** `backend-engineer` + `data-pipeline`
1. `backend/apps/transit/` 앱 생성: `SubwayStation`, `BusStop`, `NearestSubway`
2. `fetch_transit.py` 본문 채우기:
   - 지하철: `subwayStationMaster` 호출 (~284개)
   - 버스: `busStopLocationXyInfo` 페이지네이션 (~12,000개)
3. `precompute_nearest_subway` 활성: `ST_Distance` PostGIS 쿼리로 행정동별 top-3
4. 검증: 동일

#### Step 3: RentDeal 모델 + 적재 + 지오코딩 (1.5일, 가장 위험)
**위임:** `backend-engineer` + `data-pipeline`
1. `backend/apps/realestate/` 앱 생성: `RentDeal(dong_fk, deal_type, deal_date, area_m2, deposit, monthly_rent, geom: Point)`
2. `fetch_realestate.py` 본문 채우기:
   - 5개 구 (중구·종로구·관악구·마포구·동대문구) × 6개월 호출
   - IQR 1.5배 클리핑 적용 (이미 있음)
   - **지번 → 좌표 지오코딩** via VWorld 백엔드 키
   - 캐시 테이블 `JibunGeocodeCache(jibun_text PK, geom)` 또는 단순 dict 캐시 + 파일 백업 (재실행 시 hit)
3. SPEC 14.2 준수: 매물 단위(건물 정밀) 지오코딩 금지 — 지번 중심점만
4. 거래량 3건 미만 동/월은 점수 계산 시 점 생략 (이미 SPEC에 명시)

#### Step 4: compute_scores.py `--mode real` 본문 (반나절)
**위임:** `data-pipeline`
1. 정규화: 각 카테고리별 백분위(rank) 변환 → 0-100
2. `Dong.score_rent/amenity/transit` 컬럼 `bulk_update`

### Phase 1 — 실거래 핀 (raw, 클러스터 X) — 1일

#### Backend (반나절)
**위임:** `backend-engineer`
- `GET /api/transactions/bbox?bbox=lng1,lat1,lng2,lat2&deal_type=...&from=...&to=...`
  - 응답: `[{id, date, deal_type, area_m2, deposit, rent, lat, lng, jibun, dong_name}]`
  - 페이지네이션: 첫 200개 limit + has_more 플래그 (학부 데모 충분)
- DRF ViewSet, OpenAPI 자동 노출

#### Frontend (반나절)
**위임:** `frontend/engineer`
- `HeatMap.tsx`에 imperative Leaflet `L.circleMarker` layer 추가 (또는 react-leaflet `<CircleMarker>`)
- 디자인 시스템 사양:
  - 기본: 12px 원, fill `--color-near-black`, stroke 1px white@60%, hover/select 16px coral `--color-coral`
- 줌 레벨 13 미만에서는 hidden (성능 + 시각 잡음)
- 핀 클릭 → 우측 사이드 패널 (기존 `map-floating-panel` 패턴 재사용)
- 패널 내용: 같은 지번의 거래 list, 정렬은 최신순 default

### Phase 2 — 커널 점수 (2-3일)

#### Backend (1일)
**위임:** `backend-engineer`
- `POST /api/score/point` body `{lat, lng, weights:{rent,amenity,transit}, school?:string}`
- PostGIS 쿼리:
  ```sql
  -- 카테고리별 Gaussian 가중합 (σ=300m)
  WITH amenity_score AS (
    SELECT category, SUM(exp(-(ST_Distance(geom::geography, ST_MakePoint(:lng,:lat)::geography)^2) / (2 * 300^2))) as score
    FROM amenity
    WHERE ST_DWithin(geom::geography, ST_MakePoint(:lng,:lat)::geography, 1000)
    GROUP BY category
  )
  ...
  ```
- 카테고리별 점수 → 백분위 정규화 (Dong 분포 대비) → composite
- 응답:
  ```json
  {
    "score": 72.4,
    "breakdown": {"rent": 68, "amenity": 81, "transit": 70},
    "nearest": [{"category":"subway","name":"충무로역","walk_min":4}, ...],
    "radius_counts": {"편의점":8, "카페":12, "병원":2, "공원":1},
    "commute_min": 22
  }
  ```

#### Frontend (1-2일)
**위임:** `frontend/engineer`
- `MainMap.tsx`에 map click handler (Leaflet `map.on('click', ...)`)
- 클릭 지점에 Coral 12px 마커 (단일 인스턴스, 다음 클릭 시 덮어쓰기)
- 우측 사이드 패널 (kernel mode):
  - `Score` primitive 재사용 (`tone="neutral"`, lg size → `--font-data-display-size` 48px)
  - 가장 가까운 시설 list — emoji + mono 라벨 (`🚇 충무로역  WALK 4MIN`)
  - 반경 300m 시설 카운트 — mono uppercase + 큰 숫자
  - 통학 시간 (사용자가 학교 입력했을 때만)
- 디자인 시스템 사양 엄수: provenance 라벨 mono, 색은 Near-Black + Coral marker 외 X

---

## 5. 절대 안 할 것 (CLAUDE.md 규칙 재확인)

- 마이크로서비스 분리, Kafka, Elasticsearch, Logstash 도입 금지
- localStorage / sessionStorage 사용 금지 (메모리 상태로 처리)
- 디자인 시스템 외 색·폰트 임의 추가
- dark mode 부활 (전면 삭제됨)
- 매물 단위 지오코딩 (건물 정밀) — SPEC 14.2 위반
- 명세서에 없는 기능 임의 추가
- 과도한 추상화 (학부 프로젝트 규모)

---

## 6. 검증 원칙

- Backend: `python manage.py runserver` + curl 테스트
- Frontend: `npm run dev` + 브라우저 확인 (모바일 뷰는 스코프 외, 데스크톱 1440 기준)
- 통합: 실제 사용 시나리오 1회 (메인 → 동네 클릭 → 상세 → 비교)
- 디자인 시스템 위반: `/design-review` 또는 design-system-keeper 호출

---

## 7. 참고 파일 (post-/clear 새 세션이 즉시 봐야 할 것)

- `docs/SPEC.md` — 전체 명세, 섹션 6.1 (메인 지도), 6.3 (동네 상세), 10 (모델), 11 (점수), 14.2 (지오코딩 규칙)
- `docs/DESIGN_SYSTEM.md` — 디자인 단일 진실
- `CLAUDE.md` — 프로젝트 가이드, sub-agent 위임 규칙
- `backend/.env.example` — 환경변수 슬롯
- `backend/scripts/README.md` — 데이터 파이프라인 가이드
- `backend/scripts/fetch_*.py` — placeholder 골격 (본문 채우기 대상)
- `backend/apps/neighborhoods/models.py` — 기존 Dong 모델 참조
- `frontend/src/styles/tokens.css` — 디자인 토큰
- `frontend/src/lib/colors.ts` — JS hex (Leaflet/Recharts용)
- `frontend/src/components/Map/HeatMap.tsx` — 지도 메인. Phase 1 핀 layer 추가 대상
- `frontend/src/components/Map/Sidebar.tsx` — 사이드바, provenance 푸터 이미 있음

---

## 8. 최근 커밋 (최신 → 과거)

```
02b36b6 refactor(env): collapse MOLIT/SBA → DATA_GO_KR_API_KEY
015b02f style(design): FINDING-003 — Leaflet zoom controls white pill
950246f chore: ignore .gstack/
fe8e5f8 style(design): FINDING-001 — sidebar provenance footer
710a501 feat(design): apply new system to map colors and route CSS
dc9a37c feat(design): pivot to Cohere-inspired analytics aesthetic
```

---

## 9. 첫 행동 (post-/clear 새 세션이 해야 할 것)

1. `docs/SPEC.md` 정독 (특히 섹션 10, 11, 14.2)
2. `docs/DESIGN_SYSTEM.md` 정독
3. `backend/scripts/README.md` 정독
4. 본 핸드오프 다시 한 번 빠르게 훑기
5. **Phase 0a Step 1 (Amenity + Park) 부터 착수**
   - `backend-engineer`에 Amenity 모델 생성 위임
   - `data-pipeline`에 fetch_amenities + 공원 통합 위임
   - 두 작업은 모델이 먼저 끝나야 fetch가 적재 가능 → 순차

---

## 10. 미완 / 알려진 이슈

- 모바일 뷰는 의도적으로 스코프 외 (사용자 명시: "모바일은 아직 고려 안 해도 돼")
- 카카오 소셜 로그인 키는 미발급 (시간 남으면)
- 임베딩(SPEC 10번)은 Phase 2 끝낸 후 시간 보고 결정. 현재는 임의 지점 커널 scoring이 임베딩보다 임팩트 큼.
- 클러스터링은 Phase 1 끝나고 시간 보고. 기본 스킵.
