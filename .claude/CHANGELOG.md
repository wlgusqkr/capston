# 변경 이력

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
