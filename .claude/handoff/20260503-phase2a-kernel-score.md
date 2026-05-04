# Phase 2a — `POST /api/score/point` 커널 점수 엔드포인트

`docs/handoff/20260503-phase0a-kickoff.md` 섹션 4 Phase 2 → Backend 완료.
SPEC `docs/SPEC.md` 섹션 11 (점수) 준수.

## 요약

지도 위 임의 클릭 지점(lat/lng)에 대해 가우시안 커널(σ=300m, 1km 컷) 기반 종합 점수를
계산해 반환. amenity 카테고리별 가중합 + 가까운 지하철 closeness + 1km 버스 정류장 수
+ 포인트가 속한 행정동의 사전계산 `score_rent` 를 조합. school 옵션 시 통학 시간(분)
까지 함께.

## 변경 / 추가 파일

### 신규
- `backend/apps/neighborhoods/score_point.py` — 핵심 계산 로직 (~330 LOC).
  - `compute_amenity_kernel(lat, lng)` — 카테고리별 Gaussian sum + 카운트 (한 쿼리).
  - `amenity_score_from_kernel(kernel)` — raw → 0~100 (log1p + scale).
  - `compute_transit(lat, lng)` — nearest subway + bus count + 60/40 가중합.
  - `compute_rent_score(lat, lng)` — Dong 매핑 후 `score_rent` 그대로 (서울 외 → 50).
  - `find_nearest_per_category(lat, lng)` — DISTINCT ON 한 쿼리로 6개 카테고리 nearest.
  - `compute_commute_min(lat, lng, school)` — haversine + 22 km/h.
  - `compute_point_score(...)` — 메인 엔트리포인트.

### 수정
- `backend/apps/neighborhoods/serializers.py`
  - `KernelScoreWeightsSerializer`, `KernelScoreRequestSerializer` 추가.
  - validator 가 weights 음수/모두 0 거부 + 합 1.0 정규화.
- `backend/apps/neighborhoods/views.py`
  - `KernelScoreView` (DRF APIView, POST 단일).
- `backend/apps/neighborhoods/urls.py`
  - `path("score/point", KernelScoreView.as_view(), ...)` 1줄 추가.

### 변경 없음
- `config/urls.py` — 기존 라인 그대로 (`apps.neighborhoods.urls` 가 이미 mount 되어 있어
  자동으로 `/api/score/point` 노출됨, 다른 작업과 충돌 zero).
- 모델/마이그레이션 zero (`makemigrations --dry-run` → "No changes detected").

## API 스펙

### Endpoint
`POST /api/score/point`

### Request body
```json
{
  "lat": 37.5663,
  "lng": 126.9783,
  "weights": {"rent": 0.3, "amenity": 0.4, "transit": 0.3},
  "school": "동국대"   // optional
}
```

### Response (200)
```json
{
  "score": 68.89,
  "breakdown": {"rent": 3.8, "amenity": 100.0, "transit": 92.5},
  "nearest": [
    {"category": "subway", "name": "시청", "line": "1호선", "walk_min": 2, "distance_m": 125},
    {"category": "convenience", "name": "세븐일레븐무교", "walk_min": 1, "distance_m": 113},
    {"category": "cafe", "name": "달큰커피", "walk_min": 1, "distance_m": 80},
    ...
  ],
  "radius_counts": {
    "convenience": 207, "cafe": 735, "hospital": 398,
    "park": 5, "mart": 245, "pharmacy": 107
  },
  "commute_min": null,        // school 미지정/매핑실패 시 null
  "_meta": {                  // 디버그용 (frontend 무시 가능)
    "dong_slug": "1102055",
    "dong_name": "중구 명동",
    "bus_count_1km": 129
  }
}
```

### 오류 (400)
- lat ∉ [33, 39] / lng ∉ [124, 131] (한반도 박스).
- weights.rent / amenity / transit 중 하나라도 음수.
- weights 모두 0 → "rent/amenity/transit 중 하나 이상은 양수여야 합니다."

### 정규화 정책
- weights 합이 1이 아니어도 OK. 서버에서 `w_i / sum(w)` 로 정규화 (비율만 의미).
- TEST 4 검증: `{rent:3, amenity:4, transit:3}` 와 `{rent:0.3, amenity:0.4, transit:0.3}` 의
  응답이 정확히 동일.

## 점수 계산 공식

