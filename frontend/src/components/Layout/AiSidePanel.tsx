// AiSidePanel — slide-in AI chat shell.
//
// Fixed position, slides from the right. ESC to close.

import { useCallback, useRef, useState } from 'react';
import axios from 'axios';

import { useAiPanel } from '@/contexts/AiPanelContext';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { postAgentQuery } from '@/lib/api';
import type { AgentQueryResponse, AgentVisualization } from '@/types/api';

interface Message {
  id: number;
  role: 'ai' | 'user';
  text: string;
  data?: AgentQueryResponse;
  isError?: boolean;
  isLoading?: boolean;
}

const WELCOME_MESSAGE: Message = {
  id: 0,
  role: 'ai',
  text: '안녕하세요! 자취맵 AI입니다. 동네에 대해 궁금한 것을 물어보세요.',
};

let nextId = 1;

export default function AiSidePanel() {
  const { isOpen, close, toggle } = useAiPanel();
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEscapeKey(close, isOpen);

  const scrollToBottom = useCallback(() => {
    // Small delay so DOM updates before scroll
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isSending) return;

    const userMsg: Message = { id: nextId++, role: 'user', text };
    const pendingId = nextId++;
    const pendingMsg: Message = {
      id: pendingId,
      role: 'ai',
      text: '답변을 준비 중이에요.',
      isLoading: true,
    };
    setMessages((prev) => [...prev, userMsg, pendingMsg]);
    setInput('');
    setIsSending(true);
    scrollToBottom();

    try {
      const data = await postAgentQuery(text);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === pendingId
            ? { id: pendingId, role: 'ai', text: data.answer, data }
            : msg,
        ),
      );
    } catch (err) {
      const message = getAgentErrorMessage(err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === pendingId
            ? {
                id: pendingId,
                role: 'ai',
                text: `답변을 불러오지 못했습니다. ${message}`,
                isError: true,
              }
            : msg,
        ),
      );
    } finally {
      setIsSending(false);
      scrollToBottom();
    }
  }, [input, isSending, scrollToBottom]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <aside
      className={`fixed top-[var(--space-14)] right-0 bottom-0 w-[400px] max-w-[calc(100vw-28px)] bg-surface border-l border-divider z-[999] flex flex-col transition-transform duration-500 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
      style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
      aria-label="AI 채팅 패널"
      aria-hidden={!isOpen}
    >
      {/* Slide toggle handle on the left edge */}
      <button
        onClick={toggle}
        className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 w-7 h-16 bg-surface border border-r-0 border-divider rounded-l-lg flex items-center justify-center text-text-muted hover:text-primary hover:bg-primary-soft transition-all duration-200 cursor-pointer shadow-sm"
        aria-label={isOpen ? 'AI 패널 닫기' : 'AI 패널 열기'}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
          className={`transition-transform duration-300 ${isOpen ? '' : 'rotate-180'}`}
        >
          <path
            d="M9 2L4 7l5 5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Header */}
      <div className="flex items-center px-5 py-4 border-b border-divider shrink-0">
        <h2 className="text-body-large font-semibold text-text">자취맵 AI</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3" aria-live="polite">
        {messages.map((msg) => {
          const bubbleWidth =
            msg.role === 'user'
              ? 'max-w-[80%]'
              : msg.data
                ? 'w-full max-w-full'
                : 'max-w-[86%]';
          const bubbleTone =
            msg.role === 'user'
              ? 'bg-primary text-surface'
              : msg.isError
                ? 'bg-danger-soft text-danger'
                : 'bg-surface-alt text-text';

          return (
            <div
              key={msg.id}
              className={`flex min-w-0 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`${bubbleWidth} ${bubbleTone} min-w-0 px-4 py-2.5 rounded-card text-caption leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]`}
                role={msg.isError ? 'alert' : msg.isLoading ? 'status' : undefined}
              >
                {msg.isLoading && (
                  <span
                    className="inline-block w-3 h-3 mr-2 rounded-full border-2 border-current border-r-transparent align-[-2px] [animation:ui-button-spin_700ms_linear_infinite]"
                    aria-hidden="true"
                  />
                )}
                {msg.text}
                {msg.data ? <AgentResultSummary data={msg.data} /> : null}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-divider px-5 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            placeholder="메시지를 입력하세요..."
            className="flex-1 h-10 bg-surface-alt border border-border rounded-pill px-4 text-caption text-text placeholder:text-text-subtle outline-none transition-colors duration-200 focus:border-focus-ring disabled:cursor-not-allowed disabled:opacity-70"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-surface shrink-0 transition-colors duration-200 hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="메시지 보내기"
            aria-busy={isSending || undefined}
          >
            {isSending ? (
              <span
                className="w-4 h-4 rounded-full border-2 border-current border-r-transparent [animation:ui-button-spin_700ms_linear_infinite]"
                aria-hidden="true"
              />
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M14 2L7 9M14 2l-4.5 12-2-5.5L2 6.5 14 2z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}

function AgentResultSummary({ data }: { data: AgentQueryResponse }) {
  const visualizations = data.visualizations.filter((viz) => normalizeVizType(viz.type) !== 'none');

  if (data.neighborhoods.length === 0 && visualizations.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-divider pt-3">
      {data.neighborhoods.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {data.neighborhoods.map((item) => (
            <div
              key={`${item.rank}-${item.gu_name}-${item.ldong_name}`}
              className="rounded-sm bg-surface px-3 py-2"
            >
              <div className="font-semibold text-text">
                {item.rank}. {item.gu_name} {item.ldong_name}
              </div>
              <div className="mt-1 text-text-muted">{item.one_liner}</div>
              <div className="mt-1 text-text-subtle">{item.data_summary}</div>
            </div>
          ))}
        </div>
      )}
      {visualizations.map((viz, idx) => (
        <VisualizationCard key={`${viz.title}-${idx}`} viz={viz} />
      ))}
    </div>
  );
}

