# Task: Phase 0a Step 3 — `fetch_realestate.py` 본문 + VWorld 지오코딩

`docs/handoff/20260503-phase0a-kickoff.md` 섹션 4 Step 3 완료.
SPEC `docs/SPEC.md` 섹션 6.3, 10, 14.2 (지오코딩 규칙) 준수.

## 완료된 작업

### 1) 국토부 전월세 API 적재
- 3개 deal_type 엔드포인트 호출 (`villa` / `danok` / `officetel`)
- 페이지네이션 (`numOfRows=1000`, `totalCount` 기반 종료)
- XML 파싱 — `xml.etree.ElementTree`. 콤마 분리 정수 (`'15,000'`) → int 변환 helper.
- deal_type 별 필드 차이 처리:
  - villa / officetel: `excluUseAr`, `floor`, `jibun` 있음
  - danok: `totalFloorAr` (총면적), `jibun`/`floor` 없음

### 2) 사전 컷 + IQR 클리핑 (SPEC 14.2)
- 사전 컷: `deposit==0 AND monthly_rent==0` skip; `monthly_rent > 5000` skip
- IQR 1.5배: `area_m2`, `deposit`, `monthly_rent` 각 컬럼 단독 (보증금 0 = 전세는 분포에 포함)
- 클리핑 후 잔여율 86.6% (=36,213 / 41,803)

### 3) VWorld 지오코딩
- `VWORLD_API_KEY` (백엔드 키, 도메인 제한 X) — `.env`에 설정 완료
- `https://api.vworld.kr/req/address` `getCoord` `type=PARCEL`
- 입력 정규화: `f"서울특별시 {gu} {umdNm} {jibun}"` (중복 공백 제거)
- `JibunGeocodeCache` 우선 lookup → miss 시 호출 + 캐시 저장
- 호출 사이 60ms sleep, 실패 시 exponential backoff 3회 retry
- **매물 단위 정밀 좌표 금지** — 같은 지번 거래는 모두 같은 점 (SPEC 14.2)
- danok 거래는 jibun 자체가 응답에 없어서 좌표 null로 적재

### 4) 행정동 매핑
- 1차: 좌표 → `Dong.objects.filter(geom__contains=point).first()` (PostGIS spatial join)
- 2차 fallback: 좌표 없을 때 `gu` + `umdNm` 직접 이름 매칭
- 3차 fallback: `umdNm = "필동2가"` 같은 가(街) 붙은 법정동 → `"필동"` prefix 매칭
- 모두 실패 시 skip

### 5) 멱등 적재
- `external_hash = sha1(deal_type|deal_date|jibun|deposit|monthly_rent|area_m2|floor|gu)`
- `RentDeal.objects.update_or_create(external_hash=hash, defaults={...})`
- 동일 명령 재실행 시 0 inserts / 100% cache hit 확인

### 6) CLI
```
--months N        직전 N개월 (기본 6, 현재 월은 데이터 미공개 가능성으로 제외)
--gu NAME         특정 구만 (기본: 데모 5개 구)
--deal-type TYPE  villa / danok / officetel / all
--dry-run         API 호출 없이 의도만 출력
--no-geocode      VWorld 스킵, geom=null 적재
```

## 산출물

### 변경 파일
- `/Users/bagjihyeon/Desktop/School/capston/backend/scripts/fetch_realestate.py` (전면 재작성)

### 풀 적재 카운트 (5개 구 × 3 deal_type × 6개월)
- HTTP calls (data.go.kr): **98** (월별 페이지 1~3개 = 평균 ~1.2 calls/file)
- VWorld 호출: **5,629** (success 5,626 / fail 3 / 99.95%)
- JibunGeocodeCache 행: **5,723**
- 캐시 hit rate: **72.5%** (총 lookup 20,489 중 14,860 hit)
- IQR 클리핑 후 잔여 비율: **86.6%** (41,803 → 36,213)

