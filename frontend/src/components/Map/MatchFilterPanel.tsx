// MatchFilterPanel — 메인 지도 사이드바 상단 신규 패널 (Phase 5).
//
// plan §5.1 wireframe 그대로:
//   eyebrow mono "STUDIO MATCH / 내 조건 자취 거래량"
//   헤딩 22px Pretendard 600 "내 조건 자취·원룸 거래량 분포"
//   - 활성 mode dot (Coral 6px) — match 모드일 때만 헤더 우측
//   거래 유형 5 chip multi-select (DongExplore 동일 토큰 — 44px / Soft Stone fill)
//   기간 radio 5종 (3m/6m/12m/24m/all)
//   dual range slider 3개 (보증금 0~50000 / 월세 0~300 / 면적 10~150) — 18px Ink thumb
//   결과 카운트 28px tabular `${count.toLocaleString()}건` + 보조문 13px Slate `M개 동에서`
//   대학 근처 chip (#13 — boolean toggle 로 보존)
//   초기화 버튼 (default 와 다를 때만 표시)
//   mono SOURCE 라벨
//
// Phase 4.7 design-review 결정 그대로 재사용 (chip 44px / range thumb 18px /
// heading 위계 / Soft Stone active fill).

import { useMemo } from 'react';

import {
  DEFAULT_STUDIO_MATCH_FILTERS,
  isStudioMatchDirty,
} from '@/hooks/useStudioMatchFilters';
import type { ExploreDealType, ExplorePeriod, MatchFilters } from '@/types/api';

import './MatchFilterPanel.css';

const DEAL_TYPE_OPTIONS: Array<{ value: ExploreDealType; label: string }> = [
  { value: 'villa', label: '연립다세대' },
  { value: 'dagagu', label: '다가구' },
  { value: 'danok', label: '단독' },
  { value: 'officetel', label: '오피스텔' },
  { value: 'apt', label: '아파트' },
];

const PERIOD_OPTIONS: Array<{ value: ExplorePeriod; label: string }> = [
  { value: '3m', label: '3개월' },
  { value: '6m', label: '6개월' },
  { value: '12m', label: '12개월' },
  { value: '24m', label: '24개월' },
  { value: 'all', label: '전체' },
];

export interface MatchFilterPanelProps {
  filters: MatchFilters;
  onPatch: (delta: Partial<MatchFilters>) => void;
  onReset: () => void;
  /** match 모드일 때만 헤더에 Coral dot 노출. */
  modeActive: boolean;
  /** 거래량 카운트 (필터 통과 거래수). 로딩 중이면 null/undefined. */
  totalMatched: number | null | undefined;
  /** count > 0 인 동 수. 로딩 중이면 null/undefined. */
  matchedDongs: number | null | undefined;
  /** API 호출 진행 여부 — skeleton 표시. */
  isLoading: boolean;
  /** 대학 근처 chip 토글 (#13, boolean 보존). */
  nearUniversityOnly: boolean;
  onNearUniversityToggle: (next: boolean) => void;
}

