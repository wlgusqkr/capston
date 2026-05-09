// RealEstateSection — SPEC 6.3 Section 2 (자취 시장 대시보드).
//
// Phase 4.7: "최근 5건만" 표 기반 → 자취생 친화 풀 대시보드로 확장.
// 아파트는 매매성/가족 시장이라 자취 시세 감 X → 백엔드에서 apt 제외 + 보증금
// 5억 이하만 자취 시장 KPI/차트/표에 포함.
//
// Layout (위 → 아래):
//   1. Header: 제목 + 기간 토글 (월별 추이에만 영향)
//   2. KPI 4 카드 — 평균 환산월세 / 최저 보증금 / 평균 면적 / 최근 6m 거래수
//   3. 유형별 평균 환산월세 (가로 BarChart) + 면적-환산월세 산점도 (ScatterChart)
//   4. 월별 평균 추이 (LineChart 4 series) + 보증금 대역 (가로 BarChart)
//   5. 최근 자취 거래 5건 표 (apt 제외, 환산월세 포함)
import { useState } from 'react';
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
import { formatConvertedRent } from '@/lib/rent';
import type { DongDetail } from '@/types/api';

import './RealEstateSection.css';

type DealTypeKey = 'villa' | 'dagagu' | 'danok' | 'officetel';

const DEAL_TYPE_FILL: Record<DealTypeKey, string> = {
  villa: CHART_COLORS.villa,
  dagagu: CHART_COLORS.dagagu,
  danok: CHART_COLORS.danok,
  officetel: CHART_COLORS.officetel,
};

interface RealEstateSectionProps {
  realEstate: DongDetail['real_estate'];
}

type Period = '3m' | '6m' | '12m';

const PERIOD_OPTIONS: Array<{ value: Period; label: string; months: number }> = [
  { value: '3m', label: '3개월', months: 3 },
  { value: '6m', label: '6개월', months: 6 },
  { value: '12m', label: '12개월', months: 12 },
];