### DB 최종 상태
```
total deals       : 27,050
with geom         : 19,807   (73.2%)
without geom      :  7,243   (전부 danok — 응답에 jibun 없음)
JibunGeocodeCache :  5,723

by deal_type:
  villa     : 9,766  (모두 geom 有)
  officetel : 10,041 (모두 geom 有)
  danok     : 7,243  (모두 geom 無)

by gu:
  중구       : 2,461
  종로구     : 2,082
  관악구     : 9,130
  마포구     : 7,892
  동대문구   : 5,478
  + spillover (PostGIS spatial join 결과 인접 구 행정동으로 라우팅된 경계 케이스)
    동작구 2건, 성북구 5건

date range : 2025-11-01 ~ 2026-04-30
```

### 지오코딩 fail 3건
모두 VWorld가 `status="OK"` 외 응답 (주소 매칭 실패 추정). 무시해도 무방.

## 다음 작업자에게 전달할 것

### `compute_scores.py --mode real` (Step 4)
- `RentDeal.objects.filter(dong=...).aggregate(avg_rent_per_m2=...)` 로 동별 평균 산출 가능
- **거래량 3건 미만 동/월 제외** (SPEC 14.2): `Count('id') >= 3` 필터 후 시계열 사용
- 보증금/월세 환산식 (SPEC 11.2 미상세, 후술 결정 필요): 일반적으로 `monthly_rent + deposit / 100 / 12` (보증금 1만원당 월세 1만원/12개월 환산) 또는 보증금 1000만원 기준 환산

### Phase 1 backend (`/api/transactions/bbox`)
- `RentDeal.objects.filter(geom__within=bbox_polygon)` 로 핀 후보 조회
- `geom__isnull=False` 필터 필수 (danok 7,243건 제외)
- 줌 레벨 13 미만 hidden 은 프론트에서 처리

### 데모 외 20개 구 확장 (시간 남으면)
- `--gu 강남구` 식으로 단일 구만 추가 적재
- VWorld 호출 부담을 시간 대비 조절. 25개 구 × 6개월 풀 적재 시 VWorld ~30,000 calls 예상
- VWorld 일일 한도(5,000~) 고려해서 한 번에 한 구씩 + 캐시 누적

## 미완 / 알려진 이슈

### danok geom=null 100%
국토부 단독/다가구 API 응답에 `jibun` 필드 자체가 없음 (확인됨 — `parse_xml` 코드 주석 참조). 현행 fallback (umdNm → 행정동명 prefix 매칭) 으로 dong 할당은 하지만 좌표는 없음. 핀 표시는 불가, 통계 집계는 가능.

### 단독다가구 skip 50% 이슈
관악구·동대문구 등에서 danok 적재가 50%+ skip 됨. 원인: 법정동명 (예: "회기동", "전농동") 은 행정동명과 같지만, "행촌동", "필운동" 등 일부 법정동은 어떤 행정동에도 같은 이름이 없어 fallback 실패. 해결책: 행안부 BJD↔ADM 매핑 CSV 적재 후 코드 기반 매칭으로 바꿀 것. Phase 0a 스코프 외.

### 경계 케이스 cross-gu 라우팅
중구로 신청한 거래 일부가 PostGIS spatial join 결과 동작구·성북구로 매핑됨 (보통 7건). VWorld 좌표가 행정동 경계 직근일 때. 정확성 측면에서는 좌표 truth가 옳으므로 이 동작은 의도적임.

### IQR 클리핑 검증 결과
잔여 86.6% — 양호. 클리핑 너무 빡빡하지도 않고 헐겁지도 않음. 단, `deposit` 분포가 0(전세) ~ 50,000(만원) 으로 매우 넓어서 IQR이 큰 편. 필요 시 `deal_type` 별로 분리 클리핑하면 더 정밀해짐.

### 다음 실행 시 캐시 효과
JibunGeocodeCache에 5,723개 누적. 다음 월 데이터 추가할 때 동일 지번 재거래는 cache hit 100% — VWorld 호출 거의 없을 것.

### 권장 실행 주기
월 1회. cron 예: `0 4 5 * *` (매월 5일 새벽 4시 직전월 6개월 갱신). 적재 시간 약 8분 (5개 구 기준).
