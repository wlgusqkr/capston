// RealEstateSection — SPEC 6.3 Section 2 (부동산 시세).
//
// Layout:
//   - Header: title + period toggle (3/6/12 months — UI only, doesn't filter data yet)
//   - Top grid (2 cols on desktop):
//       Left  — LineChart of monthly rent trend (3 lines: villa/multi/officetel,
//               null gaps render as a line break thanks to connectNulls={false})
//       Right — Horizontal BarChart of avg monthly rent per deposit band
//   - Bottom: table of 5 most recent deals.
//
// Recharts limitations addressed:
//   - Recharts cannot consume CSS variables → palette imported from lib/colors.
//   - Tooltip / legend / axis colors set explicitly to keep light/dark switching.
//     For now we serve the light palette; dark theme switching is deferred (still
//     readable on dark surfaces because the palette mirrors data tokens).
import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card } from '@/components/ui';
import { CHART_COLORS } from '@/lib/colors';
import { formatConvertedRent } from '@/lib/rent';
import type { DongDetail } from '@/types/api';

import './RealEstateSection.css';

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

  // Slice the trend data to the selected period.
  // Trend is sent oldest → newest; take the last N entries.
  const months = PERIOD_OPTIONS.find((p) => p.value === period)?.months ?? 6;
  const trend = realEstate.monthly_trend.slice(-months);

  // Format band labels: '0' → '0~500', '500' → '500~1000', etc.
  const bands = realEstate.deposit_band_avg.map((b) => ({
    band: formatBandLabel(b.band),
    monthly: b.avg_monthly_rent,
  }));

  return (
    <section className="real-estate" aria-label="부동산 시세">
      <header className="real-estate__header">
        <h2 className="real-estate__title">부동산 시세</h2>
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

      <div className="real-estate__grid">
        <Card padding="lg" className="real-estate__chart-card" aria-label="월별 평균 월세 추이">
          <h3 className="real-estate__chart-title">월별 평균 월세 (raw, 만원)</h3>
          {/* 백엔드 monthly_trend 는 유형별 raw 월세만 노출 — per-month 보증금
              평균이 없어 환산값 산출 불가. 환산 비교는 아래 "최근 실거래" 표를
              참고. 라벨로 "raw" 명시하여 발표 질문 차단. */}
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
                  dataKey="multi"
                  name="단독다가구"
                  stroke={CHART_COLORS.multi}
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
        </Card>

        <Card padding="lg" className="real-estate__chart-card" aria-label="보증금 구간별 평균 월세">
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
        </Card>
      </div>

      <Card padding="none" className="real-estate__deals-card" aria-label="최근 실거래 5건">
        <header className="real-estate__deals-header">
          <h3 className="real-estate__chart-title">최근 실거래 5건</h3>
          {/* 환산식 mono 보조 — 칼럼 추가 이유를 발표 자리에서 즉시 답하기 위함. */}
          <p className="real-estate__deals-hint mono-label">
            환산 = 월세 + 보증금 × 0.005 (연 6%/월 0.005 가정)
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
                    {/* DongDetail.real_estate.recent_deals 에는 converted_rent 가
                        없으므로 client 계산. lib/rent.ts 가 백엔드와 동일 계수. */}
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
      </Card>
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
