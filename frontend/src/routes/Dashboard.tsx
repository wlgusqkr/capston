// Dashboard — Phase 3: KPI + MiniMap + Sections A~G.
//   A: Real Estate, B: Amenities, C: Transit, D: Population, E: Safety/Economy
//   F: Popularity (TOP10 / school / similar), G: Reviews (avg / cards / CTA)
//
// URL-driven dong selection via ?dong= search param. Default: "중구-필동".

import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import DashboardHeader from '@/components/Dashboard/DashboardHeader';
import DashboardMiniMap from '@/components/Dashboard/DashboardMiniMap';
import KpiRow from '@/components/Dashboard/KpiRow';
import AmenitySection from '@/components/Dashboard/sections/AmenitySection';
import PopularitySection from '@/components/Dashboard/sections/PopularitySection';
import PopulationSection from '@/components/Dashboard/sections/PopulationSection';
import RealEstateSection from '@/components/Dashboard/sections/RealEstateSection';
import ReviewDashboardSection from '@/components/Dashboard/sections/ReviewDashboardSection';
import SafetyEconomySection from '@/components/Dashboard/sections/SafetyEconomySection';
import TransitSection from '@/components/Dashboard/sections/TransitSection';
import Card from '@/components/ui/Card';
import { useDongDetail, useDongGuMetrics, useDongGuMetricsSeries, useDongParks, useDongPopulation, useDongScores, useDongSummary, useDongTransitCongestion } from '@/hooks/useDongs';
import { DEFAULT_WEIGHTS } from '@/types/api';

const DEFAULT_DONG_SLUG = '중구-필동';

/** gu-metrics/series codes for Section E trend charts (교통사고 / 화재). */
const SAFETY_SERIES_CODES = ['ACC_TOTAL_COUNT', 'FIRE_COUNT'];

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const dongSlug = searchParams.get('dong') ?? DEFAULT_DONG_SLUG;

  // Data hooks
  const { data: dongs } = useDongScores(DEFAULT_WEIGHTS);
  const { data: detail, isLoading: detailLoading, isError: detailError } = useDongDetail(dongSlug, DEFAULT_WEIGHTS);
  const { data: summary } = useDongSummary(dongSlug, DEFAULT_WEIGHTS);
  const { data: population } = useDongPopulation(dongSlug);
  const { data: guMetrics } = useDongGuMetrics(dongSlug);
  // Phase 4: 교통사고 + 화재 시계열 (Section E 추이 차트). 10년치.
  const { data: safetySeries } = useDongGuMetricsSeries(
    dongSlug,
    SAFETY_SERIES_CODES,
    10,
  );
  // Section B 보강: 대형 공원 리스트 (행정동 매핑).
  const { data: parks } = useDongParks(dongSlug);
  // Section C 보강: 시간대 혼잡도 + 동 성격 추정.
  const { data: congestion } = useDongTransitCongestion(dongSlug);

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
              <RealEstateSection realEstate={detail.real_estate} slug={dongSlug} guMetrics={guMetrics} />
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
                parks={parks}
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
              <TransitSection transit={detail.transit} guMetrics={guMetrics} congestion={congestion} />
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
        {guMetrics && (
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
              <SafetyEconomySection guMetrics={guMetrics} series={safetySeries} />
            </Card>
          </section>
        )}

        {/* Section F: Popularity (인기 차트) */}
        <section aria-labelledby="section-popularity">
          <Card padding="lg">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-1 h-6 rounded-full"
                style={{ backgroundColor: 'var(--color-cat-environment)' }}
              />
              <h2 id="section-popularity" className="text-feature-heading font-semibold text-text">
                인기 차트
              </h2>
            </div>
            <PopularitySection
              allDongs={dongs}
              similarDongs={detail?.similar_dongs}
              currentSlug={dongSlug}
              onDongSelect={handleDongChange}
            />
          </Card>
        </section>

        {/* Section G: Reviews (자취생 리뷰) */}
        <section aria-labelledby="section-reviews">
          <Card padding="lg">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-1 h-6 rounded-full"
                style={{ backgroundColor: 'var(--color-cat-environment)' }}
              />
              <h2 id="section-reviews" className="text-feature-heading font-semibold text-text">
                자취생 리뷰
              </h2>
            </div>
            <ReviewDashboardSection
              reviews={detail?.reviews}
              dongSlug={dongSlug}
              dongName={selectedDong?.name}
            />
          </Card>
        </section>

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
      </div>
    </main>
  );
}
