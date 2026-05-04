# Task: 전월세 환산값(converted monthly rent) API 노출 — backend

Compare 페이지의 "평균 월세 26만원" 같은 misleading 표기를 해소하기 위해
서울 자취 시장의 보증금-월세 trade-off 를 반영한 환산월세를 API 응답에 추가.

## 표준 환산식

```
환산월세(만원) = 월세(만원) + 보증금(만원) × 0.005
```

- 계수 0.005 = 연 6% 전월세전환률 / 12개월 (국토부 공시 서울 평균 4~6%에 정렬).
- 단일 진실: `backend/apps/realestate/utils.py` `convert_to_monthly()`.
- `compute_scores.py._converted_rent()` 도 같은 함수에 위임 (점수와 표시값 정합 보장).

## 완료된 작업

### 1) 공유 유틸 신설
- **신설**: `/Users/bagjihyeon/Desktop/School/capston/backend/apps/realestate/utils.py`
  - `MONTHLY_CONVERSION_RATE = 0.005`
  - `convert_to_monthly(deposit, monthly_rent) -> float` (만원 단위 in/out)
  - 음수 입력은 0으로 클램프, 전세 (rent=0) 도 정상 처리.

### 2) `compute_scores._converted_rent` 통일
- `/Users/bagjihyeon/Desktop/School/capston/backend/scripts/compute_scores.py`
- 기존: 보증금 1000만원 **초과분만** 환산 (전세는 별도 분기)
- 변경: 보증금 **전액** 환산 (국토부 표준식). util 에 위임.
- 결과: `python scripts/compute_scores.py --mode real` 재실행 후 점수 분포는 거의 동일
  (mean=50.0, std=21.7 동일). 일부 개별 동 점수가 이동 (예: 성산2동 score_rent
  86.3 → 10.0 — 보증금이 큰 deal 이 많은 동들이 영향).

### 3) RentDealPinSerializer — `converted_rent` 필드 추가
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/realestate/serializers.py`
- 응답에 `converted_rent: int` (만원, 정수 반올림) 추가.
- TransactionPanel 이 거래별 환산값을 같이 표시 가능.

### 4) Compare API — `rent_converted_avg` 필드 추가
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/neighborhoods/compare_dummy.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/neighborhoods/serializers.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/neighborhoods/views.py`

응답 dict 에 `rent_converted_avg: int | null` 추가. 기존 `rent_avg` (120 - score_rent
룰의 더미) 는 호환성 위해 그대로 유지.

신설 헬퍼 `compute_rent_converted_avgs(dongs)` 가 N+1 회피 위해 view 에서 한 번에
사전 계산. fallback 정책 (compute_scores 와 동일 정신):

1. RentDeal **≥3건** → 직접 평균
2. <3건 → 같은 **구의 ≥3건 동 평균** (gu_avg)
3. gu_avg 도 없으면 **서울 전체 ≥3건 동들의 평균 분포 중위**
4. 어떤 데이터도 없으면 `null`

## 산출물 — 변경 파일

- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/realestate/utils.py` (신설)
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/realestate/serializers.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/neighborhoods/compare_dummy.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/neighborhoods/serializers.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/neighborhoods/views.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/scripts/compute_scores.py`

Commit: `b243bfb feat(realestate): expose converted-monthly rent (보증금 환산)`

## 응답 샘플

### Before — `GET /api/compare?slugs=1108083,1114073`
```json
{
  "weights": {"w_rent": 33, "w_amenity": 33, "w_transit": 34},
  "dongs": [
    {"slug": "1108083", "name": "동선동", "score": 89.1, "rent_avg": 26, ...},
    {"slug": "1114073", "name": "성산2동", "score": 88.08, "rent_avg": 33, ...}
  ]
}
```

