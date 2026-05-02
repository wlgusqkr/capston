// Left sidebar of the main map (SPEC 6.1).
//   1. Header — logo placeholder + search input (UI only for step 4)
//   2. Layer tabs — 종합 / 전월세 / 생활시설 / 교통 (visual only)
//   3. Weight sliders — three sliders that always sum to 100
//   4. CTA — "5번 비교로 자동 추천" (alerts in step 4, real flow in step 7)
//   5. Filters — UI only for step 4
import { useId } from 'react';
import { Link } from 'react-router-dom';

import { Button, Input, Slider } from '@/components/ui';
import { rebalanceWeights } from '@/lib/weights';
import type { Weights } from '@/types/api';
import type { WeightKey } from '@/lib/weights';

import './Sidebar.css';

const LAYERS = [
  { key: 'composite', label: '종합' },
  { key: 'rent', label: '전월세' },
  { key: 'amenity', label: '생활시설' },
  { key: 'transit', label: '교통' },
] as const;

type LayerKey = (typeof LAYERS)[number]['key'];

export interface SidebarProps {
  weights: Weights;
  onWeightsChange: (next: Weights) => void;
  activeLayer: LayerKey;
  onLayerChange: (next: LayerKey) => void;
  rentCapEnabled: boolean;
  onRentCapToggle: (next: boolean) => void;
  rentCap: number;
  onRentCapChange: (next: number) => void;
  nearUniversityOnly: boolean;
  onNearUniversityToggle: (next: boolean) => void;
  /** Open the preference learning onboarding modal (SPEC 6.5). */
  onOpenPreference: () => void;
  /** Number of dongs currently queued for compare (0~3). */
  compareCount: number;
  /** Navigate to /compare with the queued slugs. */
  onOpenCompare: () => void;
  /** Whether the heatmap polygons are visible (toggle for clearer base map). */
  heatmapVisible: boolean;
  /** Toggle heatmap visibility. */
  onToggleHeatmap: (next: boolean) => void;
  /** Display name when logged in (nickname || username). Null = logged out. */
  userName: string | null;
}

export default function Sidebar({
  weights,
  onWeightsChange,
  activeLayer,
  onLayerChange,
  rentCapEnabled,
  onRentCapToggle,
  rentCap,
  onRentCapChange,
  nearUniversityOnly,
  onNearUniversityToggle,
  onOpenPreference,
  compareCount,
  onOpenCompare,
  heatmapVisible,
  onToggleHeatmap,
  userName,
}: SidebarProps) {
  const universityCheckId = useId();
  const rentCapCheckId = useId();

  const handleWeight = (key: WeightKey) => (next: number) => {
    onWeightsChange(rebalanceWeights(weights, key, next));
  };

  return (
    <aside className="sidebar" aria-label="메인 지도 사이드바">
      <header className="sidebar__header">
        <div className="sidebar__logo" aria-label="슬기로운 자취생활 로고">
          <span className="sidebar__logo-mark">슬</span>
          <span className="sidebar__logo-text">슬기로운 자취생활</span>
        </div>
        <Input
          type="search"
          placeholder="동 이름 검색"
          aria-label="동 이름 검색"
          className="sidebar__search"
          // Real autocomplete arrives in step 5/6 alongside /api/dongs/search.
          disabled
        />
        <div className="sidebar__user">
          {userName ? (
            <Link to="/mypage" className="sidebar__user-link">
              <span className="sidebar__user-name">{userName}</span>
              <span className="sidebar__user-sep"> · </span>
              <span className="sidebar__user-action">마이페이지</span>
            </Link>
          ) : (
            <Link to="/login" className="sidebar__user-link sidebar__user-link--guest">
              로그인 →
            </Link>
          )}
        </div>
      </header>

      <section className="sidebar__section" aria-label="레이어">
        <h2 className="sidebar__section-title">레이어</h2>
        <div className="sidebar__tabs" role="tablist">
          {LAYERS.map((layer) => {
            const selected = layer.key === activeLayer;
            return (
              <button
                key={layer.key}
                type="button"
                role="tab"
                aria-selected={selected}
                className={
                  selected ? 'sidebar__tab sidebar__tab--active' : 'sidebar__tab'
                }
                onClick={() => onLayerChange(layer.key)}
              >
                {layer.label}
              </button>
            );
          })}
        </div>
        <label className="sidebar__check sidebar__heatmap-toggle">
          <input
            type="checkbox"
            checked={heatmapVisible}
            onChange={(e) => onToggleHeatmap(e.target.checked)}
          />
          <span>히트맵 표시</span>
        </label>
      </section>

      <section className="sidebar__section" aria-label="가중치">
        <div className="sidebar__section-head">
          <h2 className="sidebar__section-title">가중치</h2>
          <span className="sidebar__sum tabular">
            합 {weights.rent + weights.amenity + weights.transit}
          </span>
        </div>
        <div className="sidebar__sliders">
          <Slider
            label="전월세"
            value={weights.rent}
            onChange={handleWeight('rent')}
            valueText={`${weights.rent}%`}
          />
          <Slider
            label="생활시설"
            value={weights.amenity}
            onChange={handleWeight('amenity')}
            valueText={`${weights.amenity}%`}
          />
          <Slider
            label="교통"
            value={weights.transit}
            onChange={handleWeight('transit')}
            valueText={`${weights.transit}%`}
          />
        </div>
        <Button variant="primary" fullWidth onClick={onOpenPreference}>
          5번 비교로 자동 추천 →
        </Button>
      </section>

      <section className="sidebar__section" aria-label="비교 목록">
        <h2 className="sidebar__section-title">비교 목록</h2>
        <p className="sidebar__compare-hint">
          {compareCount === 0
            ? '동네 패널에서 "비교에 추가"를 누르세요.'
            : `현재 ${compareCount}/3개 담겼어요.`}
        </p>
        <Button
          variant="secondary"
          fullWidth
          onClick={onOpenCompare}
          disabled={compareCount === 0}
        >
          비교 보기 ({compareCount})
        </Button>
      </section>

      <section className="sidebar__section" aria-label="필터">
        <h2 className="sidebar__section-title">필터</h2>

        <label className="sidebar__check" htmlFor={universityCheckId}>
          <input
            id={universityCheckId}
            type="checkbox"
            checked={nearUniversityOnly}
            onChange={(e) => onNearUniversityToggle(e.target.checked)}
          />
          <span>대학교 근처만</span>
        </label>

        <div className="sidebar__filter-block">
          <label className="sidebar__check" htmlFor={rentCapCheckId}>
            <input
              id={rentCapCheckId}
              type="checkbox"
              checked={rentCapEnabled}
              onChange={(e) => onRentCapToggle(e.target.checked)}
            />
            <span>월세 상한</span>
          </label>
          <Slider
            min={20}
            max={150}
            step={5}
            value={rentCap}
            onChange={onRentCapChange}
            valueText={`${rentCap}만원 이하`}
            disabled={!rentCapEnabled}
            hideHeader={false}
            label={null}
          />
        </div>
      </section>
    </aside>
  );
}
