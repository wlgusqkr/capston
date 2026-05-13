# 변경 이력

## 2026-05-13
- **Phase 2**: 인구·사회 섹션 (남녀 비율 도넛/인구 추이 라인/청년 비율 카드/1인 가구 추정)
- **Phase 2**: 안전·환경·경제 섹션 (6분야 안전등급 레이더/교통사고 통계/녹지·GRDP·화재 지표, 구 단위 뱃지)
- 대시보드용 인구 시계열 API (`/api/dongs/<slug>/population`)와 구별 지표 API (`/api/dongs/<slug>/gu-metrics`) 추가
- 카테고리 컬러 토큰 6종, 히트맵 레이어 팔레트 5종 (각 5단계), shimmer 키프레임 추가
- Gauge 원형 게이지 프리미티브 추가 (차오르는 애니메이션)
- 대시보드 라우트(`/dashboard`) 추가, 동 셀렉터 + 섹션 placeholder 셸 구현
- TopNav에 맵/대시보드 네비탭 + AI 검색 버튼 추가
- AI 사이드 패널 shell 구현 (mock 응답, 레이아웃 시프트 방식)
- **Phase 1**: 대시보드 KPI 행 (환산월세/보증금/거래건수/안전게이지, 카운트업 애니메이션)
- **Phase 1**: 미니맵 (히트맵 6종 레이어 토글 + 컬러칩 범례 + 확장 버튼 + 동 클릭)
- **Phase 1**: 부동산 시세 섹션 (월별 추이 라인/유형 도넛/산점도/보증금 바, Recharts 애니메이션)
- **Phase 1**: 편의시설 섹션 (카테고리별 테이블 + 충분도 뱃지 + 자취생 필수시설 칩 그리드)
- **Phase 1**: 교통 섹션 (지하철역 TOP3 + 호선 색상 + 버스 정류장/노선 수)

## 2026-05-12 — 사이드바 CSS 깨짐 수정 + QA 이슈 해결
- Chip UI 프리미티브 추가, 사이드바 필터 칩/라디오/레인지 슬라이더 스타일 복원
- Slider 프리미티브 thumb 정렬 버그 수정 (원이 바 아래로 치우치던 문제)
- Slider track gradient를 Slider 전용으로 스코프 (필터 슬라이더에 50% 채우기 노출 방지)
- Button disabled 색상, Legend 히트맵 토큰, 임의 px값 토큰 전환 등 QA 지적사항 일괄 수정
- apt 차트 색상을 CHART_COLORS로 통합

## 2026-05-12 — 디자인 시스템 v2 + Tailwind CSS 전환
- 컬러 토큰 시맨틱 리네이밍: 61개 → 25개 + 14개 불변 = 39개
  - 구체적 색상명(near-black, ink, hairline 등) → 역할명(secondary, text, divider 등)
- MetricBar 컬러: score (#FB6666/#FFD82A/#059669/#C1CCFF/#5570F1), weight → primary
- Status/MetricBar 색상 통합 (danger/warning/success/info)
- Tailwind CSS v4.3.0 설치, @theme 토큰 매핑
- 컴포넌트 CSS 파일 40+ → 0개 (globals.css 단일)
  - 모든 스타일 JSX className으로 인라인 전환
  - @keyframes, Leaflet 오버라이드, DivIcon 스타일은 globals.css 유지
- tokens.css 삭제 → globals.css @theme 통합
- 폰트: Pretendard only (Space Grotesk, Inter 제거)
- colors.ts hex 동기화
- CSS 크기: 128KB → 69KB (46% 감소)

## 2026-05-09
- 실데이터 ETL 완료: 426개 행정동, 740만 거래, 53만 상점, 800만 버스혼잡
- STUDIO MATCH 필터 구현
- MAP MODE 2옵션 정리 (매칭/종합점수)

## 2026-05-08
- RDS 연동 Django 모델 확장: 11개 신규 모델
- 디자인 시스템 쇼케이스 페이지 추가

## 2026-05-04
- 디자인 폴리시 v2: TopNav, 동네 패널 슬라이드, 비교 페이지 하이라이트

## 2026-05-03
- Cohere-inspired 디자인 피벗
- 거래 핀/클러스터, 커널 점수 API, 동네 탐색 대시보드

## 2026-05-02
- 프로젝트 초기 구축 완료 (9단계)
