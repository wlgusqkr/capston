// TransactionPanel -- slide-in right-side panel listing the deals at a single
// jibun (Phase 1b).

import { useMemo } from 'react';

import { Badge } from '@/components/ui';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { formatConvertedRent } from '@/lib/rent';
import type { RentDealPin, TransactionDealType } from '@/types/api';

const DEAL_TYPE_LABEL: Record<TransactionDealType, string> = {
  apt: '아파트',
  officetel: '오피스텔',
  villa: '연립다세대',
  dagagu: '다가구',
  danok: '단독',
};

const PYEONG_PER_M2 = 1 / 3.3058;

function formatMan(v: number): string {
  return `${v.toLocaleString('ko-KR')}만원`;
}

function formatArea(m2: number): string {
  const py = m2 * PYEONG_PER_M2;
  return `${m2.toFixed(1)}m² · ${py.toFixed(1)}평`;
}

export interface TransactionPanelProps {
  jibunKey: string | null;
  pins: RentDealPin[];
  hasMore: boolean;
  onClose: () => void;
}

export default function TransactionPanel({
  jibunKey,
  pins,
  hasMore,
  onClose,
}: TransactionPanelProps) {
  const isOpen = jibunKey != null && pins.length > 0;

  const sorted = useMemo(() => {
    const copy = [...pins];
    copy.sort((a, b) => {
      if (a.date === b.date) return b.id - a.id;
      return a.date < b.date ? 1 : -1;
    });
    return copy;
  }, [pins]);

  useEscapeKey(onClose, isOpen);

  const head = sorted[0];

  return (
    <aside
      className={`absolute top-0 right-0 h-full w-[400px] max-w-full bg-surface border-l border-border transition-transform duration-[300ms] ease-out z-[510] flex flex-col ${
        isOpen
          ? 'translate-x-0 pointer-events-auto shadow-floating'
          : 'translate-x-full pointer-events-none'
      }`}
      // @ts-expect-error -- `inert` lands as a boolean attr but React typed it later.
      inert={!isOpen ? '' : undefined}
      aria-hidden={!isOpen}
      aria-label="거래 정보 패널"
      role="complementary"
    >
      <div className="flex flex-col h-full min-h-0">
        <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-border shrink-0">
          <div className="flex flex-col gap-1 min-w-0">
            <p className="m-0 text-caption leading-[var(--font-caption-line)] text-text-muted tracking-[var(--letter-spacing-ko)]">
              {head ? `${head.gu} · ${head.dong_name}` : ''}
            </p>
            <h2 className="m-0 font-[family-name:var(--font-family-mono)] text-feature-heading leading-[var(--font-feature-heading-line)] font-semibold text-text uppercase tracking-[0.04em] tabular">
              {head ? head.jibun : ''}
            </h2>
            <p className="mono-label tabular mt-1 text-text-subtle">
              {sorted.length}건 거래
            </p>
          </div>
          <button
            type="button"
            className="w-8 h-8 rounded-md border border-transparent bg-transparent text-text-muted text-feature-heading leading-none cursor-pointer shrink-0 transition-all duration-[120ms] ease-out inline-flex items-center justify-center hover:bg-surface-alt hover:text-text focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-2"
            aria-label="패널 닫기"
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {sorted.length === 0 && (
            <div className="px-5 py-6 text-body-base text-text-muted text-center tracking-[var(--letter-spacing-ko)]" role="status">
              거래 정보가 없습니다.
            </div>
          )}
          <ul className="list-none m-0 p-0">
            {sorted.map((p) => (
              <DealRow key={p.id} pin={p} />
            ))}
          </ul>
        </div>

        {hasMore && (
          <footer className="border-t border-border px-5 py-3 bg-surface shrink-0">
            <p className="mono-label m-0 text-text-subtle text-center">
              지도를 확대하면 더 많은 거래가 표시됩니다
            </p>
          </footer>
        )}
      </div>
    </aside>
  );
}

/* -------------------------------------------------------------------------- */
/* Deal row                                                                    */
/* -------------------------------------------------------------------------- */

function DealRow({ pin }: { pin: RentDealPin }) {
  const isJeonse = pin.monthly_rent === 0;
  const convertedLabel = formatConvertedRent(pin.deposit, pin.monthly_rent);
  return (
    <li className="flex flex-col gap-2 px-5 py-4 border-b border-border bg-surface transition-colors duration-[120ms] ease-out hover:bg-surface-alt">
      <div className="flex items-center justify-between gap-3">
        <Badge variant="neutral" size="sm">
          {DEAL_TYPE_LABEL[pin.deal_type]}
        </Badge>
        <span className="text-caption text-text-muted tracking-[var(--letter-spacing-ko)] tabular">{pin.date}</span>
      </div>
      <div className="text-body-base text-text tracking-[var(--letter-spacing-ko)] tabular">{formatArea(pin.area_m2)}</div>
      <div className="flex flex-wrap items-baseline gap-2 text-body-base">
        {isJeonse ? (
          <>
            <Badge variant="neutral" size="sm">전세</Badge>
            <span className="inline-flex items-baseline gap-2">
              <span className="mono-label text-text-subtle">보증금</span>
              <span className="font-[family-name:var(--font-family-mono)] text-body-large text-text tracking-[0] tabular">
                {formatMan(pin.deposit)}
              </span>
            </span>
            <span className="text-text-subtle">·</span>
            <span className="inline-flex items-baseline gap-2">
              <span className="mono-label text-text-subtle">환산</span>
              <span className="font-[family-name:var(--font-family-mono)] text-body-large text-text tracking-[0] tabular">
                {convertedLabel}
              </span>
            </span>
          </>
        ) : (
          <>
            <span className="inline-flex items-baseline gap-2">
              <span className="mono-label text-text-subtle">월세</span>
              <span className="font-[family-name:var(--font-family-mono)] text-body-large text-text tracking-[0] tabular">
                {formatMan(pin.monthly_rent)}
              </span>
            </span>
            <span className="text-text-subtle">·</span>
            <span className="inline-flex items-baseline gap-2">
              <span className="mono-label text-text-subtle">보증금</span>
              <span className="font-[family-name:var(--font-family-mono)] text-body-large text-text tracking-[0] tabular">
                {formatMan(pin.deposit)}
              </span>
            </span>
          </>
        )}
      </div>
      {!isJeonse && (
        <div className="flex items-baseline gap-2 pt-1 border-t border-dashed border-divider mt-1">
          <span className="mono-label text-text-subtle">환산</span>
          <span className="font-[family-name:var(--font-family-mono)] text-body-base text-text tracking-[0] tabular">{convertedLabel}</span>
          <span className="mono-label text-text-subtle text-mono-label ml-auto">
            보증금 환산 포함
          </span>
        </div>
      )}
    </li>
  );
}
