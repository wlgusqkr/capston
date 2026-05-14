// Dashboard PopularitySection -- SPEC 4.4 Section F (인기 차트).
//
// Layout: 2×2 grid
//   Row 1: 종합 점수 TOP 10 | 자취촌 지수 TOP 10 (placeholder)
//   Row 2: 학교별 자취 TOP 5 (empty state) | 인근 비슷한 동
//
// Data: DongScore[] + DongDetail.similar_dongs (no new API)

import { useState } from 'react';
import { Link } from 'react-router-dom';

import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import type { DongDetail, DongScore } from '@/types/api';
import { KERNEL_SCHOOL_OPTIONS } from '@/types/api';

interface PopularitySectionProps {
  allDongs: DongScore[] | undefined;
  similarDongs: DongDetail['similar_dongs'] | undefined;
  currentSlug: string;
  onDongSelect: (slug: string) => void;
}

/** Map a 0-100 score to a Badge variant. */
function scoreVariant(score: number): 'success' | 'warning' | 'danger' {
  if (score >= 70) return 'success';
  if (score >= 50) return 'warning';
  return 'danger';
}

export default function PopularitySection({
  allDongs,
  similarDongs,
  currentSlug,
  onDongSelect,
}: PopularitySectionProps) {
  const [selectedSchool, setSelectedSchool] = useState<string>(KERNEL_SCHOOL_OPTIONS[0]);

  const top10 = (allDongs ?? []).slice(0, 10);
  const similarTop3 = (similarDongs ?? []).slice(0, 3);

  return (
    <div className="grid grid-cols-4 gap-2">
      {/* 1. 종합 점수 TOP 10 */}
      <Card padding="md">
        <h3 className="m-0 mb-1 text-[16px] leading-snug font-semibold text-text">
          종합 점수 TOP 10
        </h3>
        {top10.length > 0 ? (
          <ol className="list-none m-0 p-0 flex flex-col gap-0.5">
            {top10.map((d, idx) => {
              const isCurrent = d.slug === currentSlug;
              return (
                <li key={d.slug}>
                  <button
                    type="button"
                    onClick={() => onDongSelect(d.slug)}
                    className={`w-full flex items-center gap-2 px-1.5 py-1 rounded-card text-left transition-colors duration-[120ms] ease-out hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-2 ${
                      isCurrent ? 'bg-primary-soft' : 'bg-transparent'
                    }`}
                    aria-current={isCurrent ? 'true' : undefined}
                  >
                    <span
                      className={`tabular shrink-0 w-5 text-center text-[14px] font-semibold ${
                        idx < 3 ? 'text-primary' : 'text-text-muted'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-medium text-text truncate">
                        {d.name}
                      </span>
                      <span className="block text-[11px] text-text-subtle truncate">
                        {d.gu}
                      </span>
                    </span>
                    <Badge variant={scoreVariant(d.score)} size="sm">
                      <span className="tabular">{d.score.toFixed(1)}</span>
                    </Badge>
                  </button>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="flex items-center justify-center h-[140px] text-text-muted text-[12px]">
            랭킹 데이터를 불러오는 중...
          </div>
        )}
      </Card>

      {/* 2. 자취촌 지수 TOP 10 (placeholder — API 준비 필요) */}
      <Card padding="md">
        <h3 className="m-0 mb-1 text-[16px] leading-snug font-semibold text-text">
          자취촌 지수 TOP 10
        </h3>
        <div className="flex flex-col items-center justify-center py-6 gap-2">
          <p className="m-0 text-[13px] text-text-muted text-center">
            데이터 준비 중
          </p>
          <p className="m-0 text-[11px] text-text-subtle text-center">
            자취촌 지수 기준 랭킹 API가 연동되면 표시됩니다
          </p>
        </div>
      </Card>

      {/* 3. 학교별 자취 TOP 5 — empty state */}
      <Card padding="md">
        <h3 className="m-0 mb-1 text-[16px] leading-snug font-semibold text-text">
          학교별 자취 TOP 5
        </h3>
        <div className="mb-1">
          <Select
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
            aria-label="학교 선택"
          >
            {KERNEL_SCHOOL_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col items-center justify-center py-4 gap-2">
          <p className="m-0 text-[13px] text-text-muted text-center">
            사용자 데이터가 부족해서 아직 확인할 수 없어요
          </p>
          <p className="m-0 text-[11px] text-text-subtle text-center">
            학교 주변 자취생 데이터가 모이면 자동으로 표시됩니다
          </p>
        </div>
      </Card>

      {/* 4. 인근 비슷한 동 */}
      <Card padding="md">
        <h3 className="m-0 mb-1 text-[16px] leading-snug font-semibold text-text">
          인근 비슷한 동
        </h3>
        {similarTop3.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {similarTop3.map((d) => (
              <div
                key={d.slug}
                className="relative rounded-card border border-divider bg-surface p-2 flex flex-col gap-1.5 transition-colors duration-[120ms] ease-out hover:border-primary"
              >
                <button
                  type="button"
                  onClick={() => onDongSelect(d.slug)}
                  className="absolute inset-0 w-full h-full rounded-card focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-[-2px]"
                  aria-label={`${d.name} 대시보드로 이동`}
                />
                <div className="flex items-start justify-between gap-2 pointer-events-none">
                  <div className="min-w-0">
                    <p className="m-0 text-[13px] font-medium text-text truncate">
                      {d.name}
                    </p>
                    <p className="m-0 text-[11px] text-text-subtle truncate">
                      {d.gu}
                    </p>
                  </div>
                  <Badge variant="info" size="sm">
                    <span className="tabular">{d.similarity_pct.toFixed(1)}%</span>
                  </Badge>
                </div>
                <div className="flex items-center justify-end">
                  <Link
                    to={`/compare?dongs=${encodeURIComponent(currentSlug)},${encodeURIComponent(d.slug)}`}
                    className="relative z-10 text-[11px] text-link hover:underline focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-2 rounded-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    비교하기 →
                  </Link>
                </div>
              </div>
            ))}
            <p className="m-0 mt-0.5 text-[11px] text-text-subtle">
              점수 벡터 유사도 기반
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center py-8 text-text-muted text-[12px]">
            비슷한 동 데이터가 없습니다
          </div>
        )}
      </Card>
    </div>
  );
}
