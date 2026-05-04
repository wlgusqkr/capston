# Frontend: 메인 지도 핀 hover preview + maxZoom 19 + Preference 환산 표시

작업 일자: 2026-05-03
담당: frontend-engineer (auto)
선행 컨텍스트: `docs/handoff/20260503-rent-conversion-frontend.md`, `docs/handoff/20260503-rent-conversion-backend.md`

## 요약

메인 지도 사용성 3건:
1. 거래 핀에 hover Tooltip — 클릭 없이도 지번/평균 환산월세를 미리 본다.
2. maxZoom 18 → 19 — 더 깊은 확대 가능.
3. 줌별 동적 핀 사이즈 — 깊은 줌에서 잘 보이게.
4. PreferenceModal 비교 카드: "평균 환산 월세" 라벨 + 보증금 환산 hint.

## 변경 파일

| 파일 | 변경 |
| --- | --- |
| `frontend/src/components/Map/TransactionPinLayer.tsx` | hover Tooltip 추가, 줌별 dynamic radius, suppressTooltips prop, jibun 그룹별 평균 환산월세 사전 계산 |
| `frontend/src/components/Map/HeatMap.tsx` | MapContainer + TileLayer maxZoom 18 → 19 |
| `frontend/src/components/Map/HeatMap.css` | `.tx-pin-tooltip` 스타일 추가 (where + price line) |
| `frontend/src/routes/MainMap.tsx` | TransactionPinLayer에 `suppressTooltips` prop 전달 (어떤 패널이든 열려 있으면 비활성) |
| `frontend/src/types/api.ts` | `PairCard.rent_converted?: number \| null` 옵셔널 필드 추가 (백엔드 미적용 케이스 방어) |
| `frontend/src/components/Onboarding/PreferenceModal.tsx` | 카드 metric 라벨 "평균 월세" → "평균 환산 월세" + "보증금 환산" hint, `rent_converted` 우선·`rent_avg` 폴백 |
| `frontend/src/components/Onboarding/PreferenceModal.css` | `.pref-modal__metric-hint` mono uppercase 마이크로 라벨 스타일 |

## 줌별 핀 사이즈

`pinRadiusForZoom(zoom)` (Leaflet `radius` 단위는 **반지름 px**, 직경은 ×2):

| 줌 | 기본 radius | 직경 | selected radius | 직경 |
| --- | --- | --- | --- | --- |
| 13~14 | 6 | 12 | 8 | 16 |
| 15~16 | 7 | 14 | 9 | 18 |
| 17+ | 9 | 18 | 11 | 22 |

`zoomend`에서 즉시 `setZoom` (debounce 없음) → 핀 크기 반응 즉각. 데이터 fetch는 그대로 250 ms 디바운스.

## Tooltip 디자인 결정

| 항목 | 결정 |
| --- | --- |
| 컴포넌트 | react-leaflet `<Tooltip>` (CircleMarker 자식) |
| 방향 | `direction="top"`, offset `[0, -radius - 2]` (핀 크기 따라 자동 조정) |
| Permanent | `false` (hover에서만) |
| Pointer events | `none` (마우스 이동 방해 X) |
| 컨텐츠 1행 | `{dong_name} {jibun}` — Pretendard caption 500 weight |
| 컨텐츠 2행 | `{avgConverted}만원 평균 · {count}건` (1건이면 `{avgConverted}만원 환산`) — mono tabular |
| `avgConverted` | jibun 그룹 내 `converted_rent` 평균 (round half-up). `groups` 메모에서 미리 계산 → 렌더당 reduce 없음 |
| Suppress 조건 | `selectedJibun != null \|\| selectedSlug != null \|\| kernelPoint != null` (어느 패널이든 열려 있으면 hover preview 죽임) + 자기 자신이 selected일 때도 |

배경/테두리/그림자는 기존 `.leaflet-tooltip` (HeatMap.css)에서 상속 — 흰 surface, hairline border, `--shadow-floating`. 추가 padding 만 줄여 (`var(--space-1) var(--space-2)`) "피크" 느낌으로.

## PreferenceModal — 환산 표시

`PairCard` 카드 첫 metric:

```
평균 환산 월세  보증금 환산
                   85만원
```