export default function RealEstateSection({ realEstate }: RealEstateSectionProps) {
  const [period, setPeriod] = useState<Period>('6m');

  const months = PERIOD_OPTIONS.find((p) => p.value === period)?.months ?? 6;
  const trend = realEstate.monthly_trend.slice(-months);

  const bands = realEstate.deposit_band_avg.map((b) => ({
    band: formatBandLabel(b.band),
    monthly: b.avg_monthly_rent,
  }));

  const kpi = realEstate.studio_kpi;
  const typeAvg = realEstate.type_avg.map((t) => ({
    label: t.label,
    avg: t.avg_converted_rent ?? 0,
    has: t.avg_converted_rent !== null,
    deal_type: t.deal_type,
    count: t.count,
  }));

  // 산점도는 deal_type별로 시리즈 분리 (Recharts 색 구분)
  const scatterByType: Record<DealTypeKey, Array<{ x: number; y: number }>> = {
    villa: [],
    dagagu: [],
    danok: [],
    officetel: [],
  };
  for (const p of realEstate.scatter) {
    scatterByType[p.deal_type as DealTypeKey]?.push({
      x: p.area_m2,
      y: p.converted_rent,
    });
  }

  return (
    <section
      className="detail-section real-estate"
      aria-labelledby="rent-heading"
    >
      <p className="mono-label detail-section__eyebrow" aria-hidden="true">
        STUDIO MARKET / 자취 시세
      </p>
      <header className="real-estate__header">
        <h2 id="rent-heading" className="detail-section__heading">
          자취 시세 대시보드
        </h2>
        <div className="real-estate__period" role="tablist" aria-label="기간 선택">
          {PERIOD_OPTIONS.map((opt) => {
            const active = opt.value === period;
            return (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={active}
                className={`real-estate__period-btn${
                  active ? ' real-estate__period-btn--active' : ''
                }`}
                onClick={() => setPeriod(opt.value)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </header>

      <p className="real-estate__filter-hint mono-label">
        아파트 제외 · 보증금 5억 이하 · 최근 6개월 자취 시장 기준
      </p>

      {/* ── KPI 4 카드 ── */}
      <div className="real-estate__kpi-grid" aria-label="자취 시장 핵심 지표">
        <KpiCard
          label="평균 환산월세"
          value={kpi.avg_converted_rent != null ? `${kpi.avg_converted_rent}만원` : '-'}
          hint="월세 + 보증금 × 0.005"
        />
        <KpiCard
          label="최저 보증금"
          value={kpi.min_deposit != null ? `${kpi.min_deposit.toLocaleString()}만원` : '-'}
          hint="자취 시장 진입 가격"
        />
        <KpiCard
          label="평균 면적"
          value={kpi.avg_area_m2 != null ? `${kpi.avg_area_m2}㎡` : '-'}
          hint={kpi.avg_area_m2 != null ? `약 ${(kpi.avg_area_m2 / 3.3058).toFixed(1)}평` : ''}
        />
        <KpiCard
          label="최근 6개월 거래"
          value={kpi.recent_count.toLocaleString()}
          hint="아파트 제외, 자취 가능 매물"
        />
      </div>

      {/* ── 유형별 평균 + 면적-환산월세 산점도 ── */}
      <div className="real-estate__grid">
        <div className="real-estate__chart-block" aria-label="유형별 평균 환산월세">
          <h3 className="real-estate__chart-title">유형별 평균 환산월세 (만원)</h3>
          <p className="real-estate__chart-hint mono-label">
            거래 3건 미만 유형은 회색 처리
          </p>
          <div className="real-estate__chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={typeAvg}
                layout="vertical"
                margin={{ top: 8, right: 24, bottom: 0, left: 8 }}
              >
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
                  labelStyle={{ color: 'var(--color-text)' }}
                  formatter={(value, _n, item) => {
                    const v = typeof value === 'number' ? value : Number(value);
                    const datum = item?.payload as (typeof typeAvg)[number];
                    if (!datum.has) return ['데이터 부족', ''] as [string, string];
                    return [`${v}만원 (${datum.count}건)`, '평균 환산월세'] as [
                      string,
                      string,
                    ];
                  }}
                />
                <Bar dataKey="avg" radius={[0, 4, 4, 0]} barSize={18}>
                  {typeAvg.map((d, i) => (
                    <Cell
                      key={i}
                      fill={
                        d.has
                          ? DEAL_TYPE_FILL[d.deal_type as DealTypeKey]
                          : 'var(--color-soft-stone, #eeece7)'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="real-estate__chart-block" aria-label="면적-환산월세 산점도">
          <h3 className="real-estate__chart-title">면적·환산월세 분포</h3>
          <p className="real-estate__chart-hint mono-label">
            최근 6개월, 점 하나 = 거래 1건 (최대 200건)
          </p>
          <div className="real-estate__chart">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
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
                  width={48}
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
                  labelStyle={{ color: 'var(--color-text)' }}
                  formatter={(value, name) => {
                    const v = typeof value === 'number' ? value : Number(value);
                    const n = String(name);
                    if (n === '면적') return [`${v}㎡`, n] as [string, string];
                    if (n === '환산월세')
                      return [`${v}만원`, n] as [string, string];
                    return [`${v}`, n] as [string, string];
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={28}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 'var(--font-caption-size)' }}
                />
                <Scatter
                  name="연립다세대"
                  data={scatterByType.villa}
                  fill={CHART_COLORS.villa}
                  fillOpacity={0.7}
                />
                <Scatter
                  name="다가구"
                  data={scatterByType.dagagu}
                  fill={CHART_COLORS.dagagu}
                  fillOpacity={0.7}
                />
                <Scatter
                  name="단독"
                  data={scatterByType.danok}
                  fill={CHART_COLORS.danok}
                  fillOpacity={0.7}
                />
                <Scatter
                  name="오피스텔"
                  data={scatterByType.officetel}
                  fill={CHART_COLORS.officetel}
                  fillOpacity={0.7}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="real-estate__grid">
        <div className="real-estate__chart-block" aria-label="월별 평균 월세 추이">
          <h3 className="real-estate__chart-title">월별 평균 월세 (raw, 만원)</h3>
          <p className="real-estate__chart-hint mono-label">
            보증금 환산 전 — 환산값은 아래 거래표 참고
          </p>
          <div className="real-estate__chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke={CHART_COLORS.axis}
                  tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
                  tickMargin={6}
                />
                <YAxis
                  stroke={CHART_COLORS.axis}
                  tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
                  tickMargin={6}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--font-caption-size)',
                  }}
                  labelStyle={{ color: 'var(--color-text)' }}
                  formatter={(value) => {
                    const v = value as number | null | undefined;
                    return v == null
                      ? (['-', ''] as [string, string])
                      : ([`${v}만원`, ''] as [string, string]);
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={28}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 'var(--font-caption-size)' }}
                />
                <Line
                  type="monotone"
                  dataKey="villa"
                  name="연립다세대"
                  stroke={CHART_COLORS.villa}
                  strokeWidth={2}
                  connectNulls={false}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="dagagu"
                  name="다가구"
                  stroke={CHART_COLORS.dagagu}
                  strokeWidth={2}
                  connectNulls={false}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="danok"
                  name="단독"
                  stroke={CHART_COLORS.danok}
                  strokeWidth={2}
                  connectNulls={false}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="officetel"
                  name="오피스텔"
                  stroke={CHART_COLORS.officetel}
                  strokeWidth={2}
                  connectNulls={false}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="real-estate__chart-block" aria-label="보증금 구간별 평균 월세">
          <h3 className="real-estate__chart-title">보증금 구간별 평균 월세 (만원)</h3>
          <div className="real-estate__chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={bands}
                layout="vertical"
                margin={{ top: 8, right: 24, bottom: 0, left: 8 }}
              >
                <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  stroke={CHART_COLORS.axis}
                  tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
                  tickMargin={6}
                />
                <YAxis
                  type="category"
                  dataKey="band"
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
                  labelStyle={{ color: 'var(--color-text)' }}
                  formatter={(value) => {
                    const v = value as number;
                    return [`${v}만원`, '평균 월세'] as [string, string];
                  }}
                />
                <Bar
                  dataKey="monthly"
                  fill={CHART_COLORS.villa}
                  radius={[0, 4, 4, 0]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="real-estate__deals" aria-label="최근 자취 거래 5건">
        <header className="real-estate__deals-header">
          <h3 className="real-estate__chart-title">최근 자취 거래 5건</h3>
          <p className="real-estate__deals-hint mono-label">
            아파트 제외 · 환산 = 월세 + 보증금 × 0.005 (연 6%)
          </p>
        </header>
        <div className="real-estate__table-scroll">
          <table className="real-estate__table">
            <thead>
              <tr>
                <th scope="col">날짜</th>
                <th scope="col">유형</th>
                <th scope="col">면적</th>
                <th scope="col">보증금</th>
                <th scope="col">월세</th>
                <th scope="col">환산 월세</th>
              </tr>
            </thead>
            <tbody>
              {realEstate.recent_deals.map((deal, idx) => (
                <tr key={`${deal.date}-${idx}`}>
                  <td className="tabular">{deal.date}</td>
                  <td>{deal.type}</td>
                  <td className="tabular">{deal.area_m2.toFixed(1)}㎡</td>
                  <td className="tabular">{deal.deposit.toLocaleString()}만원</td>
                  <td className="tabular">
                    {deal.monthly_rent === 0 ? '-' : `${deal.monthly_rent}만원`}
                  </td>
                  <td className="tabular real-estate__converted-cell">
                    {formatConvertedRent(deal.deposit, deal.monthly_rent)}
                    {deal.monthly_rent === 0 && (
                      <span className="real-estate__converted-tag mono-label"> 전세</span>
                    )}
                  </td>
                </tr>
              ))}
              {realEstate.recent_deals.length === 0 && (
                <tr>
                  <td colSpan={6} className="real-estate__table-empty">
                    최근 실거래 내역이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/** Map raw band keys ('0'|'500'|'1000'|'2000'|'3000+') to human labels. */
function formatBandLabel(band: string): string {
  switch (band) {
    case '0':
      return '0~500';
    case '500':
      return '500~1000';
    case '1000':
      return '1000~2000';
    case '2000':
      return '2000~3000';
    case '3000+':
      return '3000+';
    default:
      return band;
  }
}

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
}

/** 자취 시장 KPI 1 카드 — 작은 라벨 + 큰 숫자 + (옵션) 힌트. */
function KpiCard({ label, value, hint }: KpiCardProps) {
  return (
    <div className="real-estate__kpi">
      <p className="mono-label real-estate__kpi-label">{label}</p>
      <p className="real-estate__kpi-value tabular">{value}</p>
      {hint ? <p className="real-estate__kpi-hint">{hint}</p> : null}
    </div>
  );
}