export default function MatchFilterPanel({
  filters,
  onPatch,
  onReset,
  modeActive,
  totalMatched,
  matchedDongs,
  isLoading,
  nearUniversityOnly,
  onNearUniversityToggle,
}: MatchFilterPanelProps) {
  const dirty = useMemo(() => isStudioMatchDirty(filters), [filters]);

  const toggleType = (t: ExploreDealType) => {
    const has = filters.deal_types.includes(t);
    const next = has
      ? filters.deal_types.filter((x) => x !== t)
      : [...filters.deal_types, t];
    if (next.length === 0) return; // 최소 1개 유지
    onPatch({ deal_types: next });
  };

  return (
    <aside className="match-panel" aria-label="자취 매물 조건 필터">
      {/* 헤더 */}
      <header className="match-panel__header">
        <p className="mono-label match-panel__eyebrow">
          STUDIO MATCH · 내 조건 자취 거래량
        </p>
        <div className="match-panel__title-row">
          <h2 className="match-panel__title">
            내 조건 자취·원룸 거래량 분포
          </h2>
          {modeActive ? (
            <span
              className="match-panel__mode-dot"
              aria-label="현재 매칭 모드"
              title="현재 매칭 모드"
            />
          ) : null}
        </div>
        {dirty ? (
          <button
            type="button"
            className="match-panel__reset"
            onClick={onReset}
          >
            초기화
          </button>
        ) : null}
      </header>

      {/* 거래 유형 */}
      <fieldset className="match-panel__field">
        <legend className="match-panel__field-title">거래 유형</legend>
        <div className="match-panel__chips" role="group" aria-label="거래 유형 (다중 선택)">
          {DEAL_TYPE_OPTIONS.map((opt) => {
            const active = filters.deal_types.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                className={`explore__chip${active ? ' explore__chip--active' : ''}`}
                onClick={() => toggleType(opt.value)}
                aria-pressed={active}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* 기간 */}
      <fieldset className="match-panel__field">
        <legend className="match-panel__field-title">기간 (최근)</legend>
        <div className="match-panel__radio-row">
          {PERIOD_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`explore__radio${
                filters.period === opt.value ? ' explore__radio--active' : ''
              }`}
            >
              <input
                type="radio"
                name="match-period"
                value={opt.value}
                checked={filters.period === opt.value}
                onChange={() => onPatch({ period: opt.value })}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Range sliders 3개 */}
      <RangeField
        title="보증금 (만원)"
        min={0}
        max={50000}
        step={500}
        valueMin={filters.deposit_min}
        valueMax={filters.deposit_max}
        onChange={(lo, hi) => onPatch({ deposit_min: lo, deposit_max: hi })}
        formatter={(v) => v.toLocaleString()}
      />
      <RangeField
        title="월세 (만원)"
        min={0}
        max={300}
        step={5}
        valueMin={filters.monthly_min}
        valueMax={filters.monthly_max}
        onChange={(lo, hi) => onPatch({ monthly_min: lo, monthly_max: hi })}
        formatter={(v) => String(v)}
      />
      <RangeField
        title="면적 (㎡)"
        min={10}
        max={150}
        step={1}
        valueMin={filters.area_min}
        valueMax={filters.area_max}
        onChange={(lo, hi) => onPatch({ area_min: lo, area_max: hi })}
        formatter={(v) => String(v)}
      />

      {/* 대학 근처 (#13 보존 — single boolean) */}
      <fieldset className="match-panel__field">
        <legend className="match-panel__field-title">캠퍼스 인근</legend>
        <div className="match-panel__chips" role="group">
          <button
            type="button"
            className={`explore__chip${
              nearUniversityOnly ? ' explore__chip--active' : ''
            }`}
            onClick={() => onNearUniversityToggle(!nearUniversityOnly)}
            aria-pressed={nearUniversityOnly}
          >
            대학교 근처만
          </button>
        </div>
      </fieldset>

      {/* 결과 카운트 */}
      <output className="match-panel__result" aria-live="polite">
        {isLoading || totalMatched == null ? (
          <span className="match-panel__skeleton" />
        ) : (
          <>
            <span className="match-panel__count tabular">
              {totalMatched.toLocaleString()}
            </span>
            <span className="match-panel__count-unit">건</span>
            {matchedDongs != null ? (
              <span className="match-panel__count-sub">
                {matchedDongs.toLocaleString()}개 동에서
              </span>
            ) : null}
          </>
        )}
      </output>

      <p className="mono-label match-panel__source">
        SOURCE: 국토부 실거래 (최근{' '}
        {humanPeriod(filters.period)}) · 현재 매물 재고 아님
      </p>
    </aside>
  );
}

/* ------------------------------------------------------------------------ */
/* Dual range slider — DongExplore 의 18px Ink thumb 토큰 재사용.            */
/* ------------------------------------------------------------------------ */

interface RangeFieldProps {
  title: string;
  min: number;
  max: number;
  step: number;
  valueMin: number;
  valueMax: number;
  onChange: (lo: number, hi: number) => void;
  formatter: (v: number) => string;
}

function RangeField({
  title,
  min,
  max,
  step,
  valueMin,
  valueMax,
  onChange,
  formatter,
}: RangeFieldProps) {
  return (
    <fieldset className="match-panel__field">
      <legend className="match-panel__field-title">
        <span>{title}</span>
        <span className="match-panel__range-value tabular">
          {formatter(valueMin)} ~ {formatter(valueMax)}
        </span>
      </legend>
      <div className="explore__range-inputs">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={valueMin}
          onChange={(e) => {
            const v = Number(e.target.value);
            onChange(Math.min(v, valueMax - step), valueMax);
          }}
          aria-label={`${title} 최솟값`}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={valueMax}
          onChange={(e) => {
            const v = Number(e.target.value);
            onChange(valueMin, Math.max(v, valueMin + step));
          }}
          aria-label={`${title} 최댓값`}
        />
      </div>
    </fieldset>
  );
}

function humanPeriod(p: ExplorePeriod): string {
  switch (p) {
    case '3m':
      return '3개월';
    case '6m':
      return '6개월';
    case '12m':
      return '12개월';
    case '24m':
      return '24개월';
    case 'all':
      return '전체 기간';
  }
}

// 사용처에서 default 비교가 필요할 수 있어 re-export.
export { DEFAULT_STUDIO_MATCH_FILTERS };
