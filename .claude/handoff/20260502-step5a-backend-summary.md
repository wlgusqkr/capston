# Backend: 5단계 — 동네 패널용 API (`/api/dongs/:slug/summary`) + `/scores` 응답 확장

작성: 2026-05-02 (backend-engineer)
근거: SPEC 6.2 (동네 패널), SPEC 9 (API), SPEC 11.3 (한 줄 요약 룰베이스), SPEC 14.3 (클라 재계산), step4 QA 노트 N2/N4.

---

## 완료된 작업

### A. 신규 엔드포인트 `GET /api/dongs/<slug>/summary`

쿼리 파라미터 (모두 옵션, default 33/33/34):
- `w_rent` (정수 0~100)
- `w_amenity` (정수 0~100)
- `w_transit` (정수 0~100)
- 합계는 100±1 허용

응답 (snake_case, JSON):
```json
{
  "slug": "pildong",
  "name": "필동",
  "gu": "중구",
  "score": 60.3,
  "summary": "교통 좋고 생활시설 부족, 자취 입문자에게 추천",
  "rent_avg": 85,
  "nearest_station": { "name": "충무로", "line": "4호선", "walking_min": 8 },
  "amenity_level": "normal",
  "single_household_pct": 42.0,
  "safety_level": "high"
}
```

오류:
- 가중치 잘못 → 400 + `{"<field>": "<korean message>"}` (DRF ValidationError 형식)
- 합 ≠ 100±1 → 400 + `{"weights": "..."}`
- 존재하지 않는 slug → 404 + `{"detail": "동을 찾을 수 없습니다."}`

### B. `/api/dongs/scores` 응답 확장 (SPEC 14.3 충족)

기존 필드는 그대로, 다음 3개 필드 **추가**만:
- `score_rent: number` (0~100, raw)
- `score_amenity: number` (0~100, raw)
- `score_transit: number` (0~100, raw)

→ 클라이언트가 가중치 슬라이더 변경 시 백엔드 재호출 없이 dot product로 재계산 가능.
→ step4 QA의 N2 처리 완료.

### C. 한 줄 요약 generator (SPEC 11.3)

- 새 파일: `apps/neighborhoods/summary.py`
- `generate_summary(score_rent, score_amenity, score_transit) -> str`
- 8단계 우선순위 룰, 14개 템플릿, 마지막 기본값. LLM 호출 없음 (비용·지연 회피).
- 점수 경계는 `>=` 사용 (정확히 70/80/30 등 경계값에서도 잡히도록).

룰 우선순위:
1. 셋 다 좋음 (≥70) → "자취 입문자에게 추천 — 모든 면에서 균형이 좋아요"
2. 매우 나쁨 (rent<30, amenity<50) → "비싸고 시설도 부족 — 자취 추천 어려워요"
3. 강한 조합 (역세권+저렴, 가성비)
4. 한쪽 강조 + 한쪽 약점 (대비 큰 케이스)
5. 두 지표 동시 우수 (중간 강도)
6. 한쪽 강조 (단일)
7. 균형 (모두 40~70)
8. 기본값

---

## 산출물 (수정 / 신규 — 모두 절대 경로)

신규:
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/neighborhoods/summary.py`

수정:
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/neighborhoods/serializers.py`
  - `DongScoreSerializer.fields`에 `score_rent/score_amenity/score_transit` 추가
  - `DongSummarySerializer` 신규
  - 더미 매핑 상수 (`NEAREST_STATION_FALLBACK`, `SINGLE_HOUSEHOLD_PCT_FALLBACK`)
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/neighborhoods/views.py`
  - `_parse_and_validate_weights(request)` 헬퍼 함수 (양 뷰가 공유)
  - `DongSummaryView` 신규 (404 + 400 처리)
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/neighborhoods/urls.py`
  - `path("dongs/<slug:slug>/summary", DongSummaryView.as_view(), name="dong-summary")` 추가

