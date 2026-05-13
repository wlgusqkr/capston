// Dashboard TransitSection -- SPEC 4.4 Section C (교통).
//
// Widgets:
//   1. Nearest subway stations TOP 3 (card list with line colors)
//   2. Bus stats (stop_count, route_count) as big number cards
//   3. Per-capita vehicle registration KPI (gu_metric — B4)
//   4. Subway time-of-day congestion line (weekday / saturday / sunday)
//   5. Bus time-of-day congestion line (weekday / weekend)
//   6. Dong personality estimate (label + reason + pattern bars)
//
// Data: DongDetail.transit + DongGuMetricsResponse + TransitCongestionResponse

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import { CATEGORY_COLORS, CHART_COLORS } from '@/lib/colors';
import type {
  CongestionPoint,
  DongDetail,
  DongGuMetricsResponse,
  TransitCongestionResponse,
} from '@/types/api';

interface TransitSectionProps {
  transit: DongDetail['transit'];
  guMetrics?: DongGuMetricsResponse;
  /** Optional congestion + personality payload. May be undefined while loading;
   *  charts render empty state when arrays are empty / bus stop_count = 0. */
  congestion?: TransitCongestionResponse;
}

/** Format ISO date "YYYY-MM-DD" → "YYYY년 기준". */
function formatMetricDate(date: string | null | undefined): string {
  if (!date) return '';
  return `${date.slice(0, 4)}년 기준`;
}

/** Map subway line string to CSS variable name for line color. */
function lineColor(line: string): string {
  // Extract line number from strings like "1호선", "2호선", "9호선", "신분당선"
  const match = line.match(/^(\d)/);
  if (match) {
    return `var(--color-subway-${match[1]})`;
  }
  // Non-numbered lines: use a neutral color
  return 'var(--color-text-muted)';
}

const TOOLTIP_STYLE = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  fontSize: 'var(--font-caption-size)',
};

/** Row shape used by the subway congestion line chart. */
interface SubwayRow {
  hour: number;
  평일: number | null;
  토요일: number | null;
  일요일: number | null;
}

/** Row shape used by the bus congestion line chart. */
interface BusRow {
  hour: number;
  평일: number | null;
  주말: number | null;
}

/** Build a hour-indexed lookup so the 3-series merge ignores ordering. */
function toHourMap(points: CongestionPoint[]): Map<number, number | null> {
  const m = new Map<number, number | null>();
  points.forEach((p) => m.set(p.hour, p.congestion));
  return m;
}

/** Merge weekday / saturday / sunday into one dataset keyed by hour. */
function mergeSubwayRows(by: TransitCongestionResponse['subway']['by_day']): SubwayRow[] {
  const wk = toHourMap(by.평일);
  const sa = toHourMap(by.토요일);
  const su = toHourMap(by.일요일);
  return Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    평일: wk.get(h) ?? null,
    토요일: sa.get(h) ?? null,
    일요일: su.get(h) ?? null,
  }));
}

function mergeBusRows(by: TransitCongestionResponse['bus']['by_pattern']): BusRow[] {
  const wk = toHourMap(by.평일);
  const we = toHourMap(by.주말);
  return Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    평일: wk.get(h) ?? null,
    주말: we.get(h) ?? null,
  }));
}

/** Convert background category color into a soft inline-bar fill. */
function personalityTone(label: TransitCongestionResponse['personality']['label']): {
  bg: string;
  accent: string;
} {
  switch (label) {
    case '주거 중심':
      // 그린워시 (primary-soft) + primary accent
      return { bg: 'var(--color-primary-soft)', accent: CATEGORY_COLORS.amenity };
    case '상업·업무 중심':
      // amber 톤 (realestate)
      return { bg: 'var(--color-warning-soft)', accent: CATEGORY_COLORS.realestate };
    case '유동인구 많음':
      // 보라 톤 (population) — soft 토큰 없어 info-soft 폴백 (보라 인접)
      return { bg: 'var(--color-info-soft)', accent: CATEGORY_COLORS.population };
    default:
      // null/모름 — 그린워시 (메인 배경과 동일 톤)
      return { bg: 'var(--color-primary-soft)', accent: 'var(--color-text-muted)' };
  }
}

/** Pattern score bar — bg is a flat track, fill is proportional. */
function PatternBar({
  label,
  value,
  max,
  accent,
}: {
  label: string;
  value: number | null;
  max: number;
  accent: string;
}) {
  const pct = value != null && max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="text-caption text-text-muted">{label}</span>
        <span className="tabular text-caption font-medium text-text">
          {value != null ? value.toFixed(1) : '-'}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-divider overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: accent }}
        />
      </div>
    </div>
  );
}

