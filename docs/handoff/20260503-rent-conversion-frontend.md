# Frontend: surface converted-monthly rent across compare/detail/sidebar/pin

서울 자취 시장의 보증금-월세 trade-off 가 전월세를 raw 월세만으로 비교하면
부당하게 "싸 보임" — 졸업 발표 질문 ("왜 26만원인 동이 비싸 보여요?") 차단을
위해 환산값을 4개 surface 에 노출.

표준식: `환산월세(만원) = 월세 + 보증금 × 0.005` (서울 평균 전환률 6%/년).

## 백엔드 응답 의존도

| Surface | 백엔드 신규 필드 사용? | 비고 |
|---|---|---|
| TransactionPanel pin | **`RentDealPin.converted_rent`** | 백엔드가 이미 노출 (RentDealPinSerializer.get_converted_rent). 검증된 값 사용. lib/rent.ts 도 같은 계수라 폴백 가능. |
| DongDetail recent_deals | 클라이언트 계산 (`lib/rent.ts`) | 백엔드 detail 응답에 converted_rent 미포함. 표준식 그대로 client 적용. |
| DongDetail monthly_trend | 변경 없음 (label 만) | 응답 shape 가 유형별 raw 월세 평균만. per-month 보증금 평균 미노출 → client 환산 불가능. 차트 제목에 "(raw, 만원)" 명시 + mono hint "보증금 환산 전 — 환산값은 아래 거래표 참고". |
| Compare 평균 월세 | **fallback** (백엔드 신규 필드 없음) | `/api/compare` 응답에 `rent_converted_avg` **미노출** (compare_dummy.py docstring 에 언급은 있지만 실제 builder dict 에 키 없음). 라벨 유지 + 셀에 `mono-label "raw 월세"` 보조 + footer 에 환산식/score_rent 정합성 설명. 백엔드가 신규 필드 노출하면 셀과 라벨 동시 교체. |
| Sidebar 월세 상한 슬라이더 | 라벨만 변경 | 슬라이더 값이 실제 어떤 필터에도 연결돼 있지 않음 (rentCap 변수가 어떤 score 비교에도 안 쓰임). 라벨만 정직하게 "환산 월세 상한" + "보증금 환산 포함" hint. |

## 변경 파일

### 신규
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/lib/rent.ts`
  - `MONTHLY_CONVERSION_RATE = 0.005` (백엔드 `apps.realestate.utils.MONTHLY_CONVERSION_RATE` 와 단일 진실)
  - `convertToMonthly(deposit, monthlyRent): number`
  - `formatConvertedRent(deposit, monthlyRent): string` — `Math.round(...)+"만원"`

### 수정
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/types/api.ts`
  - `RentDealPin` 에 `converted_rent: number` 추가 (백엔드가 이미 노출 중)
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Map/TransactionPanel.tsx`
  - DealRow: 반전세/월세 거래는 raw 월세+보증금 그대로 두고 새 줄에 `환산 X만원` (mono) + `보증금 환산 포함` hint
  - 전세 (월세=0): `전세` 배지 + 보증금 + 환산값을 inline (월세=0이라 환산만 비교 의미)
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Map/TransactionPanel.css`
  - `.tx-row__converted`, `-label`, `-value`, `-hint` 추가 (점선 구분선으로 derived 표시)
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Map/Sidebar.tsx`
  - "월세 상한" → **"환산 월세 상한"**
  - 슬라이더 아래 mono hint "보증금 환산 포함 (0.005/월)"
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Map/Sidebar.css`
  - `.sidebar__filter-hint` 추가
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/routes/Compare.tsx`
  - "평균 월세" 셀에 `mono-label "raw 월세"` 보조 라벨 추가 (값 자체는 그대로 — 백엔드 미준비)
  - Provenance footer RENT 행 교체: 환산식 + score_rent 가 환산값 기반임을 명시
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/routes/Compare.css`
  - `.compare__cell-foot` 추가
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Detail/RealEstateSection.tsx`
  - 차트 제목 "(만원)" → "(raw, 만원)" + mono hint "보증금 환산 전 — 환산값은 아래 거래표 참고"
  - 거래표 헤더에 mono "환산 = 월세 + 보증금 × 0.005 (연 6%/월 0.005 가정)"
  - 거래표에 **"환산 월세" 컬럼** 추가 (client 계산), 전세는 " 전세" tag 부착
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Detail/RealEstateSection.css`
  - `.real-estate__deals-header` flex 로 변경 (제목 + hint 정렬)
  - `.real-estate__deals-hint`, `-chart-hint`, `-converted-cell`, `-converted-tag` 추가

## 검증

### 1. tsc + build
```
cd frontend && npx tsc --noEmit  # → 0 errors
cd frontend && npm run build      # → ✓ built (864 kB JS, 107 kB CSS)
```

### 2. URL smoke (200 OK 모두)
- `http://127.0.0.1:5173/` (메인 지도)
- `http://127.0.0.1:5173/compare?dongs=1108083,1114073,1108060` (3-dong 비교)
- `http://127.0.0.1:5173/dong/1108083` (동선동 상세)

