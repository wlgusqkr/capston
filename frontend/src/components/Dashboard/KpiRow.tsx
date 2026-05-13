// KpiRow -- dashboard top KPI row: 4 KPI cards.
//
// 1. Average converted rent + mini line (last 6 months trend)
// 2. Average deposit (weighted from deposit_band_avg)
// 3. Recent deal count + mini bar (monthly deal counts)
// 4. Safety gauge (from summary.safety_level)

import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
} from 'recharts';

import Gauge from '@/components/ui/Gauge';
import { CHART_COLORS } from '@/lib/colors';
import type { DongDetail, DongSummary } from '@/types/api';

import KpiCard from './KpiCard';

interface KpiRowProps {
  detail: DongDetail | undefined;
  summary: DongSummary | undefined;
  isLoading: boolean;
}

/** Map safety_level to a 0-100 numeric score for the gauge. */
function safetyLevelToScore(level: DongSummary['safety_level']): number {
  switch (level) {
    case 'high':
      return 85;
    case 'mid':
      return 55;
    case 'low':
      return 25;
    default:
      return 50;
  }
}

/** Compute weighted average deposit from deposit_band_avg. */
function computeAvgDeposit(
  bands: DongDetail['real_estate']['deposit_band_avg'],
): number | null {
  if (!bands || bands.length === 0) return null;
  // Use band midpoints as weights
  const bandMidpoints: Record<string, number> = {
    '0': 250,
    '500': 750,
    '1000': 1500,
    '2000': 2500,
    '3000+': 4000,
  };
  let totalWeight = 0;
  let weightedSum = 0;
  for (const b of bands) {
    const mid = bandMidpoints[b.band] ?? 1000;
    // Use avg_monthly_rent as a proxy for band volume
    weightedSum += mid * b.avg_monthly_rent;
    totalWeight += b.avg_monthly_rent;
  }
  if (totalWeight === 0) return null;
  return Math.round(weightedSum / totalWeight);
}

/** Build mini line data from monthly_trend (last 6 months, summing all types). */
function buildMiniLineData(
  trend: DongDetail['real_estate']['monthly_trend'],
): Array<{ m: string; v: number }> {
  const last6 = trend.slice(-6);
  return last6.map((t) => {
    // Average non-null values
    const vals = [t.villa, t.dagagu, t.danok, t.officetel].filter(
      (v): v is number => v != null,
    );
    return {
      m: t.month,
      v: vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0,
    };
  });
}

/** Build mini bar data from monthly_trend (deal count proxy — count non-null types per month). */
function buildMiniBarData(
  trend: DongDetail['real_estate']['monthly_trend'],
): Array<{ m: string; v: number }> {
  const last6 = trend.slice(-6);
  return last6.map((t) => ({
    m: t.month,
    v: [t.villa, t.dagagu, t.danok, t.officetel].filter((v) => v != null).length,
  }));
}

export default function KpiRow({ detail, summary, isLoading }: KpiRowProps) {
  const kpi = detail?.real_estate.studio_kpi;
  const avgDeposit = detail ? computeAvgDeposit(detail.real_estate.deposit_band_avg) : null;
  const miniLineData = detail ? buildMiniLineData(detail.real_estate.monthly_trend) : [];
  const miniBarData = detail ? buildMiniBarData(detail.real_estate.monthly_trend) : [];
  const safetyScore = summary ? safetyLevelToScore(summary.safety_level) : 50;

  return (
    <div className="grid grid-cols-4 gap-4">
      {/* 1. Average converted rent */}
      <KpiCard
        label="평균 환산 월세"
        value={
          kpi?.avg_converted_rent != null
            ? `${kpi.avg_converted_rent}만원`
            : '-'
        }
        hint="월세 + 보증금 x 0.005"
        isLoading={isLoading}
        miniChart={
          miniLineData.length > 0 ? (
            <div className="h-[36px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={miniLineData}>
                  <Line
                    type="monotone"
                    dataKey="v"
                    stroke={CHART_COLORS.villa}
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={true}
                    animationDuration={800}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : undefined
        }
      />

      {/* 2. Average deposit */}
      <KpiCard
        label="평균 보증금"
        value={avgDeposit != null ? `${avgDeposit.toLocaleString()}만원` : '-'}
        hint="보증금 구간 가중평균"
        isLoading={isLoading}
      />

      {/* 3. Recent deal count */}
      <KpiCard
        label="최근 거래 건수"
        value={kpi?.recent_count != null ? `${kpi.recent_count}건` : '-'}
        hint="최근 6개월 자취 거래"
        isLoading={isLoading}
        miniChart={
          miniBarData.length > 0 ? (
            <div className="h-[36px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={miniBarData}>
                  <Bar
                    dataKey="v"
                    fill={CHART_COLORS.dagagu}
                    radius={[2, 2, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={800}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : undefined
        }
      />

      {/* 4. Safety gauge */}
      <div className="p-5 border border-divider rounded-card bg-surface flex flex-col items-center gap-2">
        {isLoading ? (
          <>
            <div className="h-3 w-16 bg-primary-soft rounded animate-[match-panel-pulse_1.5s_ease-in-out_infinite]" />
            <div className="h-20 w-20 bg-primary-soft rounded-full animate-[match-panel-pulse_1.5s_ease-in-out_infinite]" />
          </>
        ) : (
          <>
            <p className="text-caption m-0 text-text-subtle">안전 지수</p>
            <Gauge value={safetyScore} size="sm" />
            {summary && (
              <span className="inline-flex items-center gap-1 text-caption text-text-muted">
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-primary-soft text-caption text-text-subtle">
                  {summary.gu} 단위
                </span>
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
