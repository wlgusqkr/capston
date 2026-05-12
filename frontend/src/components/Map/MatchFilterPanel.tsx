// MatchFilterPanel -- 메인 지도 사이드바 상단 신규 패널 (Phase 5).

import { useMemo } from 'react';

import {
  DEFAULT_STUDIO_MATCH_FILTERS,
  isStudioMatchDirty,
} from '@/hooks/useStudioMatchFilters';
import type { ExploreDealType, ExplorePeriod, MatchFilters } from '@/types/api';

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
  modeActive: boolean;
  totalMatched: number | null | undefined;
  matchedDongs: number | null | undefined;
  isLoading: boolean;
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
    if (next.length === 0) return;
    onPatch({ deal_types: next });
  };

  return (
    <aside className="flex flex-col gap-5 p-6 bg-surface" aria-label="자취 매물 조건 필터">
      {/* 헤더 */}
      <header className="flex flex-col gap-2">
        <p className="mono-label m-0 text-text-subtle text-mono-label tracking-[0.26px] uppercase">
          STUDIO MATCH · 내 조건 자취 거래량
        </p>
        <div className="flex items-center gap-2">
          <h2 className="m-0 text-[22px] font-semibold text-text tracking-[var(--letter-spacing-ko)] leading-[1.3]">
            내 조건 자취·원룸 거래량 분포
          </h2>
          {modeActive ? (
            <span
              className="shrink-0 w-1.5 h-1.5 rounded-full bg-accent"
              aria-label="현재 매칭 모드"
              title="현재 매칭 모드"
            />
          ) : null}
        </div>
        {dirty ? (
          <button
            type="button"
            className="self-start bg-transparent border-0 px-2 py-1 -ml-2 text-text-subtle text-caption underline cursor-pointer rounded-sm hover:text-text hover:bg-surface-alt"
            onClick={onReset}
          >
            초기화
          </button>
        ) : null}
      </header>

      {/* 거래 유형 */}
      <fieldset className="border-0 p-0 m-0 flex flex-col gap-2">
        <legend className="text-body-base font-medium text-text flex justify-between items-baseline p-0">거래 유형</legend>
        <div className="flex flex-wrap gap-2" role="group" aria-label="거래 유형 (다중 선택)">
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
      <fieldset className="border-0 p-0 m-0 flex flex-col gap-2">
        <legend className="text-body-base font-medium text-text flex justify-between items-baseline p-0">기간 (최근)</legend>
        <div className="grid grid-cols-5 gap-1">
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
        title="면적 (m2)"
        min={10}
        max={150}
        step={1}
        valueMin={filters.area_min}
        valueMax={filters.area_max}
        onChange={(lo, hi) => onPatch({ area_min: lo, area_max: hi })}
        formatter={(v) => String(v)}
      />

      {/* 대학 근처 */}
      <fieldset className="border-0 p-0 m-0 flex flex-col gap-2">
        <legend className="text-body-base font-medium text-text flex justify-between items-baseline p-0">캠퍼스 인근</legend>
        <div className="flex flex-wrap gap-2" role="group">
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
      <output
        className="flex items-baseline gap-2 flex-wrap mt-2 pt-3 border-t border-divider"
        aria-live="polite"
      >
        {isLoading || totalMatched == null ? (
          <span className="inline-block h-7 w-[60%] bg-divider rounded-xs [animation:match-panel-pulse_1.2s_ease-in-out_infinite]" />
        ) : (
          <>
            <span className="text-[28px] font-semibold text-text leading-[1.1] tabular">
              {totalMatched.toLocaleString()}
            </span>
            <span className="text-body-base text-text-subtle">건</span>
            {matchedDongs != null ? (
              <span className="ml-auto text-[13px] text-text-muted">
                {matchedDongs.toLocaleString()}개 동에서
              </span>
            ) : null}
          </>
        )}
      </output>

      <p className="mono-label m-0 text-text-muted text-mono-label tracking-[0.26px] uppercase">
        SOURCE: 국토부 실거래 (최근{' '}
        {humanPeriod(filters.period)}) · 현재 매물 재고 아님
      </p>
    </aside>
  );
}

/* ------------------------------------------------------------------------ */
/* Dual range slider                                                         */
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
    <fieldset className="border-0 p-0 m-0 flex flex-col gap-2">
      <legend className="text-body-base font-medium text-text flex justify-between items-baseline p-0">
        <span>{title}</span>
        <span className="text-caption text-text-subtle font-normal tabular">
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

export { DEFAULT_STUDIO_MATCH_FILTERS };
