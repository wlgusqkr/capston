// MapModeToggle — 메인 지도 사이드바의 MAP MODE 토글 (Phase 5 cleanup).
//
// 기존 LayerSwitcher (LAYERS 5종 라디오) 폐기. WEIGHTS 와 의미가 겹쳐
// 사용자 혼란 (LAYERS=전월세 + WEIGHTS 슬라이더 동시 활성) 을 만들었음.
//
// 새 모델:
//   - '매칭' (거래량 분포)  → MatchFilterPanel 의 자취 거래량 히트맵
//   - '종합 점수'           → WEIGHTS 슬라이더 활성, composite 가중합 히트맵
//   단일 축 (전월세/시설/교통) 보기는 WeightSliders 의 프리셋 칩 (100/0/0) 으로 표현.
//
// 디자인 토큰: WEIGHTS 위 사이드바 섹션 헤더와 동일 시각 어휘.
//   - eyebrow mono "MAP MODE"
//   - 두 항목 vertical radio (Soft Stone active fill, Ink outline)
//   - match 모드일 때 헤더 우측 Coral dot (MatchFilterPanel 과 동일 어휘)

import './MapModeToggle.css';

export type MapMode = 'match' | 'score';

const OPTIONS: Array<{ value: MapMode; label: string; sub: string }> = [
  { value: 'match', label: '매칭', sub: '거래량 분포' },
  { value: 'score', label: '종합 점수', sub: '가중치 기반' },
];

export interface MapModeToggleProps {
  mode: MapMode;
  onModeChange: (next: MapMode) => void;
}

export default function MapModeToggle({ mode, onModeChange }: MapModeToggleProps) {
  return (
    <div className="map-mode-toggle" role="radiogroup" aria-label="지도 모드">
      {OPTIONS.map((opt) => {
        const selected = opt.value === mode;
        return (
          <label
            key={opt.value}
            className={`map-mode-toggle__item${
              selected ? ' map-mode-toggle__item--active' : ''
            }`}
          >
            <input
              type="radio"
              name="map-mode"
              value={opt.value}
              checked={selected}
              onChange={() => onModeChange(opt.value)}
            />
            <span className="map-mode-toggle__label">{opt.label}</span>
            <span className="map-mode-toggle__sub">{opt.sub}</span>
          </label>
        );
      })}
    </div>
  );
}
