# Frontend: 6단계-B — 동네 상세 페이지 (DongDetail, SPEC 6.3)

작성: 2026-05-02 (frontend-engineer)
근거: SPEC 6.3 (모든 섹션), SPEC 8 (URL `/dong/:slug`), step6a 백엔드 핸드오프 (`GET /api/dongs/:slug/detail`).

---

## Routes added

- `/dong/:slug` → `routes/DongDetail.tsx` — full detail page (SPEC 6.3)
- 라우트 등록: `src/App.tsx`에 `<Route path="/dong/:slug" element={<DongDetail />} />`
- DongPanel의 "자세히 보기" 버튼이 이미 `useNavigate('/dong/:slug')` 호출 중. 자동 동작.

---

## Components added

신규 디렉토리 `src/components/Detail/`:

- `HeroSection.tsx` — 좌측 동 이름 + Score + vs-Seoul 배지 + 한 줄 요약, 우측 280px 정사각형 미니 지도 (별도 `<MapContainer>` 인스턴스, scrollWheelZoom/dragging 비활성)
- `RealEstateSection.tsx` — 기간 토글(3/6/12개월, 클라이언트에서 trend slice) + Recharts LineChart(villa/multi/officetel 3선, `connectNulls={false}`로 null 자동 끊김) + Recharts horizontal BarChart(보증금 5대역) + 최근 실거래 5건 테이블
- `AmenitySection.tsx` — 8개 카테고리 카드 그리드 2열 (count + density + Badge sufficient→success/normal→warning/lacking→danger)
- `TransitSection.tsx` — 좌(가까운 역 3개 리스트, 1위는 `Badge variant="success"` + soft 배경 강조), 우(버스 카드: 큰 정류장 수 + 작은 노선 수)
- `ReviewSection.tsx` — 평균 별점(★ glyph, secondary 오렌지로 채움) + 리뷰 수 + 대표 리뷰 3개 카드(line-clamp 4) + "전체 리뷰 보기 →" CTA(alert)
- `SimilarDongsSection.tsx` — 3열 카드, `as="button"`으로 클릭 시 `useNavigate('/dong/:slug')` 이동

각 컴포넌트는 동반 `.css` 파일로 스타일 분리. 모두 디자인 토큰만 사용.

신규 라우트 파일:
- `routes/DongDetail.tsx` — 6개 섹션 + topbar(← 지도로 + breadcrumb) + 하단 sticky CTA 바(비교/찜/공유 alert)
- `routes/DongDetail.css`

---

## API hooks added

- `useDongDetail(slug, weights)` in `src/hooks/useDongs.ts`
  - 엔드포인트: `GET /api/dongs/:slug/detail?w_rent=&w_amenity=&w_transit=`
  - `enabled: !!slug` — slug undefined/빈 문자열이면 비활성
  - queryKey: `['dongs', 'detail', slug, w_rent, w_amenity, w_transit]`
  - staleTime 60s

수반:
- `getDongDetail(slug, weights)` in `src/lib/api.ts`
- `DongDetail` 인터페이스 in `src/types/api.ts` — step6a 핸드오프의 TS 인터페이스 그대로 (snake_case 유지)

---

## 산출물 (모두 절대 경로)

신규:
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/routes/DongDetail.tsx`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/routes/DongDetail.css`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Detail/HeroSection.tsx`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Detail/HeroSection.css`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Detail/RealEstateSection.tsx`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Detail/RealEstateSection.css`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Detail/AmenitySection.tsx`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Detail/AmenitySection.css`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Detail/TransitSection.tsx`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Detail/TransitSection.css`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Detail/ReviewSection.tsx`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Detail/ReviewSection.css`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Detail/SimilarDongsSection.tsx`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Detail/SimilarDongsSection.css`

