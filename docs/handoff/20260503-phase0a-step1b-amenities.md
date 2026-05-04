# Phase 0a Step 1b — Amenity 적재 (소상공인 상가 + 도시공원)

`docs/handoff/20260503-phase0a-kickoff.md` 섹션 4 Step 1 의 두 번째 절반.
모델 단계는 `20260503-phase0a-step1a-models.md` 에서 끝났고 본 단계는 그 모델에 실 데이터를 채웠다.

## 변경/추가 파일

### 본문 채움
- `/Users/bagjihyeon/Desktop/School/capston/backend/scripts/fetch_amenities.py`
  - placeholder dry-run 골격 → 실 호출 + DB 적재 본문.
  - `--target {stores,parks,all}` 인자로 분기.

### 신규 도우미 함수
- `_get_with_retry`           — 429/5xx 시 exponential backoff 3회.
- `classify(item)`            — SBA item dict → CATEGORY_CHOICES value (또는 None=skip).
- `fetch_gu_stores(...)`       — 시군구 단위 페이지네이션 generator.
- `_dong_lookup(lng, lat, gu)` — 좌표 → `Dong` (gu hint 로 최대 25배 빠름).
- `_persist_stores`            — items → `Amenity.objects.update_or_create`.
- `fetch_parks(api_key)`       — 서울시 도시공원 전체 row 리스트 (페이지네이션).
- `_persist_parks`             — 공원 row → Amenity (`category='park'`, `source='seoul_park'`).

### 키 결정
- **API**: SBA `storeListInDong` 인데 `divId=signguCd, key=11140` 으로 자치구 단위 일괄 호출.
  → 행정동 단위 호출(`divId=adongCd`)은 우리 DB 의 SGIS 코드와 SBA 의 행안부 8자리 코드가
    다른 체계라 별도 매핑표가 필요. 자치구 호출은 응답에 lon/lat 이 박혀 있어
    `Dong.geom__contains` spatial join 한 번으로 끝.
- **자치구 매핑**: `GU_TO_SIGUNGU_CD` 25개 행으로 한국어 구이름 → 5자리 시군구코드 직접 매핑.

### CATEGORY 매핑 (`classify`)
| value         | 조건                                                    |
|---|---|
| convenience   | `indsSclsCd == 'G20405'`                                |
| mart          | `indsSclsCd in ('G20404','G20509')`                      |
| cafe          | `indsSclsCd == 'I21201'`                                 |
| restaurant    | `indsMclsCd in ('I201','I202','I203','I204','I210')` (한/중/일/양/분식) |
| hospital      | `indsMclsCd in ('Q101','Q102')` (병원 + 의원)            |
| pharmacy      | `indsSclsCd == 'G21501'`                                 |
| laundry       | `indsMclsCd == 'S203'`                                   |
| studycafe     | `bizesNm` 에 '스터디카페' 포함                           |
| oliveyoung    | `bizesNm` 에 '올리브영' 포함                             |
| (skip)        | 그 외 (의류·미용·법무·광고 등 자취 입문 가치 없음)      |

매물 비율: 24,117개 중 6,887개 (≈28.6%) 가 매핑 → 나머지 71% 는 SPEC 6.3 카테고리 외라
의도적으로 스킵 (의류 G209, 명함/광고 M114, 여행사 N105 등). 이건 노이즈가 아니라
자취 시그널 외 업종.

## 검증 결과 — 풀 25개 구 + 공원 적재 후

```
total: 165,280

=== by category ===
  restaurant      94,742
  cafe            21,205
  hospital        18,078
  mart             9,978
  convenience      9,394
  pharmacy         5,247
  laundry          4,938
  studycafe        1,185
  oliveyoung         386
  park               127

=== by source ===
  sba            165,153
  seoul_park         127

=== top 10 dong (전체 카테고리 합산) ===
  강남구    역삼1동           2,742
  마포구    서교동            2,566
  종로구    종로1·2·3·4가동    2,293
  영등포구   여의동            2,195
  강서구    가양1동           1,589
  금천구    가산동            1,584
  중구     명동              1,452
  서대문구   신촌동            1,239
  영등포구   영등포동           1,203
  서초구    서초3동           1,199
```

상권 핫스팟이 상위에 정상 정렬 (역삼/서교/종로/여의도/명동/신촌). Sanity OK.

## API 호출 횟수

