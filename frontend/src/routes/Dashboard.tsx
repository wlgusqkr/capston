// Dashboard — Phase 3: KPI + MiniMap + Sections A~G.
//   A: Real Estate, B: Amenities, C: Transit, D: Population, E: Safety/Economy
//   F: Popularity (TOP10 / school / similar), G: Reviews (avg / cards / CTA)
//
// URL-driven adong selection via ?adong= search param. Default: "중구-필동".

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
import { useAdongDerivedIndices, useAdongDetail, useAdongGuMetrics, useAdongGuMetricsSeries, useAdongParks, useAdongPopulation, useAdongScores, useAdongSummary, useAdongTransitCongestion } from '@/hooks/useAdongs';
import { DEFAULT_WEIGHTS } from '@/types/api';

const DEFAULT_DONG_SLUG = '중구-필동';

/** gu-metrics/series codes for Section E trend charts (교통사고 / 화재). */
const SAFETY_SERIES_CODES = ['ACC_TOTAL_COUNT', 'FIRE_COUNT'];

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const dongSlug = searchParams.get('adong') ?? DEFAULT_DONG_SLUG;

  // Data hooks
  const { data: adongs } = useAdongScores(DEFAULT_WEIGHTS);
  const { data: detail, isLoading: detailLoading, isError: detailError } = useAdongDetail(dongSlug, DEFAULT_WEIGHTS);
  const { data: summary } = useAdongSummary(dongSlug, DEFAULT_WEIGHTS);
  const { data: population } = useAdongPopulation(dongSlug);
  const { data: guMetrics } = useAdongGuMetrics(dongSlug);
  // Phase 4: 교통사고 + 화재 시계열 (Section E 추이 차트). 10년치.
  const { data: safetySeries } = useAdongGuMetricsSeries(
    dongSlug,
    SAFETY_SERIES_CODES,
    10,
  );
  // Section B 보강: 대형 공원 리스트 (행정동 매핑).
  const { data: parks } = useAdongParks(dongSlug);
  // Section C 보강: 시간대 혼잡도 + 동 성격 추정.
  const { data: congestion } = useAdongTransitCongestion(dongSlug);
  // KPI 보강: SPEC §4.5 자취촌 지수 + 계약 활발도 (백엔드 일일 갱신, staleTime 30분).
  const { data: derived } = useAdongDerivedIndices(dongSlug);

  const selectedAdong = useMemo(
    () => adongs?.find((d) => d.slug === dongSlug) ?? null,
    [adongs, dongSlug],
  );

  const handleAdongChange = useCallback(
    (slug: string) => {
      setSearchParams({ adong: slug }, { replace: true });
    },
    [setSearchParams],
  );

  // If no adong param in URL, set the default
  useEffect(() => {
    if (!searchParams.has('adong')) {
      setSearchParams({ adong: DEFAULT_DONG_SLUG }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Build summary text for header
  const summaryText = summary
    ? `${summary.summary}`
    : undefined;

  return (
    <main id="main" className="min-h-[calc(100vh-var(--space-14))] bg-primary-soft">
      <div className="max-w-[1280px] mx-auto px-5 py-5 flex flex-col gap-3">
        {/* Header: adong selector + selected adong info */}
        <DashboardHeader
          selectedAdong={
            selectedAdong
              ? { slug: selectedAdong.slug, name: selectedAdong.name, gu: selectedAdong.gu }
              : null
          }
          onAdongChange={handleAdongChange}
          summaryText={summaryText}
        />

        {/* KPI row + MiniMap */}
        <div className="grid grid-cols-2 gap-3">
          <KpiRow
            detail={detail}
            summary={summary}
            derived={derived}
            allAdongs={adongs}
            isLoading={detailLoading}
          />
          <DashboardMiniMap
            adongs={adongs ?? []}
            selectedSlug={dongSlug}
            onAdongSelect={handleAdongChange}
          />
        </div>

        {/* Error state */}
        {detailError && (
          <Card padding="md">
            <div className="flex items-center justify-center h-[100px] text-text-muted text-caption">
              데이터를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.
            </div>
          </Card>
        )}

        {/* Section A: Real Estate */}
        {detail && (
          <section aria-labelledby="section-realestate">
            <Card padding="md">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-1 h-5 rounded-full"
                  style={{ backgroundColor: 'var(--color-cat-realestate)' }}
                />
                <h2 id="section-realestate" className="text-[16px] font-semibold text-text">
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
            <Card padding="md">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-1 h-5 rounded-full"
                  style={{ backgroundColor: 'var(--color-cat-amenity)' }}
                />
                <h2 id="section-amenity" className="text-[16px] font-semibold text-text">
                  편의시설
                </h2>
              </div>
              <AmenitySection
                amenities={detail.amenities}
                allAdongs={adongs}
                currentAmenityScore={selectedAdong?.score_amenity ?? 50}
                parks={parks}
              />
            </Card>
          </section>
        )}

        {/* Section C: Transit */}
        {detail && (
          <section aria-labelledby="section-transit">
            <Card padding="md">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-1 h-5 rounded-full"
                  style={{ backgroundColor: 'var(--color-cat-transport)' }}
                />
                <h2 id="section-transit" className="text-[16px] font-semibold text-text">
                  교통
                </h2>
              </div>
              <TransitSection transit={detail.transit} congestion={congestion} />
            </Card>
          </section>
        )}

        {/* Section D: Population */}
        {population && (
          <section aria-labelledby="section-population">
            <Card padding="md">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-1 h-5 rounded-full"
                  style={{ backgroundColor: 'var(--color-cat-population)' }}
                />
                <h2 id="section-population" className="text-[16px] font-semibold text-text">
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
            <Card padding="md">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-1 h-5 rounded-full"
                  style={{ backgroundColor: 'var(--color-cat-safety)' }}
                />
                <h2 id="section-safety" className="text-[16px] font-semibold text-text">
                  안전·환경·경제
                </h2>
              </div>
              <SafetyEconomySection guMetrics={guMetrics} series={safetySeries} />
            </Card>
          </section>
        )}

        {/* Section F: Popularity (인기 차트) */}
        <section aria-labelledby="section-popularity">
          <Card padding="md">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-1 h-5 rounded-full"
                style={{ backgroundColor: 'var(--color-cat-environment)' }}
              />
              <h2 id="section-popularity" className="text-[16px] font-semibold text-text">
                인기 차트
              </h2>
            </div>
            <PopularitySection
              allAdongs={adongs}
              similarAdongs={detail?.similar_dongs}
              currentSlug={dongSlug}
              onAdongSelect={handleAdongChange}
            />
          </Card>
        </section>

        {/* Section G: Reviews (자취생 리뷰) */}
        <section aria-labelledby="section-reviews">
          <Card padding="md">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-1 h-5 rounded-full"
                style={{ backgroundColor: 'var(--color-cat-environment)' }}
              />
              <h2 id="section-reviews" className="text-[16px] font-semibold text-text">
                자취생 리뷰
              </h2>
            </div>
            <ReviewDashboardSection
              reviews={detail?.reviews}
              dongSlug={dongSlug}
              dongName={selectedAdong?.name}
            />
          </Card>
        </section>

        {/* Loading skeleton for sections when detail is loading */}
        {detailLoading && !detail && (
          <>
            {['부동산 시세', '편의시설', '교통'].map((title) => (
              <Card key={title} padding="md">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-5 rounded-full bg-primary-soft" />
                  <div className="h-4 w-24 bg-primary-soft rounded animate-[match-panel-pulse_1.5s_ease-in-out_infinite]" />
                </div>
                <div className="h-[160px] bg-primary-soft rounded animate-[match-panel-pulse_1.5s_ease-in-out_infinite]" />
              </Card>
            ))}
          </>
        )}
      </div>
    </main>
  );
}
