# Task: 7단계-A — 백엔드 선호 학습 API

작성: 2026-05-02
SPEC 6.5 (선호 학습), 9 (API), 11.4 (Bradley-Terry / scipy) 기준.

## 완료된 작업

### 신규 앱 `apps.preference`

무상태(stateless) API. 모델/마이그레이션 없음. `UserPreference` 모델은 9단계 인증 도입 시 추가 예정.

### 산출물

- `backend/apps/preference/__init__.py` (빈 파일)
- `backend/apps/preference/apps.py` — `PreferenceConfig(name="apps.preference", label="preference")`
- `backend/apps/preference/optimizer.py` — Bradley-Terry / Logistic 가중치 추정기
  - `estimate_weights(comparisons) -> dict[str, float]` (합 = 1, 0~1)
  - `to_integer_percent(weights) -> dict[str, int]` (합 = 100, largest-remainder 보정)
  - 빈 입력 → 균등 33/33/34 fallback
  - `np.logaddexp(0, -z)`로 NLL 수치 안정 (overflow 방지)
  - SLSQP + 합=1 등식 제약 + [0,1] 박스
  - 모든 차이 0이거나 최적화 실패 시 균등 fallback
- `backend/apps/preference/urls.py` — `app_name="preference"`, 2개 라우트
- `backend/apps/preference/views.py` — `PreferencePairsView`, `PreferenceSubmitView`
  - `_select_pairs`: 축(rent/amenity/transit) 별 최대 차이 쌍 라운드 로빈 → 정보량 최대화
  - `_build_card`: rent_avg = `max(0, int(120 - score_rent))`, transit_min = `NEAREST_STATIONS_FALLBACK[1].walking_min` 또는 폴백 10, amenity_label = score≥70 "충분" / ≥40 "보통" / "부족"
  - `score`는 33/33/34 가중 합성, 소수 둘째자리 반올림

### 설정 변경

- `backend/config/settings/base.py` — `LOCAL_APPS`에 `"apps.preference"` 추가 (기존)
- `backend/config/urls.py` — `path("api/", include("apps.preference.urls"))` 추가 (기존)

### 변경 디테일

- `PreferenceSubmitView`에 length > 50 잠금장치 추가:
  ```
  비교는 최대 50개까지만 처리할 수 있습니다.
  ```

## API 엔드포인트

### `GET /api/preference/pairs?count=5`

비교용 동네 쌍 N개 (1 ≤ count ≤ 20, 기본 5).

응답:
```json
{
  "pairs": [
    {
      "left":  { "slug": "...", "name": "...", "gu": "...", "rent_avg": 105, "transit_min": 4, "amenity_label": "충분", "score": 60.25 },
      "right": { "slug": "...", "name": "...", "gu": "...", "rent_avg": 40,  "transit_min": 5, "amenity_label": "충분", "score": 71.55 }
    },
    ...
  ]
}
```

오류:
- `count`가 정수가 아님 → 400 `{"count":"정수여야 합니다."}`
- `count` 범위 외 → 400 `{"count":"1~20 범위여야 합니다."}`
- 동이 2개 미만 → 400 `{"detail":"비교할 동이 부족합니다 (최소 2개 필요)."}`

### `POST /api/preference/submit`

요청:
```json
{
  "comparisons": [
    { "won": "pildong", "lost": "hoegidong" },
    ...
  ]
}
```

응답:
```json
{ "w_rent": 0, "w_amenity": 0, "w_transit": 100 }
```
(모두 정수, 합 = 100)

오류 (모두 400, 한국어):
- body가 객체 아님 → `{"detail":"JSON 객체여야 합니다."}`
- `comparisons` 누락/비배열 → `{"comparisons":"리스트여야 합니다."}`
- `comparisons` 빈 배열 → `{"comparisons":"최소 1개 이상의 비교가 필요합니다."}`
- `comparisons` 길이 > 50 → `{"comparisons":"비교는 최대 50개까지만 처리할 수 있습니다."}`
- 항목이 객체 아님 → `{"comparisons":"i번 항목이 객체가 아닙니다."}`
- won/lost가 문자열 아님 → `{"comparisons":"i번 항목의 won/lost는 문자열 슬러그여야 합니다."}`
- won == lost → `{"comparisons":"i번 항목의 won과 lost가 같은 슬러그입니다 ('slug')."}`
- 미존재 슬러그 → `{"comparisons":"존재하지 않는 동 슬러그: slug1, slug2"}`

## TypeScript 인터페이스

프론트가 그대로 import 권장. snake_case 유지 (DongSummary 패턴 일관).