function VisualizationCard({ viz }: { viz: AgentVisualization }) {
  const type = normalizeVizType(viz.type);

  if (type === 'none') return null;

  return (
    <div className="min-w-0 rounded-sm bg-surface px-3 py-2">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 font-semibold text-text [overflow-wrap:anywhere]">
          {viz.title || getVisualizationTypeLabel(type)}
        </div>
        <span className="shrink-0 rounded-full bg-surface-alt px-2 py-0.5 text-[10px] font-semibold uppercase tracking-normal text-text-muted">
          {type}
        </span>
      </div>
      {type === 'bar' ? <BarVisualization viz={viz} /> : null}
      {type === 'line' ? <LineVisualization viz={viz} /> : null}
      {type === 'table' ? <TableVisualization viz={viz} /> : null}
      {type === 'unknown' ? <TableVisualization viz={viz} /> : null}
    </div>
  );
}

function BarVisualization({ viz }: { viz: AgentVisualization }) {
  const rows = viz.data.filter((datum) => typeof datum.value === 'number');
  const max = Math.max(...rows.map((datum) => Math.abs(datum.value ?? 0)), 0);

  if (rows.length === 0 || max === 0) {
    return <TableVisualization viz={viz} />;
  }

  return (
    <div className="mt-2 flex min-w-0 flex-col gap-2">
      {rows.slice(0, 6).map((datum) => {
        const value = datum.value ?? 0;
        const width = `${Math.max((Math.abs(value) / max) * 100, 6)}%`;
        return (
          <div key={datum.label} className="min-w-0">
            <div className="mb-1 flex min-w-0 items-center justify-between gap-2">
              <span className="min-w-0 truncate text-text-muted" title={datum.label}>
                {compactText(datum.label, 26)}
              </span>
              <span className="shrink-0 tabular text-text">
                {formatValue(value, viz.unit)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-alt">
              <div
                className={datum.is_baseline ? 'h-full rounded-full bg-divider' : 'h-full rounded-full bg-primary'}
                style={{ width }}
              />
            </div>
          </div>
        );
      })}
      {rows.length > 6 ? (
        <div className="text-text-subtle">외 {rows.length - 6}개 항목</div>
      ) : null}
    </div>
  );
}

function LineVisualization({ viz }: { viz: AgentVisualization }) {
  const rows = viz.data.filter((datum) => typeof datum.value === 'number');

  if (rows.length < 2) {
    return <BarVisualization viz={viz} />;
  }

  const values = rows.map((datum) => datum.value ?? 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 300;
  const height = 96;
  const points = rows.map((datum, idx) => {
    const x = 14 + (idx / (rows.length - 1)) * (width - 28);
    const y = 12 + ((max - (datum.value ?? 0)) / range) * (height - 28);
    return { x, y, datum };
  });
  const pointString = points.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <div className="mt-2 min-w-0">
      <div className="h-28 rounded-sm bg-surface-alt px-1 py-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" role="img" aria-label={viz.title}>
          <polyline
            points={pointString}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          />
          {points.map((point) => (
            <circle
              key={`${point.datum.label}-${point.x}`}
              cx={point.x}
              cy={point.y}
              r="3.5"
              className="fill-surface stroke-primary"
              strokeWidth="2"
            />
          ))}
        </svg>
      </div>
      <div className="mt-1 flex min-w-0 justify-between gap-2 text-[10px] text-text-subtle">
        <span className="min-w-0 truncate" title={rows[0]?.label}>
          {compactText(rows[0]?.label ?? '', 16)}
        </span>
        <span className="shrink-0 tabular text-text-muted">
          {formatValue(values[values.length - 1], viz.unit)}
        </span>
        <span className="min-w-0 truncate text-right" title={rows[rows.length - 1]?.label}>
          {compactText(rows[rows.length - 1]?.label ?? '', 16)}
        </span>
      </div>
    </div>
  );
}

function TableVisualization({ viz }: { viz: AgentVisualization }) {
  const rows = viz.data.slice(0, 6);

  if (rows.length === 0) {
    return <div className="mt-2 text-text-subtle">표시할 시각화 데이터가 없습니다.</div>;
  }

  return (
    <div className="mt-2 flex min-w-0 flex-col gap-1.5">
      {rows.map((datum) => (
        <div key={datum.label} className="min-w-0 rounded-sm bg-surface-alt px-2.5 py-2">
          <div className="min-w-0 font-semibold text-text" title={datum.label}>
            {compactText(datum.label, 34)}
          </div>
          {datum.columns ? (
            <div className="mt-1 grid min-w-0 grid-cols-1 gap-1 text-text-muted">
              {Object.entries(datum.columns).slice(0, 4).map(([key, value]) => (
                <div key={key} className="grid min-w-0 grid-cols-[72px_1fr] gap-2">
                  <span className="truncate text-text-subtle" title={key}>
                    {compactText(key, 10)}
                  </span>
                  <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                    {String(value ?? '-')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-1 text-text-muted">
              {datum.value != null ? formatValue(datum.value, viz.unit) : formatColumns(datum.columns)}
            </div>
          )}
        </div>
      ))}
      {viz.data.length > rows.length ? (
        <div className="text-text-subtle">외 {viz.data.length - rows.length}개 항목</div>
      ) : null}
    </div>
  );
}

function formatColumns(columns: AgentQueryResponse['visualizations'][number]['data'][number]['columns']) {
  if (!columns) return '';
  return Object.entries(columns)
    .slice(0, 2)
    .map(([key, value]) => `${key}: ${value ?? '-'}`)
    .join(' · ');
}

function normalizeVizType(type: string) {
  const normalized = type.toLowerCase();
  if (normalized === 'bar' || normalized === 'line' || normalized === 'table' || normalized === 'none') {
    return normalized;
  }
  return 'unknown';
}

function getVisualizationTypeLabel(type: ReturnType<typeof normalizeVizType>) {
  switch (type) {
    case 'bar':
      return '수치 비교';
    case 'line':
      return '추이';
    case 'table':
      return '목록';
    default:
      return '시각화';
  }
}

function formatValue(value: number, unit: string) {
  const formatted = value.toLocaleString('ko-KR', {
    maximumFractionDigits: 1,
  });
  return unit ? `${formatted} ${unit}` : formatted;
}

function compactText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  if (maxLength <= 6) return text.slice(0, maxLength);

  const headLength = Math.ceil((maxLength - 3) * 0.65);
  const tailLength = maxLength - 3 - headLength;
  return `${text.slice(0, headLength)}...${text.slice(-tailLength)}`;
}

function getAgentErrorMessage(err: unknown) {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | { error?: unknown; detail?: unknown }
      | undefined;

    if (typeof data?.error === 'string' && data.error.length > 0) {
      return data.error;
    }
    if (typeof data?.detail === 'string' && data.detail.length > 0) {
      return data.detail;
    }
    if (err.response?.status === undefined || err.response.status === 0) {
      return '백엔드 연결을 확인해주세요.';
    }
  }

  if (err instanceof Error && err.message.length > 0) {
    return err.message;
  }

  return '잠시 후 다시 시도해주세요.';
}
