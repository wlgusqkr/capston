// Dashboard AmenitySection -- SPEC 4.4 Section B (편의시설).
//
// Widgets:
//   1. Category table (8 categories: count, density, TOP X%, sufficiency badge)
//   2. Essential facility chip grid
//   3. Large parks list (TOP N by area) — DongParksResponse
//   4. Library placeholder (data not available)
//
// Data: DongDetail.amenities + DongScore[] (for percentile) + DongParksResponse

import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import { CATEGORY_COLORS } from '@/lib/colors';
import { computeAmenityPercentile } from '@/lib/percentile';
import type { AmenityLevel, DongDetail, DongPark, DongParksResponse, DongScore } from '@/types/api';

interface AmenitySectionProps {
  amenities: DongDetail['amenities'];
  allDongs: DongScore[] | undefined;
  currentAmenityScore: number;
  parks?: DongParksResponse;
}

const LEVEL_BADGE: Record<AmenityLevel, { variant: 'success' | 'warning' | 'danger'; label: string }> = {
  sufficient: { variant: 'success', label: '충분' },
  normal: { variant: 'warning', label: '보통' },
  lacking: { variant: 'danger', label: '부족' },
};

/** Essential facilities for the chip grid. */
const ESSENTIAL_CATEGORIES = ['편의점', '카페', '마트', '음식점', '병원·약국', '세탁소', '올리브영', '스터디카페'];

/** 대형 공원 카드에 보여줄 최대 개수. */
const PARKS_DISPLAY_LIMIT = 6;

/** 평균 도보 속도 ≈ 4 km/h → 1분당 약 67m. */
const WALK_METERS_PER_MIN = 67;

/** Dedupe 공원 (RDS 원본에 동일 공원 중복 행). id 기준. */
function dedupeParks(parks: DongPark[]): DongPark[] {
  const seen = new Map<string, DongPark>();
  for (const p of parks) {
    if (!seen.has(p.id)) seen.set(p.id, p);
  }
  return Array.from(seen.values());
}

/** 면적 포맷: ≥ 10,000㎡ → "X.X ha", 미만 → "N㎡". null → "면적 정보 없음". */
function formatArea(area_m2: number | null): string {
  if (area_m2 == null) return '면적 정보 없음';
  if (area_m2 >= 10_000) {
    const ha = area_m2 / 10_000;
    return `${ha.toFixed(1)} ha`;
  }
  return `${Math.round(area_m2).toLocaleString()}㎡`;
}

/** 거리 포맷: null → null (행에서 생략), <1000 → "Xm", ≥1000 → "X.Xkm". */
function formatDistance(distance_m: number | null): string | null {
  if (distance_m == null) return null;
  if (distance_m < 1000) return `${Math.round(distance_m).toLocaleString()}m`;
  return `${(distance_m / 1000).toFixed(1)}km`;
}

/** 도보 시간 (분, ceil). null → null. */
function walkMinutes(distance_m: number | null): number | null {
  if (distance_m == null) return null;
  return Math.max(1, Math.ceil(distance_m / WALK_METERS_PER_MIN));
}

