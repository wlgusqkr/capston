// Dashboard SafetyEconomySection -- SPEC 4.4 Section E (안전·환경·경제).
//
// All data is gu-level (○○구 단위 뱃지). Metric codes from gu_metric table:
//   Safety: SAFETY_GRADE_MEAN, SAFETY_GRADE_TRAFFIC, SAFETY_GRADE_CRIME,
//           SAFETY_GRADE_FIRE, SAFETY_GRADE_DISASTER, SAFETY_GRADE_LIFE
//   Accidents: ACC_TOTAL, ACC_DEATH, ACC_DRUNK_RATIO, ACC_HITRUN_RATIO
//   Green: AREA_GREEN_RATIO, AREA_GREEN_PER_CAPITA
//   Economy: GRDP_TOTAL, GRDP_PER_CAPITA
//   Fire: FIRE_COUNT
//
// Data: DongGuMetricsResponse

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import { CATEGORY_COLORS, CHART_COLORS } from '@/lib/colors';
import type { DongGuMetricsResponse } from '@/types/api';

interface SafetyEconomySectionProps {
  guMetrics: DongGuMetricsResponse;
}

const TOOLTIP_STYLE = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  fontSize: 'var(--font-caption-size)',
};

/** Helper to get metric value with fallback. */
function mv(
  metrics: DongGuMetricsResponse['metrics'],
  code: string,
): number | null {
  return metrics[code]?.value ?? null;
}

/** Helper to get Seoul average value. */
function sa(
  seoulAvg: DongGuMetricsResponse['seoul_avg'],
  code: string,
): number | null {
  return seoulAvg[code]?.value ?? null;
}

/** Render a metric card with value, Seoul comparison, and unit. */
function MetricCard({
  label,
  value,
  seoulValue,
  unit,
  higherIsBetter = true,
}: {
  label: string;
  value: number | null;
  seoulValue: number | null;
  unit: string;
  higherIsBetter?: boolean;
}) {
  const diff = value != null && seoulValue != null ? value - seoulValue : null;
  const isGood = diff != null ? (higherIsBetter ? diff >= 0 : diff <= 0) : null;

  return (
    <div className="p-4 rounded-card border border-divider bg-surface">
      <p className="mono-label m-0 mb-1 text-text-subtle">{label}</p>
      <p className="tabular m-0 text-card-heading font-semibold text-text leading-[1.1]">
        {value != null ? `${formatNumber(value)}${unit}` : '-'}
      </p>
      {seoulValue != null && diff != null && (
        <p className="m-0 mt-1 text-caption text-text-muted">
          서울 {formatNumber(seoulValue)}{unit}
          <span className={`ml-1 font-medium ${isGood ? 'text-success' : 'text-danger'}`}>
            {diff >= 0 ? '▲' : '▼'}
            {formatNumber(Math.abs(diff))}{unit}
          </span>
        </p>
      )}
    </div>
  );
}

function formatNumber(n: number): string {
  if (Number.isInteger(n)) return n.toLocaleString();
  if (Math.abs(n) >= 1000) return Math.round(n).toLocaleString();
  return n.toFixed(1);
}

// Safety radar field definitions — 6 SAFETY_GRADE sub-fields
const SAFETY_FIELDS = [
  { code: 'SAFETY_GRADE_TRAFFIC', label: '교통안전' },
  { code: 'SAFETY_GRADE_CRIME', label: '범죄안전' },
  { code: 'SAFETY_GRADE_FIRE', label: '화재안전' },
  { code: 'SAFETY_GRADE_DISASTER', label: '재난안전' },
  { code: 'SAFETY_GRADE_LIFE', label: '생활안전' },
  { code: 'SAFETY_GRADE_MEAN', label: '종합' },
] as const;

