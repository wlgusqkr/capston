// Dashboard PopulationSection -- SPEC 4.4 Section D (인구·사회).
//
// Widgets:
//   1. Gender ratio donut (adong_population latest male/female)
//   2. Population trend line (adong_population trend, 2022.09~)
//   3. Youth ratio highlight cards (POP_YOUTH_19_34 / POP_TOTAL_YOUTH_BASE)
//   4. Avg age card (POP_MEAN_AGE + male/female chips) — Phase 4 B1
//   5. Elderly ratio donut (POP_ELDERLY_RATIO) — Phase 4 B2
//   6. 1-person household estimate donut (household vs population ratio)
//
// Data: DongPopulationResponse + DongGuMetricsResponse

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import { CATEGORY_COLORS, CHART_COLORS } from '@/lib/colors';
import type { DongGuMetricsResponse, DongPopulationResponse } from '@/types/api';

interface PopulationSectionProps {
  population: DongPopulationResponse;
  guMetrics: DongGuMetricsResponse | undefined;
}

const GENDER_COLORS = [CATEGORY_COLORS.transport, '#EC4899'] as const; // blue for male, pink for female

const TOOLTIP_STYLE = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  fontSize: 'var(--font-caption-size)',
};

/** Format ISO date "YYYY-MM-DD" → "YYYY년 기준". null/undefined → empty. */
function formatMetricDate(date: string | null | undefined): string {
  if (!date) return '';
  const year = date.slice(0, 4);
  return `${year}년 기준`;
}

