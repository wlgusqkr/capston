// TransactionPanel — slide-in right-side panel listing the deals at a single
// jibun (Phase 1b).
//
// Mirrors DongPanel structure for consistency:
//   - Fixed to the right edge, ~400px wide, full viewport height.
//   - Slides in via translateX. Stays in DOM when closed (jibunKey === null)
//     so the transition runs both directions.
//   - Internal scroll for long lists.
//
// Sections:
//   1. Header — jibun + dong_name (gu) mono uppercase, close button
//   2. Deal list — sorted by date desc; each row has type badge + area +
//      deposit/monthly_rent + date.
//   3. Footer — "+N more" hint when caller passes a `truncated` count.
//
// ESC closes the panel.
import { useEffect, useMemo } from 'react';

import { Badge } from '@/components/ui';
import { formatConvertedRent } from '@/lib/rent';
import type { RentDealPin, TransactionDealType } from '@/types/api';

import './TransactionPanel.css';

/** Korean labels for deal types — Pretendard sentence-case (badge content). */
const DEAL_TYPE_LABEL: Record<TransactionDealType, string> = {
  apt: '아파트',
  officetel: '오피스텔',
  villa: '연립다세대',
  danok: '단독다가구',
};

/** 1평 = 3.3058 m² (한국 면적 환산 표준). */
const PYEONG_PER_M2 = 1 / 3.3058;

/** 만원 단위 보증금/월세 → "55만원" 표기.
 *  - 0이면 빈 문자열을 반환하지 않고 "0만원"으로 명시 (UX: 데이터 정직성).
 */
function formatMan(v: number): string {
  return `${v.toLocaleString('ko-KR')}만원`;
}

function formatArea(m2: number): string {
  const py = m2 * PYEONG_PER_M2;
  return `${m2.toFixed(1)}m² · ${py.toFixed(1)}평`;
}

export interface TransactionPanelProps {
  /** Stable key from TransactionPinLayer.jibunKeyOf — null means panel closed. */
  jibunKey: string | null;
  /** Pre-grouped deals at this jibun. Caller does the grouping. */
  pins: RentDealPin[];
  /** True when the parent's API response was truncated by limit/has_more.
   *  We surface this in the footer as a "+N more" disclosure.
   */
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

  // Sort newest first, fallback to id desc for tie-breaks.
  const sorted = useMemo(() => {
    const copy = [...pins];
    copy.sort((a, b) => {
      if (a.date === b.date) return b.id - a.id;
      return a.date < b.date ? 1 : -1;
    });
    return copy;
  }, [pins]);

  // ESC closes when open.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Header text — derived from the first pin (all share dong/gu/jibun).
  const head = sorted[0];

  return (
    <aside
      className={`tx-panel${isOpen ? ' tx-panel--open' : ''}`}
      aria-hidden={!isOpen}
      aria-label="거래 정보 패널"
      role="complementary"
    >
      <div className="tx-panel__inner">
        <header className="tx-panel__header">
          <div className="tx-panel__title">
            <p className="tx-panel__where">
              {head ? `${head.gu} · ${head.dong_name}` : ''}
            </p>
            <h2 className="tx-panel__jibun">
              {head ? head.jibun : ''}
            </h2>
            <p className="tx-panel__count mono-label tabular">
              {sorted.length}건 거래
            </p>
          </div>
          <button
            type="button"
            className="tx-panel__close"
            aria-label="패널 닫기"
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="tx-panel__body">
          {sorted.length === 0 && (
            <div className="tx-panel__empty" role="status">
              거래 정보가 없습니다.
            </div>
          )}
          <ul className="tx-panel__list">
            {sorted.map((p) => (
              <DealRow key={p.id} pin={p} />
            ))}
          </ul>
        </div>

        {hasMore && (
          <footer className="tx-panel__footer">
            <p className="tx-panel__more mono-label">
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
  // Prefer backend's converted_rent (정수 만원, 동일 계수 0.005/월) — 없는 케이스는
  // 거래 row 단위로는 거의 발생하지 않지만 방어 차원에서 클라이언트 계산으로 폴백.
  const convertedLabel = formatConvertedRent(pin.deposit, pin.monthly_rent);
  return (
    <li className="tx-row">
      <div className="tx-row__top">
        <Badge variant="neutral" size="sm">
          {DEAL_TYPE_LABEL[pin.deal_type]}
        </Badge>
        <span className="tx-row__date tabular">{pin.date}</span>
      </div>
      <div className="tx-row__area">{formatArea(pin.area_m2)}</div>
      <div className="tx-row__price">
        {isJeonse ? (
          <>
            {/* 전세는 월세=0이라 보증금 환산값이 곧 비교 가능한 월세 부담. */}
            <Badge variant="neutral" size="sm">전세</Badge>
            <span className="tx-row__price-pair">
              <span className="tx-row__price-label mono-label">보증금</span>
              <span className="tx-row__price-amount tabular">
                {formatMan(pin.deposit)}
              </span>
            </span>
            <span className="tx-row__price-sep">·</span>
            <span className="tx-row__price-pair">
              <span className="tx-row__price-label mono-label">환산</span>
              <span className="tx-row__price-amount tabular">
                {convertedLabel}
              </span>
            </span>
          </>
        ) : (
          <>
            <span className="tx-row__price-pair">
              <span className="tx-row__price-label mono-label">월세</span>
              <span className="tx-row__price-amount tabular">
                {formatMan(pin.monthly_rent)}
              </span>
            </span>
            <span className="tx-row__price-sep">·</span>
            <span className="tx-row__price-pair">
              <span className="tx-row__price-label mono-label">보증금</span>
              <span className="tx-row__price-amount tabular">
                {formatMan(pin.deposit)}
              </span>
            </span>
          </>
        )}
      </div>
      {/* 환산월세는 보증금 환산 합산으로 동일 기준 비교용. 전세는 위에서 inline
          노출했으므로 중복을 피한다 (반전세/월세 케이스만 노출). */}
      {!isJeonse && (
        <div className="tx-row__converted">
          <span className="tx-row__converted-label mono-label">환산</span>
          <span className="tx-row__converted-value tabular">{convertedLabel}</span>
          <span className="tx-row__converted-hint mono-label">
            보증금 환산 포함
          </span>
        </div>
      )}
    </li>
  );
}