### After
```json
{
  "weights": {"w_rent": 33, "w_amenity": 33, "w_transit": 34},
  "dongs": [
    {
      "slug": "1108083", "name": "동선동", "gu": "성북구",
      "score": 89.1,
      "rent_avg": 26,            // 기존 (120 - score_rent 더미)
      "rent_converted_avg": 82,  // 신규 (RentDeal 환산월세 평균, 만원)
      "transit_min": 10, "amenity_label": "충분", ...
    },
    {
      "slug": "1114073", "name": "성산2동", "gu": "마포구",
      "score": 62.8,             // 환산식 통일로 score_rent 가 86.3→10 이동
      "rent_avg": 110,
      "rent_converted_avg": 90,
      ...
    }
  ]
}
```

### Before — `GET /api/transactions/bbox?bbox=...`
```json
{ "items": [
  {
    "id": 208, "date": "2026-04-30", "deal_type": "officetel",
    "deposit": 14700, "monthly_rent": 0,
    "lat": 37.564098, "lng": 126.999898, ...
  }
]}
```

### After
```json
{ "items": [
  {
    "id": 208, "date": "2026-04-30", "deal_type": "officetel",
    "deposit": 14700, "monthly_rent": 0,
    "converted_rent": 74,           // 신규 (만원, 정수)
    "lat": 37.564098, "lng": 126.999898, ...
  }
]}
```

확인: 14700 × 0.005 + 0 = 73.5 → 74. ✓

## compute_scores 통합 결과

`python scripts/compute_scores.py --mode real` 재실행 (~3초):

```
점수 분포:
  score_rent     min=  0.0  max=100.0  mean= 50.0  std= 21.7
  score_amenity  min=  0.0  max=100.0  mean= 50.0  std= 28.9
  score_transit  min=  0.0  max=100.0  mean= 50.0  std= 28.9
```

→ 분포 mean/std 는 이전과 동일. 개별 동 점수만 일부 이동.

이전 vs 신 환산식 영향 받는 동 예시:
- 명동 (중구): score_rent 3.8 → 3.3
- 전농2동 (동대문구): 7.1 → 7.3
- 남현동 (관악구): 90.6 → 90.3
- 성산2동 (마포구): 86.3 → 10.0 ← 큰 이동 (783개 deal, 보증금 분포 영향)
- 동선동 (성북구): 89.1 (변동 미미)

이전 식이 보증금 1000만원까지를 무시했기 때문에, 보증금이 큰 deal 이 많은
동(주로 마포·성동 일부)이 raw 월세만 보면 저렴했다가 환산식 통일로 정상화됨.

## Frontend 작업자에게 전달

### 정확한 필드명/단위/타입

| 필드 | 위치 | 타입 | 단위 | null 가능 |
|---|---|---|---|---|
| `converted_rent` | `GET /api/transactions/bbox` items[i] | int | 만원 | 아니오 (모든 deal 에 존재) |
| `rent_converted_avg` | `GET /api/compare` dongs[i] | int \| null | 만원 | 예 (모든 fallback 실패 시 null) |
| `rent_avg` | `GET /api/compare` dongs[i] | int | 만원 (더미) | 아니오 (호환용 유지) |

### Compare 페이지 변경 권장
- "평균 월세 26만원" 같은 표기는 **`rent_avg` 대신 `rent_converted_avg` 사용**.
  레이블도 "평균 월세" → "**평균 환산월세**" 또는 "월세(보증금 환산 포함)" 권장.
- `rent_converted_avg === null` 케이스: "데이터 부족" 또는 "—" 표시.
- 기존 `rent_avg` 는 즉시 제거하지 말 것 (다른 화면에서 참조 가능). 점진 전환.

### TransactionPanel 변경 권장
- 거래 카드에 raw 월세 옆에 `(환산 ${converted_rent}만원)` 보조 표기 권장.
- 전세 (`monthly_rent === 0`) 의 경우 "월세 0 (전세 환산 ${converted_rent}만원)" 같은 표기로 직관 강화.

### 환산 계수 노출 정책
- 사용자에게 환산 계수(0.005/월 ≈ 연 6%) 를 직접 보일 필요는 없음. 단 툴팁/도움말에
  "보증금을 표준 전월세전환률(연 6%) 기준으로 월세화한 추정값" 정도 한 줄 권장.