### Amenity (compute_scores.py 와 동일 가중치)
```
raw_total = Σ w_c * log1p(Σ_i exp(-d_i^2 / (2σ^2)))
score_amenity = clamp(0, 100, raw_total / 3.0 * 100)
```
- σ = 300m (SPEC).
- 카테고리 가중치: convenience .20 / hospital .15 / mart, restaurant, cafe, studycafe, pharmacy 각 .10 / laundry, oliveyoung, park 각 .05.
- 100점 캘리브레이션: raw_total ≥ 3.0 → 100. 명동/신촌/회기/신림 등 dense 상권에서 100.0 도달.

### Transit
```
subway_signal = max(0, 1 - dist_to_nearest_subway / 1000m)
bus_signal    = min(1, log1p(bus_count_1km) / log1p(50))
score_transit = (0.6 * subway_signal + 0.4 * bus_signal) * 100
```
- compute_scores.py 와 동일 — 동 단위 점수와 같은 메트릭.

### Rent
- 점이 속한 Dong 의 사전계산 `score_rent` 그대로 (이미 5개 구는 실데이터, 나머지는 fallback 47.8 군집).
- Dong 매핑 실패 → 50.0 + warning 로그.

### Composite
```
score = score_rent * w_r + score_amenity * w_a + score_transit * w_t
```

## 학교 좌표 dict (SCHOOL_COORDS)

자취생 인구 큰 서울 주요 대학 + 캡스톤 호스트 동국대 (총 16 키, 일부 별칭 포함):

| 키 | 좌표 (lat, lng) | 비고 |
|---|---|---|
| 동국대 | 37.5586, 127.0001 | 중구 필동 (캡스톤 호스트) |
| 한양대 | 37.5570, 127.0454 | 성동구 행당동 |
| 고려대 | 37.5894, 127.0322 | 성북구 안암동 |
| 연세대 | 37.5658, 126.9386 | 서대문구 신촌동 |
| 서강대 | 37.5510, 126.9410 | 마포구 신수동 |
| 이화여대 | 37.5618, 126.9469 | 서대문구 대현동 |
| 홍익대 | 37.5512, 126.9252 | 마포구 상수동 |
| 서울대 | 37.4602, 126.9520 | 관악구 신림동 |
| 중앙대 | 37.5052, 126.9571 | 동작구 흑석동 |
| 건국대 | 37.5403, 127.0793 | 광진구 화양동 |
| 성균관대 | 37.5878, 126.9933 | 종로구 명륜동 (인사캠) |
| 경희대 | 37.5965, 127.0524 | 동대문구 회기동 |
| 외대 / 한국외대 | 37.5973, 127.0577 | 동대문구 이문동 (alias) |
| 시립대 / 서울시립대 | 37.5840, 127.0581 | 동대문구 전농동 (alias) |

좌표는 캠퍼스 정문/메인 출입구 부근. 학교명 미매칭 시 `commute_min: null` (오류 아님).

## 검증 결과

### 1) 명동 (37.5663, 126.9783) — weights 0.3/0.4/0.3
```
HTTP 200 — 244ms (cold)
score: 68.89
breakdown: {"rent": 3.8, "amenity": 100.0, "transit": 92.5}
nearest: [시청(1호선) 125m, 달큰커피 80m, 세븐일레븐무교 113m,
          덕수한의원 95m, 서울시청신매점 42m, 명약국 121m, 세종로공원 828m]
radius_counts: convenience 207, cafe 735, hospital 398,
               park 5, mart 245, pharmacy 107
commute_min: null
dong: 중구 명동
```
→ 명동 시세는 비싸므로 rent 3.8 정상. amenity dense → 100. transit (시청 125m) → 92.

### 2) 동국대 + 학교 통학 (37.5172, 126.9970, school=동국대)
```
HTTP 200 — 110ms
score: 36.80
breakdown: {"rent": 47.8, "amenity": 16.0, "transit": 42.93}
nearest: [서빙고(경원선) 792m, ...]
radius_counts: convenience 13, cafe 15, hospital 1, park 0, mart 16, pharmacy 1
commute_min: 18
dong: 용산구 서빙고동  ← 좌표가 실제로 서빙고 (필동 아님 — 사용자 제공 좌표)
```
→ 동국대(필동)까지 직선 거리 약 4.7km / 22km/h ≈ 18분.