```ts
// GET /api/preference/pairs?count=N
export interface PreferencePairCard {
  slug: string;
  name: string;
  gu: string;
  rent_avg: number;        // 만원, 정수
  transit_min: number;     // 도보 분, 정수
  amenity_label: '충분' | '보통' | '부족';
  score: number;           // 33/33/34 가중치, 소수 둘째자리
}

export interface PreferencePair {
  left: PreferencePairCard;
  right: PreferencePairCard;
}

export interface PreferencePairsResponse {
  pairs: PreferencePair[];
}

// POST /api/preference/submit
export interface PreferenceSubmitRequest {
  comparisons: Array<{ won: string; lost: string }>;
}

export interface PreferenceSubmitResponse {
  w_rent: number;     // 0~100, 정수
  w_amenity: number;
  w_transit: number;  // w_rent + w_amenity + w_transit === 100
}

export interface PreferenceErrorResponse {
  detail?: string;
  comparisons?: string;
  count?: string;
}
```

## 검증 결과

- `python manage.py check` → System check identified no issues
- `GET /api/preference/pairs?count=5` → 200, pairs 길이 5
  - 첫 쌍: yeoksamdong (score_rent=15, score_transit=95) ↔ hoegidong (score_rent=80, score_transit=70)
  - 양극단부터 우선 선택되는 것 확인
- `GET /api/preference/pairs?count=3` → 200, pairs 길이 3
- `GET /api/preference/pairs?count=abc` → 400
- `GET /api/preference/pairs?count=0` → 400
- **시나리오: transit 우선 사용자**
  ```
  comparisons:
    pildong 이김 vs hoegidong (transit 8 vs 5)
    pildong 이김 vs seogyodong
    yeoksamdong 이김 vs jamsildong
    pildong 이김 vs jamsildong
    yeoksamdong 이김 vs hoegidong
  결과: { w_rent: 0, w_amenity: 0, w_transit: 100 } — 정확히 transit이 가장 큼
  ```
- 빈 array → 400 한국어
- 미존재 슬러그 → 400, 어느 슬러그인지 명시
- won == lost → 400, 인덱스 + 슬러그 명시
- length 51 → 400 잠금장치 동작

## 7단계 frontend-engineer가 알아야 할 것

- API base: `http://localhost:8000/api`, 라우트:
  - `GET /preference/pairs?count=5`
  - `POST /preference/submit` body `{ comparisons: [{won, lost}, ...] }`
- 첫 진입 가중치는 SPEC 6.1대로 33/33/34 유지. 카드의 `score` 필드도 33/33/34 가중.
- SPEC 6.5 모달 카드에 표시할 필드: `rent_avg`(만원), `transit_min`(분), `amenity_label`(충분/보통/부족) — 한국어 그대로 사용 가능.
- 5번 비교 완료 후 응답의 `w_rent / w_amenity / w_transit` 값은 0~100 정수 합 100 — 슬라이더 값으로 그대로 주입 가능 (메인 지도 사이드바 SPEC 6.1 슬라이더 단위와 동일).
- `_select_pairs` 휴리스틱은 동 5개 환경에서 항상 같은 5쌍을 반환 (라운드 로빈 + 결정적). 사용자에게 다른 쌍을 보여주려면 클라이언트가 `count`를 늘려서 받고 셔플하거나, 10단계 후 426동에서 자연 랜덤성 확보.
- 슬러그를 won/lost로 보낼 때, 같은 슬러그 두 번 (예: 같은 카드 두 번 선택) 보내지 않도록 클라이언트에서 가드. 서버는 400 응답.
- 에러 응답은 `{detail, comparisons, count}` 중 1개 키. 토스트로 그대로 보여줘도 무방 (한국어).

## 알려진 이슈 / 미완

- `UserPreference` 영속화 없음 — 9단계 인증 도입 후 동일 결과를 DB에 저장하는 별도 엔드포인트 또는 인증된 POST 변형 추가 예정.
- 5개 더미 환경에서는 가능한 쌍이 10개뿐. count > 10이면 라운드 로빈으로 중복 허용 (코드 주석 명시).
- `transit_min` 폴백 10은 `NEAREST_STATIONS_FALLBACK`에 없는 slug용 — 10단계 실 데이터 적재 후 `SubwayStation` ST_DistanceSphere 쿼리로 교체.
- `_select_pairs`는 무가중 차이 절대값만 고려 — 사용자 답변 누적 후 정보 이득 최대화 능동 학습은 SPEC 6.5에서 "간단 버전" 허용 명시.
- `to_integer_percent`의 largest-remainder 보정으로 누적 오차 흡수하지만, 최적화 결과가 정확히 한 축에 100% 쏠리는 케이스 (예: w=[0,0,1])에서는 0/0/100 그대로 나감 — 의도된 동작.
- 응답 캐싱 미적용 — `pairs`는 결정적이라 5분 캐시 가능하지만 5개 더미 단계라 생략. 10단계 426동에서 N choose 2 계산이 무거우면 캐시 도입.
