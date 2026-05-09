// /dong/:slug/explore — 자취 시세 BI 대시보드 (Phase 4.8).
//
// 한 동의 자취 시장을 깊이 탐색. 좌측 sidebar 필터, 우측 메인 KPI/차트/표.
// 모든 필터는 URL 쿼리스트링과 동기화 — 새로고침/공유/뒤로가기 안전.
//
// Layout (desktop only — 모바일은 SPEC상 미지원):
//   ┌──────────────┬───────────────────────────────────────┐
//   │ ExploreFilter│ KPI 4 cards                            │
//   │  - dealtypes │ ─────────────────────────────────────  │
//   │  - period    │ Scatter (메인) + Type avg / Deposit / │
//   │  - sliders×3 │ Monthly trend (작은 차트들)            │
//   │  [reset]     │ ─────────────────────────────────────  │
//   │              │ Deals table (sortable + paginated)    │
//   └──────────────┴───────────────────────────────────────┘
import { Link, useParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';

import { CHART_COLORS } from '@/lib/colors';
import { usePageTitle } from '@/contexts/PageTitleContext';
import {
  DEFAULT_EXPLORE_FILTERS,
  useDongExplore,
  useExploreFilters,
} from '@/hooks/useDongExplore';
import type {
  ExploreDealType,
  ExploreFilters,
  ExplorePeriod,
  ExploreSort,
} from '@/types/api';

import './DongExplore.css';

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

const DEAL_TYPE_FILL: Record<ExploreDealType, string> = {
  villa: CHART_COLORS.villa,
  dagagu: CHART_COLORS.dagagu,
  danok: CHART_COLORS.danok,
  officetel: CHART_COLORS.officetel,
  apt: '#8b5cf6', // violet — 자취 4종과 명확히 구분
};

const SORT_OPTIONS: Array<{ value: ExploreSort; label: string }> = [
  { value: 'date_desc', label: '최신순' },
  { value: 'date_asc', label: '오래된순' },
  { value: 'converted_desc', label: '환산월세 높은순' },
  { value: 'converted_asc', label: '환산월세 낮은순' },
  { value: 'deposit_desc', label: '보증금 높은순' },
  { value: 'deposit_asc', label: '보증금 낮은순' },
  { value: 'monthly_desc', label: '월세 높은순' },
  { value: 'monthly_asc', label: '월세 낮은순' },
  { value: 'area_desc', label: '넓은순' },
  { value: 'area_asc', label: '좁은순' },
];

export default function DongExplore() {
  const { slug } = useParams<{ slug: string }>();
  const { filters, patch, setPage, reset } = useExploreFilters();
  const { data, isLoading, isError, error } = useDongExplore(slug, filters);

  usePageTitle(
    data ? `${data.dong.gu} ${data.dong.name} · 자취 시세 탐색` : '자취 시세 탐색',
  );

  if (!slug) {
    return <div className="explore__error">잘못된 URL입니다.</div>;
  }
  if (isError) {
    return (
      <div className="explore__error">
        데이터를 불러오지 못했습니다. {(error as Error)?.message}
      </div>
    );
  }

  return (
    <div className="explore">
      <ExploreSidebar filters={filters} patch={patch} reset={reset} />

      <main className="explore__main" aria-busy={isLoading}>
        <header className="explore__header">
          <Link to={`/dong/${slug}`} className="explore__back mono-label">
            ← 동 상세로
          </Link>
          <h1 className="explore__title">
            {data ? `${data.dong.gu} ${data.dong.name}` : '...'}{' '}
            <span className="explore__title-sub">자취 시세 탐색</span>
          </h1>
          <p className="explore__hint mono-label">
            아래 필터를 조절하면 KPI · 차트 · 거래표가 모두 즉시 갱신됩니다
          </p>
        </header>

        {data ? (
          <>
            <KpiBlock kpi={data.kpi} />
            <ScatterBlock data={data.scatter} />
            <ChartsRow
              typeAvg={data.type_avg}
              depositBand={data.deposit_band}
              trend={data.monthly_trend}
            />
            <DealsBlock
              deals={data.deals}
              sort={filters.sort}
              onSortChange={(sort) => patch({ sort })}
              onPageChange={setPage}
            />
          </>
        ) : (
          <div className="explore__loading mono-label">불러오는 중...</div>
        )}
      </main>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Sidebar                                                                  */
/* ──────────────────────────────────────────────────────────────────────── */

interface SidebarProps {
  filters: ExploreFilters;
  patch: (delta: Partial<ExploreFilters>) => void;
  reset: () => void;
}

function ExploreSidebar({ filters, patch, reset }: SidebarProps) {
  const toggleType = (t: ExploreDealType) => {
    const has = filters.deal_types.includes(t);
    const next = has
      ? filters.deal_types.filter((x) => x !== t)
      : [...filters.deal_types, t];
    if (next.length === 0) return; // 최소 1개 유지
    patch({ deal_types: next });
  };

  const isDirty =
    JSON.stringify({ ...filters, page: 1 }) !==
    JSON.stringify({ ...DEFAULT_EXPLORE_FILTERS, page: 1 });

  return (
    <aside className="explore__sidebar" aria-label="필터 패널">
      <div className="explore__filter-header">
        <p className="mono-label">FILTERS</p>
        {isDirty ? (
          <button type="button" className="explore__reset" onClick={reset}>
            초기화
          </button>
        ) : null}
      </div>

      {/* 거래 유형 chips */}
      <fieldset className="explore__field">
        <legend className="explore__field-title">거래 유형</legend>
        <div className="explore__chips">
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
        <p className="explore__hint-small">
          아파트 포함하려면 클릭. 자취 4종은 기본 활성.
        </p>
      </fieldset>

      {/* 기간 */}
      <fieldset className="explore__field">
        <legend className="explore__field-title">기간</legend>
        <div className="explore__radio-row">
          {PERIOD_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`explore__radio${
                filters.period === opt.value ? ' explore__radio--active' : ''
              }`}
            >
              <input
                type="radio"
                name="period"
                value={opt.value}
                checked={filters.period === opt.value}
                onChange={() => patch({ period: opt.value })}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <RangeField
        title="보증금 (만원)"
        min={0}
        max={50000}
        step={500}
        valueMin={filters.deposit_min}
        valueMax={filters.deposit_max}
        onChange={(lo, hi) => patch({ deposit_min: lo, deposit_max: hi })}
        formatter={(v) => v.toLocaleString()}
      />
      <RangeField
        title="월세 (만원)"
        min={0}
        max={300}
        step={5}
        valueMin={filters.monthly_min}
        valueMax={filters.monthly_max}
        onChange={(lo, hi) => patch({ monthly_min: lo, monthly_max: hi })}
        formatter={(v) => String(v)}
      />
      <RangeField
        title="면적 (㎡)"
        min={0}
        max={150}
        step={1}
        valueMin={filters.area_min}
        valueMax={filters.area_max}
        onChange={(lo, hi) => patch({ area_min: lo, area_max: hi })}
        formatter={(v) => String(v)}
      />
    </aside>
  );
}

/* Range slider (dual). Native HTML5 range 두 개를 겹쳐서 만든 단순 구현. */
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
    <fieldset className="explore__field">
      <legend className="explore__field-title">
        <span>{title}</span>
        <span className="explore__range-value tabular">
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

/* ──────────────────────────────────────────────────────────────────────── */
/* KPI                                                                      */
/* ──────────────────────────────────────────────────────────────────────── */

interface KpiBlockProps {
  kpi: { count: number; avg_converted_rent: number | null; min_deposit: number | null; avg_area_m2: number | null };
}

function KpiBlock({ kpi }: KpiBlockProps) {
  return (
    <div className="explore__kpi-grid">
      <KpiCard
        label="필터된 거래"
        value={kpi.count.toLocaleString()}
        hint="현재 필터 매칭 건수"
      />
      <KpiCard
        label="평균 환산월세"
        value={kpi.avg_converted_rent != null ? `${kpi.avg_converted_rent}만원` : '-'}
        hint="월세 + 보증금 × 0.005"
      />
      <KpiCard
        label="최저 보증금"
        value={kpi.min_deposit != null ? `${kpi.min_deposit.toLocaleString()}만원` : '-'}
        hint="가장 진입 부담 적은 매물"
      />
      <KpiCard
        label="평균 면적"
        value={kpi.avg_area_m2 != null ? `${kpi.avg_area_m2}㎡` : '-'}
        hint={kpi.avg_area_m2 != null ? `약 ${(kpi.avg_area_m2 / 3.3058).toFixed(1)}평` : ''}
      />
    </div>
  );
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="explore__kpi">
      <p className="mono-label explore__kpi-label">{label}</p>
      <p className="explore__kpi-value tabular">{value}</p>
      {hint ? <p className="explore__kpi-hint">{hint}</p> : null}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Charts                                                                   */
/* ──────────────────────────────────────────────────────────────────────── */

function ScatterBlock({
  data,
}: {
  data: Array<{ deal_type: ExploreDealType; area_m2: number; converted_rent: number }>;
}) {
  const byType: Record<ExploreDealType, Array<{ x: number; y: number }>> = {
    villa: [],
    dagagu: [],
    danok: [],
    officetel: [],
    apt: [],
  };
  for (const p of data) {
    byType[p.deal_type]?.push({ x: p.area_m2, y: p.converted_rent });
  }
  return (
    <div className="explore__scatter-block" aria-label="면적 · 환산월세 산점도">
      <header className="explore__chart-header">
        <h2 className="explore__chart-title">면적 · 환산월세 분포</h2>
        <p className="mono-label explore__chart-hint">
          점 1 = 거래 1건 (최대 500건). 색상 = 거래 유형
        </p>
      </header>
      <div className="explore__scatter">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 16, right: 24, bottom: 8, left: 8 }}>
            <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              name="면적"
              unit="㎡"
              stroke={CHART_COLORS.axis}
              tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
              tickMargin={6}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="환산월세"
              unit="만원"
              stroke={CHART_COLORS.axis}
              tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
              tickMargin={6}
              width={56}
            />
            <ZAxis range={[28, 28]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-caption-size)',
              }}
              formatter={(value: number, name: string) => {
                if (name === '면적') return [`${value}㎡`, name] as [string, string];
                if (name === '환산월세')
                  return [`${value}만원`, name] as [string, string];
                return [`${value}`, name] as [string, string];
              }}
            />
            <Legend
              verticalAlign="top"
              height={28}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 'var(--font-caption-size)' }}
            />
            {(['villa', 'dagagu', 'danok', 'officetel', 'apt'] as ExploreDealType[]).map((k) =>
              byType[k].length > 0 ? (
                <Scatter
                  key={k}
                  name={DEAL_TYPE_OPTIONS.find((o) => o.value === k)?.label ?? k}
                  data={byType[k]}
                  fill={DEAL_TYPE_FILL[k]}
                  fillOpacity={0.65}
                />
              ) : null,
            )}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface ChartsRowProps {
  typeAvg: Array<{ deal_type: ExploreDealType; label: string; avg_converted_rent: number | null; count: number }>;
  depositBand: Array<{ band: string; count: number; avg_monthly_rent: number }>;
  trend: Array<{ month: string; villa: number | null; dagagu: number | null; danok: number | null; officetel: number | null }>;
}

