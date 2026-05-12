# 변경 이력

## 2026-05-12
- 디자인 시스템 토큰 리팩토링: Soft Stone/JetBrains Mono 제거, MetricBar 물 탄 색 적용, weight tone primary-green 통일
- tokens.css ↔ DesignSystem.tsx 완전 동기화 (시맨틱 alias, 레거시 alias, 맵 레이아웃 토큰 추가)
- DESIGN_SYSTEM.md, design-system-keeper.md 에이전트 스펙 갱신
- 프로젝트 핸드오프 시스템을 STATE.md + CHANGELOG.md 체제로 전환

## 2026-05-09
- 실데이터 ETL 완료: 426개 행정동, 740만 거래, 53만 상점, 800만 버스혼잡 데이터 적재
- 편의시설 11카테고리 파생 (18만 7천건), 카테고리별 가중 점수 산출
- STUDIO MATCH 필터 구현: 보증금/월세/면적/대학 근처 조건으로 매칭 거래량 히트맵
- 메인 지도 UX 정리: LAYERS 5옵션 → MAP MODE 2옵션 (매칭/종합점수)

## 2026-05-08
- RDS 연동 Django 모델 확장: 11개 신규 모델 (regions, metrics, parks 앱)
- 디자인 시스템 쇼케이스 페이지 추가 (/design-system)

## 2026-05-04
- 디자인 폴리시 v2: TopNav, 동네 패널 슬라이드 애니메이션, 비교 페이지 하이라이트

## 2026-05-03
- 디자인 피벗: Cohere-inspired 미감으로 전환 (white canvas + green primary + Near-Black accent)
- 거래 핀/클러스터 지도 표시, 커널 점수 API, 동네 탐색 대시보드
- 선호 학습 환산 전월세 반영, radius 체계 통일 (md=8px, card=16px)

## 2026-05-02
- 프로젝트 초기 구축 완료: 9단계 전체 (셋업 → 디자인 → 백엔드 → 지도 → 패널 → 상세 → 선호 → 비교 → 인증/마이페이지)
- 데이터 파이프라인 스켈레톤 작성
