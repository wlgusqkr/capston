// AiSidePanel — slide-in AI chat shell (Phase 0 mock).
//
// Fixed position, slides from the right. ESC to close.
// Mock behavior: echoes user message + canned AI reply after 500ms.

import { useCallback, useRef, useState } from 'react';

import { useAiPanel } from '@/contexts/AiPanelContext';
import { useEscapeKey } from '@/hooks/useEscapeKey';

interface Message {
  id: number;
  role: 'ai' | 'user';
  text: string;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEscapeKey(close, isOpen);

  const scrollToBottom = useCallback(() => {
    // Small delay so DOM updates before scroll
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }, []);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;

    const userMsg: Message = { id: nextId++, role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    scrollToBottom();

    // Mock AI reply after 500ms
    setTimeout(() => {
      const aiMsg: Message = {
        id: nextId++,
        role: 'ai',
        text: '아직 AI 기능을 준비 중이에요. 곧 답변 드릴게요!',
      };
      setMessages((prev) => [...prev, aiMsg]);
      scrollToBottom();
    }, 500);
  }, [input, scrollToBottom]);

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
      className={`fixed top-[var(--space-14)] right-0 bottom-0 w-[400px] bg-surface border-l border-divider z-[999] flex flex-col transition-transform duration-500 ${
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
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-card text-caption leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary text-surface'
                  : 'bg-surface-alt text-text'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
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
            placeholder="메시지를 입력하세요..."
            className="flex-1 h-10 bg-surface-alt border border-border rounded-pill px-4 text-caption text-text placeholder:text-text-subtle outline-none transition-colors duration-200 focus:border-focus-ring"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-surface shrink-0 transition-colors duration-200 hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="메시지 보내기"
          >
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
          </button>
        </div>
      </div>
    </aside>
  );
}
