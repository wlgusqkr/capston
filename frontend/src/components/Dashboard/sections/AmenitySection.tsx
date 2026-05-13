// Dashboard AmenitySection -- SPEC 4.4 Section B (편의시설).
//
// Widgets:
//   1. Category table (8 categories: count, density, TOP X%, sufficiency badge)
//   2. Essential facility chip grid
//
// Data: DongDetail.amenities + DongScore[] (for percentile)

import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import { computeAmenityPercentile } from '@/lib/percentile';
import type { AmenityLevel, DongDetail, DongScore } from '@/types/api';

interface AmenitySectionProps {
  amenities: DongDetail['amenities'];
  allDongs: DongScore[] | undefined;
  currentAmenityScore: number;
}

const LEVEL_BADGE: Record<AmenityLevel, { variant: 'success' | 'warning' | 'danger'; label: string }> = {
  sufficient: { variant: 'success', label: '충분' },
  normal: { variant: 'warning', label: '보통' },
  lacking: { variant: 'danger', label: '부족' },
};

/** Essential facilities for the chip grid. */
const ESSENTIAL_CATEGORIES = ['편의점', '카페', '마트', '음식점', '병원·약국', '세탁소', '올리브영', '스터디카페'];

export default function AmenitySection({
  amenities,
  allDongs,
  currentAmenityScore,
}: AmenitySectionProps) {
  const percentile = computeAmenityPercentile(allDongs, '', currentAmenityScore);

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

      {/* Placeholder: park/library data */}
      <Card padding="lg" className="opacity-60">
        <div className="flex items-center justify-center h-[80px] text-text-muted text-caption">
          공원 · 도서관 위젯은 데이터 준비 중입니다
        </div>
      </Card>
    </div>
  );
}