DB 모델 변경: **없음** (`makemigrations --dry-run` → "No changes detected").

---

## 검증 결과

### `generate_summary` 5개 더미 동 출력

| slug | rent | amenity | transit | 한 줄 요약 |
|---|---|---|---|---|
| pildong | 35 | 55 | 90 | 교통 좋고 생활시설 부족, 자취 입문자에게 추천 |
| hoegidong | 80 | 75 | 60 | 월세 저렴하고 시설도 무난, 가성비 좋아요 |
| seogyodong | 30 | 92 | 78 | 시설·교통 모두 좋아 생활하기 편해요 |
| yeoksamdong | 15 | 80 | 85 | 월세는 비싸지만 교통 최고 |
| jamsildong | 60 | 78 | 75 | 시설·교통 모두 좋아 생활하기 편해요 |

5개 모두 자연스러운 한국어, default fallback 미발생.

### curl 응답 예시 (pildong, default weights)

```json
{
  "slug": "pildong",
  "name": "필동",
  "gu": "중구",
  "score": 60.3,
  "summary": "교통 좋고 생활시설 부족, 자취 입문자에게 추천",
  "rent_avg": 85,
  "nearest_station": { "name": "충무로", "line": "4호선", "walking_min": 8 },
  "amenity_level": "normal",
  "single_household_pct": 42.0,
  "safety_level": "high"
}
```

### 가중치 오버라이드 (`?w_rent=10&w_amenity=10&w_transit=80`)

`pildong` score: 60.3 → **81.0** (transit=90이라 가중치 80% 줄 때 점프). summary는 동일(룰은 raw 점수 기반).

### 404 케이스

```
HTTP/1.1 404 Not Found
{"detail":"동을 찾을 수 없습니다."}
```

### `/api/dongs/scores` 확장 응답 (한 항목)

```json
{
  "slug": "hoegidong",
  "name": "회기동",
  "gu": "동대문구",
  "score": 71.55,
  "lat": 37.5917,
  "lng": 127.0533,
  "score_rent": 80.0,
  "score_amenity": 75.0,
  "score_transit": 60.0
}
```

기존 필드 모두 유지 → 4단계 프론트 호환성 유지.

---

## 5단계 frontend-engineer가 알아야 할 것

### TS 인터페이스 (그대로 사용 가능)

```ts
interface DongSummary {
  slug: string;
  name: string;
  gu: string;
  score: number;                      // weighted, 0~100, 소수점 둘째 자리
  summary: string;                    // 한 줄 요약 (한국어)
  rent_avg: number;                   // 만원 (정수)
  nearest_station: {
    name: string;
    line: string;
    walking_min: number;              // 정수
  };
  amenity_level: 'sufficient' | 'normal' | 'lacking';
  single_household_pct: number;       // 0~100 (소수 가능)
  safety_level: 'high' | 'mid' | 'low';
}
```

`/api/dongs/scores` 응답 항목에 `score_rent / score_amenity / score_transit: number` 추가됨. `frontend/src/types/api.ts`의 `DongScore`에 옵션 또는 필수로 같이 추가하시고, 이후 슬라이더 변경 시 `useDongScores` 재호출 대신 클라 재계산(`recomputeScore`) 사용 가능.

### 호출 예시

```ts
import { api } from '@/lib/api';

// 동네 패널 오픈 시
const { data } = await api.get<DongSummary>(`/dongs/${slug}/summary`, {
  params: { w_rent, w_amenity, w_transit },
});
```

### 더미 데이터의 한계 (실 데이터 연동 시기)

