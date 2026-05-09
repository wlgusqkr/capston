# Main Map Studio Filter — 자취 조건 거래량 분포

작성일: 2026-05-09
상태: **초안 (plan-design-review + plan-eng-review 완료, outside voice 적용)**
선행: SPEC §5.1, BI 대시보드 (`/dong/:slug/explore`, Phase 4.8)

> **카피 정확화 (eng-review #18, codex outside voice)**: "내 조건에 맞는 매물 찾기"가 아닌 "내 조건 자취·원룸 거래량 분포"로 카피 수정. 데이터는 **국토부 실거래 최근 6개월** — 현재 매물 재고가 아니다. 자취생이 네이버 부동산처럼 "지금 살 수 있는 매물"로 오해하지 않도록 모든 카피·라벨에 명시.

---

## 1. 목적 (Why)

자취생이 메인 지도(`/`)에 들어오자마자 **자기 조건**을 입력해 "어디에 매물이 많은지"를 즉시 시각화하게 한다. 현재 메인 지도는 가중치 슬라이더로 종합 점수 히트맵을 그리는데, 점수는 추상적이고 자취생의 실제 의사결정(보증금/월세/면적)과 거리가 있다. 이 plan은 **score 히트맵 옆에 "match 히트맵"** 모드를 추가해 자취생 첫 화면을 의사결정 도구로 만든다.

> "내 보증금 1,000 / 월세 50 / 25㎡ 매물이 어디에 많지?" → 좌측에 조건 입력 → 지도 히트맵이 그 조건의 매물 비율로 재색칠.

---

## 2. User Story + Emotional Arc

### 2.1 Persona
**김자취, 24세, 첫 자취 준비.** 회사가 강남이고 보증금 1,500만원 이내 / 월세 50~70만원 정도가 한도. 부모님과 상의 중. 부동산 어플 들어가면 "월세 35만원" 광고만 가득해서 진짜 시세 감 잡기 어려움. 슬기로운 자취생활을 친구 추천으로 들음.

### 2.2 Storyboard (감정 ⌒ 행동 ⌒ 화면)

| Step | 사용자 행동 | 화면 상태 | 사용자 감정 | 본 plan이 지원하는 것 |
|---|---|---|---|---|
| 1 | `/` 진입 (첫 방문) | Match 모드 default, 필터 default(자취 4종, 6m, 풀 범위) | "어, 지도네. 이걸로 뭘 한다는 거지?" 약간 어색 | STUDIO MATCH 패널 헤더 + placeholder 결과 ("조건을 좁혀 자취 매물을 찾아보세요") |
| 2 | 보증금 슬라이더 좌측 끌어 max 1500까지 좁힘 | 슬라이더 thumb drag 중. 결과 카운트 skeleton → "12,340건 / 87개 동". 히트맵 ratio 재계산 + 색 transition 300ms | "오, 진짜 바뀌네." 호기심 ↑ | 즉각 반영 (debounce 200ms) + transition |
| 3 | 월세 30~70 으로 좁힘. 면적 18~30 좁힘 | 카운트 "5,491건 / 73개 동". 히트맵 마포·관악 진하게, 강남·서초 옅게 (월세 70 이하 제한 때문) | "어 강남이 흐려졌네. 그래 강남은 비싸지." 안도 + 학습 | ratio 정규화로 동별 상대량 가시화 |
| 4 | 진한 동 호버 (마포 서교동) | Tooltip "마포구 서교동 · 1,075건" | "오 홍대네. 거기 매물 많구나." | hover tooltip with match count |
| 5 | 서교동 클릭 | 우측 동 패널 슬라이드인. 상단 score 카드 + 하단 신규 매칭 카드 ("1,075건 / 평균 환산 99만원 / 매칭률 12.3%") | "오 평균 99만원이면 내 한도 좀 넘는데..." 살짝 실망 + 정보 정확함에 신뢰 ↑ | 매칭 카드 with 평균 환산월세 |
| 6 | "자세히 탐색하기 →" 클릭 | `/dong/마포구-서교동/explore?<필터>` 로 이동. 필터 그대로 전달. | "아 이 동에서 더 깊게 보겠다." 의도 확장 | URL state 동기화 |
| 7 | (몇 분 후 돌아옴) 재방문 | URL 그대로 → 필터 그대로. 처음과 동일 view | "내 작업 그대로 있네." 안정감 | URL 영속성 |

### 2.3 Time-horizon design
- **5초 (visceral)**: 사이드바 좌측 "STUDIO MATCH / 내 조건 매물" eyebrow 라벨이 가장 먼저 눈에 들어옴. 한국어 헤딩 24px. "여기서 자취 매물 찾는다" 즉각 인지.
- **5분 (behavioral)**: 슬라이더 ↔ 지도 색 변화 ↔ 결과 카운트 동기화. "이거 진짜 데이터 기반이구나" 신뢰 형성.
- **5년 (reflective)**: 자취 끝나고 친구에게 추천. "그 사이트 들어가서 보증금 슬라이더 만지면 진짜 매물 많은 동이 색깔로 떠. 부동산 광고 같은 거짓말 없어."

### 2.4 Trust signals
- 결과 카운트가 RDS 7.4M 실거래 기반임을 작은 mono 라벨로 명시: `SOURCE: 국토부 실거래 (최근 6개월)`
- 0건일 때 "데이터 없음"이 아닌 "조건에 맞는 매물이 없어요 — 범위를 넓혀보세요" 같은 행동 가능한 안내
- 매물 가장 많은 동에 Coral 1px outline → "여기가 top" 명확하게

---

## 3. Backend

### 3.1 신규 endpoint
`GET /api/dongs/match-counts?<filters>`

**필터 (Phase 4.8 Explore 와 동일):**
- `deal_types` csv (default `villa,dagagu,danok,officetel`)
- `period` 3m / 6m / 12m / 24m / all (default 6m)
- `deposit_min/max` 만원
- `monthly_min/max` 만원
- `area_min/max` ㎡

**응답:**
```json
{
  "filters_applied": { ... },
  "total_matched": 23491,
  "dongs": [
    { "code": "1144055000", "slug": "마포구-서교동", "count": 1075, "ratio": 78.4 },
    ...
  ]
}
```

`ratio` = 0~100 정규화. 가장 매물 많은 동을 100, 가장 적은(또는 0) 동을 0으로.

### 3.2 구현

**DRY: explore.py 의 helper 재사용** (eng-review 결정 #6):
```python
# apps/neighborhoods/match.py
from .explore import apply_filters, parse_explore_filters  # 100% 재사용
# match-counts 는 페이지네이션·deals 가 없으므로 parse 가 sort/page 필드 더 받지만
# 무시. 또는 별도 parse_match_filters 로 sort/page 빼고 분리 — explore 와 동일
# 검증 로직만 따와 작은 dispatch.
```

**SQL: 한 방 GROUP BY**
```sql
SELECT dong_id, COUNT(*) AS cnt
FROM rent_deal
WHERE <filters>
GROUP BY dong_id;
-- 인덱스 (dong_id, deal_date) 활용 — 426 grouping 평균 50~150ms (실측 필요).
```

응답 빌드 시 0건 동도 포함 (NO_DATA 색 표시 위해):
```python
all_dongs = list(Dong.objects.values_list('id', 'code', 'slug'))
counts = {row['dong_id']: row['cnt'] for row in qs}
max_cnt = max(counts.values()) if counts else 0
result = []
for dong_id, code, slug in all_dongs:
    cnt = counts.get(dong_id, 0)
    ratio = (cnt / max_cnt * 100) if max_cnt > 0 else 0.0
    result.append({"code": code, "slug": slug, "count": cnt, "ratio": round(ratio, 1)})
```

**캐시 5분 (Redis)** — 같은 필터 query string sha1 키. RDS staleness 허용 (5분 자취 시장 변화 무시 가능).

---

## 4. Frontend

### 4.1 좌측 사이드바 신규 패널
현재 LayerSwitcher (종합/전월세/시설/교통) + Legend 위에 **"내 조건에 맞는 매물 찾기"** 패널 추가.

**레이아웃 (위에서 아래):**
- 헤더: "내 조건" + 토글 (on/off)
- 거래유형 multi-chip (5종)
- 기간 radio (3m/6m/12m/24m/전체)
- Range sliders 3개: 보증금 / 월세 / 면적
- "초기화" 텍스트 버튼
- 결과 요약: "지금 조건에 맞는 매물 N,XXX건, M개 동에서 발견"

토글이 on → 지도 히트맵이 match 모드 (ratio 기반). off → score 모드 (가중치 기반).

### 4.2 히트맵 색
match 모드에서도 같은 5단 그린 그라데이션 사용 (DESIGN_SYSTEM.md). 의미가 다른 만큼 Legend 라벨이 바뀜:
- score 모드: "낮음 ← 종합 점수 → 높음"
- match 모드: "0건 ← 조건 매물 수 → 가장 많은 동"

### 4.3 동 패널 (match 모드)
match 모드에서 동 클릭 시 패널 내용 추가:
- 상단 score 카드는 그대로
- 하단에 "조건 충족 매물" 카드 추가:
  - 매칭 N건
  - 평균 환산월세
  - 평균 보증금
  - 매칭률 (전체 거래 대비 %)
- "자세히 탐색하기 →" 버튼 → `/dong/<slug>/explore?<필터>`

### 4.4 URL state
필터를 메인 지도 URL 쿼리스트링과 동기화 (`/?deal_types=...&deposit_max=1500&...`). 새로고침/공유 안전. Explore 페이지로 넘어갈 때도 그대로 전달.

---

## 5. 화면 명세

### 5.1 사이드바 3-패널 구조 (위에서 아래)

```
┌───────────────────────────────────────────────────────────────┐
│                     TopNav (로고 · 검색 · 로그인)              │
├───────────────────┬───────────────────────────────────────────┤
│ STUDIO MATCH      │                                            │
│ 내 조건 매물 찾기 │                                            │
│                   │                                            │
│ 거래 유형         │                                            │
│ [연] [다] [단]    │                                            │
│ [오] [아]         │              Leaflet 2D 지도                │
│                   │                                            │
│ 기간              │              425 행정동 폴리곤              │
│ ○ 6m ● 12m ○ 24m │                                            │
│                   │              5단 그린 그라데이션            │
│ 보증금  ◐━━○━ ━ │              (DESIGN_SYSTEM Heatmap)        │
│ 월세    ○━━━━━━ │                                            │
│ 면적    ○━○━━ ━ │                                            │
│                   │                                            │
│ 23,491건          │                                            │
│ 78개 동           │                                            │
│ [초기화]          │                                            │
├─ ── ── ── ── ── ─┤                                            │
│ LAYERS            │                                            │
│ ● 매칭(Match)     │                                            │
│ ○ 종합 / 전월세   │                                            │
│ ○ 시설 / 교통     │                                            │
├─ ── ── ── ── ── ─┤                                            │
│ WEIGHTS           │                                            │
│ (Match 모드일 땐  │  ┌──────┐ Legend                           │
│  비활성/숨김)     │  │ 5단  │ 0건 ←━━━━━━━→ 가장 많음          │
│ 전월세 ━━●━━━━━ │  └──────┘                                  │
│ 시설  ━━━●━━━━ │                                            │
│ 교통  ━━━●━━━━ │                                            │
└───────────────────┴───────────────────────────────────────────┘
   280px width                       fluid
```

### 5.2 정보 위계 (사용자가 보는 순서)

1. **STUDIO MATCH** (패널 1, sidebar 상단) — 자취생의 핵심 도구. eyebrow 라벨 mono uppercase, 한국어 헤딩 강조.
2. **LAYERS** (패널 2, 중앙) — 어떤 모드의 히트맵을 볼지 선택. Match/Score 4종 토글.
3. **WEIGHTS** (패널 3, 하단) — Score 모드 전용. Match 모드일 때는 회색 disabled 또는 collapse.
4. **Map** (메인) — 위 모든 입력의 결과.
5. **Legend** (지도 우측 하단 floating) — 모드 따라 라벨 동적 변경.

세 패널은 Hairline 1px 디바이더로 구분. 카드 그림자/border-radius 추가 X (DESIGN_SYSTEM "depth via surface alternation" 준수).

### 5.3 모드 전환 affordance

LAYERS 패널의 첫 옵션이 "● 매칭(Match)" — 라디오로 선택 시:
- 히트맵 색 모드 변경 (300ms transition)
- WEIGHTS 패널 disabled (회색 + 마우스 오버 툴팁 "매칭 모드에서는 가중치 미사용")
- Legend 라벨 "0건 ← 매물 수 → 가장 많음"
- STUDIO MATCH 패널 헤더 옆에 작은 활성 dot (Coral `#ff7759`) 표시

LAYERS 의 다른 옵션 (종합/전월세/시설/교통) 선택 시:
- 히트맵 score 기반
- WEIGHTS 활성
- Legend 라벨 "낮음 ← 점수 → 높음"
- STUDIO MATCH 패널 dot 사라짐, 패널은 그대로 보이지만 inactive (필터 입력 불가능 X — 입력은 가능, 히트맵엔 미반영. 동 클릭 시 패널의 매칭 카드만 그 동에 한정 표시)

### 5.4 히트맵 색 전환
score → match 토글 시 polygon `fillColor` 300ms ease-in-out transition. 같은 5단 그린 그라데이션 사용 (DESIGN_SYSTEM Heatmap, opacity 0.7).

### 5.5 인터랙션 상태표

| 컴포넌트 | LOADING | EMPTY | ERROR | SUCCESS | PARTIAL/EDGE |
|---|---|---|---|---|---|
| **STUDIO MATCH 패널** (필터 입력 결과) | "계산 중..." 회색 dot 1초 후 결과 카운트 자리에 skeleton 막대 (Hairline) | "0건 — 조건에 맞는 매물이 없어요. 보증금/월세 범위를 넓혀보세요." (Soft Stone 배경 박스 + 초기화 버튼) | "데이터를 불러오지 못했어요. [다시 시도]" | "23,491건 / 78개 동" 검은 굵은 숫자 + 가벼운 한국어 보조문 | **거래 0건인 동만 회색**: ratio가 NaN 처리되어 polygon이 NO_DATA 색 (`#eeece7` Soft Stone 70% opacity) |
| **히트맵 (Match 모드)** | 기존 score 색 유지 + 우측 하단 spinner 1.5s | 모든 polygon NO_DATA 색 + Legend "조건에 맞는 매물이 서울 어디에도 없어요" | 기존 score 색 유지 + Toast "매칭 데이터 로드 실패" | 5단 그라데이션, 진한 = 매물 풍부 | rank=1 동(매물 가장 많음) Coral 1px outline 강조 |
| **동 패널 매칭 카드** (동 클릭 후) | 카드 자리에 skeleton 3줄 (각 line 600ms stagger) | "이 동네는 조건에 맞는 매물이 없어요" + 작은 일러스트 X(없음) — 단 한 줄 메시지 + "조건 완화하기" 텍스트 버튼 | "매칭 정보 로드 실패. [다시 시도]" | "12건 / 평균 환산 73만원 / 매칭률 8.4%" 정렬된 표 | 매칭률 1% 미만 → 작은 경고 dot ("희소") |
| **Legend** | 라벨 mono "LOADING..." | "0건" → "—" | 변경 없음 | "0건 ← 매물 수 → 1,075건" 양 끝 동적 라벨 | match=score 모드 전환 시 라벨 cross-fade 200ms |
| **필터 슬라이더** | disabled (드래그 막힘) 50ms 깜빡임 | n/a | n/a | thumb 18px 검은 점, drag 시 cursor: grabbing | min 끌어 max 넘기면 자동 swap (min < max 보장) |

### 5.6 첫 진입 default state

**기본 모드: Match 모드** (Score 가 아님). 자취생 첫 화면에서 자기 조건으로 즉시 시작할 수 있게.
- LAYERS 라디오 첫 옵션 "● 매칭" 선택됨
- 필터 default: 자취 4종(연립다세대/다가구/단독/오피스텔), 6개월, 보증금 0~50000, 월세 0~300, 면적 10~100 — 즉 Phase 4.8 explore 와 동일 default
- 결과 요약: 처음엔 "조건을 좁혀 자취 매물을 찾아보세요" placeholder. 사용자가 슬라이더 한 번이라도 움직이면 실 결과 표시
- 가중치 슬라이더는 회색 disabled. 사용자가 LAYERS 를 종합/전월세/... 로 전환하면 활성화

이렇게 하면 자취생이 처음 들어왔을 때 "이 동네 점수가 ?" 같은 추상에서 시작하지 않고 "내 조건에 맞는 매물 어디에 많아?" 라는 구체에서 시작.

---

## 5.7 AI Slop 회피 사양

10개 슬롭 패턴 모두 회피:

- ❌ 보라/인디고 gradient: 사용 X. 5단 그린만.
- ❌ 3-column icon-in-circle feature grid: 패널이 1열이고 섹션이 STUDIO MATCH/LAYERS/WEIGHTS 3개지만 모두 다른 형식 (chip / radio / slider)이라 슬롭 패턴 아님.
- ❌ Centered everything: 모든 헤딩·카운트는 좌측 정렬.
- ❌ Bubbly border-radius: 카드 8px, chip 999px만 (chip는 자연), polygon 기본.
- ❌ 데코 blob/wave: 0.
- ❌ 이모지 데코: 0. 활성 dot은 Coral 색 6px 원 (UI element, 데코 X).
- ❌ Colored left-border 카드: X. 디바이더는 Hairline 1px 가로선.
- ❌ Generic 카피 ("Welcome to studio finder!"): X. 모든 카피는 행동 지향 ("내 조건에 맞는 매물 찾기" / "조건을 좁혀 자취 매물을 찾아보세요" / "조건 완화하기")
- ❌ Cookie-cutter 섹션 rhythm: 섹션은 결과 위주 단일 캔버스. 마케팅 패턴 아님.
- ✅ App UI 분류 (dashboard) — 카드는 interaction이 있는 곳에만 (Soft Stone score card는 데이터 표시, 매칭 카드는 액션 포함).

**구체 spec:**
- chip 활성 색: Soft Stone `#eeece7` fill + Ink `#212121` outline (DongExplore 와 동일 — Phase 4.7 design-review 결정과 일관)
- 결과 카운트 typography: `tabular-nums` 28px Pretendard 600 + 보조문 13px Slate `#75758a`
- 활성 mode dot: Coral `#ff7759` 6px 원, 헤더 라벨 우측 4px 간격
- Tooltip: 흰 배경 + Hairline 보더 + 10px font-mono 라벨 + 14px Pretendard 본문

## 5.8 Design System Token 명세

기존 `frontend/src/styles/tokens.css` + DESIGN_SYSTEM.md + Phase 4.7 design-review 결정과 100% 정합:

| 요소 | Token | 값 |
|---|---|---|
| 사이드바 너비 | `--sidebar-width-main` (신규) | 280px |
| 패널 padding | `--space-6` | 24px |
| 패널 gap | `--space-7` | 32px |
| 디바이더 | `--color-hairline` | `#d9d9dd` |
| 패널 카드 배경 | `--color-surface` | `#ffffff` |
| 활성 mode dot | `--color-coral` | `#ff7759` |
| 결과 카운트 색 | `--color-text` | `#212121` Ink |
| 결과 보조문 색 | `--color-slate` | `#75758a` |
| chip 활성 fill | `--color-soft-stone` | `#eeece7` |
| chip 활성 outline | `--color-text` | `#212121` |
| chip min-height | (재사용) | 44px (touch + 시각 일관) |
| range thumb | (재사용 .explore__range-inputs) | 18px Ink + 흰 보더 + Ink 1px ring |
| H2 카운트 라벨 | (재사용) | mono uppercase 11px tracking 0.06em |

**컴포넌트 reuse:**
- `.explore__chip*` — chip 스타일 재사용 (가능하면 더 generic 이름으로 추출: `.chip` 베이스 + `.studio-match__chip`)
- `.explore__range-inputs input[type=range]` — slider thumb 스타일 재사용
- 새 패널 className: `.studio-match`, `.studio-match__field`, `.studio-match__chip`, `.studio-match__result`

추후 design system 정리 PR(별도)에서 `.chip` / `.range-slider` 같은 generic 베이스로 추출.

## 5.9 Responsive & Accessibility

### Responsive
- **Desktop only.** 1280px 이상 가정. 1440px 표준 viewport.
- 사이드바 280px 고정. 지도 fluid 나머지.
- 1280px 미만: 본 plan 범위 X (project memory: 모바일 미지원).

### Keyboard Navigation
- Tab 순서: TopNav → STUDIO MATCH chips (좌→우) → period radio → 보증금 slider 2개 → 월세 slider 2개 → 면적 slider 2개 → "초기화" → LAYERS radio → WEIGHTS slider 3개 → Map polygon (focus 관리는 Leaflet 기본)
- chip: Space/Enter 토글
- radio: 화살표 키 (좌우)로 이동, 자동 select
- range slider: 화살표 키 ±step, Home/End = min/max
- 동 패널 열림: Escape → 패널 close, 포커스 사이드바 복귀

### ARIA
- STUDIO MATCH 패널: `<aside aria-label="자취 매물 조건 필터">`
- 거래 유형: `<fieldset>` + `<legend>` 시각적 hidden 가능 (sr-only)
- chip group: `role="group"` + `aria-label="거래 유형 (다중 선택)"`
- chip: `role="button"` + `aria-pressed={active}`
- result count: `<output aria-live="polite">23,491건 / 78개 동</output>` — 슬라이더 변경 시 스크린리더가 새 결과 읽음
- LAYERS radio: 표준 `<input type="radio">` 그룹
- 히트맵 polygon: 기존 Leaflet aria-label (구·동 이름 + 점수)
- mode 전환 시: `aria-live` 영역에 "매칭 모드로 전환됨, 매물 수 기준 색상" 1회 announce

### Touch targets (desktop이지만 일관)
- chip 44px (Phase 4.7 결정)
- radio 44px (period — 패딩 늘림)
- slider thumb 18px (시각) / 24px (drag hit area, transparent 패딩)

### Color Contrast (WCAG AA)
- Ink #212121 on white: 16.1:1 ✓
- Slate #75758a on white: 4.7:1 ✓ (large text 4.5+ pass)
- Coral #ff7759 on white: 2.9:1 — **decoration only로 사용 (CTA/text 절대 X)**, mode dot 인 6px 원에만
- Heatmap Deep Forest #003c33 on Pale Green Wash #edfce9: 11.8:1 ✓ (지도 라벨 가독)

## 5.10 Codex outside voice 반영 (#1~#17, autonomy 모드 자동 적용)

### #1 default state 모순
**Fix:** 첫 진입 default 필터를 **자취 평균값** 으로 좁힘 (placeholder 제거):
- 보증금 0~5,000만원 (자취 시장 90 percentile)
- 월세 30~80만원
- 면적 15~40㎡ (8~12평)
- 거래유형 다가구·연립다세대·오피스텔 (단독 제외 — 1:1 통째 임대 아님)
- 기간 6개월
첫 fetch 즉시 결과 카운트 표시 ("최근 6개월 자취 거래 2,341건이 78개 동에서").

### #2 default 너무 넓음
위 #1 fix 와 함께 해결. 단순 거래량 지도가 아닌 자취 시장 의사결정 도구로 작동.

### #3 ratio 정규화 강화
**Fix:** 최소 표본 N=10 미만 동은 ratio=0 으로 처리. 응답에 `min_sample=10` 메타 명시.
공식: `ratio = log1p(count) / log1p(max_count) * 100` 로 변경 (Codex 권장 log scale).
극단적 outlier 동(예: 한 동 5,000건, 다른 동 50건)이 100 vs 1 로 과장되지 않게.

### #4 "0건" vs "데이터 없음" 응답 구조 분리
**Fix:** 응답 dong item 에 `has_data: bool` 필드 추가:
- `count > 0` → `has_data=true, ratio>0`
- `count == 0` AND 동 거래 인덱스 있음 → `has_data=true, ratio=0` (실제 0건)
- 동 거래 인덱스 없음(이론상 X but defensive) → `has_data=false`
프론트에서 `has_data=false` 또는 `count<min_sample` → NO_DATA 색.

### #5 425 vs 426 숫자
**Fix:** RDS adong = 426, GeoJSON = 425 (1개 동 누락 — 검수 후 결정 — 우선 plan은 426 통일, 적재 시 missing 1개 별도 처리 노트).

### #6 동 패널 매칭 카드 endpoint 빠짐
**Fix:** 별도 endpoint `GET /api/dongs/<slug>/match-detail?<filters>` 추가.
응답: `{count, avg_converted_rent, avg_deposit, match_ratio, period_total}`.
URL state 동기화. **신규 산출 추가** (섹션 8 update).

### #7 매칭률 denominator 정의
**Fix:** `match_ratio = (필터 통과 거래 N) / (같은 동 + 같은 기간 + 같은 거래유형 set 전체 N) * 100`.
plan 에 spec 명시.

### #8/#9 SQL 성능 보장
**Fix:** 마이그레이션 추가 — `CREATE INDEX rent_deal_match_idx ON rent_deal (deal_type, deposit, monthly_rent, area_m2, dong_id);` (5-column composite, partial: `WHERE deal_date >= NOW() - 365 days` 도 검토). 또는 `(dong_id, deal_type, deal_date)` 복합 정도면 충분 — EXPLAIN ANALYZE 실측 후 결정.
**EXPLAIN test 폐기**: SLA 기반 (응답 < 500ms p95) test 로 변경.

### #10 Redis cache key canonicalization
**Fix:** `apps/neighborhoods/match.py` 에 `_canonicalize_filters(d: dict) -> str` helper:
```python
def _canonicalize_filters(d):
    # default 와 같은 필드는 omit, csv 정렬, key 정렬
    canonical = {}
    for k in sorted(d):
        v = d[k]
        if v == DEFAULT_FILTERS.get(k): continue
        if isinstance(v, (list, tuple)): v = ','.join(sorted(v))
        canonical[k] = v
    return hashlib.sha1(json.dumps(canonical).encode()).hexdigest()
```

### #11 URL state push vs replace
**Fix:** `useExploreFilters` 의 `setSearch(sp, { replace: true })` 사용 (현재 false). 슬라이더 drag → URL 갱신은 history pollution 방지. 명시적 mode 전환만 `replace: false`.

### #12 vitest setup이 critical path 리스크
**Note:** 사용자 #10 에서 vitest setup 본 plan 첫 step 으로 결정. 일정 리스크 인지하고 진행.

### #13 rentCap / nearUniversity 제거 위험
**Fix:** "통합" 입장 유지하되 **nearUniversity 는 별도 chip 으로 STUDIO MATCH 패널 안에 보존**. "근처 학교" multi-select chip (서울 주요 12개 대학) — 자취 시장 핵심 변수라 보존 가치.
rentCap 은 월세 slider 로 흡수 — 별도 토글 제거.

### #14 score+match 카드 동 패널 동시 → 정보 혼선
**Fix:** match 모드일 때 동 패널 우선순위 변경:
- 상단: **매칭 카드** (이 동의 조건 매물 N건 + 평균 환산월세 + 매칭률) — primary
- 하단: score 카드 — secondary, "동의 종합 평가는 다른 mode 에서 자세히 보기"
score 모드일 때는 반대.

### #15 색 모드 혼동
**Fix:** match 모드일 때 polygon **opacity 0.7 → 0.85** + Legend 좌측에 작은 mode 배지 ("거래량 분포 보기 중") 표시. 시각적 모드 차이 강화.

### #16 Explore 필터 schema 호환
**Fix:** `MatchFilters` 와 `ExploreFilters` 타입을 **공통 base** 로 추출. `BaseRentFilters` 정의 후 두 페이지에서 extend. URL query string 도 동일 키 사용 ("자세히" 링크 호환 보장).

### #17 parse_explore_filters 재사용 coupling
**Fix:** explore 의 `parse_explore_filters` 가 sort/page 같은 explore-only 필드를 받음. match 는 그것 무시 → 별도 `parse_base_filters` 로 분리:
```python
# explore.py
def parse_base_filters(p): ...   # 두 곳 공유
def parse_explore_filters(p):
    base = parse_base_filters(p)
    base.update({"sort": ..., "page": ..., "page_size": ...})
    return base
```

## 5.11 신규 산출물 (outside voice 반영)
- backend `apps/neighborhoods/match.py` 안에 `DongMatchDetailView` (#6) 추가, urls 1라인.
- backend migration: `(dong_id, deal_type, deal_date)` 복합 인덱스 (#8) — 또는 EXPLAIN ANALYZE 후 결정.
- frontend `MatchKpiCard.tsx` 가 `/match-detail` API 호출. 새 hook `useDongMatchDetail`.
- 공통 타입 추출 `types/api.ts` `BaseRentFilters` (#16).
- explore.py 의 `parse_base_filters` 분리 (#17).

## 6. 미해결 결정 → 결정 완료

| # | 질문 | 결정 | 근거 |
|---|---|---|---|
| Q1 | match vs score 모드 — 토글 vs match 단일? | **토글 (LAYERS 라디오 5개: 매칭/종합/전월세/시설/교통)** | score 4종은 SPEC 5.1 핵심 자산이라 폐기 X. match 추가만. 첫 진입 default = "매칭" (자취생 본진). |
| Q2 | match 결과 0인 동 색? | **NO_DATA 색 (Soft Stone 70% opacity)** | DESIGN_SYSTEM 의 `HEATMAP_NO_DATA = #eeece7` 패턴 그대로. 0% 색(가장 옅은 그린)과 명확히 구분 → 사용자가 "0건"과 "데이터 없음" 헷갈리지 않음. |
| Q3 | match 모드일 때 가중치 슬라이더? | **disabled (회색 + 마우스 오버 툴팁)** | 가중치는 score 의미. match 에 적용 의미 없음. Hide 보다 disabled 가 사용자에게 모드 차이 인지시키기 좋음 (학습 효과). |
| Q4 | 결과 카운트 위치? | **사이드바 STUDIO MATCH 패널 하단** (지도 floating 카드 X) | 패널 안에서 입력 → 결과 흐름이 spatial 일관. 지도 위에 floating 카드 추가하면 UI 노이즈 ↑. |
| Q5 | score vs match 모드 시각 구분 affordance? | **3중 신호**: (a) LAYERS 활성 라디오 색 (b) STUDIO MATCH 헤더 옆 Coral 6px dot (c) Legend 라벨 mono 텍스트 변경 | 색·위치·라벨 3가지로 redundant 신호 (Norman 의 "redundancy in signals" 원칙). |
| Q6 | `/preference` 가중치 ↔ match 필터 관계? | **독립** | match 필터는 "매물 시장 탐색" 도구. preference 가중치는 "동 종합 점수" 도구. 둘은 같은 사이드바 안에 공존하지만 의미 영역 다름. preference 학습 결과 → WEIGHTS 슬라이더 자동 적용. match 필터엔 영향 X. |

**STOP** — 이 중 사용자 확인이 가장 의미 있는 결정은 **Q1** (default 모드).

---

## 7. Non-goals (이 plan에 포함 안 함)

- Saved searches (즐겨찾기) — 별도
- 인구·교통 등 score 와의 결합 점수 — 별도
- 모바일 반응형 — 데스크탑 only (project memory)
- 추천 알고리즘 (cosine similarity 등) — score 점수 그대로

---

## 8. 산출 (구현 대상)

### Step 0 (선행): Frontend test framework setup (eng-review 결정 #10)

**vitest + @testing-library/react + jsdom + happy-dom 셋업**. 1시간 강 소요. 후속 모든 frontend 작업에 unit test 가능.

산출:
- `frontend/package.json` — `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` devDeps + `test` 스크립트 추가
- `frontend/vitest.config.ts` 신규
- `frontend/src/test/setup.ts` 신규 (jest-dom matchers + Recharts ResizeObserver 모킹)
- `frontend/tsconfig.json` types 에 `vitest/globals` 추가
- 첫 smoke test: `frontend/src/lib/colors.test.ts` — `scoreToHeatmapBucket` 5분위 boundary
- `frontend/src/components/Map/HeatMap.test.tsx` — Phase 4.7 fix 회귀 방지 (adm_cd2 ↔ code 매칭)

검증: `npm run test` 5+ green.

### Backend
- `apps/neighborhoods/match.py` (apply_filters 는 explore.py 에서 import 재사용)
- `apps/neighborhoods/views.py` `DongMatchCountsView` 추가
- `urls.py` `dongs/match-counts`

### Frontend
- `routes/MainMap.tsx` — 사이드바에 새 패널 추가 + **기존 단편 필터(`rentCapEnabled` / `rentCap` / `nearUniversityOnly`) 제거** (eng-review 결정 #1: STUDIO MATCH 로 통합)
- `components/Map/MatchFilterPanel.tsx` (신규)
- `components/Map/MatchFilterPanel.css`
- `components/Map/MatchModeBadge.tsx` (헤더 Coral dot)
- `components/Map/MatchKpiCard.tsx` (동 패널 매칭 카드)
- `hooks/useDongMatchCounts.ts` (신규, useExploreFilters 패턴 따라감)
- `types/api.ts` — `DongMatchResponse` 추가
- `lib/api.ts` `getDongMatchCounts`
- `components/Map/HeatMap.tsx` — match 모드 ratio 기반 색칠 분기 (`layerKey` 메모이즈에 mode 추가)
- `components/Map/Legend.tsx` — match 모드 라벨

### 제거 대상 (eng-review 결정 #1)
- `MainMap.tsx` 의 `rentCapEnabled`, `setRentCapEnabled`, `rentCap`, `setRentCap`, `nearUniversityOnly`, `setNearUniversityOnly` state 6개
- `components/Map/FilterControls.tsx` (위 상태 사용처 — 컴포넌트 자체 제거 또는 비활성)
- 위 필터를 사용하는 view 쪽 query 로직 (있을 시)

### 사이드바 layout 노트
- 사이드바 vertical scroll 허용 (3 패널이 1000px 미만 화면에서 fit 안 될 수 있음).
- Legend 는 사이드바 안이 아니라 **지도 우측 하단 floating** (DESIGN_SYSTEM 권장). 현재 위치 유지.

### 캐시 정책
- Redis 5분 TTL. RDS staleness 허용 (자취 시장 5분 단위 변화는 무시 가능).
- 캐시 키: 정렬된 query string sha1.

### 성능 보장 (eng-review 결정 #11)
- **Frontend debounce 200ms**: range slider drag 중 onChange 폭주 방지. `useDongMatchCounts` 훅 안에서 `useDeferredValue` 또는 `lodash-es/debounce` 사용.
- **SQL 인덱스 검증**: `(dong_id, deal_date)` + `(deal_type, deal_date)` 인덱스 확인됨. EXPLAIN ANALYZE 로 Index Scan 회귀 가드.
- **응답 페이로드**: 426 dong × 4 필드 ≈ 50KB. gzip 후 8KB. 무시.
- **frontend re-render**: HeatMap polygon 426개 → react-leaflet GeoJSON layer 단일 마운트. `layerKey` 메모이즈로 mode/data 변경 시에만 리마운트.

---

## 9. 검증 / 테스트 사양 (eng-review)

### 9.1 Backend unit tests (`backend/apps/neighborhoods/tests/test_match.py` 신규)

```python
# 필수 케이스 — pytest 또는 Django TestCase
class MatchEndpointTests:
    def test_default_filters_returns_426_dongs(self):
        # GET /api/dongs/match-counts (no query) → 200 + len(dongs) == 426
    def test_zero_match_filter(self):
        # 보증금 -1 같은 극단 → 0 매칭 → 모든 동 ratio=0, count=0
    def test_ratio_normalized_0_to_100(self):
        # 정상 필터 → 가장 많은 동 ratio≈100, 가장 적은 ratio>=0
    def test_invalid_period_returns_400(self):
        # period=999 → 400
    def test_deposit_min_gt_max_returns_400(self):
        # deposit_min=5000, deposit_max=1000 → 400
    def test_cache_hit_returns_same_response(self):
        # 같은 필터 두 번 호출 → 두 번째 캐시 hit (Redis 모킹)
    def test_apply_filters_shared_with_explore(self):
        # parse_explore_filters 와 동일한 input → 동일한 queryset
        # explore.py 재사용 검증 (regression 방지)
```

### 9.2 Backend integration test

```python
def test_match_endpoint_uses_dong_id_index():
    # EXPLAIN ANALYZE 로 Index Scan 확인 (idx (dong_id, deal_date))
    # Seq Scan 발생 시 fail
```

### 9.3 Frontend unit tests

```typescript
// MatchFilterPanel.test.tsx
describe('MatchFilterPanel', () => {
  test('chip 토글 → URL 갱신', /* ... */);
  test('마지막 chip 비활성 시도 → 무시 (최소 1개)', /* ... */);
  test('range slider min > max 시도 → swap 또는 boundary 보장', /* ... */);
  test('초기화 버튼 → default 필터로 복귀', /* ... */);
});

// useDongMatchCounts.test.ts
describe('useDongMatchCounts', () => {
  test('필터 변경 → debounce 200ms 후 fetch', /* ... */);
  test('동일 필터 → React Query 캐시 hit', /* ... */);
});
```

### 9.4 Regression tests (CRITICAL — 기존 score 모드 깨지지 X 보장)

```typescript
// HeatMap.test.tsx
test('REGRESSION: mode=score → 기존 score 색칠 동작 (Phase 4 회귀 방지)', /* ... */);
test('REGRESSION: layerKey 메모이즈 → mode 변경 시 강제 리마운트', /* ... */);
```

### 9.5 E2E tests (Playwright 또는 vitest+browser, project 채택 framework 따름)

```
e2e/main-map-match-filter.spec.ts
- 첫 진입: STUDIO MATCH 패널 보임 + LAYERS '매칭' 선택됨
- 슬라이더 drag → 카운트 변화 + 히트맵 색 transition
- LAYERS 종합 클릭 → WEIGHTS 활성 + Legend 라벨 변경
- 동 클릭 → 동 패널 매칭 카드 표시
- '자세히 탐색하기' → /dong/<slug>/explore?<필터> 로 query string 그대로 전달
- URL query 새로고침 → 필터 복원
- 0건 매칭 필터 → EMPTY 메시지 + 모든 polygon NO_DATA
```

### 9.6 Test framework
이 프로젝트는 frontend 에 vitest 미설치 (Phase 4.7 design-review 시점 확인). **본 plan 구현 전에 vitest setup 추가 필요** — 또는 Django backend 만 unit test 작성하고 frontend 는 E2E + manual.

권장: 본 plan 의 첫 step 으로 **frontend vitest + @testing-library/react + jsdom setup** 추가. 한번 setup 하면 Phase 4.8 explore 페이지 + 본 plan 모두 자동 보강.

### 9.7 Coverage 목표
- Backend match endpoint: ≥90%
- Frontend MatchFilterPanel: ≥80%
- E2E user flows: 5종 모두 (smoke + 1 full match journey)
- Regression: HeatMap mode 분기 + URL state 일관성

---

## 10. 디자인 결정 — plan-design-review 결과 (2026-05-09)

### 10.1 Pass별 score
| Pass | Before | After |
|---|---|---|
| 1. Information Architecture | 4/10 | 9/10 (ASCII 와이어프레임 + 정보 위계 + 모드 전환 affordance) |
| 2. Interaction State Coverage | 2/10 | 9/10 (5 컴포넌트 × LOADING/EMPTY/ERROR/SUCCESS/PARTIAL 매트릭스) |
| 3. User Journey & Emotional Arc | 5/10 | 9/10 (7-step storyboard + 5/5/5 time-horizon + trust signals) |
| 4. AI Slop Risk | 7/10 | 9/10 (10패턴 모두 회피 검증 + chip/카운트/dot/tooltip 정밀 spec) |
| 5. Design System Alignment | 7/10 | 9/10 (token 표 + 컴포넌트 reuse 명시) |
| 6. Responsive & Accessibility | 5/10 | 9/10 (Tab 순서 + ARIA + 콘트라스트 검증 + Touch 44px) |
| 7. Unresolved Decisions | 6/10 | 10/10 (Q1~Q6 모두 결정, Q1은 사용자 확인) |

### 10.2 첫 진입 default (Q1 사용자 확정)
**매칭 모드** — 자취생 첫 화면이 자기 조건으로 즉시 시작. SPEC 5.1 의 종합점수 기본값을 본 plan 에서 override.

### 10.3 Approved Mockups
plan-design-review 진행 시 OpenAI API key 미설정으로 시각 mockup 생성 X. ASCII 와이어프레임(섹션 5.1)이 시각 레퍼런스 역할.

향후 mockup 필요시: 사용자 platform.openai.com key 발급 → `! echo '{"api_key":"sk-..."}' > ~/.gstack/openai.json` → `$D variants --brief "..."`로 보강.

### 10.4 NOT in scope (의도적 제외)
- Saved searches / 즐겨찾기 — 별도 plan
- 매칭 결과의 시계열 추세 (지난주 대비 매물 변화) — 별도 plan
- 모바일 반응형 (project memory: desktop only)
- 비교 페이지 BI화 — 별도 plan
- 인구·교통 등 score 와의 결합 점수 — 별도 plan

### 10.5 What already exists (재사용)
(원래 위치 그대로)
- `.explore__chip*` (Phase 4.7 Soft Stone active fill, 44px height)
- `.explore__range-inputs input[type=range]` (Phase 4.7 18px Ink thumb)
- `HEATMAP_COLORS` 5단 그린 그라데이션 (DESIGN_SYSTEM)
- `HEATMAP_NO_DATA` (Soft Stone 70% opacity)
- `useExploreFilters` URL state 패턴 (Phase 4.8 explore — match 페이지에도 동일 패턴 적용)
- DongPanel 컴포넌트 (Phase 5/6)
- LayerSwitcher / Legend / WeightsSlider 기존 컴포넌트

신규 컴포넌트 4개:
- `MatchFilterPanel.tsx` (사이드바 새 패널)
- `MatchModeBadge.tsx` (헤더 Coral dot)
- `MatchKpiCard.tsx` (동 패널 매칭 카드)
- `useDongMatchCounts.ts` (React Query hook)


## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 1 | issues_found | 18 outside-voice issues (1 user-confirmed: 카피 정확화 / 17 auto-applied) |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | clean | 11 issues, 0 critical gaps (#1·#6·#10·#18 user-decided, 나머지 plan에 반영) |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | clean | score: 6/10 → 9.1/10, 6 decisions |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

**CODEX:** Plan에 18 issues 자동 반영 (#18 카피·#1 default·#6 매치 디테일 endpoint·#10 cache key 등).
**CROSS-MODEL:** Eng review와 Codex 모두 (a) 기존 단편 필터 통합, (b) URL state debounce/replace, (c) SQL 인덱스 검증 강조 — 합의점 강함.
**UNRESOLVED:** 0
**VERDICT:** **DESIGN + ENG CLEARED.** 본 plan 으로 구현 가능. 첫 step = vitest setup → backend match endpoint + match-detail endpoint → frontend MatchFilterPanel + HeatMap mode 분기 → E2E.