수정:
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/App.tsx` — `/dong/:slug` 라우트 추가
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/types/api.ts` — `DongDetail` 인터페이스 추가
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/lib/api.ts` — `getDongDetail` 추가
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/hooks/useDongs.ts` — `useDongDetail` 추가
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/lib/colors.ts` — `CHART_COLORS` (라이트/다크) 추가
- `/Users/bagjihyeon/Desktop/School/capston/frontend/package.json` — `recharts` 의존성 추가

---

## 결정 사항

### F1. 가중치 — 기본값 33/33/34 (메인 지도 가중치 미인계)

메인 지도 weights는 `MainMap` useState 메모리에 위치. detail 페이지로 이동 시 라우트만 바뀌므로 별도 lift-state 또는 URL 파라미터 없이는 가져올 수 없음.

선택지:
- (A) URL 쿼리 파라미터로 전달 (`/dong/:slug?w_rent=...`)
- (B) Context provider로 전역 weights 들어올리기
- (C) 기본값 33/33/34로 detail 진입 시 항상 균등 — **선택**

이유: 핸드오프 요건(F1 "default 33/33/34로")에 부합 + 8단계 마이페이지에서 사용자 가중치 영속화 결정 후 일괄 정리. detail 페이지의 핵심 정보(부동산/편의시설/교통/리뷰/유사동)는 가중치에 의존하지 않음(가중치는 종합 점수와 vs_seoul_avg_pct만 변동). 메인 지도와 detail 페이지에서 점수가 살짝 다르게 보일 수 있으나 학부 프로젝트 스코프에서 허용 가능.

### F2. 미니 지도 — 별도 `<MapContainer>` 인스턴스

react-leaflet은 동일 페이지에 다수 MapContainer를 렌더해도 충돌 없음. 메인 지도와 분리된 별도 인스턴스. `scrollWheelZoom={false}`, `dragging={false}`, `doubleClickZoom={false}`, `zoomControl={false}`, `attributionControl={false}`로 페이지 스크롤/UX 방해 최소화.

### F3. 차트 컬러 — `lib/colors.ts` 콘스턴트 (CSS var 미사용)

Recharts는 CSS variable을 prop으로 받지 못함. SPEC 4.2 데이터 컬러 헥스를 `CHART_COLORS` (라이트) / `CHART_COLORS_DARK` (다크)로 미러. 현 단계에서는 라이트 팔레트만 사용. 다크 모드에서도 가독성 유지(데이터 hue가 다크 surface에서도 충분한 대비).

### F4. 기간 토글 — 클라이언트에서 trend slice

3/6/12개월 토글은 백엔드가 항상 12개월치 trend를 보내고, 프론트가 `slice(-N)`으로 자른다. 백엔드 round-trip 없음. SPEC 14.3 정신과 일치.

### F5. 별점 표시 — `★` glyph + secondary 오렌지

5개 star를 인라인 span으로 렌더, `Math.round(rating)`로 정수 별점 (4.3 → 4개 채움). secondary 토큰(따뜻한 오렌지)이 별점에 자연스럽게 어울림.

### F6. similar_dongs 카드 — `Card as="button"`

Card를 button으로 렌더해 키보드 포커스/엔터 클릭 자동 처리. focus-visible 링은 디자인 시스템 토큰.

### F7. 점수 / 점수 색상 매핑

HeroSection에서 미니 지도 핀 색은 종합점수의 4단계 색(`scoreToHeatmapColor`)을 그대로 사용. 메인 지도 폴리곤과 시각적 일관성.

### F8. vs_seoul_avg_pct 배지 variant

- `>= +5%` → success (서울 평균보다 좋음)
- `<= -5%` → danger (서울 평균보다 나쁨)
- 그 사이 → warning (비슷함)
임계값 5는 임의. step6a 백엔드 baseline이 65 임시값이라 정밀도 재조정은 step10에서.

### F9. 리뷰 본문 line-clamp 4

대표 리뷰 카드 높이를 일정하게 맞추기 위해 `-webkit-line-clamp: 4`. 전체 본문은 "전체 리뷰 보기"에서 노출(미구현 alert).

---

## 검증

### Build / typecheck
- `npx tsc --noEmit` → PASS (0 errors)
- `npm run build` → PASS
  - 942 modules transformed
  - dist/index-*.js: 810.52 KB / gzip 248.82 KB (recharts 추가로 약 +400KB; 학부 프로젝트 단계라 chunk-split 미적용)
  - dist/index-*.css: 59.87 KB / gzip 13.28 KB

### 백엔드 응답
- `GET /api/dongs/pildong/detail?w_rent=33&w_amenity=33&w_transit=34` → 200, 모든 섹션 포함
- 5개 동(pildong/hoegidong/seogyodong/yeoksamdong/jamsildong) 모두 200
- 존재하지 않는 slug → 404

### Vite dev 서버
- `npm run dev` 부팅 정상 (포트 5175 자동 fallback)
- `/dong/pildong` 라우트 200, `DongDetail.tsx` / `RealEstateSection.tsx` transform 200
- 프록시 통한 `/api/dongs/pildong/detail` 200 반환 (Django 8000 → 5175)

### 시각 검증 절차

```bash
# 터미널 1
cd /Users/bagjihyeon/Desktop/School/capston/backend
.venv/bin/python manage.py runserver

