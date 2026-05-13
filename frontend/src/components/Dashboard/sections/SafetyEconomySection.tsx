// Dashboard SafetyEconomySection -- SPEC 4.4 Section E (안전·환경·경제).
//
// All data is gu-level (○○구 단위 뱃지). Metric codes from gu_metric table:
//   Safety:        SAFETY_GRADE_TRAFFIC, _CRIME, _FIRE, _DISEASE, _LIFE, _SUICIDE
//   Accidents:     ACC_TOTAL_COUNT, ACC_INJURY_COUNT, ACC_DRUNK_COUNT, ACC_HITRUN_COUNT
//   Green/Urban:   AREA_GREEN, AREA_URBAN
//   Economy:       GRDP_CURRENT, POP_RESIDENT (for per-capita)
//   Fire:          FIRE_COUNT
//   Transit (B3):  TRAFFIC_CULTURE_INDEX, TRAFFIC_SAFETY, TRAFFIC_WALK,
//                  TRAFFIC_DRIVE, TRAFFIC_VULNERABLE
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

/** Format ISO date "YYYY-MM-DD" → "YYYY년 기준". null/undefined → empty. */
function formatMetricDate(date: string | null | undefined): string {
  if (!date) return '';
  return `${date.slice(0, 4)}년 기준`;
}

/** Helper to get metric value with fallback. */
function mv(
  metrics: DongGuMetricsResponse['metrics'],
  code: string,
): number | null {
  return metrics[code]?.value ?? null;
}

/** Helper to get metric date. */
function mDate(
  metrics: DongGuMetricsResponse['metrics'],
  code: string,
): string | null | undefined {
  return metrics[code]?.date;
}

/** Helper to get Seoul average value. */
function sa(
  seoulAvg: DongGuMetricsResponse['seoul_avg'],
  code: string,
): number | null {
  return seoulAvg[code]?.value ?? null;
}

function formatNumber(n: number): string {
  if (Number.isInteger(n)) return n.toLocaleString();
  if (Math.abs(n) >= 1000) return Math.round(n).toLocaleString();
  return n.toFixed(1);
}

/** Render a metric card with value, Seoul comparison, unit, optional date footer. */
function MetricCard({
  label,
  value,
  seoulValue,
  unit,
  date,
  higherIsBetter = true,
  formatter,
}: {
  label: string;
  value: number | null;
  seoulValue: number | null;
  unit: string;
  date?: string | null;
  higherIsBetter?: boolean;
  formatter?: (n: number) => string;
}) {
  const fmt = formatter ?? formatNumber;
  const diff = value != null && seoulValue != null ? value - seoulValue : null;
  const isGood = diff != null ? (higherIsBetter ? diff >= 0 : diff <= 0) : null;
  const dateText = formatMetricDate(date);

  return (
    <div className="p-4 rounded-card border border-divider bg-surface">
      <p className="text-caption m-0 mb-1 text-text-subtle">{label}</p>
      <p className="tabular m-0 text-card-heading font-semibold text-text leading-[1.1]">
        {value != null ? `${fmt(value)}${unit}` : '-'}
      </p>
      {seoulValue != null && diff != null && (
        <p className="m-0 mt-1 text-caption text-text-muted">
          서울 {fmt(seoulValue)}{unit}
          <span className={`ml-1 font-medium ${isGood ? 'text-success' : 'text-danger'}`}>
            {diff >= 0 ? '▲' : '▼'}
            {fmt(Math.abs(diff))}{unit}
          </span>
        </p>
      )}
      {dateText && (
        <p className="m-0 mt-1 text-caption text-text-subtle">{dateText}</p>
      )}
    </div>
  );
}

// Safety radar field definitions — 6 SAFETY_GRADE sub-fields (실제 응답 코드 기준)
const SAFETY_FIELDS = [
  { code: 'SAFETY_GRADE_TRAFFIC', label: '교통안전' },
  { code: 'SAFETY_GRADE_CRIME', label: '범죄' },
  { code: 'SAFETY_GRADE_FIRE', label: '화재' },
  { code: 'SAFETY_GRADE_DISEASE', label: '생활질병' },
  { code: 'SAFETY_GRADE_LIFE', label: '생활안전' },
  { code: 'SAFETY_GRADE_SUICIDE', label: '자살' },
] as const;