export default function TransitSection({ transit, guMetrics, congestion }: TransitSectionProps) {
  const stations = transit.nearest_stations;
  const bus = transit.bus;

  // B4. 1인당 차량 등록 (보행 친화도 시그널) — 25구 평균값과 비교.
  //   순위는 1인당 비율 기준이 더 의미 있으나 백엔드 rank는 raw 값 기준이라
  //   여기서는 raw VEHICLE_REGISTERED 순위를 그대로 표시 (구 전체 차량 절대량).
  const vehicleRegistered = guMetrics?.metrics['VEHICLE_REGISTERED']?.value ?? null;
  const popResident = guMetrics?.metrics['POP_RESIDENT']?.value ?? null;
  const guAvgVehicleRegistered = guMetrics?.metrics['VEHICLE_REGISTERED']?.gu_avg ?? null;
  const guAvgPopResident = guMetrics?.metrics['POP_RESIDENT']?.gu_avg ?? null;
  const vehicleRank = guMetrics?.metrics['VEHICLE_REGISTERED']?.rank_in_seoul ?? null;

  const vehiclePerCapita =
    vehicleRegistered != null && popResident != null && popResident > 0
      ? vehicleRegistered / popResident
      : null;
  // 25구 평균의 1인당 차량 = (Σ vehicle ÷ 25) / (Σ pop ÷ 25) = 25구 합산비와 동일.
  const guAvgVehiclePerCapita =
    guAvgVehicleRegistered != null && guAvgPopResident != null && guAvgPopResident > 0
      ? guAvgVehicleRegistered / guAvgPopResident
      : null;
  const vehicleDiff =
    vehiclePerCapita != null && guAvgVehiclePerCapita != null
      ? vehiclePerCapita - guAvgVehiclePerCapita
      : null;
  const vehicleDate = formatMetricDate(guMetrics?.metrics['VEHICLE_REGISTERED']?.date);

  // -- Congestion rows --------------------------------------------------------
  const subwayRows = congestion ? mergeSubwayRows(congestion.subway.by_day) : [];
  const busRows = congestion ? mergeBusRows(congestion.bus.by_pattern) : [];
  const hasSubwayCongestion =
    congestion != null &&
    subwayRows.some((r) => r.평일 != null || r.토요일 != null || r.일요일 != null);
  const busStopCount = congestion?.bus.stop_count ?? 0;
  const hasBusCongestion =
    congestion != null && busStopCount > 0 && busRows.some((r) => r.평일 != null || r.주말 != null);

  const stationLabel =
    congestion && congestion.subway.stations.length > 0
      ? congestion.subway.stations.map((s) => s.name).join(', ')
      : '';

  // Personality + pattern scores -------------------------------------------
  const personality = congestion?.personality;
  const tone = personalityTone(personality?.label ?? null);
  const patternMax = (() => {
    if (!personality) return 0;
    const vals = [
      personality.scores.morning_peak,
      personality.scores.midday,
      personality.scores.evening_peak,
      personality.scores.weekend,
    ].filter((v): v is number => v != null);
    return vals.length > 0 ? Math.max(...vals) : 0;
  })();

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-5">
        {/* 1. Nearest subway stations */}
        <Card padding="lg" className="col-span-2">
          <h3 className="m-0 mb-3 text-feature-heading leading-[1.3] font-semibold text-text">
            가까운 지하철역 TOP 3
          </h3>
          <div className="flex flex-col gap-3">
            {stations.slice(0, 3).map((st) => {
              const isTop = st.rank === 1;
              return (
                <div
                  key={`${st.name}-${st.line}`}
                  className={`flex items-center gap-4 p-3 rounded-card border ${
                    isTop
                      ? 'border-primary/30 bg-primary-soft/30'
                      : 'border-divider bg-surface'
                  }`}
                >
                  {/* Rank badge */}
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-body-base font-semibold ${
                      isTop
                        ? 'bg-primary text-surface'
                        : 'bg-primary-soft text-text-muted'
                    }`}
                  >
                    {st.rank}
                  </div>

                  {/* Station info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-body-base font-medium text-text">
                        {st.name}
                      </span>
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded-full text-caption text-surface font-medium"
                        style={{ backgroundColor: lineColor(st.line) }}
                      >
                        {st.line}
                      </span>
                    </div>
                  </div>

                  {/* Walking time */}
                  <div className="flex-shrink-0 text-right">
                    <span className="tabular text-body-base font-semibold text-text">
                      {st.walking_min}분
                    </span>
                    <span className="text-caption text-text-muted ml-1">도보</span>
                  </div>
                </div>
              );
            })}
            {stations.length === 0 && (
              <div className="text-center text-text-muted text-caption py-6">
                인근 지하철역 데이터가 없습니다.
              </div>
            )}
          </div>
        </Card>

        {/* 2. Bus stats */}
        <div className="flex flex-col gap-5">
          <Card padding="lg">
            <p className="text-caption m-0 mb-2 text-text-subtle">버스 정류장</p>
            <p className="tabular m-0 text-card-heading font-semibold text-text leading-[1.1]">
              {bus.stop_count}
            </p>
            <p className="m-0 mt-1 text-caption text-text-muted">개소</p>
          </Card>
          <Card padding="lg">
            <p className="text-caption m-0 mb-2 text-text-subtle">버스 노선</p>
            <p className="tabular m-0 text-card-heading font-semibold text-text leading-[1.1]">
              {bus.route_count}
            </p>
            <p className="m-0 mt-1 text-caption text-text-muted">개 노선</p>
          </Card>
        </div>
      </div>

      {/* B4. 1인당 차량 등록 (보행 친화도 시그널) */}
      {vehiclePerCapita != null && guMetrics && (
        <Card padding="lg">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <p className="text-caption m-0 text-text-subtle">
                  1인당 차량 등록
                </p>
                <Badge variant="neutral" size="sm">
                  {guMetrics.gu_name} 단위
                </Badge>
              </div>
              <p className="tabular m-0 text-card-heading font-semibold text-text leading-[1.1]">
                {vehiclePerCapita.toFixed(2)}
                <span className="ml-1 text-body-base font-medium text-text-muted">대 / 명</span>
              </p>
              {guAvgVehiclePerCapita != null && vehicleDiff != null && (
                <p className="m-0 text-caption text-text-muted">
                  25구 평균 {guAvgVehiclePerCapita.toFixed(2)}대
                  <span
                    className={`ml-1 font-medium ${
                      vehicleDiff <= 0 ? 'text-success' : 'text-danger'
                    }`}
                  >
                    {vehicleDiff >= 0 ? '▲' : '▼'}
                    {Math.abs(vehicleDiff).toFixed(2)}대
                  </span>
                </p>
              )}
              {vehicleRank != null && (
                <p className="m-0 text-caption text-text-subtle">
                  25구 중 {vehicleRank}위 (차량 등록 총량 기준)
                </p>
              )}
              {vehicleDate && (
                <p className="m-0 text-caption text-text-subtle">{vehicleDate}</p>
              )}
            </div>
            <p className="m-0 text-caption text-text-subtle max-w-[200px] text-right">
              값이 낮을수록 보행 친화적인 동네입니다
            </p>
          </div>
        </Card>
      )}

      {/* Row: 시간대 혼잡도 — 지하철 + 버스 라인 차트 */}
      <div className="grid grid-cols-2 gap-5">
        {/* 지하철 시간대 혼잡도 */}
        <Card padding="lg">
          <h3 className="m-0 mb-3 text-feature-heading leading-[1.3] font-semibold text-text">
            지하철 시간대 혼잡도
          </h3>
          {hasSubwayCongestion ? (
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={subwayRows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                  <XAxis
                    dataKey="hour"
                    type="number"
                    domain={[0, 23]}
                    ticks={[0, 6, 12, 18, 23]}
                    tick={{ fontSize: 10, fill: CHART_COLORS.axis }}
                    tickFormatter={(v: number) => `${v}시`}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: CHART_COLORS.axis }}
                    tickFormatter={(v: number) => v.toFixed(0)}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelFormatter={(label) => `${label}시`}
                    formatter={(value, name) => {
                      if (value == null) return ['-', name];
                      const v = value as number;
                      return [v.toFixed(2), name];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    name="평일"
                    type="monotone"
                    dataKey="평일"
                    stroke={CATEGORY_COLORS.transport}
                    strokeWidth={2}
                    dot={{ r: 2, fill: CATEGORY_COLORS.transport }}
                    activeDot={{ r: 5 }}
                    connectNulls
                    isAnimationActive
                    animationDuration={1200}
                  />
                  <Line
                    name="토요일"
                    type="monotone"
                    dataKey="토요일"
                    stroke={CHART_COLORS.warningDeep}
                    strokeWidth={1.5}
                    dot={false}
                    connectNulls
                    isAnimationActive
                    animationDuration={1200}
                    animationBegin={200}
                  />
                  <Line
                    name="일요일"
                    type="monotone"
                    dataKey="일요일"
                    stroke={CHART_COLORS.warning}
                    strokeWidth={1.5}
                    dot={false}
                    connectNulls
                    isAnimationActive
                    animationDuration={1200}
                    animationBegin={400}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-text-muted text-caption">
              인근 지하철역 혼잡도 데이터가 부족합니다
            </div>
          )}
          <p className="m-0 mt-2 text-caption text-text-subtle">
            {stationLabel
              ? `인근 ${congestion?.subway.stations.length ?? 0}개역 평균 — ${stationLabel}`
              : '인근 지하철역 평균'}
          </p>
        </Card>

        {/* 버스 시간대 혼잡도 */}
        <Card padding="lg">
          <h3 className="m-0 mb-3 text-feature-heading leading-[1.3] font-semibold text-text">
            버스 시간대 혼잡도
          </h3>
          {hasBusCongestion ? (
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={busRows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                  <XAxis
                    dataKey="hour"
                    type="number"
                    domain={[0, 23]}
                    ticks={[0, 6, 12, 18, 23]}
                    tick={{ fontSize: 10, fill: CHART_COLORS.axis }}
                    tickFormatter={(v: number) => `${v}시`}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: CHART_COLORS.axis }}
                    tickFormatter={(v: number) => v.toFixed(2)}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelFormatter={(label) => `${label}시`}
                    formatter={(value, name) => {
                      if (value == null) return ['-', name];
                      const v = value as number;
                      return [v.toFixed(3), name];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    name="평일"
                    type="monotone"
                    dataKey="평일"
                    stroke={CATEGORY_COLORS.transport}
                    strokeWidth={2}
                    dot={{ r: 2, fill: CATEGORY_COLORS.transport }}
                    activeDot={{ r: 5 }}
                    connectNulls
                    isAnimationActive
                    animationDuration={1200}
                  />
                  <Line
                    name="주말"
                    type="monotone"
                    dataKey="주말"
                    stroke={CHART_COLORS.warningDeep}
                    strokeWidth={1.5}
                    dot={false}
                    connectNulls
                    isAnimationActive
                    animationDuration={1200}
                    animationBegin={200}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-text-muted text-caption">
              {busStopCount === 0
                ? '동에 매핑된 버스 정류장 데이터가 부족합니다'
                : '버스 시간대 혼잡도 데이터가 없습니다'}
            </div>
          )}
          <p className="m-0 mt-2 text-caption text-text-subtle">
            {busStopCount > 0
              ? `동 내 ${busStopCount}개 정류장 평균 · 최근 30~60일`
              : '동 내 버스 정류장 평균 · 최근 30~60일'}
          </p>
        </Card>
      </div>

      {/* 동 성격 추정 카드 (full width) */}
      <Card padding="lg" className={personality?.label == null ? 'opacity-70' : ''}>
        <div
          className="rounded-card p-5 flex flex-col gap-4"
          style={{ backgroundColor: tone.bg }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-caption m-0 text-text-subtle">동 성격 추정</p>
              <p
                className="m-0 text-card-heading font-semibold leading-[1.2]"
                style={{ color: personality?.label != null ? tone.accent : 'var(--color-text-muted)' }}
              >
                {personality?.label ?? '특징 추정 보류'}
              </p>
              {personality?.reason && (
                <p className="m-0 mt-1 text-caption text-text-muted max-w-[640px]">
                  {personality.reason}
                </p>
              )}
              {personality?.label == null && !personality?.reason && (
                <p className="m-0 mt-1 text-caption text-text-muted">
                  혼잡도 패턴이 뚜렷한 특징을 보이지 않습니다
                </p>
              )}
            </div>
            <Badge variant="neutral" size="sm">
              혼잡도 패턴 기반
            </Badge>
          </div>

          {/* Pattern score bars */}
          {personality && (
            <div className="grid grid-cols-4 gap-4">
              <PatternBar
                label="출근 (7~9시)"
                value={personality.scores.morning_peak}
                max={patternMax}
                accent={tone.accent}
              />
              <PatternBar
                label="낮 (11~14시)"
                value={personality.scores.midday}
                max={patternMax}
                accent={tone.accent}
              />
              <PatternBar
                label="퇴근 (18~20시)"
                value={personality.scores.evening_peak}
                max={patternMax}
                accent={tone.accent}
              />
              <PatternBar
                label="주말 평균"
                value={personality.scores.weekend}
                max={patternMax}
                accent={tone.accent}
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
