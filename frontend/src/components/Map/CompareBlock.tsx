// CompareBlock — hint text + "비교 보기" secondary CTA.
//
// Used inside Sidebar (Stage 2a). In R-1 (Stage 2b) the basket count is
// surfaced as a separate floating CompareChip; CompareBlock stays only as
// the Sidebar variant during the parallel-run window. Once Sidebar is
// removed in Stage 2b, this component goes away too — only CompareChip
// remains. Kept here so Stage 2a can decompose Sidebar without yet
// touching R-1 floating chrome.

import { Button } from '@/components/ui';

export interface CompareBlockProps {
  compareCount: number;
  onOpenCompare: () => void;
}

export default function CompareBlock({
  compareCount,
  onOpenCompare,
}: CompareBlockProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-micro text-text-muted leading-[1.4] tracking-normal">
        {compareCount === 0
          ? '동네 패널에서 "비교에 추가"를 누르세요.'
          : `현재 ${compareCount}/3개 담겼어요.`}
      </p>
      <Button
        variant="secondary"
        fullWidth
        onClick={onOpenCompare}
        disabled={compareCount === 0}
      >
        비교 보기 ({compareCount})
      </Button>
    </div>
  );
}