// Transit culture radar (B3) — 4 sub-fields under TRAFFIC_CULTURE_INDEX
const TRAFFIC_CULTURE_FIELDS = [
  { code: 'TRAFFIC_SAFETY', label: '안전' },
  { code: 'TRAFFIC_WALK', label: '보행' },
  { code: 'TRAFFIC_DRIVE', label: '운전' },
  { code: 'TRAFFIC_VULNERABLE', label: '교통약자' },
] as const;

export default function SafetyEconomySection({
  guMetrics,
}: SafetyEconomySectionProps) {
  const { metrics, seoul_avg, gu_name } = guMetrics;

  // 1. Safety radar data — 1~5 scale, higher is safer
  const radarData = SAFETY_FIELDS.map((f) => ({
    subject: f.label,
    구: mv(metrics, f.code),
    서울: sa(seoul_avg, f.code),
  }));
  const hasRadarData = radarData.some((d) => d.구 != null);

  // Composite safety grade — mean of 6 sub-fields (since SAFETY_GRADE_MEAN not in response)
  const safetyValues = SAFETY_FIELDS.map((f) => mv(metrics, f.code)).filter(
    (v): v is number => v != null,
  );
  const safetyMean =
    safetyValues.length > 0
      ? safetyValues.reduce((a, b) => a + b, 0) / safetyValues.length
      : null;
  const seoulSafetyValues = SAFETY_FIELDS.map((f) => sa(seoul_avg, f.code)).filter(
    (v): v is number => v != null,
  );
  const seoulSafetyMean =
    seoulSafetyValues.length > 0
      ? seoulSafetyValues.reduce((a, b) => a + b, 0) / seoulSafetyValues.length
      : null;
  const safetyDate = formatMetricDate(mDate(metrics, 'SAFETY_GRADE_TRAFFIC'));

  // 2. Accident metrics — 실제 코드 기반
  const accTotal = mv(metrics, 'ACC_TOTAL_COUNT');
  const accInjury = mv(metrics, 'ACC_INJURY_COUNT');
  const accDrunk = mv(metrics, 'ACC_DRUNK_COUNT');
  const accHitrun = mv(metrics, 'ACC_HITRUN_COUNT');

  // 음주/뺑소니는 절대값 → 총건수 대비 비율로 변환
  const accDrunkRatio =
    accDrunk != null && accTotal != null && accTotal > 0 ? (accDrunk / accTotal) * 100 : null;
  const accHitrunRatio =
    accHitrun != null && accTotal != null && accTotal > 0 ? (accHitrun / accTotal) * 100 : null;
  const accDate = formatMetricDate(mDate(metrics, 'ACC_TOTAL_COUNT'));

  const accBarData = [
    ...(accDrunkRatio != null ? [{ name: '음주사고 비율', value: accDrunkRatio }] : []),
    ...(accHitrunRatio != null ? [{ name: '뺑소니 비율', value: accHitrunRatio }] : []),
  ];
  const accBarColors = [CATEGORY_COLORS.realestate, CATEGORY_COLORS.safety];

  // 3. Green area metrics — AREA_GREEN, AREA_URBAN, POP_RESIDENT
  const areaGreen = mv(metrics, 'AREA_GREEN');
  const areaUrban = mv(metrics, 'AREA_URBAN');
  const popResident = mv(metrics, 'POP_RESIDENT');
  const seoulAreaGreen = sa(seoul_avg, 'AREA_GREEN');
  const seoulAreaUrban = sa(seoul_avg, 'AREA_URBAN');
  const seoulPopResident = sa(seoul_avg, 'POP_RESIDENT');

  const greenRatio =
    areaGreen != null && areaUrban != null && areaGreen + areaUrban > 0
      ? (areaGreen / (areaGreen + areaUrban)) * 100
      : null;
  const greenPerCapita =
    areaGreen != null && popResident != null && popResident > 0
      ? areaGreen / popResident
      : null;
  const seoulGreenRatio =
    seoulAreaGreen != null && seoulAreaUrban != null && seoulAreaGreen + seoulAreaUrban > 0
      ? (seoulAreaGreen / (seoulAreaGreen + seoulAreaUrban)) * 100
      : null;
  const seoulGreenPerCapita =
    seoulAreaGreen != null && seoulPopResident != null && seoulPopResident > 0
      ? seoulAreaGreen / seoulPopResident
      : null;

  // 4. GRDP — GRDP_CURRENT (백만원 단위) ÷ POP_RESIDENT
  const grdpCurrent = mv(metrics, 'GRDP_CURRENT');
  const seoulGrdpCurrent = sa(seoul_avg, 'GRDP_CURRENT');
  const grdpPerCapita =
    grdpCurrent != null && popResident != null && popResident > 0
      ? grdpCurrent / popResident
      : null;
  const seoulGrdpPerCapita =
    seoulGrdpCurrent != null && seoulPopResident != null && seoulPopResident > 0
      ? seoulGrdpCurrent / seoulPopResident
      : null;
  const grdpDate = formatMetricDate(mDate(metrics, 'GRDP_CURRENT'));

  // GRDP 총액 — 백만원 → 조원 (÷ 1,000,000)
  const grdpTotalJo = grdpCurrent != null ? grdpCurrent / 1_000_000 : null;

  // 5. Fire count
  const fireCount = mv(metrics, 'FIRE_COUNT');
  const seoulFireCount = sa(seoul_avg, 'FIRE_COUNT');

  // B3. Traffic culture radar
  const trafficCultureIndex = mv(metrics, 'TRAFFIC_CULTURE_INDEX');
  const seoulTrafficCultureIndex = sa(seoul_avg, 'TRAFFIC_CULTURE_INDEX');
  const trafficRadarData = TRAFFIC_CULTURE_FIELDS.map((f) => ({
    subject: f.label,
    구: mv(metrics, f.code),
    서울: sa(seoul_avg, f.code),
  }));
  const hasTrafficRadar = trafficRadarData.some((d) => d.구 != null);
  const trafficCultureDate = formatMetricDate(mDate(metrics, 'TRAFFIC_CULTURE_INDEX'));

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

      {/* Row 1: Safety radar (with composite text) + Accident stats */}
      <div className="grid grid-cols-2 gap-5">
        {/* 1. Safety radar */}
        <Card padding="lg">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="m-0 text-feature-heading leading-[1.3] font-semibold text-text">
              안전 등급 (6분야)
            </h3>
            {safetyMean != null && (
              <p className="m-0 tabular text-caption text-text-muted">
                종합{' '}
                <span className="text-body-base font-semibold text-text">
                  {safetyMean.toFixed(1)}
                </span>
                {seoulSafetyMean != null && (
                  <span className="ml-1">/ 서울 {seoulSafetyMean.toFixed(1)}</span>
                )}
              </p>
            )}
          </div>
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
            1~5점, 높을수록 안전. {safetyDate || '서울시 안전등급 기준'}
          </p>
        </Card>

        {/* 2. Accident stats */}
        <Card padding="lg">
          <h3 className="m-0 mb-3 text-feature-heading leading-[1.3] font-semibold text-text">
            교통사고
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-card border border-divider bg-surface">
              <p className="text-caption m-0 mb-1 text-text-subtle">총 발생건수</p>
              <p className="tabular m-0 text-feature-heading font-semibold text-text">
                {accTotal != null ? `${accTotal.toLocaleString()}건` : '-'}
              </p>
            </div>
            <div className="p-3 rounded-card border border-divider bg-surface">
              <p className="text-caption m-0 mb-1 text-text-subtle">부상자수</p>
              <p className="tabular m-0 text-feature-heading font-semibold text-danger">
                {accInjury != null ? `${accInjury.toLocaleString()}명` : '-'}
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
                    tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
                    width={88}
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
          {accDate && (
            <p className="m-0 mt-2 text-caption text-text-subtle">{accDate}</p>
          )}
        </Card>
      </div>

      {/* Row 2: Traffic culture radar (B3) + GRDP total card */}
      <div className="grid grid-cols-2 gap-5">
        {/* B3. Traffic culture radar */}
        <Card padding="lg">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="m-0 text-feature-heading leading-[1.3] font-semibold text-text">
              교통문화지수
            </h3>
            {trafficCultureIndex != null && (
              <p className="m-0 tabular text-caption text-text-muted">
                종합{' '}
                <span className="text-body-base font-semibold text-text">
                  {trafficCultureIndex.toFixed(1)}
                </span>
                {seoulTrafficCultureIndex != null && (
                  <span className="ml-1">/ 서울 {seoulTrafficCultureIndex.toFixed(1)}</span>
                )}
              </p>
            )}
          </div>
          {hasTrafficRadar ? (
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={trafficRadarData}>
                  <PolarGrid stroke={CHART_COLORS.grid} />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fontSize: 9, fill: CHART_COLORS.axis }}
                    tickCount={6}
                  />
                  <Radar
                    name={gu_name}
                    dataKey="구"
                    stroke={CATEGORY_COLORS.transport}
                    fill={CATEGORY_COLORS.transport}
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
              교통문화지수 데이터가 없습니다
            </div>
          )}
          <p className="m-0 mt-2 text-caption text-text-subtle">
            0~100점, 높을수록 양호. {trafficCultureDate || '국토부 교통문화지수'}
          </p>
        </Card>

        {/* GRDP — 총액 + 1인당 */}
        <Card padding="lg">
          <h3 className="m-0 mb-3 text-feature-heading leading-[1.3] font-semibold text-text">
            GRDP (지역내총생산)
          </h3>
          <div className="flex flex-col gap-3">
            <div className="p-4 rounded-card border border-divider bg-surface">
              <p className="text-caption m-0 mb-1 text-text-subtle">{gu_name} GRDP 총액</p>
              <p className="tabular m-0 text-card-heading font-semibold text-text leading-[1.1]">
                {grdpTotalJo != null ? `${grdpTotalJo.toFixed(1)}조원` : '-'}
              </p>
              {grdpDate && (
                <p className="m-0 mt-1 text-caption text-text-subtle">{grdpDate}</p>
              )}
            </div>
            <div className="p-4 rounded-card border border-divider bg-surface">
              <p className="text-caption m-0 mb-1 text-text-subtle">1인당 GRDP</p>
              <p className="tabular m-0 text-card-heading font-semibold text-text leading-[1.1]">
                {grdpPerCapita != null ? `${grdpPerCapita.toFixed(1)}백만원` : '-'}
              </p>
              {seoulGrdpPerCapita != null && grdpPerCapita != null && (
                <p className="m-0 mt-1 text-caption text-text-muted">
                  서울 {seoulGrdpPerCapita.toFixed(1)}백만원
                  <span
                    className={`ml-1 font-medium ${
                      grdpPerCapita >= seoulGrdpPerCapita ? 'text-success' : 'text-danger'
                    }`}
                  >
                    {grdpPerCapita >= seoulGrdpPerCapita ? '▲' : '▼'}
                    {Math.abs(grdpPerCapita - seoulGrdpPerCapita).toFixed(1)}백만원
                  </span>
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Row 3: Green + Fire metrics */}
      <div className="grid grid-cols-3 gap-5">
        <MetricCard
          label="녹지 비율"
          value={greenRatio}
          seoulValue={seoulGreenRatio}
          unit="%"
          date={mDate(metrics, 'AREA_GREEN')}
          higherIsBetter={true}
          formatter={(n) => n.toFixed(1)}
        />
        <MetricCard
          label="1인당 녹지"
          value={greenPerCapita}
          seoulValue={seoulGreenPerCapita}
          unit="㎡"
          date={mDate(metrics, 'AREA_GREEN')}
          higherIsBetter={true}
          formatter={(n) => n.toFixed(1)}
        />
        <MetricCard
          label="화재 발생"
          value={fireCount}
          seoulValue={seoulFireCount}
          unit="건"
          date={mDate(metrics, 'FIRE_COUNT')}
          higherIsBetter={false}
        />
      </div>
    </div>
  );
}
