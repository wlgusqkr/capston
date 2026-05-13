// Dashboard — Phase 0 shell.
//
// URL-driven dong selection via ?dong= search param. Renders section
// placeholders that will be filled with widgets in subsequent phases.
//
// Default dong: "pildong" (서울시 중구 필동).

import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import DashboardHeader from '@/components/Dashboard/DashboardHeader';
import Card from '@/components/ui/Card';
import { useDongScores } from '@/hooks/useDongs';
import type { CategoryKey } from '@/lib/colors';
import { DEFAULT_WEIGHTS } from '@/types/api';

const DEFAULT_DONG_SLUG = 'pildong';

interface SectionDef {
  title: string;
  category: CategoryKey;
}

const SECTIONS: SectionDef[] = [
  { title: '부동산 시세', category: 'realestate' },
  { title: '편의시설', category: 'amenity' },
  { title: '교통', category: 'transport' },
  { title: '인구·사회', category: 'population' },
  { title: '안전·환경·경제', category: 'safety' },
  { title: '인기 차트', category: 'environment' },
  { title: '자취생 리뷰', category: 'environment' },
];

/** Placeholder section with category accent bar. */
function DashboardSection({ title, category }: SectionDef) {
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

  // Fetch dong list (weights don't matter for the selector)
  const { data: dongs } = useDongScores(DEFAULT_WEIGHTS);

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

  return (
    <main id="main" className="min-h-[calc(100vh-var(--space-14))] bg-surface-alt">
      <div className="max-w-[1280px] mx-auto px-6 py-6 flex flex-col gap-6">
        {/* Header: dong selector + selected dong info */}
        <DashboardHeader
          selectedDong={
            selectedDong
              ? { slug: selectedDong.slug, name: selectedDong.name, gu: selectedDong.gu }
              : null
          }
          onDongChange={handleDongChange}
        />

        {/* KPI + Map placeholder */}
        <div className="grid grid-cols-2 gap-6">
          <Card padding="lg">
            <div className="flex items-center justify-center h-[200px] text-text-muted text-caption">
              KPI 영역 (Phase 1)
            </div>
          </Card>
          <Card padding="lg">
            <div className="flex items-center justify-center h-[200px] text-text-muted text-caption">
              작은 지도 (Phase 1)
            </div>
          </Card>
        </div>

        {/* Section placeholders */}
        {SECTIONS.map((section) => (
          <DashboardSection
            key={section.title}
            title={section.title}
            category={section.category}
          />
        ))}
      </div>
    </main>
  );
}