- `card.rent_converted`가 number면 `{n}만원`, null/undefined면 `card.rent_avg` 폴백.
- "보증금 환산" 마이크로 라벨은 mono uppercase + `--color-text-subtle` — 디자인 시스템 "data marker" 컨벤션. 라벨 옆에 inline-flex baseline 정렬.
- `Compare.tsx` `rent_converted_avg`와 같은 의도. 단일성 유지.

## 백엔드 의존

| 필드 | 현재 상태 | 행동 |
| --- | --- | --- |
| `RentDealPin.converted_rent` | 적용됨 (commit `b243bfb`) | hover Tooltip이 직접 사용 |
| `PairCard.rent_converted` | **미적용** (2026-05-03 기준) — backend agent가 병렬 작업 중 | 옵셔널로 타입 선언, `rent_avg` 폴백 |

백엔드가 `rent_converted` 추가 후 별도 프런트 코드 수정 불필요 — 응답에 필드가 들어오는 순간 자동으로 표시됨.

## 채택 / 기각한 폴리시

채택:
- 줌별 dynamic 핀 사이즈 (요구사항)
- 패널 열려 있을 때 hover tooltip 비활성 (사이드바/패널과 시각 충돌 방지)
- selected 핀 자기 자신은 hover tooltip 비활성 (이미 패널이 정보 제공)
- jibun 그룹 평균 사전 계산 — 렌더 비용 0
- maxZoom 19 (요구사항)

기각:
- "전체 보기로" 버튼 (zoom out hint) — 현재 ZoomControl로 충분, UI 노이즈
- 핀 hover 시 카드 살짝 커지기 — selected와 시각 위계 혼동 우려, Tooltip만으로 충분
- 거래 0건 지역 별도 hint overlay — 기존 zoom hint(`tx-zoom-hint`)와 패널 빈 상태 메시지로 이미 커버
- supercluster — 스코프 초과 (요구사항에서도 명시 제외)

## 잔여 갭

- **줌 13에서 핀이 빽빽해 hover 충돌 가능**: 같은 jibun은 이미 1개 마커로 합쳐지지만 인접 jibun들이 가까이 모이면 hover가 잘못된 핀에 걸릴 수 있음. supercluster 미도입이라 근본 해결 X — 줌 14+ 사용 권장.
- **VWorld z=19 일부 영역**: 서울 외곽(노원/도봉/강남 외곽)은 z=19에서 빈 타일이 일시적으로 비치는 경우 있음. Leaflet이 z=18에서 stretch 하므로 사용성에는 무리 X.
- **PairCard `rent_converted` 미수령 시**: 현재는 `rent_avg` (점수 derived, 120 - score_rent) 폴백. 백엔드 적용 전까지는 환산값이 아닌 raw 더미 값이 보임. 폴백 자체는 깨지지 않음.

## 검증 방법

1. `cd frontend && npm run dev`
2. http://127.0.0.1:5173 진입 — 줌 13 이상으로 확대.
3. 핀 위에 마우스 hover → 흰 카드 (지번 + "X만원 평균 · N건") 떠야 함.
4. 핀 클릭 → 패널 열림. 패널 열린 상태에서 다른 핀 hover → tooltip 안 떠야 함.
5. 패널 닫으면 다시 hover preview 작동.
6. ZoomControl `+` 클릭하여 18 → 19까지 확대 가능 확인.
7. 줌 17/19에서 핀 크기 다른지 눈으로 비교.
8. 사이드바 "비교 기반 자동 추천" → 모달 카드의 첫 metric 라벨이 "평균 환산 월세" + 작은 "보증금 환산" 표기.
9. 콘솔 에러 0 / `npm run build` 통과 (확인 완료).

## 다음 작업자에게

- 백엔드 `PairCard` 응답에 `rent_converted` 추가되면 별도 프런트 변경 없음 — 자동 적용.
- 만약 hover tooltip이 시각적으로 무겁다는 피드백 나오면 `.tx-pin-tooltip` 패딩 더 줄이거나 `direction`을 `auto`로 바꿔 화면 가장자리 자동 회피 추가 가능.
- 줌 19 사용성 모니터링 — 사용자 피드백에서 빈 타일 보고 다수면 18로 되돌리고 별도 줌 hint 추가.
