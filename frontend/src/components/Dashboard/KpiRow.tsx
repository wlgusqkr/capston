// KpiRow -- dashboard top KPI rows.
//
// Row 1 (4 cards):
//   1. Average converted rent + mini line (last 6 months trend) + percentile badge
//   2. Average deposit (weighted from deposit_band_avg) + insight
//   3. Recent deal count + mini bar (monthly deal counts) + percentile badge
//   4. Safety gauge (from summary.safety_level) + insight
//
// Row 2 (2 cards, col-span-2 each):
//   5. 자취촌 지수 게이지 (SPEC §4.5) + breakdown (no truncate)
//   6. 계약 활발도 (deals_per_1000) KPI

import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
} from 'recharts';

import Gauge from '@/components/ui/Gauge';
import { CHART_COLORS } from '@/lib/colors';
import type { DongDerivedIndicesResponse, DongDetail, DongScore, DongSummary } from '@/types/api';

import KpiCard from './KpiCard';

interface KpiRowProps {
  detail: DongDetail | undefined;
  summary: DongSummary | undefined;
  derived: DongDerivedIndicesResponse | undefined;
  allDongs: DongScore[] | undefined;
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

/** Map safety_level to Korean text. */
function safetyLevelLabel(level: DongSummary['safety_level']): string {
  switch (level) {
    case 'high':
      return '높음';
    case 'mid':
      return '보통';
    case 'low':
      return '낮음';
    default:
      return '-';
  }
}

/** Compute weighted average deposit from deposit_band_avg. */
function computeAvgDeposit(
  bands: DongDetail['real_estate']['deposit_band_avg'],
): number | null {
  if (!bands || bands.length === 0) return null;
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

/** Compute percentile of a value within a sorted-desc array. Returns "상위 N%" string. */
function computeRentPercentile(
  allDongs: DongScore[] | undefined,
  rentValue: number,
): string | undefined {
  if (!allDongs || allDongs.length === 0) return undefined;
  const rents = allDongs.map((d) => d.score_rent).sort((a, b) => b - a);
  const idx = rents.findIndex((r) => rentValue >= r);
  const percentile = idx >= 0 ? Math.max(1, Math.round(((idx + 1) / rents.length) * 100)) : 100;
  return `상위 ${percentile}%`;
}

/** Get deposit insight text. */
function getDepositInsight(avgDeposit: number | null): string | undefined {
  if (avgDeposit == null) return undefined;
  if (avgDeposit <= 500) return '보증금 부담이 적은 동네예요';
  if (avgDeposit <= 1500) return '보증금이 평균 수준이에요';
  return '보증금이 다소 높은 편이에요';
}

/** Get safety insight text. */
function getSafetyInsight(level: DongSummary['safety_level']): string {
  switch (level) {
    case 'high':
      return '안전 등급이 높은 구예요';
    case 'mid':
      return '안전 등급이 평균 수준이에요';
    case 'low':
      return '안전 등급이 낮은 편이에요';
    default:
      return '';
  }
}

export default function KpiRow({ detail, summary, derived, allDongs, isLoading }: KpiRowProps) {
  const kpi = detail?.real_estate.studio_kpi;
  const avgDeposit = detail ? computeAvgDeposit(detail.real_estate.deposit_band_avg) : null;
  const miniLineData = detail ? buildMiniLineData(detail.real_estate.monthly_trend) : [];
  const miniBarData = detail ? buildMiniBarData(detail.real_estate.monthly_trend) : [];
  const safetyScore = summary ? safetyLevelToScore(summary.safety_level) : 50;

  const studio = derived?.studio_index;
  const activity = derived?.activity;

  // 자취촌 지수 derived fields
  const studioScore = studio?.score;
  const studioPercentile = studio?.percentile;
  const studioRank = studio?.rank;
  const studioTotal = studio?.total_dongs;
  const breakdown = studio?.breakdown;

  // 계약 활발도 derived fields
  const activityPercentile = activity?.percentile;
  const dealsPer1000 = activity?.deals_per_1000;
  const deals12m = activity?.deals_12m;
  const pop = activity?.population;

  // Percentile computations for KPI cards
  const rentBadge = kpi?.avg_converted_rent != null
    ? computeRentPercentile(allDongs, kpi.avg_converted_rent)
    : undefined;
  const rentInsight = kpi?.avg_converted_rent != null && allDongs && allDongs.length > 0
    ? `서울 ${allDongs.length}개 동 중 월세가 ${(kpi.avg_converted_rent <= 50) ? '저렴한' : (kpi.avg_converted_rent <= 70) ? '평균 수준인' : '높은'} 편이에요`
    : undefined;

  const dealBadge = activityPercentile != null
    ? `상위 ${Math.max(1, 100 - activityPercentile)}%`
    : undefined;

  return (
    <div className="flex flex-col gap-3">
      {/* Row 1: 4 KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {/* 1. Average converted rent */}
        <KpiCard
          label="평균 환산 월세"
          value={
            kpi?.avg_converted_rent != null
              ? `${kpi.avg_converted_rent}만원`
              : '-'
          }
          badge={rentBadge}
          insight={rentInsight}
          hint="월세 + 보증금 x 0.005"
          isLoading={isLoading}
          miniChart={
            miniLineData.length > 0 ? (
              <div className="h-[32px] w-full">
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
          insight={getDepositInsight(avgDeposit)}
          hint="보증금 구간 가중평균"
          isLoading={isLoading}
        />

        {/* 3. Recent deal count */}
        <KpiCard
          label="최근 거래 건수"
          value={kpi?.recent_count != null ? `${kpi.recent_count}건` : '-'}
          badge={dealBadge}
          insight={kpi?.recent_count != null ? '거래가 활발한 편이에요' : undefined}
          hint="최근 6개월 자취 거래"
          isLoading={isLoading}
          miniChart={
            miniBarData.length > 0 ? (
              <div className="h-[32px] w-full">
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
        <div className="p-3 border border-divider rounded-card bg-surface flex flex-col items-center gap-1.5">
          {isLoading ? (
            <>
              <div className="h-3 w-16 bg-primary-soft rounded animate-[match-panel-pulse_1.5s_ease-in-out_infinite]" />
              <div className="h-16 w-16 bg-primary-soft rounded-full animate-[match-panel-pulse_1.5s_ease-in-out_infinite]" />
            </>
          ) : (
            <>
              <p className="text-[12px] m-0 text-text-subtle">안전 지수</p>
              <Gauge value={safetyScore} size="sm" />
              {summary && (
                <>
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-primary-soft text-[11px] text-text-subtle">
                    {safetyLevelLabel(summary.safety_level)} · {summary.gu}
                  </span>
                  <p className="m-0 text-[13px] text-text leading-snug text-center">
                    {getSafetyInsight(summary.safety_level)}
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Row 2: 자취촌 지수 + 계약 활발도 (col-span-2 each) */}
      <div className="grid grid-cols-4 gap-3">
        {/* 5. 자취촌 지수 게이지 */}
        <div className="col-span-2 p-3 border border-divider rounded-card bg-surface flex items-center gap-3">
          {!derived ? (
            <>
              <div className="h-16 w-16 bg-primary-soft rounded-full animate-[match-panel-pulse_1.5s_ease-in-out_infinite]" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-3 w-20 bg-primary-soft rounded animate-[match-panel-pulse_1.5s_ease-in-out_infinite]" />
                <div className="h-4 w-32 bg-primary-soft rounded animate-[match-panel-pulse_1.5s_ease-in-out_infinite]" />
                <div className="h-3 w-40 bg-primary-soft rounded animate-[match-panel-pulse_1.5s_ease-in-out_infinite]" />
              </div>
            </>
          ) : studioScore == null ? (
            <>
              <Gauge value={0} size="sm" animate={false} />
              <div className="flex-1 flex flex-col gap-1 min-w-0">
                <p className="text-[12px] m-0 text-text-subtle">자취촌 지수</p>
                <p className="text-[14px] font-medium text-text-muted m-0">
                  데이터 부족
                </p>
                <p className="text-[12px] m-0 text-text-muted">
                  최근 12개월 거래가 없는 동입니다
                </p>
              </div>
            </>
          ) : (
            <>
              <Gauge value={studioScore} size="sm" />
              <div className="flex-1 flex flex-col gap-1 min-w-0">
                <p className="text-[12px] m-0 text-text-subtle">자취촌 지수</p>
                <div className="flex items-baseline gap-2 flex-wrap">
                  {studioPercentile != null && (
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-primary-soft text-[11px] text-primary font-medium">
                      상위 {Math.max(1, 100 - studioPercentile)}%
                    </span>
                  )}
                  {studioRank != null && studioTotal != null && (
                    <span className="text-[12px] tabular text-text-muted">
                      {studioRank}/{studioTotal}위
                    </span>
                  )}
                </div>
                {breakdown && (
                  <p className="text-[12px] leading-snug m-0 text-text-muted">
                    비아파트 {Math.round(breakdown.non_apt_ratio * 100)}% · 소형{' '}
                    {Math.round(breakdown.small_area_ratio * 100)}% · 월세 활발{' '}
                    {Math.round(breakdown.monthly_deal_normalized * 100)}%
                  </p>
                )}
                <p className="text-[11px] m-0 text-text-subtle">
                  비아파트·소형·월세 가중평균
                </p>
              </div>
            </>
          )}
        </div>

        {/* 6. 계약 활발도 */}
        <div className="col-span-2 p-3 border border-divider rounded-card bg-surface flex flex-col gap-1.5">
          {!derived ? (
            <>
              <div className="h-3 w-20 bg-primary-soft rounded animate-[match-panel-pulse_1.5s_ease-in-out_infinite]" />
              <div className="h-6 w-32 bg-primary-soft rounded animate-[match-panel-pulse_1.5s_ease-in-out_infinite]" />
              <div className="h-3 w-40 bg-primary-soft rounded animate-[match-panel-pulse_1.5s_ease-in-out_infinite]" />
            </>
          ) : dealsPer1000 == null ? (
            <>
              <p className="text-[12px] m-0 text-text-subtle">계약 활발도</p>
              <p className="text-[14px] font-medium text-text-muted m-0">
                데이터 부족
              </p>
              <p className="text-[12px] m-0 text-text-muted">
                인구 데이터가 없어 산출할 수 없습니다
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] m-0 text-text-subtle">계약 활발도</p>
                {activityPercentile != null && (
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-primary-soft text-[11px] text-primary font-medium">
                    상위 {Math.max(1, 100 - activityPercentile)}%
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <p className="tabular m-0 text-[20px] font-semibold text-text leading-[1.1]">
                  {dealsPer1000.toFixed(1)}
                </p>
                <span className="text-[12px] text-text-muted">회/천명</span>
              </div>
              <p className="text-[13px] m-0 text-text leading-snug">
                거래가 활발한 편이에요
              </p>
              <p className="text-[11px] m-0 text-text-muted">
                최근 12개월 거래 {(deals12m ?? 0).toLocaleString()}건
                {pop != null && ` · 인구 ${pop.toLocaleString()}명`}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