### 3. 데이터 검증 (백엔드 + 클라이언트 계수 일치)
TransactionPanel 핀 5건 sanity check:
```
officetel  보증금  20450만 / 월세   0만 → API=102 (expect 102) ✓ (전세)
officetel  보증금    100만 / 월세  35만 → API= 36 (expect  36) ✓
officetel  보증금   3000만 / 월세  60만 → API= 75 (expect  75) ✓
```
백엔드 `converted_rent` 와 `lib/rent.ts.convertToMonthly` 값이 정수 단위에서 1대1 일치.

DongDetail 동선동 (1108083) recent_deals client 계산:
```
2026-03-27 연립다세대  보증금 3000만 / 월세 13만 → 환산 28만
2026-03-11 단독다가구  보증금 1000만 / 월세 21만 → 환산 26만
2026-02-22 단독다가구  보증금  500만 / 월세 23만 → 환산 26만
2026-01-11 연립다세대  보증금 1000만 / 월세 15만 → 환산 20만
2025-12-18 오피스텔   보증금 1000만 / 월세 15만 → 환산 20만
```
졸업 발표 데모 line: rent_avg 26만원 동에서 raw 21만/환산 26만, raw 13만/환산 28만 — 환산 적용으로 보증금 trade-off 가 즉시 가시화.

### 4. 시각 묘사

**Compare** (`/compare?dongs=1108083,1114073,1108060`):
- "평균 월세" 행 셀: 큰 숫자 `26 / 33 / 26 만원` 아래 작은 mono `RAW 월세`
- Footer RENT 행: "환산 월세 = 월세 + 보증금 × 0.005 (서울 평균 전환률 6%/년 가정). 점수(score_rent)는 환산값 기반이며, 위 셀의 'raw 월세'는 보증금 환산 전 표시값입니다. 국토부 실거래가 5개 구 적재 한정."

**DongDetail** (`/dong/1108083`):
- 부동산 시세 차트 헤더 "월별 평균 월세 (raw, 만원)" + mono "보증금 환산 전 — 환산값은 아래 거래표 참고"
- 거래표 헤더 우측 mono "환산 = 월세 + 보증금 × 0.005 (연 6%/월 0.005 가정)"
- 거래표 6번째 컬럼 "환산 월세": 28만원 / 26만원 / 26만원 / 20만원 / 20만원 (mono)

**Sidebar** (메인 지도 좌측):
- 필터 섹션 "환산 월세 상한" 체크박스 + 슬라이더 + mono "보증금 환산 포함 (0.005/월)"

**TransactionPanel** (줌 13+ 핀 클릭):
- 반전세/월세 row: "월세 35만원 · 보증금 100만원" 위쪽 + 점선 아래 "환산 36만원" + 우측 mono "보증금 환산 포함"
- 전세 row: `전세` 배지 + "보증금 20450만원 · 환산 102만원" — 환산값이 핵심 비교 수치임을 명시

## 디자인 시스템 갭

없음. 전부 기존 토큰 사용:
- `--color-text-subtle` / `--color-text-muted` / `--color-text` (계층)
- `--font-family-mono` + `--font-mono-label-size` / `-tracking` (mono 보조 텍스트)
- `--color-hairline` (dashed divider)
- `--color-pale-green` (compare best-cell wash, 그대로 유지)

`.mono-label` utility 가 `text-transform: uppercase` 라 한국어 hint 는 영향
없으나 영문 단어 (RAW 등) 는 자동 대문자 처리됨 — 의도된 동작.

## 알려진 잔여 갭

1. **Compare 평균 월세 셀 = 백엔드 derived raw 값** — `compare_dummy.py` 가
   `rent_converted_avg` 를 docstring 만 적고 실제 dict 에 누락. 백엔드 agent
   가 이 키를 builder 에 추가하면, `Compare.tsx` 의 `rentVals` 와 셀 라벨을
   `평균 환산 월세` 로 동시 교체. 그 시점에 `compare__cell-foot` ("RAW 월세")
   는 제거.
2. **DongDetail monthly_trend 차트** — 라인이 raw 월세만 표기. 환산 라인을
   추가하려면 백엔드가 `monthly_trend` 항목에 보증금 평균을 같이 노출해야
   함 (현재 응답 shape 미포함). 차트는 라벨만 "(raw, 만원)" 으로 변경.
3. **Sidebar 환산 월세 상한 슬라이더** — UI label 만 정확. 실제로 `rentCap`
   변수는 어떤 dong score / heatmap 필터에도 연결되어 있지 않음 (MainMap.tsx
   에서 state 만 보유, 계산식 미사용). 진짜 필터링이 필요하면 별도 작업으로
   `score_rent → 환산 월세 변환식` 또는 `rent_avg <= cap` 비교 로직 추가
   필요. 라벨/hint 변경은 향후 진짜 필터를 붙일 때도 그대로 맞음.
4. **DongPanel** — `summary.rent_avg` 한 줄 요약은 그대로 유지 (이미 derived
   임을 footer 가 explain 안 함). 별도 surface 라 본 작업 범위 밖. 필요 시
   다음 라운드에서 동일 패턴 적용.

## Commit

`feat(rent): surface converted-monthly rent across compare/detail/sidebar/pin`

본문에 4개 surface (Compare, DongDetail, Sidebar, TransactionPanel) + 계수
0.005/월 (6%/년) 명시. 백엔드 commit 과 conventional pair.