export default function AmenitySection({
  amenities,
  allDongs,
  currentAmenityScore,
  parks,
}: AmenitySectionProps) {
  const percentile = computeAmenityPercentile(allDongs, '', currentAmenityScore);

  // 공원 dedupe + 면적 내림차순 (백엔드 정렬은 dedupe 전 기준)
  const dedupedParks = parks ? dedupeParks(parks.parks) : [];
  const sortedParks = [...dedupedParks].sort((a, b) => {
    const aa = a.area_m2 ?? -1;
    const bb = b.area_m2 ?? -1;
    return bb - aa;
  });
  const visibleParks = sortedParks.slice(0, PARKS_DISPLAY_LIMIT);
  const hasParks = parks != null && visibleParks.length > 0;

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Category table */}
      <Card padding="lg">
        <h3 className="m-0 mb-3 text-feature-heading leading-[1.3] font-semibold text-text">
          카테고리별 편의시설
        </h3>
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-body-base">
            <thead>
              <tr>
                <th className="bg-primary-soft text-text-subtle text-caption font-medium text-left py-2.5 px-4 border-b border-divider">
                  카테고리
                </th>
                <th className="bg-primary-soft text-text-subtle text-caption font-medium text-right py-2.5 px-4 border-b border-divider">
                  개수
                </th>
                <th className="bg-primary-soft text-text-subtle text-caption font-medium text-right py-2.5 px-4 border-b border-divider">
                  밀도(/km2)
                </th>
                <th className="bg-primary-soft text-text-subtle text-caption font-medium text-center py-2.5 px-4 border-b border-divider">
                  순위
                </th>
                <th className="bg-primary-soft text-text-subtle text-caption font-medium text-center py-2.5 px-4 border-b border-divider">
                  충분도
                </th>
              </tr>
            </thead>
            <tbody>
              {amenities.map((a) => {
                const badge = LEVEL_BADGE[a.level];
                return (
                  <tr key={a.category}>
                    <td className="py-2.5 px-4 border-b border-divider text-text font-medium">
                      {a.category}
                    </td>
                    <td className="tabular py-2.5 px-4 border-b border-divider text-text text-right">
                      {a.count.toLocaleString()}
                    </td>
                    <td className="tabular py-2.5 px-4 border-b border-divider text-text text-right">
                      {a.density_per_km2.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-4 border-b border-divider text-center">
                      {percentile != null ? (
                        <span className="text-caption text-text-muted tabular">
                          TOP {percentile}%
                        </span>
                      ) : (
                        <span className="text-caption text-text-subtle">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 border-b border-divider text-center">
                      <Badge variant={badge.variant} size="sm">
                        {badge.label}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
              {amenities.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-text-muted py-8">
                    편의시설 데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 2. Essential facility chip grid */}
      <Card padding="lg">
        <h3 className="m-0 mb-3 text-feature-heading leading-[1.3] font-semibold text-text">
          자취생 필수시설
        </h3>
        <div className="flex flex-wrap gap-2">
          {ESSENTIAL_CATEGORIES.map((cat) => {
            const match = amenities.find((a) => a.category === cat);
            if (!match) {
              return (
                <div
                  key={cat}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-card border border-divider bg-surface"
                >
                  <span className="text-body-base text-text">{cat}</span>
                  <Badge variant="neutral" size="sm">-</Badge>
                </div>
              );
            }
            const badge = LEVEL_BADGE[match.level];
            return (
              <div
                key={cat}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-card border border-divider bg-surface"
              >
                <span className="text-body-base text-text">{cat}</span>
                <span className="tabular text-caption text-text-muted">{match.count}개</span>
                <Badge variant={badge.variant} size="sm">
                  {badge.label}
                </Badge>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 3. Parks + Library placeholder — 2-column grid */}
      <div className="grid grid-cols-2 gap-5">
        {/* 3a. Parks (large parks TOP N) */}
        <Card padding="lg">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="m-0 text-feature-heading leading-[1.3] font-semibold text-text">
              대형 공원
            </h3>
            {parks && parks.count > 0 && (
              <Badge variant="neutral" size="sm">
                총 {dedupedParks.length}곳
              </Badge>
            )}
          </div>

          {!hasParks ? (
            <div className="flex items-center justify-center h-[120px] text-text-muted text-caption">
              {parks ? '주변에 대형 공원이 없습니다' : '공원 정보를 불러오는 중입니다'}
            </div>
          ) : (
            <ul className="m-0 p-0 list-none flex flex-col gap-2">
              {visibleParks.map((p) => {
                const distLabel = formatDistance(p.distance_m);
                const walkMin = walkMinutes(p.distance_m);
                return (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 p-3 rounded-card border border-divider bg-surface"
                  >
                    {/* Left: name + category chip */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="flex-shrink-0 w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: CATEGORY_COLORS.amenity }}
                          aria-hidden
                        />
                        <span className="text-body-base font-medium text-text truncate">
                          {p.name}
                        </span>
                      </div>
                      <p className="m-0 mt-1 text-caption text-text-muted truncate">
                        {p.category}
                      </p>
                    </div>

                    {/* Right: area + distance */}
                    <div className="flex-shrink-0 text-right">
                      <p className="tabular m-0 text-body-base font-semibold text-text">
                        {formatArea(p.area_m2)}
                      </p>
                      {distLabel != null ? (
                        <p className="tabular m-0 mt-1 text-caption text-text-muted">
                          {distLabel}
                          {walkMin != null && (
                            <span className="ml-1 text-text-subtle">· 도보 {walkMin}분</span>
                          )}
                        </p>
                      ) : (
                        <p className="m-0 mt-1 text-caption text-text-subtle">
                          거리 정보 없음
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* 3b. Library placeholder (data not yet available) */}
        <Card padding="lg" className="opacity-60">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="m-0 text-feature-heading leading-[1.3] font-semibold text-text">
              도서관
            </h3>
            <Badge variant="neutral" size="sm">준비 중</Badge>
          </div>
          <div className="flex items-center justify-center h-[120px] text-text-muted text-caption text-center">
            도서관 위젯은 데이터 준비 중입니다
          </div>
        </Card>
      </div>
    </div>
  );
}
