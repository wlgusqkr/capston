// Left sidebar of the main map (SPEC 6.1).
//
// Stage 2a decomposition: this is now a thin shell. The four portable
// pieces live in their own files and will be reused by R-1 floating chrome
// (Stage 2b):
//   - <LayerSwitcher>   layer tabs + heatmap toggle
//   - <WeightSliders>   3 sliders + sum + 자동 추천 CTA
//   - <CompareBlock>    compare basket hint + secondary CTA
//   - <FilterControls>  university near-only + 환산 월세 상한
//
// Stage 2b removes this Sidebar entirely (R-1 floating chrome takes over).
import { Link } from 'react-router-dom';

import CompareBlock from './CompareBlock';
import FilterControls from './FilterControls';
import LayerSwitcher from './LayerSwitcher';
import WeightSliders from './WeightSliders';
import type { LayerKey } from './LayerSwitcher';
import type { Weights } from '@/types/api';

import './Sidebar.css';

export type { LayerKey };

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
  return (
    <aside className="sidebar" aria-label="메인 지도 사이드바">
      <header className="sidebar__header">
        <div className="sidebar__logo" aria-label="슬기로운 자취생활 로고">
          <span className="sidebar__logo-mark" aria-hidden="true">슬</span>
          <span className="sidebar__logo-text">기로운 자취생활</span>
        </div>
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
        <div className="sidebar__section-title" aria-hidden="true">레이어</div>
        <LayerSwitcher
          activeLayer={activeLayer}
          onLayerChange={onLayerChange}
          heatmapVisible={heatmapVisible}
          onToggleHeatmap={onToggleHeatmap}
        />
      </section>

      <section className="sidebar__section" aria-label="가중치">
        <div className="sidebar__section-title" aria-hidden="true">가중치</div>
        <WeightSliders
          weights={weights}
          onWeightsChange={onWeightsChange}
          onOpenPreference={onOpenPreference}
        />
      </section>

      <section className="sidebar__section" aria-label="비교 목록">
        <div className="sidebar__section-title" aria-hidden="true">비교 목록</div>
        <CompareBlock
          compareCount={compareCount}
          onOpenCompare={onOpenCompare}
        />
      </section>

      <section className="sidebar__section" aria-label="필터">
        <div className="sidebar__section-title" aria-hidden="true">필터</div>
        <FilterControls
          rentCapEnabled={rentCapEnabled}
          onRentCapToggle={onRentCapToggle}
          rentCap={rentCap}
          onRentCapChange={onRentCapChange}
          nearUniversityOnly={nearUniversityOnly}
          onNearUniversityToggle={onNearUniversityToggle}
        />
      </section>

      <footer className="sidebar__footer" aria-label="데이터 출처">
        <p className="sidebar__provenance">
          <span className="sidebar__provenance-key">DATA</span>
          <span className="sidebar__provenance-val">
            국토교통부 · 소상공인진흥공단 · 서울교통빅데이터
          </span>
        </p>
        <p className="sidebar__provenance">
          <span className="sidebar__provenance-key">UPDATED</span>
          <span className="sidebar__provenance-val">2026.05.01</span>
        </p>
      </footer>
    </aside>
  );
}