export default function SafetyEconomySection({
  guMetrics,
}: SafetyEconomySectionProps) {
  const { metrics, seoul_avg, gu_name } = guMetrics;

  // 1. Safety radar data — safety grades are 1~5 scale, higher is safer
  const radarData = SAFETY_FIELDS.map((f) => ({
    subject: f.label,
    구: mv(metrics, f.code),
    서울: sa(seoul_avg, f.code),
  }));
  const hasRadarData = radarData.some((d) => d.구 != null);

  // 2. Accident metrics
  const accTotal = mv(metrics, 'ACC_TOTAL');
  const accDeath = mv(metrics, 'ACC_DEATH');
  const accDrunkRatio = mv(metrics, 'ACC_DRUNK_RATIO');
  const accHitrunRatio = mv(metrics, 'ACC_HITRUN_RATIO');

  // Bar chart for drunk/hit-run ratios
  const accBarData = [
    ...(accDrunkRatio != null ? [{ name: '음주사고 비율', value: accDrunkRatio }] : []),
    ...(accHitrunRatio != null ? [{ name: '뺑소니 비율', value: accHitrunRatio }] : []),
  ];
  const accBarColors = [CATEGORY_COLORS.realestate, CATEGORY_COLORS.safety];

  // 3. Green area metrics
  const greenRatio = mv(metrics, 'AREA_GREEN_RATIO');
  const greenPerCapita = mv(metrics, 'AREA_GREEN_PER_CAPITA');
  const seoulGreenRatio = sa(seoul_avg, 'AREA_GREEN_RATIO');
  const seoulGreenPerCapita = sa(seoul_avg, 'AREA_GREEN_PER_CAPITA');

  // 4. GRDP
  const grdpTotal = mv(metrics, 'GRDP_TOTAL');
  const grdpPerCapita = mv(metrics, 'GRDP_PER_CAPITA');
  const seoulGrdpPerCapita = sa(seoul_avg, 'GRDP_PER_CAPITA');

  // 5. Fire count
  const fireCount = mv(metrics, 'FIRE_COUNT');
  const seoulFireCount = sa(seoul_avg, 'FIRE_COUNT');

  return (
    <div className="flex flex-col gap-5">
      {/* Badge: all data is gu-level */}
      <div className="flex items-center gap-2">
        <Badge variant="neutral" size="sm">
          {gu_name} 단위
        </Badge>
        <span className="text-caption text-text-muted">
          모든 지표는 자치구 단위 데이터입니다
        </span>
      </div>

      {/* Row 1: Safety radar + Accident stats */}
      <div className="grid grid-cols-2 gap-5">
        {/* 1. Safety radar */}
        <Card padding="lg">
          <h3 className="m-0 mb-3 text-feature-heading leading-[1.3] font-semibold text-text">
            안전 등급 (6분야)
          </h3>
          {hasRadarData ? (
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke={CHART_COLORS.grid} />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 5]}
                    tick={{ fontSize: 9, fill: CHART_COLORS.axis }}
                    tickCount={6}
                  />
                  <Radar
                    name={gu_name}
                    dataKey="구"
                    stroke={CATEGORY_COLORS.safety}
                    fill={CATEGORY_COLORS.safety}
                    fillOpacity={0.25}
                    isAnimationActive={true}
                    animationDuration={1200}
                  />
                  <Radar
                    name="서울 평균"
                    dataKey="서울"
                    stroke={CHART_COLORS.axis}
                    fill={CHART_COLORS.axis}
                    fillOpacity={0.08}
                    strokeDasharray="4 4"
                    isAnimationActive={true}
                    animationDuration={1200}
                    animationBegin={300}
                  />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-text-muted text-caption">
              안전 등급 데이터가 없습니다
            </div>
          )}
          <p className="m-0 mt-2 text-caption text-text-subtle">
            1~5점, 높을수록 안전. 서울시 안전등급 기준.
          </p>
        </Card>

        {/* 2. Accident stats */}
        <Card padding="lg">
          <h3 className="m-0 mb-3 text-feature-heading leading-[1.3] font-semibold text-text">
            교통사고
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-card border border-divider bg-surface">
              <p className="mono-label m-0 mb-1 text-text-subtle">총 발생건수</p>
              <p className="tabular m-0 text-feature-heading font-semibold text-text">
                {accTotal != null ? `${accTotal.toLocaleString()}건` : '-'}
              </p>
            </div>
            <div className="p-3 rounded-card border border-divider bg-surface">
              <p className="mono-label m-0 mb-1 text-text-subtle">사망자수</p>
              <p className="tabular m-0 text-feature-heading font-semibold text-danger">
                {accDeath != null ? `${accDeath}명` : '-'}
              </p>
            </div>
          </div>
          {accBarData.length > 0 ? (
            <div className="h-[120px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={accBarData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: CHART_COLORS.axis }}
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value) => {
                      const v = value as number;
                      return [`${v.toFixed(1)}%`, ''];
                    }}
                  />
                  <Bar
                    dataKey="value"
                    radius={[0, 4, 4, 0]}
                    isAnimationActive={true}
                    animationDuration={800}
                  >
                    {accBarData.map((_, idx) => (
                      <Cell key={idx} fill={accBarColors[idx]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[80px] text-text-muted text-caption">
              음주/뺑소니 비율 데이터가 없습니다
            </div>
          )}
        </Card>
      </div>

      {/* Row 2: Green area + GRDP + Fire */}
      <div className="grid grid-cols-4 gap-5">
        <MetricCard
          label="녹지 비율"
          value={greenRatio}
          seoulValue={seoulGreenRatio}
          unit="%"
          higherIsBetter={true}
        />
        <MetricCard
          label="1인당 녹지"
          value={greenPerCapita}
          seoulValue={seoulGreenPerCapita}
          unit="㎡"
          higherIsBetter={true}
        />
        <MetricCard
          label="1인당 GRDP"
          value={grdpPerCapita != null ? Math.round(grdpPerCapita / 100) / 10 : null}
          seoulValue={seoulGrdpPerCapita != null ? Math.round(seoulGrdpPerCapita / 100) / 10 : null}
          unit="백만원"
          higherIsBetter={true}
        />
        <MetricCard
          label="화재 발생"
          value={fireCount}
          seoulValue={seoulFireCount}
          unit="건"
          higherIsBetter={false}
        />
      </div>

      {/* GRDP total note */}
      {grdpTotal != null && (
        <p className="m-0 text-caption text-text-subtle">
          {gu_name} GRDP 총액: {(grdpTotal / 10000).toFixed(1)}조원
        </p>
      )}
    </div>
  );
}