| 필드 | 현재 | 실 데이터 적재 시기 |
|---|---|---|
| `score` | Dong.score_* 가중합 (실제 룰) | 더미 점수, 10단계에서 실 점수로 |
| `summary` | 룰베이스 (실제 룰) | 변경 없음 |
| `rent_avg` | `120 - score_rent` 임시 매핑 | 10단계 (RentDeal 평균) |
| `nearest_station` | slug별 하드코딩 (5개만) | 10단계 (SubwayStation + ST_Distance) |
| `amenity_level` | `score_amenity` 구간 (70/40 임계값) | 10단계 (서울 전체 백분위 기반 재산정) |
| `single_household_pct` | slug별 하드코딩 (30~60) | 10단계 (통계청 데이터) |
| `safety_level` | `score_transit` 임시 매핑 (70/40) | 5/24 이후 (범죄·CCTV·가로등 데이터) |

→ frontend 표시는 미리 만들어 두고, 데이터 교체 시 응답 형식만 그대로면 화면은 무수정.
→ 5개 더미 외 slug로 호출하면 `nearest_station = {"name": "정보 없음", "line": "-", "walking_min": 0}`, `single_household_pct = 40.0`. (10단계에서 본 데이터 들어오면 사라지는 폴백.)

### 가중치 검증 일관성

`/api/dongs/scores`와 `/api/dongs/<slug>/summary` 모두 동일한 검증 로직(`_parse_and_validate_weights`)을 사용. 합 100±1 허용, 0~100 범위, 정수만. 4단계 `frontend/src/lib/weights.ts`의 `rebalanceWeights` 출력과 정확히 호환.

---

## 알려진 이슈 / 미완

1. **더미 5개 한정** — `/api/dongs/scores`도 동일 5개 더미만. 426개 적재는 10단계.
2. **`safety_level`** — 현재 `score_transit` 임시 매핑. SPEC에 별도 안전 점수 정의가 없어 5/24 이후 데이터 결정 필요.
3. **`amenity_level` 임계값** — 현 (70/40)은 임시. SPEC 6.3 "상위/중간/하위 33%"는 서울 전체 백분위 기반인데, 5개 더미로는 백분위가 무의미. 10단계에서 점수 정규화 시점에 컬럼 추가 또는 서버에서 percentile 계산하여 분류하는 방식 검토.
4. **Redis 캐싱 미설정** — base settings의 django-redis는 활성화되어 있으나 `DongSummaryView`에 `@cache_page` 데코레이터 미부착. 5개 더미라 부담 없음. 426개 + 실시간 가중치 변경 시 캐시 키에 weights 포함하여 5분 TTL 캐싱 추가 필요.
5. **공통 검증 헬퍼 위치** — `_parse_and_validate_weights`는 현재 `views.py` 내부. 향후 `/api/compare`, `/api/preference/...`도 가중치 받으면 `apps/neighborhoods/utils.py` 같은 곳으로 이동 검토.

---

## 막혔던 지점 / 결정사항

- **default fallback 발생 1건** — 첫 룰 (`>` 사용)로는 `hoegidong (80/75/60)`, `jamsildong (60/78/75)`이 모두 default로 떨어졌음. 룰 경계를 `>=`로 바꾸고 "두 지표 동시 우수" 룰 3개를 5번 단계로 추가하여 5개 동 모두 자연스러운 응답 보장. 향후 426개 동에 대해서도 default 발생률은 매우 낮을 것으로 기대.
- **`rent_avg` 계산식** — `120 - score_rent` 단순 매핑 채택. 점수 100 → 20만, 점수 0 → 120만. 10단계에서 RentDeal 평균으로 교체 시 `get_rent_avg`만 수정하면 됨.

---

## 다음 단계 (5단계 frontend)

- DongPanel 컴포넌트 (SPEC 6.2): 우측 슬라이드 인 380~420px
- `HeatMap.onDongClick` → DongPanel 오픈 + `/api/dongs/<slug>/summary` 호출
- `/api/dongs/scores` 응답에 raw 점수 추가됨에 따라 클라이언트 재계산 적용 검토 (선택, 5개라 백엔드 재호출도 비용 무시)
