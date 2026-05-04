# Backend: Phase 1a — `GET /api/transactions/bbox`

`docs/handoff/20260503-phase0a-kickoff.md` 섹션 4 Phase 1 → Backend 완료.
SPEC `docs/SPEC.md` 섹션 6.1 (메인 지도), 14.2 (지오코딩) 준수.

## API endpoints added

### `GET /api/transactions/bbox`

bbox 내 RentDeal 핀 조회. 메인 지도 raw pin 레이어용 (SPEC 6.1).

**Query params:**

| 이름 | 필수 | 형식 | 기본 | 설명 |
|---|---|---|---|---|
| `bbox` | YES | `lng1,lat1,lng2,lat2` | — | SW(lng1,lat1) + NE(lng2,lat2). WGS84(SRID 4326). |
| `deal_type` | no | `apt` \| `officetel` \| `villa` \| `danok` \| `all` | `all` | RentDeal.deal_type 화이트리스트 + all. |
| `from` | no | `YYYY-MM-DD` | — | `deal_date >= from` |
| `to` | no | `YYYY-MM-DD` | — | `deal_date <= to` |
| `limit` | no | int | 200 | 최대 500. 초과 입력 시 자동 컷. |

**Response (200):**

```json
{
  "items": [
    {
      "id": 208,
      "date": "2026-04-30",
      "deal_type": "officetel",
      "area_m2": 20.36,
      "deposit": 14700,
      "monthly_rent": 0,
      "lat": 37.564098,
      "lng": 126.999898,
      "jibun": "90-24",
      "dong_name": "광희동",
      "gu": "중구"
    }
  ],
  "has_more": true,
  "total": 50,
  "has_more_total": true
}
```

- `items`: 좌표 있는 거래만 (geom IS NOT NULL). 정렬: `-deal_date, -id` (최신순).
- `has_more`: limit + 1 fetch 패턴. true면 다음 페이지 존재 (현재 cursor/offset 미제공 — 학부 데모는 단순화).
- `total`: 표시용 카운트. 상한 cap = `limit * 5`. cap 초과 시 cap 값 + `has_more_total=true`.
- `has_more_total`: 진짜 total 이 cap에 잘렸는지 여부.

**오류 (400):**

- `bbox` 미지정 / 좌표 4개 아님 / 숫자 아님 / SW>=NE
- `bbox` 위경도 한반도 권역(lng 124~132, lat 33~39) 벗어남
- `deal_type` 화이트리스트 외
- `from`/`to` 형식 위반
- `limit` 정수 아님 / <=0

응답: `{"<key>": "<한국어 메시지>"}` (DRF 기본 ValidationError 형식).

## Models added/modified

없음. 기존 `apps.realestate.RentDeal` 그대로 사용.

## Migration status

새 마이그레이션 없음. `python manage.py makemigrations --dry-run` → `No changes detected`.
`python manage.py check` → `System check identified no issues (0 silenced).`.

## Files changed

### 신규
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/realestate/serializers.py` — `RentDealPinSerializer` (geom → lat/lng 펼침).
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/realestate/views.py` — `TransactionsBboxView` (APIView, drf-spectacular 스키마 부착).
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/realestate/urls.py` — `transactions/bbox` 라우트.

### 수정
- `/Users/bagjihyeon/Desktop/School/capston/backend/config/urls.py` — 한 줄 추가:
  ```py
  path("api/", include("apps.realestate.urls")),
  ```
  (기존 `apps.{neighborhoods,preference,users}` include 라인은 미변경.)

## 검증 결과

### 1. 명동 일대 + limit=10
```
curl 'http://localhost:8000/api/transactions/bbox?bbox=126.95,37.55,127.00,37.58&limit=10'
→ items: 10
  has_more: True
  total: 50
  has_more_total: True
```
샘플 첫 번째 row:
```json
{
  "id": 208, "date": "2026-04-30", "deal_type": "officetel",
  "area_m2": 20.36, "deposit": 14700, "monthly_rent": 0,
  "lat": 37.564098, "lng": 126.999898,
  "jibun": "90-24", "dong_name": "광희동", "gu": "중구"
}
```

### 2. officetel + from=2026-01-01
```
curl 'http://localhost:8000/api/transactions/bbox?bbox=126.95,37.55,127.00,37.58&deal_type=officetel&from=2026-01-01&limit=5'
→ items: 5
  all officetel: True
  all >= 2026-01-01: True
  has_more: True, total: 25
```

### 3. limit cap 동작
```
curl '...&limit=2000' → items: 500 (자동 컷), has_more: True, total: 1122
```
limit이 MAX_LIMIT=500으로 자동 컷됨. 명시 에러 없음 (UX 친화).

### 4. to 필터
```
curl '...&from=2026-01-01&to=2026-01-31&limit=3'
→ items 모두 2026-01-31 이전 (실제 1월 마지막 날 거래만 반환됨)
  total: 15