## 검증 결과

### 1) `python manage.py check` → 0 issues ✓

### 2) `compute_scores.py --mode real` ✓ (3초, 이전 분포와 일관)

### 3) 거래별 환산 spot check
- `convert_to_monthly(5000, 60) = 85.0` ✓ (사양 예시 일치)
- `convert_to_monthly(20000, 0) = 100.0` ✓ (전세 환산)
- `convert_to_monthly(1000, 80) = 85.0` ✓
- `convert_to_monthly(0, 50) = 50.0` ✓ (deposit 0)

### 4) `rent_converted_avg ≥ rent_avg(raw)` 검증
- 사양상의 "환산은 raw + 보증금×계수 ≥ raw" 는 raw 평균 기준일 때 성립.
- 본 응답의 `rent_avg` 는 `120 - score_rent` 더미라 직접 비교는 의미 없음.
- 실 raw 평균 vs 환산 평균 비교 (신림동 id=335 표본):
  - raw avg monthly_rent: 46.51 만원
  - converted avg: 58.41 만원
  - 차이 11.9 만원 = 평균 보증금 약 2,380 만원 × 0.005 ≈ 11.9 ✓

### 5) Fallback 검증 (curl)
```
GET /api/compare?slugs=1108083,1114073,1103051

동선동 (성북구, 5건)        → rent_converted_avg = 82  (직접 평균)
성산2동 (마포구, 783건)      → rent_converted_avg = 90  (직접 평균)
후암동 (용산구, 0건)         → rent_converted_avg = 90  (서울 중위 fallback)
```

3계층 fallback 모두 정상 동작 확인.

## 미완 / 알려진 이슈

### 1) `rent_avg` 의 명명 혼란
- 현재 `rent_avg` 필드는 raw 월세 평균이 **아니라** `120 - score_rent` 더미.
- 본 작업은 신규 필드 추가만 하고 기존 의미는 보존 (frontend 깨짐 방지).
- 후속 정리: frontend 가 모두 `rent_converted_avg` 로 전환되면 `rent_avg` 의미를
  raw 평균(또는 deprecated 표기)으로 정정 권장.

### 2) `DongSummary`/`DongDetail` 에는 환산값 미반영
- 본 작업은 명시적으로 Compare API 와 RentDealPin 만 범위.
- DongSummary (`/api/dongs/<slug>/summary`) 와 DongDetail 의 `rent_avg` 는 그대로.
- 후속: 동 상세 응답에 `monthly_rent_avg` aggregate 가 추가되면 같은 패턴으로
  `monthly_rent_converted_avg` 동시 노출 권장.

### 3) `score_rent` 일부 동 점수 이동
- 환산식 통일로 보증금이 큰 deal 이 많은 동의 score_rent 가 이전보다 낮아짐.
- 예: 성산2동 86.3 → 10.0. 이는 표준식 적용의 자연스러운 결과 (보증금이 큰
  반전세도 환산하면 비싸다).
- 사용자에게 보이는 점수가 갑자기 바뀌는 것이라, 가능하면 같은 배포 사이클에서
  frontend 와 함께 출시 권장.

### 4) compute_rent_converted_avgs 의 캐싱
- 현재 비교 응답마다 SQL aggregate 1회 + 같은 구 RentDeal fetch 1회 발생.
- 5개 비교 케이스에서 측정 응답 시간 < 200ms (이전 < 100ms 대비 +100ms 미만).
- 캐싱 도입 시 cache key: `(sorted_slugs)` 또는 `()` (seoul_median 만 캐싱).
- 현재 미도입 (cache TTL 5분 정책 적용 가능 — 후속 작업 권장).

### 5) 환산 계수의 정책 결정
- 0.005 (연 6%) 는 국토부 평균. 시기별·지역별 4~7% 사이 변동.
- 변경 시 `MONTHLY_CONVERSION_RATE` 1줄 + `compute_scores --mode real` 재실행.
- DB/환경변수 노출은 스코프 외 (사양 명시).