export default function PopulationSection({
  population,
  guMetrics,
}: PopulationSectionProps) {
  const latest = population.latest;
  const trend = population.trend;

  // 1. Gender ratio donut data
  const genderData = latest
    ? [
        { name: '남성', value: latest.male_population },
        { name: '여성', value: latest.female_population },
      ]
    : [];
  const maleRatio =
    latest && latest.total_population > 0
      ? ((latest.male_population / latest.total_population) * 100).toFixed(1)
      : null;
  const femaleRatio =
    latest && latest.total_population > 0
      ? ((latest.female_population / latest.total_population) * 100).toFixed(1)
      : null;

  // 2. Population trend line data — sample every 3rd point if too many rows
  const trendData = (() => {
    const sampled = trend.length > 24 ? trend.filter((_, i) => i % 3 === 0 || i === trend.length - 1) : trend;
    return sampled.map((row) => ({
      date: row.date,
      인구: row.total_population,
      세대: row.household_count,
    }));
  })();

  // 3. Youth ratio — compute from POP_YOUTH_19_34/39 ÷ POP_TOTAL_YOUTH_BASE × 100
  const youth19_34 = guMetrics?.metrics['POP_YOUTH_19_34']?.value ?? null;
  const youth19_39 = guMetrics?.metrics['POP_YOUTH_19_39']?.value ?? null;
  const youthBase = guMetrics?.metrics['POP_TOTAL_YOUTH_BASE']?.value ?? null;
  const seoulYouth19_34 = guMetrics?.seoul_avg['POP_YOUTH_19_34']?.value ?? null;
  const seoulYouth19_39 = guMetrics?.seoul_avg['POP_YOUTH_19_39']?.value ?? null;
  const seoulYouthBase = guMetrics?.seoul_avg['POP_TOTAL_YOUTH_BASE']?.value ?? null;

  const youthRatio19_34 =
    youth19_34 != null && youthBase != null && youthBase > 0
      ? (youth19_34 / youthBase) * 100
      : null;
  const youthRatio19_39 =
    youth19_39 != null && youthBase != null && youthBase > 0
      ? (youth19_39 / youthBase) * 100
      : null;
  const seoulYouthRatio19_34 =
    seoulYouth19_34 != null && seoulYouthBase != null && seoulYouthBase > 0
      ? (seoulYouth19_34 / seoulYouthBase) * 100
      : null;
  const seoulYouthRatio19_39 =
    seoulYouth19_39 != null && seoulYouthBase != null && seoulYouthBase > 0
      ? (seoulYouth19_39 / seoulYouthBase) * 100
      : null;
  const youthDate = formatMetricDate(guMetrics?.metrics['POP_YOUTH_19_34']?.date);

  // 4. (B1) Avg age — POP_MEAN_AGE / *_MALE / *_FEMALE
  const meanAge = guMetrics?.metrics['POP_MEAN_AGE']?.value ?? null;
  const meanAgeMale = guMetrics?.metrics['POP_MEAN_AGE_MALE']?.value ?? null;
  const meanAgeFemale = guMetrics?.metrics['POP_MEAN_AGE_FEMALE']?.value ?? null;
  const seoulMeanAge = guMetrics?.seoul_avg['POP_MEAN_AGE']?.value ?? null;
  const meanAgeDate = formatMetricDate(guMetrics?.metrics['POP_MEAN_AGE']?.date);
  const meanAgeDiff = meanAge != null && seoulMeanAge != null ? meanAge - seoulMeanAge : null;

  // 5. (B2) Elderly ratio — POP_ELDERLY_RATIO (%)
  const elderlyRatio = guMetrics?.metrics['POP_ELDERLY_RATIO']?.value ?? null;
  const seoulElderlyRatio = guMetrics?.seoul_avg['POP_ELDERLY_RATIO']?.value ?? null;
  const elderlyDate = formatMetricDate(guMetrics?.metrics['POP_ELDERLY_RATIO']?.date);
  const elderlyDonutData =
    elderlyRatio != null
      ? [
          { name: '65세 이상', value: elderlyRatio },
          { name: '그 외', value: Math.max(0, 100 - elderlyRatio) },
        ]
      : [];

  // 6. 1-person household estimate (가구당 평균인원 기반 단순 추정)
  const avgPersonsPerHousehold =
    latest && latest.household_count > 0
      ? latest.total_population / latest.household_count
      : null;
  const singleHouseholdPct =
    avgPersonsPerHousehold != null
      ? Math.max(0, Math.min(100, Math.round((2 - avgPersonsPerHousehold) * 100)))
      : null;
  const singleDonutData =
    singleHouseholdPct != null
      ? [
          { name: '1인 가구 (추정)', value: singleHouseholdPct },
          { name: '기타 가구', value: 100 - singleHouseholdPct },
        ]
      : [];

  return (
    <div className="flex flex-col gap-5">
      {/* Row 1: Gender donut + Population trend */}
      <div className="grid grid-cols-3 gap-5">
        {/* 1. Gender ratio donut */}
        <Card padding="lg">
          <h3 className="m-0 mb-3 text-feature-heading leading-[1.3] font-semibold text-text">
            남녀 비율
          </h3>
          {genderData.length > 0 ? (
            <div className="flex flex-col items-center">
              <div className="h-[160px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genderData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius="55%"
                      outerRadius="80%"
                      paddingAngle={2}
                      isAnimationActive={true}
                      animationDuration={1000}
                      animationBegin={200}
                    >
                      {genderData.map((_, idx) => (
                        <Cell key={idx} fill={GENDER_COLORS[idx]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(value) => {
                        const v = value as number;
                        return [`${v.toLocaleString()}명`, ''];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-4 text-caption text-text-muted">
                <span>
                  <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: GENDER_COLORS[0] }} />
                  남성 {maleRatio}%
                </span>
                <span>
                  <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: GENDER_COLORS[1] }} />
                  여성 {femaleRatio}%
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[160px] text-text-muted text-caption">
              인구 데이터가 없습니다
            </div>
          )}
        </Card>

        {/* 2. Population trend line */}
        <Card padding="lg" className="col-span-2">
          <h3 className="m-0 mb-3 text-feature-heading leading-[1.3] font-semibold text-text">
            인구 추이
          </h3>
          {trendData.length > 0 ? (
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: CHART_COLORS.axis }}
                    tickFormatter={(d: string) => d.slice(2, 7)} // "22-09"
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: CHART_COLORS.axis }}
                    tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value) => {
                      const v = value as number;
                      return [`${v.toLocaleString()}`, ''];
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="인구"
                    stroke={CATEGORY_COLORS.population}
                    fill={CATEGORY_COLORS.population}
                    fillOpacity={0.15}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={true}
                    animationDuration={1200}
                  />
                  <Area
                    type="monotone"
                    dataKey="세대"
                    stroke={CATEGORY_COLORS.environment}
                    fill={CATEGORY_COLORS.environment}
                    fillOpacity={0.1}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={true}
                    animationDuration={1200}
                    animationBegin={300}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-text-muted text-caption">
              추이 데이터가 없습니다
            </div>
          )}
        </Card>
      </div>

      {/* Row 2: Youth ratio + Avg age + Elderly ratio */}
      <div className="grid grid-cols-3 gap-5">
        {/* 3. Youth ratio cards */}
        <Card padding="lg">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="m-0 text-feature-heading leading-[1.3] font-semibold text-text">
              청년 비율
            </h3>
            {guMetrics && (
              <Badge variant="neutral" size="sm">
                {guMetrics.gu_name} 단위
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* 19~34세 */}
            <div className="p-3 rounded-card border border-divider bg-surface">
              <p className="text-caption m-0 mb-1 text-text-subtle">19~34세</p>
              <p className="tabular m-0 text-card-heading font-semibold text-text leading-[1.1]">
                {youthRatio19_34 != null ? `${youthRatio19_34.toFixed(1)}%` : '-'}
              </p>
              {seoulYouthRatio19_34 != null && youthRatio19_34 != null && (
                <p className="m-0 mt-1 text-caption text-text-muted">
                  서울 {seoulYouthRatio19_34.toFixed(1)}%
                  <span className={`ml-1 font-medium ${youthRatio19_34 > seoulYouthRatio19_34 ? 'text-success' : 'text-danger'}`}>
                    {youthRatio19_34 > seoulYouthRatio19_34 ? '▲' : '▼'}
                    {Math.abs(youthRatio19_34 - seoulYouthRatio19_34).toFixed(1)}%p
                  </span>
                </p>
              )}
            </div>
            {/* 19~39세 */}
            <div className="p-3 rounded-card border border-divider bg-surface">
              <p className="text-caption m-0 mb-1 text-text-subtle">19~39세</p>
              <p className="tabular m-0 text-card-heading font-semibold text-text leading-[1.1]">
                {youthRatio19_39 != null ? `${youthRatio19_39.toFixed(1)}%` : '-'}
              </p>
              {seoulYouthRatio19_39 != null && youthRatio19_39 != null && (
                <p className="m-0 mt-1 text-caption text-text-muted">
                  서울 {seoulYouthRatio19_39.toFixed(1)}%
                  <span className={`ml-1 font-medium ${youthRatio19_39 > seoulYouthRatio19_39 ? 'text-success' : 'text-danger'}`}>
                    {youthRatio19_39 > seoulYouthRatio19_39 ? '▲' : '▼'}
                    {Math.abs(youthRatio19_39 - seoulYouthRatio19_39).toFixed(1)}%p
                  </span>
                </p>
              )}
            </div>
          </div>
          {youthDate && (
            <p className="m-0 mt-2 text-caption text-text-subtle">{youthDate}</p>
          )}
          {!guMetrics && (
            <div className="flex items-center justify-center h-[60px] text-text-muted text-caption">
              구 지표 데이터를 불러오는 중...
            </div>
          )}
        </Card>

        {/* 4. (B1) Avg age */}
        <Card padding="lg">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="m-0 text-feature-heading leading-[1.3] font-semibold text-text">
              평균 연령
            </h3>
            {guMetrics && (
              <Badge variant="neutral" size="sm">
                {guMetrics.gu_name} 단위
              </Badge>
            )}
          </div>
          {meanAge != null ? (
            <>
              <p className="tabular m-0 text-card-heading font-semibold text-text leading-[1.1]">
                {meanAge.toFixed(1)}
                <span className="ml-1 text-body-base font-medium text-text-muted">세</span>
              </p>
              <div className="flex items-center gap-2 mt-2">
                {meanAgeMale != null && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-medium"
                    style={{
                      backgroundColor: 'var(--color-info-soft)',
                      color: GENDER_COLORS[0],
                    }}
                  >
                    남 {meanAgeMale.toFixed(1)}
                  </span>
                )}
                {meanAgeFemale != null && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-medium"
                    style={{
                      backgroundColor: 'var(--color-danger-soft)',
                      color: GENDER_COLORS[1],
                    }}
                  >
                    여 {meanAgeFemale.toFixed(1)}
                  </span>
                )}
              </div>
              {seoulMeanAge != null && meanAgeDiff != null && (
                <p className="m-0 mt-2 text-caption text-text-muted">
                  서울 {seoulMeanAge.toFixed(1)}세
                  <span className={`ml-1 font-medium ${meanAgeDiff <= 0 ? 'text-success' : 'text-danger'}`}>
                    {meanAgeDiff >= 0 ? '▲' : '▼'}
                    {Math.abs(meanAgeDiff).toFixed(1)}세
                  </span>
                </p>
              )}
              {meanAgeDate && (
                <p className="m-0 mt-1 text-caption text-text-subtle">{meanAgeDate}</p>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-[80px] text-text-muted text-caption">
              평균 연령 데이터가 없습니다
            </div>
          )}
        </Card>

        {/* 5. (B2) Elderly ratio donut */}
        <Card padding="lg">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="m-0 text-feature-heading leading-[1.3] font-semibold text-text">
              고령 인구 비율
            </h3>
            {guMetrics && (
              <Badge variant="neutral" size="sm">
                {guMetrics.gu_name} 단위
              </Badge>
            )}
          </div>
          {elderlyDonutData.length > 0 && elderlyRatio != null ? (
            <div className="flex flex-col items-center">
              <div className="h-[120px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={elderlyDonutData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius="60%"
                      outerRadius="85%"
                      paddingAngle={2}
                      isAnimationActive={true}
                      animationDuration={1000}
                      animationBegin={300}
                    >
                      <Cell fill={CATEGORY_COLORS.safety} />
                      <Cell fill="var(--color-primary-soft)" />
                    </Pie>
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(value) => {
                        const v = value as number;
                        return [`${v.toFixed(1)}%`, ''];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <p className="m-0 tabular text-body-base font-semibold text-text">
                {elderlyRatio.toFixed(1)}%
              </p>
              {seoulElderlyRatio != null && (
                <p className="m-0 mt-1 text-caption text-text-muted">
                  서울 {seoulElderlyRatio.toFixed(1)}%
                  <span className={`ml-1 font-medium ${elderlyRatio <= seoulElderlyRatio ? 'text-success' : 'text-danger'}`}>
                    {elderlyRatio >= seoulElderlyRatio ? '▲' : '▼'}
                    {Math.abs(elderlyRatio - seoulElderlyRatio).toFixed(1)}%p
                  </span>
                </p>
              )}
              {elderlyDate && (
                <p className="m-0 mt-1 text-caption text-text-subtle">{elderlyDate}</p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[120px] text-text-muted text-caption">
              데이터가 없습니다
            </div>
          )}
        </Card>
      </div>

      {/* Row 3: 1-person household estimate */}
      <div className="grid grid-cols-3 gap-5">
        <Card padding="lg">
          <h3 className="m-0 mb-3 text-feature-heading leading-[1.3] font-semibold text-text">
            1인 가구 추정
          </h3>
          {singleDonutData.length > 0 ? (
            <div className="flex flex-col items-center">
              <div className="h-[140px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={singleDonutData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius="55%"
                      outerRadius="80%"
                      paddingAngle={2}
                      isAnimationActive={true}
                      animationDuration={1000}
                      animationBegin={400}
                    >
                      <Cell fill={CATEGORY_COLORS.population} />
                      <Cell fill="var(--color-primary-soft)" />
                    </Pie>
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(value) => {
                        const v = value as number;
                        return [`${v}%`, ''];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <p className="m-0 text-body-base font-semibold text-text text-center tabular">
                {singleHouseholdPct}%
              </p>
              <p className="m-0 text-caption text-text-muted text-center">
                가구당 평균 {avgPersonsPerHousehold?.toFixed(2)}인
              </p>
              <p className="m-0 mt-1 text-caption text-text-subtle text-center">
                추정값 (인구/세대 기반)
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[140px] text-text-muted text-caption">
              데이터가 없습니다
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
