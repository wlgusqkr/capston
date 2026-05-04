/**
 * Modal — translucent backdrop + centered card.
 *
 * Features:
 *   - Closes on ESC and backdrop click (configurable)
 *   - Locks body scroll while open
 *   - Simple focus trap (Tab loops inside the modal)
 *   - aria-modal + role="dialog"
 *   - Renders to document.body via portal
 *
 * Examples:
 *   const [open, setOpen] = useState(false);
 *   <Modal open={open} onClose={() => setOpen(false)} title="가중치 학습">
 *     <p>5번 비교로 자동 추천을 시작할까요?</p>
 *     <Button onClick={start}>시작하기</Button>
 *   </Modal>
 *
 *   <Modal open={true} onClose={close} maxWidth={600} dismissOnBackdrop={false}>
 *     <CustomContent />
 *   </Modal>
 *
 *   <Modal open={x} onClose={close} ariaLabel="설정">
 *     ...
 *   </Modal>
 */

import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

import { useEscapeKey } from '@/hooks/useEscapeKey';

import './Modal.css';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Visible title rendered in the header. If absent, header is omitted. */
  title?: ReactNode;
  /** aria-label fallback when `title` is not a string (or omitted). */
  ariaLabel?: string;
  /** ID of an element rendered inside `children` whose text labels the modal.
   *  Use this when the visible heading lives in the body (not the header), so
   *  screen readers announce the actual heading instead of an alternate label.
   *  Takes precedence over both `title` and `ariaLabel` when set. */
  ariaLabelledBy?: string;
  /** Card max-width in px. Default 600. */
  maxWidth?: number;
  /** Close on backdrop click. Default true. */
  dismissOnBackdrop?: boolean;
  /** Close on ESC key. Default true. */
  dismissOnEsc?: boolean;
  /** Hide the X close button in header. */
  hideCloseButton?: boolean;
  children: ReactNode;
}

/* Selectors for elements we consider focusable inside the modal. */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function Modal({
  open,
  onClose,
  title,
  ariaLabel,
  ariaLabelledBy,
  maxWidth = 600,
  dismissOnBackdrop = true,
  dismissOnEsc = true,
  hideCloseButton = false,
  children,
}: ModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  /* ESC handler — shared useEscapeKey hook (post-A-7 dedup). */
  useEscapeKey(onClose, open && dismissOnEsc);

  /* Body scroll lock */
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  /* Focus management: save → focus first → restore on close */
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    // Defer to after render so refs are populated.
    const t = window.setTimeout(() => {
      if (!cardRef.current) return;
      const firstFocusable = cardRef.current.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (firstFocusable ?? cardRef.current).focus();
    }, 0);
    return () => {
      window.clearTimeout(t);
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  /* Focus trap on Tab */
  const onCardKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !cardRef.current) return;
    const focusables = Array.from(
      cardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    ).filter((el) => !el.hasAttribute('disabled'));
    if (focusables.length === 0) {
      e.preventDefault();
      cardRef.current.focus();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  if (!open) return null;
  if (typeof document === 'undefined') return null; // SSR safety

  // Caller-provided id wins over the auto-rendered title (so a body-level <h2>
  // can label the dialog), which in turn wins over an explicit aria-label.
  const labelledBy =
    ariaLabelledBy ??
    (typeof title === 'string' && title.length > 0 ? 'ui-modal-title' : undefined);
  const computedAriaLabel =
    !labelledBy && (ariaLabel ?? (typeof title === 'string' ? title : undefined));

  return createPortal(
    <div
      className="ui-modal__backdrop"
      onClick={dismissOnBackdrop ? onClose : undefined}
      role="presentation"
    >
      <div
        ref={cardRef}
        className="ui-modal__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={computedAriaLabel || undefined}
        style={{ maxWidth }}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onCardKeyDown}
      >
        {(title || !hideCloseButton) && (
          <div className="ui-modal__header">
            {title && (
              <h2 id="ui-modal-title" className="ui-modal__title">
                {title}
              </h2>
            )}
            {!hideCloseButton && (
              <button
                type="button"
                className="ui-modal__close"
                onClick={onClose}
                aria-label="닫기"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M4 4L12 12M12 4L4 12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className="ui-modal__body">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export default Modal;