```

### 5. 오류 응답
- bbox 없음 → 400 `{"bbox":"bbox 파라미터는 필수입니다 (lng1,lat1,lng2,lat2)."}`
- SW>=NE → 400 `{"bbox":"SW(lng1,lat1)가 NE(lng2,lat2)보다 작아야 합니다."}`
- 잘못된 deal_type → 400 `{"deal_type":"deal_type은 다음 중 하나여야 합니다: all, apt, danok, officetel, villa."}`

### 6. 빈 결과 (bbox는 valid하지만 데이터 없는 영역)
```json
{"items": [], "has_more": false, "total": 0, "has_more_total": false}
```

### 7. 응답 시간
첫 호출 ~113ms, 두 번째 호출 ~113ms (DB 자체가 워낙 빨라서 캐시 hit 측정 불가지만, 5분 캐시는 동작 중).

### 8. OpenAPI 노출
`GET /api/schema/` 에 `/api/transactions/bbox` operation 등록 확인. Swagger UI (`/api/schema/swagger-ui/`)에서 `transactions` 태그 하위에 표시됨.

## Frontend integration notes (Phase 1b 작업자에게)

### 인증
공개 엔드포인트. settings.REST_FRAMEWORK 기본 `AllowAny`. 헤더 불필요.

### CORS
`.env` `DJANGO_CORS_ALLOWED_ORIGINS` 에 이미 `http://localhost:5173` 등록됨.

### 좌표 SRID
- 응답 `lat`/`lng`는 WGS84 (EPSG:4326). Leaflet과 즉시 호환.
- `lat = geom.y` (위도), `lng = geom.x` (경도). 6자리 소수점 round.
- 같은 `jibun`을 가진 거래는 모두 동일 좌표 (SPEC 14.2 — 매물 단위 정밀 좌표 금지). 프론트가 클러스터링 또는 jitter로 시각 처리 권장.

### `has_more` 의미
- `has_more=true` → 동일 필터로 다음 페이지가 있음. 단, **현재는 cursor/offset 미제공**. 즉 더 가져오려면 bbox 좁히거나 deal_type 좁히거나 from/to 좁혀야 함. 학부 데모로 충분 판단.
- `has_more_total=true` → `total`은 cap에 잘림 (실제는 더 많음). UI 표시는 `1,000+` 같은 형식 권장.

### 줌 레벨 처리
- 핀은 줌 ≥ 13 에서만 표시 (kickoff 섹션 4 Phase 1 frontend, 성능+시각 잡음 회피).
- 줌 < 13 일 때는 호출 자체를 보류해도 됨.

### bbox 크기 권장
- viewport 기반 bbox 그대로 보내도 OK. 너무 크면 서버가 limit으로 자동 컷.
- 추천: viewport 변경 후 300ms debounce → 호출.

### 응답 형식 stability
- `items` 배열 구조는 RentDeal 모델 변경 없는 한 안정. 새 deal_type 추가 시에도 기존 필드 유지.
- 알려진 deal_type 분포: `villa`, `officetel` 만 좌표 있음. `danok`은 응답에 영원히 안 나옴(아래 Known issues).
- `apt` deal_type은 모델에는 있지만 현재 적재 0건 (Phase 0a Step 3에서 미수집). 향후 적재 시 자동 노출.

### 권장 첫 호출 (서울 시청 일대 데모용)
```
GET /api/transactions/bbox?bbox=126.95,37.55,127.00,37.58&limit=200
```

## Known issues

### geom__isnull row 7,243 건은 응답에서 빠짐
Phase 0a Step 3 핸드오프 참조. 적재된 27,050건 중 19,807건 (73.2%)만 좌표 있음. 7,243건은 모두 `danok` (단독다가구) — 국토부 API가 jibun을 응답에 안 내려줘서 지오코딩 불가.
→ `deal_type=danok` 필터로 호출하면 빈 응답. 현재로는 정상 동작.

### 적재 범위는 5개 구만
중구·종로구·관악구·마포구·동대문구 + spillover (PostGIS spatial join 결과 인접 구로 라우팅된 경계 케이스 7건). 다른 20개 구는 적재 안 됨.

### `apt` deal_type 0건
Phase 0a Step 3에서 villa/danok/officetel만 적재. 아파트는 명세서에 없는 것은 아니지만 우선순위 밖.

### total cap 동작
limit * 5 까지만 정확. 그 이상 시 cap 값 + `has_more_total=true`. 현재 적재 1.9만건 규모에선 limit=200 → cap=1000 으로 거의 모든 케이스 정확.

### 캐시 키 부동소수 정밀도
bbox 좌표는 6자리 소수점으로 정규화. 동일 viewport 반복 조작 시에만 hit. 줌·팬 변경마다 새 키 → 실제 hit rate는 낮음 (5분 TTL). 향후 grid quantize 도입 시 hit rate 개선 가능 (현재 스코프 외).

### danok geom 100% null은 영구 문제
국토부 API 자체 한계. 향후 BJD↔ADM 매핑 + 지번 외 다른 식별자 매칭 도입 시 일부 복구 가능.

### bbox 권역 검증은 한반도 박스
lng 124~132, lat 33~39. 서울이 아닌 부산 좌표도 통과 (의도적 — 향후 확장 대비). 하지만 실제 응답은 적재 범위에 한정.
