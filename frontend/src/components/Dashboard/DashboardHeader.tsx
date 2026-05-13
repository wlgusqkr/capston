// DashboardHeader — dong selector + selected dong display + summary text.

import DongSelector from './DongSelector';

export interface DashboardHeaderProps {
  selectedDong: { slug: string; name: string; gu: string } | null;
  onDongChange: (slug: string) => void;
  /** One-line summary from DongSummary (e.g. "월세 평균 72만원, 역세권, 생활시설 충분"). */
  summaryText?: string;
}

export default function DashboardHeader({
  selectedDong,
  onDongChange,
  summaryText,
}: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-6">
      {/* Left: dong selector */}
      <DongSelector
        value={selectedDong?.slug ?? null}
        onChange={onDongChange}
        className="w-[280px]"
      />

      {/* Right: selected dong display */}
      <div className="flex items-center gap-3 min-w-0">
        {selectedDong ? (
          <div className="flex items-baseline gap-2 min-w-0">
            <h1 className="text-feature-heading font-semibold text-text whitespace-nowrap">
              {selectedDong.gu} {selectedDong.name}
            </h1>
            {summaryText ? (
              <span className="text-caption text-text-muted truncate max-w-[400px]">
                {summaryText}
              </span>
            ) : (
              <span className="text-caption text-text-muted whitespace-nowrap">
                데이터 불러오는 중...
              </span>
            )}
          </div>
        ) : (
          <span className="text-caption text-text-muted">
            동네를 선택하세요
          </span>
        )}
      </div>
    </div>
  );
}
