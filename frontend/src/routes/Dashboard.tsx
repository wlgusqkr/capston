// Dashboard — Phase 2: KPI + MiniMap + Sections A~E.
//
// URL-driven dong selection via ?dong= search param. Default: "중구-필동".

import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import DashboardHeader from '@/components/Dashboard/DashboardHeader';
import DashboardMiniMap from '@/components/Dashboard/DashboardMiniMap';
import KpiRow from '@/components/Dashboard/KpiRow';
import AmenitySection from '@/components/Dashboard/sections/AmenitySection';
import PopulationSection from '@/components/Dashboard/sections/PopulationSection';
import RealEstateSection from '@/components/Dashboard/sections/RealEstateSection';
import SafetyEconomySection from '@/components/Dashboard/sections/SafetyEconomySection';
import TransitSection from '@/components/Dashboard/sections/TransitSection';
import Card from '@/components/ui/Card';
import { useDongDetail, useDongGuMetrics, useDongPopulation, useDongScores, useDongSummary } from '@/hooks/useDongs';
import type { CategoryKey } from '@/lib/colors';
import { DEFAULT_WEIGHTS } from '@/types/api';

const DEFAULT_DONG_SLUG = '중구-필동';

interface SectionDef {
  title: string;
  category: CategoryKey;
}

/** Placeholder sections for Phase 3+ (charts, reviews). */
const LATER_SECTIONS: SectionDef[] = [
  { title: '인기 차트', category: 'environment' },
  { title: '자취생 리뷰', category: 'environment' },
];

function PlaceholderSection({ title, category }: SectionDef) {
  return (
    <Card padding="lg">
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-1 h-6 rounded-full"
          style={{ backgroundColor: `var(--color-cat-${category})` }}
        />
        <h2 className="text-feature-heading font-semibold text-text">
          {title}
        </h2>
      </div>
      <div className="flex items-center justify-center h-[200px] text-text-muted text-caption">
        위젯이 곧 추가됩니다
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const dongSlug = searchParams.get('dong') ?? DEFAULT_DONG_SLUG;

  // Data hooks
  const { data: dongs } = useDongScores(DEFAULT_WEIGHTS);
  const { data: detail, isLoading: detailLoading, isError: detailError } = useDongDetail(dongSlug, DEFAULT_WEIGHTS);
  const { data: summary } = useDongSummary(dongSlug, DEFAULT_WEIGHTS);
  const { data: population } = useDongPopulation(dongSlug);
  const { data: guMetrics } = useDongGuMetrics(dongSlug);

  const selectedDong = useMemo(
    () => dongs?.find((d) => d.slug === dongSlug) ?? null,
    [dongs, dongSlug],
  );

  const handleDongChange = useCallback(
    (slug: string) => {
      setSearchParams({ dong: slug }, { replace: true });
    },
    [setSearchParams],
  );

  // If no dong param in URL, set the default
  useEffect(() => {
    if (!searchParams.has('dong')) {
      setSearchParams({ dong: DEFAULT_DONG_SLUG }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Build summary text for header
  const summaryText = summary
    ? `${summary.summary}`
    : undefined;

  return (
    <main id="main" className="min-h-[calc(100vh-var(--space-14))] bg-primary-soft">
      <div className="max-w-[1280px] mx-auto px-6 py-6 flex flex-col gap-6">
        {/* Header: dong selector + selected dong info */}
        <DashboardHeader
          selectedDong={
            selectedDong
              ? { slug: selectedDong.slug, name: selectedDong.name, gu: selectedDong.gu }
              : null
          }
          onDongChange={handleDongChange}
          summaryText={summaryText}
        />

        {/* KPI row + MiniMap */}
        <div className="grid grid-cols-2 gap-6">
          <KpiRow
            detail={detail}
            summary={summary}
            isLoading={detailLoading}
          />
          <DashboardMiniMap
            dongs={dongs ?? []}
            selectedSlug={dongSlug}
            onDongSelect={handleDongChange}
          />
        </div>

        {/* Error state */}
        {detailError && (
          <Card padding="lg">
            <div className="flex items-center justify-center h-[120px] text-text-muted text-caption">
              데이터를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.
            </div>
          </Card>
        )}

        {/* Section A: Real Estate */}
        {detail && (
          <section aria-labelledby="section-realestate">
            <Card padding="lg">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-1 h-6 rounded-full"
                  style={{ backgroundColor: 'var(--color-cat-realestate)' }}
                />
                <h2 id="section-realestate" className="text-feature-heading font-semibold text-text">
                  부동산 시세
                </h2>
              </div>
              <RealEstateSection realEstate={detail.real_estate} slug={dongSlug} />
            </Card>
          </section>
        )}

        {/* Section B: Amenities */}
        {detail && (
          <section aria-labelledby="section-amenity">
            <Card padding="lg">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-1 h-6 rounded-full"
                  style={{ backgroundColor: 'var(--color-cat-amenity)' }}
                />
                <h2 id="section-amenity" className="text-feature-heading font-semibold text-text">
                  편의시설
                </h2>
              </div>
              <AmenitySection
                amenities={detail.amenities}
                allDongs={dongs}
                currentAmenityScore={selectedDong?.score_amenity ?? 50}
              />
            </Card>
          </section>
        )}

        {/* Section C: Transit */}
        {detail && (
          <section aria-labelledby="section-transit">
            <Card padding="lg">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-1 h-6 rounded-full"
                  style={{ backgroundColor: 'var(--color-cat-transport)' }}
                />
                <h2 id="section-transit" className="text-feature-heading font-semibold text-text">
                  교통
                </h2>
              </div>
              <TransitSection transit={detail.transit} />
            </Card>
          </section>
        )}

        {/* Section D: Population */}
        {population && (
          <section aria-labelledby="section-population">
            <Card padding="lg">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-1 h-6 rounded-full"
                  style={{ backgroundColor: 'var(--color-cat-population)' }}
                />
                <h2 id="section-population" className="text-feature-heading font-semibold text-text">
                  인구·사회
                </h2>
              </div>
              <PopulationSection
                population={population}
                guMetrics={guMetrics}
              />
            </Card>
          </section>
        )}

        {/* Section E: Safety & Economy */}
        {guMetrics && guMetrics.date && (
          <section aria-labelledby="section-safety">
            <Card padding="lg">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-1 h-6 rounded-full"
                  style={{ backgroundColor: 'var(--color-cat-safety)' }}
                />
                <h2 id="section-safety" className="text-feature-heading font-semibold text-text">
                  안전·환경·경제
                </h2>
              </div>
              <SafetyEconomySection guMetrics={guMetrics} />
            </Card>
          </section>
        )}

        {/* Loading skeleton for sections when detail is loading */}
        {detailLoading && !detail && (
          <>
            {['부동산 시세', '편의시설', '교통'].map((title) => (
              <Card key={title} padding="lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-1 h-6 rounded-full bg-primary-soft" />
                  <div className="h-5 w-24 bg-primary-soft rounded animate-[match-panel-pulse_1.5s_ease-in-out_infinite]" />
                </div>
                <div className="h-[200px] bg-primary-soft rounded animate-[match-panel-pulse_1.5s_ease-in-out_infinite]" />
              </Card>
            ))}
          </>
        )}

        {/* Placeholder sections for Phase 3+ */}
        {LATER_SECTIONS.map((section) => (
          <PlaceholderSection
            key={section.title}
            title={section.title}
            category={section.category}
          />
        ))}
      </div>
    </main>
  );
}