# 터미널 2
cd /Users/bagjihyeon/Desktop/School/capston/frontend
npm run dev
```

브라우저 http://localhost:5173 (또는 자동 fallback 포트):

- [ ] 메인 지도 → 폴리곤 클릭 → 패널 → "자세히 보기" → URL이 `/dong/pildong`으로 변경, 상세 페이지 표시
- [ ] 상단: ← 지도로 (Link) + 동 이름 breadcrumb
- [ ] HeroSection: 좌측 구(작게) + 동(H1) + Score lg + vs Seoul 배지 + 한 줄 요약 / 우측 280×280 미니 지도 + 핀
- [ ] RealEstateSection: 제목 + 3/6/12개월 토글(클릭 시 LineChart 데이터 줄어듦) + 좌 LineChart 3선 + 우 horizontal BarChart 5밴드 + 하 실거래 5건 테이블
- [ ] AmenitySection: 8개 카드 2열 그리드. 각 카드: 카테고리 + count + density + Badge
- [ ] TransitSection: 좌 가까운 역 3개(1위 강조 soft 배경) / 우 버스 큰숫자(정류장)+작은숫자(노선)
- [ ] ReviewSection: 평균 별점 + 카운트 + 대표 리뷰 3개 카드(별점/제목/학교/본문/날짜) + 전체 리뷰 CTA(alert)
- [ ] SimilarDongsSection: 3열 카드, 클릭 시 다른 동의 detail 페이지로 이동
- [ ] 하단 sticky CTA 바: 비교에 추가 / 찜하기 / 공유 (각각 alert)
- [ ] 5개 동 모두 입장 가능: pildong, hoegidong, seogyodong, yeoksamdong, jamsildong
- [ ] 다크 모드 (`document.documentElement.setAttribute('data-theme','dark')`) → 모든 섹션 자동 다크 톤. Recharts 라인/바 색은 라이트 팔레트 hex 그대로(다크 surface 위에서도 가독성 OK).
- [ ] 직접 URL 진입(`/dong/pildong`) 시에도 정상 렌더

---

## 7단계(선호 학습) frontend-engineer가 알아야 할 것

### 라우트 / 컴포넌트 진입점
- `/onboarding` 라우트 추가 시 `App.tsx`에 한 줄 등록.
- 이미 시스템에 `Modal` 프리미티브 존재(`@/components/ui`). `<Modal open={...} maxWidth={600}>` + 내부에 비교 카드 2개 레이아웃.

### 메인 지도 가중치 영속/공유
- `MainMap`의 weights는 현재 useState 메모리 only. 7단계 선호학습 결과(`{w_rent, w_amenity, w_transit}`)를 메인 지도에 자동 적용해야 함.
- 옵션:
  - (A) URL 쿼리(`/?w_rent=...`)
  - (B) `WeightsProvider` Context (CLAUDE.md "메모리 상태로 처리"와 정합)
  - (C) `MainMap` 부모로 들어올리기
- 추천: **B (Context)** — detail 페이지에서도 같은 weights 참조 가능 + "메인 지도에서 확인하기" 트랜지션 자연스러움.

### Detail 페이지 weights 정합성
- 현재 detail 페이지는 weights를 `DEFAULT_WEIGHTS`로 고정 사용. 7단계에서 Context 도입 시 `DongDetail.tsx`도 `useWeights()`로 교체하면 일관성 회복.

### 학습 결과 → 메인 지도 트랜지션 (SPEC 6.5)
- 모달 닫기 → `setWeights(result)` → `useDongScores(weights)` 자동 refetch → `<HeatMap>` 폴리곤이 `--transition-slow` (300ms)로 색상 트랜지션. 토큰은 step2 단계에서 정의됨.

### 비교 카드 레이아웃 재사용
- 7단계 비교 카드(2개 가로 분할: 구/동/평균월세/통학시간/생활시설)는 SPEC 6.5. 8단계 비교 페이지(SPEC 6.4)와 비슷한 컬럼 레이아웃이지만 "이게 더 좋아요" 버튼만 추가. Detail 페이지의 SimilarDongsSection 카드 패턴이 시작점으로 참고 가능.

### Recharts 사용 패턴 정착
- step6b에서 `lib/colors.ts`의 `CHART_COLORS` 콘스턴트 + Recharts ResponsiveContainer 패턴 정립. 7단계 결과 화면이 막대그래프(가중치 시각화)를 쓴다면 동일 패턴으로 이어가면 됨.

---

## 알려진 이슈 / 한계

1. **detail 페이지 weights 33/33/34 고정** — F1 결정 사항. 7단계 또는 8단계에서 Context 도입 시 해소.
2. **Recharts 다크 모드 자동 전환 안 함** — 차트 hex 콘스턴트가 라이트 팔레트로 고정. `useTheme()` 훅 또는 `prefers-color-scheme` 매처를 도입하면 다크 팔레트로 스왑 가능. 학부 데모 영향 없음(라이트 hex가 다크 surface 위에서도 가독성 OK).
3. **번들 크기 800KB 초과 경고** — recharts(~400KB) 추가 영향. 학부 프로젝트라 dynamic import / chunk split 미적용. 발표 데모 영향 없음.
4. **기간 토글이 12개월치 데이터 클라 slice** — 백엔드는 항상 12개월. 향후 백엔드 query param `?period=3m`이 추가되면 정밀화 가능. 현재 단계 적합.
5. **vs_seoul_avg_pct 임계값 ±5** — 백엔드 baseline 65 임시값과 정합. step10 실 데이터 도입 후 임계값 재조정 필요.
6. **CTA 바 sticky 동작** — bottom: 0으로 sticky. 매우 짧은 페이지(예: 모든 섹션 비어있는 동)에서는 bottom에 고정되지 않을 수 있음. 5개 더미 데이터에선 모두 충분히 길어 정상.
7. **5개 동 더미 한정** — 426개 적재(step10) 시 자연스럽게 해소.
8. **모바일 반응형 X** — 1280px+ 데스크톱 가정 (frontend-engineer 가이드).

---

## 디자인 시스템 갭 (design-system-keeper에 보고)

- 없음. 6단계 detail은 기존 토큰 + 컴포넌트(Button, Card, Badge, Score)로 100% 커버.
- "기간 토글"(3/6/12개월)은 segmented control 패턴이지만 1회 사용이라 인라인 구현. 7단계 이후 동일 패턴 반복되면 `Tabs` 또는 `SegmentedControl` 프리미티브 시스템화 검토.
- "별점 표시"는 ReviewSection 단일 사용. 마이페이지 / 비교 화면(별점 컬럼)에서도 사용 시 `Stars` 프리미티브 추출 검토.
