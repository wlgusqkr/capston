// Dashboard TransitSection -- SPEC 4.4 Section C (교통).
//
// Widgets:
//   1. Nearest subway stations TOP 3 (card list with line colors)
//   2. Bus stats (stop_count, route_count) as big number cards
//   3. Per-capita vehicle registration KPI (gu_metric — B4)
//   4. Time-of-day congestion (placeholder — API not yet available)
//   5. Dong personality estimate (placeholder — depends on congestion)
//
// Data: DongDetail.transit + DongGuMetricsResponse (optional)

import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import type { DongDetail, DongGuMetricsResponse } from '@/types/api';

interface TransitSectionProps {
  transit: DongDetail['transit'];
  guMetrics?: DongGuMetricsResponse;
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

export default function TransitSection({ transit, guMetrics }: TransitSectionProps) {
  const stations = transit.nearest_stations;
  const bus = transit.bus;

  // B4. 1인당 차량 등록 (보행 친화도 시그널)
  const vehicleRegistered = guMetrics?.metrics['VEHICLE_REGISTERED']?.value ?? null;
  const popResident = guMetrics?.metrics['POP_RESIDENT']?.value ?? null;
  const seoulVehicleRegistered = guMetrics?.seoul_avg['VEHICLE_REGISTERED']?.value ?? null;
  const seoulPopResident = guMetrics?.seoul_avg['POP_RESIDENT']?.value ?? null;

  const vehiclePerCapita =
    vehicleRegistered != null && popResident != null && popResident > 0
      ? vehicleRegistered / popResident
      : null;
  const seoulVehiclePerCapita =
    seoulVehicleRegistered != null && seoulPopResident != null && seoulPopResident > 0
      ? seoulVehicleRegistered / seoulPopResident
      : null;
  const vehicleDiff =
    vehiclePerCapita != null && seoulVehiclePerCapita != null
      ? vehiclePerCapita - seoulVehiclePerCapita
      : null;
  const vehicleDate = formatMetricDate(guMetrics?.metrics['VEHICLE_REGISTERED']?.date);

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
              {seoulVehiclePerCapita != null && vehicleDiff != null && (
                <p className="m-0 text-caption text-text-muted">
                  서울 {seoulVehiclePerCapita.toFixed(2)}대
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

      {/* 4. Congestion placeholder */}
      <Card padding="lg" className="opacity-60">
        <div className="flex items-center justify-center h-[80px] text-text-muted text-caption">
          시간대 혼잡도 위젯은 데이터 준비 중입니다
        </div>
      </Card>

      {/* 5. Dong personality placeholder */}
      <Card padding="lg" className="opacity-60">
        <div className="flex items-center justify-center h-[80px] text-text-muted text-caption">
          동 성격 추정 위젯은 데이터 준비 중입니다
        </div>
      </Card>
    </div>
  );
}