- **DATA_GO_KR (SBA)**: 25 자치구 × 평균 ~26 페이지(한 페이지 1000개) = 약 **620 호출**.
  data.go.kr 일일 한도(기본 10,000) 대비 6% 사용. 멱등 재실행 시 동일.
- **SEOUL_OPEN (도시공원)**: 1 호출 (133개 < 1000 페이지). 매우 가벼움.

## 멱등성 검증

- 중구만 두 번째 실행 결과 `Amenity.objects.count()` 변화 없음 (동일 6,887).
- `external_id=bizesId` UNIQUE → `update_or_create` 가 안전하게 동작.
- 공원도 `external_id='park:<SN>'` 으로 동일하게 처리.

## 알려진 이슈 / Caveats

1. **카테고리 분류 한계**
   - 음식점 `restaurant` 안에 한식+중식+일식+양식+분식이 합쳐짐. SPEC 카테고리가
     세분돼 있지 않아 OK 지만, 점수 계산에서 한 카테고리가 너무 많은 가중을 차지하지
     않도록 `compute_scores` 단계에서 카테고리별 max-cap 또는 log scale 권장.
   - `studycafe`(1185)는 키워드 기반이라 누락이 있을 수 있음. SBA 분류표에 별도 코드가
     없는 한계. 점수 영향 미미.
   - `oliveyoung`(386)도 키워드 기반 ("CJ올리브영" 포함). 다만 분류상 G22199(그 외 기타
     상품 전문 소매업)이 대다수라 코드만으로는 식별 불가.

2. **공원**
   - 133개 중 5개가 서울 외(과천 서울대공원 등) → spatial join 으로 자동 제외.
   - 좌표 누락 1개도 자동 제외.
   - SearchParkInfoService 는 어린이공원 같은 소형 공원이 빠져 있음. 가치 시그널로는
     충분하지만 정밀 분석은 한계.

3. **rate limit**
   - 풀 적재 중 한 번도 429 발생 없음. SBA 일일 한도 여유 큼.
   - 서울 열린데이터 광장도 동일.

4. **좌표 중복**
   - 같은 빌딩에 여러 점포가 있으면 좌표가 동일. spatial join 은 첫 dong 매칭이라 OK.
   - 매물 단위 정밀 좌표는 시설 자체 위치라 SPEC 14.2 위반 아님 (지오코딩 호출이 아닌
     원본 응답 좌표 그대로 사용).

5. **'기타' 적재 안 함**
   - 모델에 `etc` choice 가 있지만 본 스크립트는 절대 etc 로 적재하지 않음.
   - 추후 카테고리 확장 시 `classify()` 수정만 하면 즉시 멱등 재적재 가능.

## 다음 작업자 (compute_scores) 가 알아야 할 점

1. **데이터 모양**: `Amenity.objects.filter(dong__gu='중구', category='cafe').count()` 식으로
   동·카테고리 단위 카운트가 즉시 SQL 한 줄로 가능. spatial join 이미 끝남.

2. **점수 계산 시 권장**:
   - 카테고리별 카운트 → log(1+count) → 동별 백분위 → 0~100 정규화.
   - 단순 합산은 음식점이 dominate 하므로 카테고리별 가중 (예: 편의점 0.2, 마트 0.1,
     음식점 0.1, 카페 0.1, 병원 0.15, 약국 0.1, 세탁소 0.05, 스터디카페 0.1, 올리브영 0.05,
     공원 0.05) 같은 식으로 정의 후 SPEC 11.2 의 amenity score 산출.

3. **공원은 카운트 매우 작음 (127개 / 425 dong)**:
   - 공원 가중을 너무 크게 주면 노이즈. 동의 공원 유무(이진) 또는 로그 카운트가 안전.

4. **kernel-mode (Phase 2) 호환**:
   - 모든 row 가 PointField + GiST index 가 박혀 있어 `ST_DWithin(geom::geography, point, 1000)`
     반경 쿼리 즉시 동작. Phase 2 의 `/api/score/point` 작성 시 그대로 사용.

## 미완 / 후속 단계

- Step 2: `fetch_transit.py` (지하철 + 버스, NearestSubway 사전계산) — `data-pipeline`/`backend-engineer`
- Step 3: `fetch_realestate.py` 본문 + 지오코딩
- Step 4: `compute_scores.py --mode real` 본문