function ChartsRow({ typeAvg, depositBand, trend }: ChartsRowProps) {
  const typeData = typeAvg.map((t) => ({
    ...t,
    avg: t.avg_converted_rent ?? 0,
    has: t.avg_converted_rent !== null,
  }));
  const bandData = depositBand.map((b) => ({
    band: formatBand(b.band),
    monthly: b.avg_monthly_rent,
    count: b.count,
  }));

  return (
    <div className="explore__charts-row">
      {/* 1) 유형별 평균 가로 막대 */}
      <div className="explore__chart-block" aria-label="유형별 평균 환산월세">
        <h3 className="explore__chart-title">유형별 평균 환산월세 (만원)</h3>
        <div className="explore__chart-mid">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={typeData} layout="vertical" margin={{ top: 8, right: 24, bottom: 0, left: 8 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                stroke={CHART_COLORS.axis}
                tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
                tickMargin={6}
              />
              <YAxis
                type="category"
                dataKey="label"
                stroke={CHART_COLORS.axis}
                tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
                width={80}
                tickMargin={6}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--font-caption-size)',
                }}
                formatter={(value: number, _n, item) => {
                  const d = item?.payload as (typeof typeData)[number];
                  if (!d.has) return ['데이터 부족', ''] as [string, string];
                  return [`${value}만원 (${d.count}건)`, '평균'] as [string, string];
                }}
              />
              <Bar dataKey="avg" radius={[0, 4, 4, 0]} barSize={18}>
                {typeData.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.has ? DEAL_TYPE_FILL[d.deal_type] : 'var(--color-soft-stone, #eeece7)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2) 보증금 대역 분포 */}
      <div className="explore__chart-block" aria-label="보증금 대역 분포">
        <h3 className="explore__chart-title">보증금 대역 분포</h3>
        <p className="mono-label explore__chart-hint">막대 = 거래 건수, 우측 = 평균 월세</p>
        <div className="explore__chart-mid">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bandData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="band"
                stroke={CHART_COLORS.axis}
                tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
              />
              <YAxis
                stroke={CHART_COLORS.axis}
                tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--font-caption-size)',
                }}
                formatter={(value: number, _n, item) => {
                  const d = item?.payload as (typeof bandData)[number];
                  return [`${value}건 · 평균 ${d.monthly}만원`, ''] as [string, string];
                }}
              />
              <Bar dataKey="count" fill={CHART_COLORS.bar} radius={[4, 4, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3) 월별 평균 추이 */}
      <div className="explore__chart-block" aria-label="월별 평균 월세 추이">
        <h3 className="explore__chart-title">월별 평균 월세 추이 (만원)</h3>
        <div className="explore__chart-mid">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="month"
                stroke={CHART_COLORS.axis}
                tick={{ fill: CHART_COLORS.axis, fontSize: 10 }}
                tickMargin={6}
              />
              <YAxis
                stroke={CHART_COLORS.axis}
                tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
                width={36}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--font-caption-size)',
                }}
                formatter={(v) =>
                  v == null
                    ? (['-', ''] as [string, string])
                    : ([`${v}만원`, ''] as [string, string])
                }
              />
              <Legend
                verticalAlign="top"
                height={24}
                iconType="circle"
                iconSize={6}
                wrapperStyle={{ fontSize: 'var(--font-caption-size)' }}
              />
              <Line type="monotone" dataKey="villa" name="연립다세대" stroke={CHART_COLORS.villa} strokeWidth={2} dot={false} connectNulls={false} />
              <Line type="monotone" dataKey="dagagu" name="다가구" stroke={CHART_COLORS.dagagu} strokeWidth={2} dot={false} connectNulls={false} />
              <Line type="monotone" dataKey="danok" name="단독" stroke={CHART_COLORS.danok} strokeWidth={2} dot={false} connectNulls={false} />
              <Line type="monotone" dataKey="officetel" name="오피스텔" stroke={CHART_COLORS.officetel} strokeWidth={2} dot={false} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function formatBand(b: string): string {
  switch (b) {
    case '0':
      return '0~500';
    case '500':
      return '500~1k';
    case '1000':
      return '1~2k';
    case '2000':
      return '2~3k';
    case '3000+':
      return '3k+';
    default:
      return b;
  }
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Deals table                                                              */
/* ──────────────────────────────────────────────────────────────────────── */

interface DealsBlockProps {
  deals: {
    items: Array<{
      date: string;
      type: string;
      deal_type: ExploreDealType;
      area_m2: number;
      deposit: number;
      monthly_rent: number;
      converted_rent: number;
      house_name: string;
      build_year: number | null;
      floor: number | null;
    }>;
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
  sort: ExploreSort;
  onSortChange: (s: ExploreSort) => void;
  onPageChange: (p: number) => void;
}

function DealsBlock({ deals, sort, onSortChange, onPageChange }: DealsBlockProps) {
  return (
    <section className="explore__deals" aria-label="거래 표">
      <header className="explore__deals-header">
        <h2 className="explore__chart-title">거래 목록 ({deals.total.toLocaleString()}건)</h2>
        <div className="explore__deals-tools">
          <label className="explore__sort">
            <span className="mono-label">정렬</span>
            <select
              value={sort}
              onChange={(e) => onSortChange(e.target.value as ExploreSort)}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <div className="explore__table-scroll">
        <table className="explore__table">
          <thead>
            <tr>
              <th scope="col">날짜</th>
              <th scope="col">유형</th>
              <th scope="col">건물명</th>
              <th scope="col">면적</th>
              <th scope="col">층</th>
              <th scope="col">건축</th>
              <th scope="col">보증금</th>
              <th scope="col">월세</th>
              <th scope="col">환산</th>
            </tr>
          </thead>
          <tbody>
            {deals.items.map((d, i) => (
              <tr key={`${d.date}-${i}`}>
                <td className="tabular">{d.date}</td>
                <td>{d.type}</td>
                <td className="explore__table-name">{d.house_name || '-'}</td>
                <td className="tabular">{d.area_m2.toFixed(1)}㎡</td>
                <td className="tabular">{d.floor != null ? `${d.floor}층` : '-'}</td>
                <td className="tabular">{d.build_year != null ? `'${String(d.build_year).slice(-2)}` : '-'}</td>
                <td className="tabular">{d.deposit.toLocaleString()}</td>
                <td className="tabular">{d.monthly_rent === 0 ? '-' : d.monthly_rent}</td>
                <td className="tabular explore__table-converted">{d.converted_rent}</td>
              </tr>
            ))}
            {deals.items.length === 0 ? (
              <tr>
                <td colSpan={9} className="explore__table-empty">
                  필터에 맞는 거래가 없습니다. 좌측 필터 범위를 넓혀보세요.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {deals.total_pages > 1 ? (
        <Pagination
          page={deals.page}
          totalPages={deals.total_pages}
          onChange={onPageChange}
        />
      ) : null}
    </section>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  const can = (target: number) => target >= 1 && target <= totalPages && target !== page;
  return (
    <div className="explore__pagination" role="navigation">
      <button
        type="button"
        disabled={!can(page - 1)}
        onClick={() => onChange(page - 1)}
      >
        이전
      </button>
      <span className="tabular explore__pagination-info">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        disabled={!can(page + 1)}
        onClick={() => onChange(page + 1)}
      >
        다음
      </button>
    </div>
  );
}