### 3) 회기동 + 경희대 (37.5897, 127.0570, school=경희대)
```
HTTP 200 — 158ms
score: 94.27
breakdown: {"rent": 90.8, "amenity": 96.65, "transit": 96.53}
nearest: [회기(중앙선) 58m → 1분 도보, ...]
radius_counts: convenience 99, cafe 211, hospital 91, park 0, mart 81, pharmacy 49
commute_min: 7
dong: 동대문구 휘경1동
```
→ 경희대 캠퍼스 바로 옆이므로 7분 정상. 회기 자취 명소답게 rent/amenity/transit 모두 90+.

### 4) 가중치 합 != 1.0 정규화 검증
```
input weights {rent:3, amenity:4, transit:3}  → 응답 score 68.89
input weights {rent:0.3, amenity:0.4, transit:0.3}  → 응답 score 68.89
```
완벽히 동일. 서버에서 `w_i/sum(w)` 정규화 정상.

### 5) 오류 케이스
| 입력 | HTTP | 응답 |
|---|---|---|
| weights.rent = -1 | 400 | `{"weights": {"rent": ["이 값이 0.0보다 크거나 같은지 확인하세요."]}}` |
| weights 모두 0 | 400 | `{"weights": ["rent/amenity/transit 중 하나 이상은 양수여야 합니다."]}` |
| lat = 50.0 | 400 | `{"lat": ["이 값이 39.0보다 작거나 같은지 확인하세요."]}` |
| school = "존재하지않는대학" | 200 | `commute_min: null` (오류 아님) |

## 응답 시간 측정

curl `-w "%{time_total}\n"` 기준 (Django dev server, localhost):

| 위치 | 첫 호출 | 반복 |
|---|---|---|
| 명동 (dense, 1500+ amenity) | 244ms | 188-220ms |
| 서빙고 (sparse) | 110ms | ~100ms |
| 신촌 (dense) | 191ms | ~190ms |
| 신림 (dense) | 175ms | ~170ms |
| 광진 (mid) | 154ms | ~150ms |

**모든 호출 < 250ms.** SPEC 5초 / 작업 가이드 500ms 모두 만족.

내부 함수 측정 (Python timing, HTTP 외):
- `compute_amenity_kernel` (명동): 71ms (이전 765ms → 11x 개선).
- `find_nearest_per_category` (명동, 6 카테고리): 한 쿼리로 통합 후 ~30ms.
- `compute_transit`: 25ms.
- `compute_rent_score`: 10ms.

### 성능 최적화 요약
초기 구현은 명동 1.8초였음. 원인: `ST_DWithin(geom::geography, ...)` 가 amenity 의
geometry GiST 인덱스를 사용하지 못해 seq scan + 165k 행 geography cast.

해결: `geom && ST_Expand(point, 0.012°)` bbox 프리필터 (GiST 인덱스 활용) +
`ST_DistanceSphere(geom, point)` (geography cast 회피). 동일 결과, 8x 빠름.

`find_nearest_per_category` 도 6개 별도 쿼리 → `DISTINCT ON (category)` 한 쿼리로 통합.

## 캐시 정책

현재 캐시 미적용. 이유:
- Phase 2a 의 사용자 시나리오는 "지도 클릭" → 매번 다른 좌표. 동일 좌표 재호출이 드뭄.
- 응답 시간 < 250ms 라 캐시 오버헤드(serialize/deserialize) 가 오히려 비싸질 수 있음.
- 캐시 키 설계 복잡 (lat/lng 부동소수 → 그리드 양자화 필요).

향후 필요 시: lat/lng 를 0.001° 그리드 (≈100m) 양자화 + weights/school 함께 키로
django-redis cache (TTL 5min — settings.base CACHES 이미 구성됨).

## frontend (Phase 2b) 작업자에게 전달

### 호출 예시 (TypeScript)
```ts
// frontend/src/lib/api.ts 또는 비슷한 위치
async function fetchKernelScore(args: {
  lat: number;
  lng: number;
  weights: { rent: number; amenity: number; transit: number };
  school?: string;
}) {
  const res = await fetch('/api/score/point', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`score/point failed: ${res.status}`);
  return await res.json() as KernelScoreResponse;
}
```

