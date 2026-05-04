# Task: Preference 학습 모달의 월세를 환산값으로 통일 — backend

선호 학습(SPEC 6.5, 11.4) 5번 비교 모달에서 사용자에게 보여주는 "평균 월세"
및 학습 알고리즘에 들어가는 rent metric 을 환산월세 기준으로 정합화.

## 문제

raw 월세만 보면 보증금이 큰 동(반전세 다수)이 부당하게 싸 보인다.
- 모달 PairCard: `card.rent_avg` 만 표시 — `120 - score_rent` 더미
- `/api/preference/submit`: 학습 시 rent 차이를 어떤 단위로 보는가?

## 결론

### 1) 학습 알고리즘은 이미 환산 기반 — 변경 불필요

`PreferenceSubmitView.post` 의 features tuple 은 `(score_rent, score_amenity,
score_transit)`. `compute_scores._converted_rent` 는 이전 작업
(`20260503-rent-conversion-backend.md`) 에서 `apps.realestate.utils.convert_to_monthly`
에 위임하도록 통일됨 → `score_rent` 가 이미 환산월세 백분위 기반.

따라서 본 작업에서 optimizer 알고리즘 자체는 손대지 않음. 단, views.py 의
features 추출 코드에 **학습 logic 의 rent metric 이 환산 기반임을 명시하는 주석**
을 추가하여 후속 작업자 혼동 방지.

### 2) PairCard 응답에 `rent_converted` 신규 필드

기존 `rent_avg` (만원, 더미) 는 BC 위해 보존, 신규 필드만 추가.
`compute_rent_converted_avgs` (Compare API 와 동일 fallback) 재사용.

필드명은 frontend 가 이미 사용 중인 `rent_converted` 로 정렬 (Compare API 의
`rent_converted_avg` 와 명명이 다른 이유: PairCard 는 단일 동 카드로 "평균"
의미가 자명하여 `_avg` 접미사 생략. frontend 타입 `PairCard.rent_converted`
와 일치).

## 변경 파일

- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/preference/views.py`

  - import: `from apps.neighborhoods.compare_dummy import compute_rent_converted_avgs`
  - `_build_card`: 신규 파라미터 `rent_converted: int | None = None`,
    응답 dict 에 `rent_converted` 키 추가
  - `PreferencePairsView.get`: 모든 pair 의 unique dong 목록을 한 번에 모아
    `compute_rent_converted_avgs` 1회 호출 → slug 별 환산값 dict → `_build_card` 에 전달
  - `PreferenceSubmitView.post`: features 추출 코드에 환산 기반 주석 추가 (코드 변경 없음)

다른 파일 변경 없음. 마이그레이션 없음 (응답 derived field 만 추가).

## 응답 샘플

### Before — `GET /api/preference/pairs?count=1`

```json
{
  "pairs": [
    {
      "left": {
        "slug": "1102052",
        "name": "소공동",
        "gu": "중구",
        "rent_avg": 120,
        "transit_min": 10,
        "amenity_label": "충분",
        "score": 61.84
      },
      "right": {
        "slug": "1121069",
        "name": "신림동",
        "gu": "관악구",
        "rent_avg": 20,
        "transit_min": 10,
        "amenity_label": "충분",
        "score": 86.0
      }
    }
  ]
}
```

### After

```json
{
  "pairs": [
    {
      "left": {
        "slug": "1102052",
        "name": "소공동",
        "gu": "중구",
        "rent_avg": 120,
        "rent_converted": 151,
        "transit_min": 10,
        "amenity_label": "충분",
        "score": 61.84
      },
      "right": {
        "slug": "1121069",
        "name": "신림동",
        "gu": "관악구",
        "rent_avg": 20,
        "rent_converted": 58,
        "transit_min": 10,
        "amenity_label": "충분",
        "score": 86.0
      }
    }
  ]
}
```

소공동 (중구, 보증금 큰 매물 다수) 151만원 vs 신림동 (관악구, 소형 원룸 다수)
58만원 — 사용자 직관과 일치.

## 학습 로직 변경 위치 + 알고리즘 설명

### 위치

`/Users/bagjihyeon/Desktop/School/capston/backend/apps/preference/views.py`
`PreferenceSubmitView.post` 내, `comparisons` features tuple 추출 직전
(현재 line ~327). 추가된 주석 인용:

```python
# rent feature 는 dong.score_rent 사용 — score_rent 는 compute_scores 가
# 환산월세(보증금×0.005 + 월세, apps.realestate.utils.convert_to_monthly)
# 분포의 백분위로 산출하므로 이미 환산 기반이다. 따라서 학습 로직은
# raw 월세가 아닌 환산월세 차이를 비교한다 (rent metric 환산 통일).
```

### 알고리즘 설명

1. 각 동의 `score_rent` 는 `compute_scores._converted_rent` 로 산출된 환산월세
   분포의 백분위 (높을수록 저렴). 즉 `score_rent_A - score_rent_B = 0` 이면
   환산월세 분포에서 같은 위치, `score_rent_A > score_rent_B` 이면 A 가 더 저렴.
2. `optimizer.estimate_weights` 는 Bradley-Terry / Logistic Regression 으로
   `P(won > lost | w) = sigmoid(w · (won_features - lost_features))` 를 최대화.
3. 따라서 사용자가 환산월세 더 저렴한 (=score_rent 높은) 동을 일관되게 고르면
   `w_rent` 가 상승. 보증금 큰 동을 raw 월세만 보고 잘못 비교할 일이 없다.

직접 측정: 5개 비교 모두 cheaper-converted 동을 고르는 케이스에서
`{w_rent: 34, w_amenity: 33, w_transit: 33}` 로 rent 가중치가 기본
(33/33/34) 대비 상승 — 정상 동작 확인.

## 검증

- `python manage.py check` → System check identified no issues (0 silenced) ✓
- `python manage.py makemigrations --dry-run` → No changes detected ✓
- `GET /api/preference/pairs?count=2` → HTTP 200, 응답에 `rent_converted`
  필드 모두 존재 (소공동 151, 신림동 58 등 직관 일치) ✓
- `POST /api/preference/submit` (5쌍, cheap-converted 일관 선택) →
  `{"w_rent": 34, "w_amenity": 33, "w_transit": 33}` (기본 33/33/34 대비 rent 상승) ✓
- 응답 시간 `count=1` 145ms — `compute_rent_converted_avgs` SQL 1회 + 같은 구
  RentDeal fetch 1회 (Compare API 와 동일 비용 프로파일)

## Frontend 작업자에게 전달

### 정확한 필드명/단위/타입

| 필드 | 위치 | 타입 | 단위 | null 가능 |
|---|---|---|---|---|
| **`rent_converted`** | `GET /api/preference/pairs` pairs[i].left/right | int \| null | 만원 | 예 (어떤 fallback 도 데이터 없으면 null) |
| `rent_avg` | 동일 | int | 만원 (더미: `120 - score_rent`) | 아니오 (호환성 유지) |

### 명명 차이 주의

- Compare API: `rent_converted_avg` (3개 동 비교 표 컨텍스트)
- Pairs API: `rent_converted` (단일 카드 컨텍스트, frontend 코드와 정렬)

### PreferenceModal 수정 상태

`PreferenceModal.tsx` 는 이미 `card.rent_converted` 로 표기 전환을 완료한 상태.
(diff 발견: "평균 월세" → "평균 환산 월세 [보증금 환산]" 레이블 변경, fallback
`{card.rent_converted ?? card.rent_avg}만원` 적용). 본 backend 작업과 정확히
정합. 추가 frontend 변경 불필요.

`frontend/src/types/api.ts` 의 `PairCard.rent_converted?: number | null` 선언도
이미 존재하며 타입 정확.

## 미완 / 알려진 이슈

### 1) `rent_avg` 의 명명 혼란 (Compare 와 동일 이슈)

`rent_avg` 는 raw 월세 평균이 아니라 `120 - score_rent` 더미. 본 작업은
신규 필드 추가만 하고 기존 의미는 보존. 후속: frontend 가 모두
`rent_converted` 로 전환되면 deprecated 마킹 또는 raw 평균으로 정정 권장.

### 2) `compute_rent_converted_avgs` 캐싱 미도입

5쌍 비교에서 unique dong 최대 10개 → 같은 구 RentDeal fetch 1회 + 서울 전체
SQL 집계 1회. 응답 시간 145ms 측정. 캐싱 도입 시 cache key:
`(sorted_unique_slugs)` 또는 seoul_median 만 캐싱 (5분 TTL). Compare API 와
동시에 적용하는 후속 작업으로 권장.

### 3) Compare 와의 명명 불일치

`rent_converted` (PairCard) vs `rent_converted_avg` (Compare). 단기적으로는
의도된 차이지만, 이후 일관성 위해 한쪽으로 통일하는 정리 작업이 가능.
선택 시 frontend 사용처 grep 후 일괄 변경 권장.

### 4) 모달의 `score` 필드는 가중치 기본(33/33/34) 기준 표시

`_build_card` 가 `dong.composite_score(0.33, 0.33, 0.34)` 로 계산. 사용자가
선호 학습 후 학습된 가중치로 다시 보고 싶다면 별도 API 호출 필요 — 본 작업
범위 외.