### 응답 타입
```ts
type KernelScoreResponse = {
  score: number;            // 0~100, 소수점 2자리
  breakdown: {
    rent: number; amenity: number; transit: number;
  };
  nearest: Array<{
    category: string;       // 'subway' | 'convenience' | 'cafe' | 'hospital' | 'park' | 'mart' | 'pharmacy'
    name: string;
    line?: string;          // subway 만
    walk_min: number;
    distance_m: number;
  }>;
  radius_counts: {
    convenience: number; cafe: number; hospital: number;
    park: number; mart: number; pharmacy: number;
  };
  commute_min: number | null;
  _meta?: { dong_slug: string | null; dong_name: string | null; bus_count_1km: number };
};
```

### UI 통합 메모
- handoff kickoff 의 Phase 2 Frontend 사양 그대로:
  - `MainMap.tsx` Leaflet `map.on('click', ...)` 핸들러.
  - 클릭 위치에 Coral 12px 마커 (`L.circleMarker`, fillColor `--color-coral`).
  - 우측 사이드 패널 kernel mode — `Score` 프리미티브 (tone="neutral", lg).
  - 가장 가까운 시설 list — emoji + mono 라벨 (`🚇 시청  WALK 2MIN`).
  - radius_counts — mono uppercase + 큰 숫자 (`CONVENIENCE 207`, `CAFE 735`).
  - commute_min — 학교 입력했을 때만 표시.
- weights 슬라이더는 기존 사이드바와 같은 컴포넌트 재사용 (정수 0~100).
  - 호출 시 `/100.0` 후 weights dict 로 직렬화.
- school 입력은 자유 텍스트 (또는 SCHOOL_COORDS 키 자동완성).
  - 미매칭 시 `commute_min: null` → 프런트에서 "학교 정보 없음" 표시.

### 카테고리 → emoji 매핑 (제안)
```
subway      🚇
convenience 🏪
cafe        ☕
hospital    🏥
park        🌳
mart        🛒
pharmacy    💊
restaurant  🍚  (현재 nearest 에 안 나가지만 radius_counts 확장 시)
```

## 미완 / 알려진 이슈

1. **점수 정규화 — 백분위 미적용 (간단 옵션 채택)**
   - SPEC 11 권장은 raw → 동 분포 백분위. 현재는 raw → log1p 가중합 → 캡 3.0 정규화.
   - 실측 결과 dense 상권(명동/신촌/회기) 100, sparse 주거(서빙고) 16 — 직관 일치.
   - 정밀 백분위 매핑은 future work. radius_counts 가 이미 raw 시그널이라 사용자 직관 충분.

2. **rent_score 의 5개 구 외 fallback**
   - handoff step4 명시: 5개 구 외 322개 동이 47.8 plateau.
   - 서빙고/한강로/외곽 동 클릭 시 rent=47.8 동률. UI 에서 "데이터 보강 중" 라벨 권장 (선택).

3. **commute 정밀도 (haversine + 22km/h)**
   - 한강 도하/지하철 환승/실제 노선 무시. ±5분 마진 보정만 적용.
   - 학부 데모 OK. 정밀 통학 시간은 카카오 길찾기 API 등 (out of scope).

4. **캐시 미적용**
   - 응답 시간 < 250ms 라 단발 호출 OK.
   - 동일 좌표 반복(예: 인기 좌표 데모) 발생 시 grid quantize + redis 캐시 추가 권장.

5. **`_meta` 필드**
   - 디버그/검증용. Phase 2b frontend 는 무시 가능. 프로덕션 빌드에서 제거 검토 가능
     하나, 응답 크기 영향 미미 (~50 bytes).

6. **학교 dict 16개 — 누락 학교 시 fallback 없음**
   - 사용자가 "이대" 같은 별칭/약어를 입력하면 매칭 실패.
   - 1차 데모는 16개로 충분. 추후 alias 확장 또는 자동완성 입력 위젯 권장.

## 다음 작업 (Phase 2b)

- frontend MainMap kernel mode (Leaflet click → POST /api/score/point → 사이드 패널).
- 디자인 시스템 토큰 엄수 (Near-Black + Coral marker 외 색 X, mono 라벨).
- 핸드오프: `docs/handoff/20260503-phase2b-frontend-kernel.md`.

---

## 산출물 경로

- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/neighborhoods/score_point.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/neighborhoods/serializers.py` (수정)
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/neighborhoods/views.py` (수정)
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/neighborhoods/urls.py` (수정)
