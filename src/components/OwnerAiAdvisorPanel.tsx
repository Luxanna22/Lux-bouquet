import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, RotateCcw, ShieldCheck, X } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  cached?: boolean;
  snapshotHash?: string;
}

export interface GeminiAdvisorTriggerButtonProps {
  isOpen: boolean;
  onClick: () => void;
  isDarkMode: boolean;
  className?: string;
}

export interface OwnerAiAdvisorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  adminSessionToken: string;
  deviceTokenHash: string;
  isDarkMode: boolean;
  activeTabLabel?: string;
}

const STARTER_PROMPTS = [
  'Where is the biggest drop-off in the conversion funnel?',
  'Analyze PH (₱) vs INTL ($) buyer pricing & tier revenue.',
  'What happens to monthly revenue at 2,000 daily visitors?',
  'Which Couture features trigger the most upgrade views?',
];

const GeminiStarIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    className={className}
  >
    <path
      d="M12 2C12.35 7.45 16.55 11.65 22 12C16.55 12.35 12.35 16.55 12 22C11.65 16.55 7.45 12.35 2 12C7.45 11.65 11.65 7.45 12 2Z"
      fill="currentColor"
    />
  </svg>
);

export const GeminiAdvisorTriggerButton: React.FC<GeminiAdvisorTriggerButtonProps> = ({
  isOpen,
  onClick,
  isDarkMode,
  className = '',
}) => {
  const activeStyle = isDarkMode
    ? 'bg-[#E6B89C] text-[#231C18] border-[#E6B89C] hover:bg-[#F0C8AE]'
    : 'bg-[#6E4434] text-[#FFFDF9] border-[#6E4434] hover:bg-[#593527]';

  const idleStyle = isDarkMode
    ? 'bg-[#2B2321] text-[#FBF6F1] border-[#5E4E49] hover:border-[#E6B89C]/80 hover:bg-[#352C29]'
    : 'bg-[#FFFDF9] text-[#2A201D] border-[#DECBB9] hover:border-[#B4846C] hover:bg-[#FAF4EE]';

  const starTint = isOpen
    ? 'text-current'
    : isDarkMode
      ? 'text-[#E6B89C]'
      : 'text-[#B4846C]';

  return (
    <button
      type="button"
      data-testid="owner-ai-trigger-btn"
      aria-expanded={isOpen}
      aria-label={isOpen ? 'Close Analytics Advisor' : 'Open Analytics Advisor'}
      title={isOpen ? 'Close Analytics Advisor' : 'Open Analytics Advisor'}
      onClick={onClick}
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
      className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full border border-dashed text-xs font-medium transition-colors cursor-pointer shrink-0 ${
        isOpen ? activeStyle : idleStyle
      } ${className}`}
    >
      <GeminiStarIcon className={`w-3.5 h-3.5 shrink-0 transition-transform ${starTint}`} />
      <span className="hidden sm:inline">Advisor</span>
    </button>
  );
};

function renderInlineSegments(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={idx} className="font-mono text-[11px] px-1 py-0.5 rounded bg-current/10">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function renderAdvisorText(raw: string): React.ReactNode {
  const lines = raw.split('\n');
  return (
    <div className="space-y-1.5">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }
        if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
          const headingText = trimmed.replace(/^#{2,3}\s+/, '');
          return (
            <p
              key={idx}
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              className="text-[15px] font-semibold tracking-tight pt-1"
            >
              {renderInlineSegments(headingText)}
            </p>
          );
        }
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-0.5">
              <span aria-hidden="true" className="opacity-45 select-none leading-relaxed">
                ·
              </span>
              <span className="flex-1">{renderInlineSegments(trimmed.slice(2))}</span>
            </div>
          );
        }
        const numberedMatch = trimmed.match(/^(\d+\.)\s+(.*)$/);
        if (numberedMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-0.5">
              <span className="font-mono text-[11px] opacity-55 select-none pt-0.5 tabular-nums">
                {numberedMatch[1]}
              </span>
              <span className="flex-1">{renderInlineSegments(numberedMatch[2])}</span>
            </div>
          );
        }
        return <p key={idx}>{renderInlineSegments(trimmed)}</p>;
      })}
    </div>
  );
}

export const OwnerAiAdvisorPanel: React.FC<OwnerAiAdvisorPanelProps> = ({
  isOpen,
  onClose,
  adminSessionToken,
  deviceTokenHash,
  isDarkMode,
  activeTabLabel,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [questionInput, setQuestionInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastFailedRequest, setLastFailedRequest] = useState<{
    mode: 'overview' | 'question';
    text: string;
  } | null>(null);
  const [rateRemaining, setRateRemaining] = useState<number | null>(null);

  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Close drawer on Escape key when open
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Auto-scroll to newest message or loading indicator
  useEffect(() => {
    if (!isOpen) return;
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading, errorMsg, isOpen]);

  const surfaceClass = isDarkMode
    ? 'bg-[#352C29] text-[#FBF6F1] border-[#5E4E49]'
    : 'bg-[#FFFDF9] text-[#2A201D] border-[#DECBB9]';

  const recessedClass = isDarkMode
    ? 'bg-[#2B2321] border-[#5E4E49]'
    : 'bg-[#FAF4EE] border-[#DECBB9]';

  const mutedTextClass = isDarkMode ? 'text-[#D8C7BE]' : 'text-[#6E5D54]';

  const hairlineBorder = isDarkMode ? 'border-[#5E4E49]' : 'border-[#DECBB9]';

  const primaryBtnClass = isDarkMode
    ? 'bg-[#E6B89C] text-[#231C18] hover:bg-[#F0C8AE]'
    : 'bg-[#6E4434] text-[#FFFDF9] hover:bg-[#593527]';

  const subtleBtnClass = isDarkMode
    ? 'border-[#5E4E49] text-[#D8C7BE] hover:text-[#FBF6F1] hover:bg-[#2B2321]'
    : 'border-[#DECBB9] text-[#6E5D54] hover:text-[#2A201D] hover:bg-[#FAF4EE]';

  const inputClass = isDarkMode
    ? 'bg-[#2B2321] border-[#5E4E49] text-[#FBF6F1] placeholder:text-[#D8C7BE]/55 focus:border-[#E6B89C]'
    : 'bg-[#FAF4EE] border-[#DECBB9] text-[#2A201D] placeholder:text-[#6E5D54]/65 focus:border-[#6E4434]';

  const errorNoticeClass = isDarkMode
    ? 'bg-[#2B2321] border-[#B4846C]/60 text-[#E6B89C]'
    : 'bg-[#FAF4EE] border-[#B4846C]/70 text-[#6E4434]';

  const sendAiRequest = async (
    mode: 'overview' | 'question',
    text: string,
    isRetry = false
  ) => {
    if (!adminSessionToken || isLoading) return;
    if (mode === 'question' && !text.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);
    setLastFailedRequest(null);

    const displayUserPrompt =
      mode === 'overview'
        ? 'Generate executive analytics & revenue overview'
        : text.trim();

    const historySource =
      isRetry && messages[messages.length - 1]?.role === 'user'
        ? messages.slice(0, -1)
        : messages;
    const nextHistory = historySource.slice(-4).map((m) => ({
      role: m.role,
      text: m.text.slice(0, 400),
    }));

    if (!isRetry) {
      const userMessage: ChatMessage = {
        id: `u_${Date.now()}`,
        role: 'user',
        text: displayUserPrompt,
      };
      setMessages((prev) => [...prev, userMessage]);
    }
    if (mode === 'question') {
      setQuestionInput('');
    }

    try {
      const res = await fetch('/api/payments/verify-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'owner_analytics_ai',
          adminSessionToken,
          deviceTokenHash,
          mode,
          question: mode === 'question' ? text.trim().slice(0, 500) : '',
          history: nextHistory,
        }),
      });

      const rawText = await res.text();
      let data: {
        ok?: boolean;
        message?: string;
        answer?: string;
        cached?: boolean;
        snapshotHash?: string;
        rateRemaining?: number;
      } | null = null;

      if (rawText) {
        try {
          data = JSON.parse(rawText);
        } catch {
          data = null;
        }
      }

      if (!res.ok || !data?.ok) {
        setLastFailedRequest({ mode, text });
        if (data?.message) {
          setErrorMsg(data.message);
        } else if (!res.ok) {
          const isTimeoutCode = /FUNCTION_INVOCATION_TIMEOUT|504/i.test(rawText);
          const isInvocationFailed = /FUNCTION_INVOCATION_FAILED|BAD_GATEWAY/i.test(rawText);
          if (isTimeoutCode) {
            setErrorMsg('The server function timed out waiting for Gemini. Tap Retry to try again.');
          } else if (isInvocationFailed) {
            setErrorMsg(
              `Gateway returned HTTP ${res.status} (upstream function error). Redeploy or tap Retry in a moment.`
            );
          } else {
            const statusSuffix = res.statusText ? ` (${res.statusText})` : '';
            setErrorMsg(
              `Server returned HTTP ${res.status}${statusSuffix}. Please try again in a moment.`
            );
          }
        } else {
          setErrorMsg('The advisor could not complete this request right now.');
        }
        return;
      }

      if (typeof data.rateRemaining === 'number') {
        setRateRemaining(data.rateRemaining);
      }

      const assistantMsg: ChatMessage = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        text: data.answer || 'No summary was returned.',
        cached: Boolean(data.cached),
        snapshotHash: data.snapshotHash,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setLastFailedRequest({ mode, text });
      setErrorMsg('Could not reach the analytics endpoint. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendAiRequest('question', questionInput);
  };

  const handleClear = () => {
    if (isLoading) return;
    setMessages([]);
    setErrorMsg(null);
    setLastFailedRequest(null);
    inputRef.current?.focus();
  };

  return (
    <>
      {/* Mobile-only soft backdrop */}
      {isOpen && (
        <div
          aria-hidden="true"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-[#231C18]/35 backdrop-blur-[1px] md:hidden"
        />
      )}

      {/* Right-hand slide-out / docked Gemini-style sidebar (stays mounted when closed to preserve history) */}
      <aside
        aria-label="Analytics Advisor"
        aria-hidden={!isOpen}
        style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
        className={`${
          isOpen ? 'flex' : 'hidden'
        } fixed inset-y-0 right-0 z-40 md:static md:z-auto md:shrink-0 w-full sm:w-[390px] lg:w-[410px] h-full flex-col border-l border-dashed shadow-xl md:shadow-none ${surfaceClass}`}
      >
        {/* Compact Header */}
        <header
          className={`px-4 py-3 border-b border-dashed flex items-center justify-between gap-2 shrink-0 ${hairlineBorder}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <GeminiStarIcon
              className={`w-4 h-4 shrink-0 ${isDarkMode ? 'text-[#E6B89C]' : 'text-[#B4846C]'}`}
            />
            <div className="min-w-0">
              <h2
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                className="text-xl font-medium leading-none truncate"
              >
                Analytics Advisor
              </h2>
              {activeTabLabel && (
                <p className={`text-[11px] leading-tight mt-0.5 truncate ${mutedTextClass}`}>
                  Viewing {activeTabLabel}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              data-testid="owner-ai-overview-btn"
              type="button"
              disabled={isLoading}
              onClick={() => sendAiRequest('overview', '')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-45 transition-colors ${primaryBtnClass}`}
            >
              <GeminiStarIcon className="w-3 h-3 shrink-0" />
              <span>{isLoading ? 'Analyzing...' : 'Overview'}</span>
            </button>

            {messages.length > 0 && (
              <button
                type="button"
                disabled={isLoading}
                onClick={handleClear}
                aria-label="Clear conversation"
                title="Clear conversation"
                className={`px-2 py-1.5 rounded-lg border border-dashed text-[11px] inline-flex items-center gap-1 cursor-pointer disabled:opacity-45 transition-colors ${subtleBtnClass}`}
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Analytics Advisor"
              title="Close (Esc)"
              className={`p-1.5 rounded-lg border border-dashed cursor-pointer transition-colors ${subtleBtnClass}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Scrollable Conversation Thread */}
        <div
          data-testid="owner-ai-thread"
          className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col justify-center py-4 space-y-5">
              <div className="space-y-1.5">
                <div
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-full border border-dashed ${recessedClass}`}
                >
                  <GeminiStarIcon
                    className={`w-4 h-4 ${isDarkMode ? 'text-[#E6B89C]' : 'text-[#B4846C]'}`}
                  />
                </div>
                <p
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  className="text-2xl font-medium leading-snug"
                >
                  Ask about studio metrics, pricing, or conversion.
                </p>
                <p className={`text-xs leading-relaxed ${mutedTextClass}`}>
                  On-demand analysis from aggregated studio counts. Nothing runs until you ask.
                </p>
              </div>

              <div className="space-y-2">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={isLoading}
                    onClick={() => sendAiRequest('question', prompt)}
                    className={`w-full px-3 py-2.5 rounded-xl border border-dashed text-xs text-left leading-snug transition-colors cursor-pointer disabled:opacity-45 ${recessedClass} ${
                      isDarkMode
                        ? 'hover:border-[#E6B89C]/70 text-[#FBF6F1]'
                        : 'hover:border-[#B4846C] text-[#2A201D]'
                    }`}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col gap-1 ${
                  m.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                {m.role === 'user' ? (
                  <div
                    className={`max-w-[86%] rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${primaryBtnClass}`}
                  >
                    {m.text}
                  </div>
                ) : (
                  <div className="w-full flex items-start gap-2">
                    <div
                      className={`mt-1 w-5 h-5 rounded-full border border-dashed flex items-center justify-center shrink-0 ${recessedClass}`}
                    >
                      <GeminiStarIcon
                        className={`w-2.5 h-2.5 ${
                          isDarkMode ? 'text-[#E6B89C]' : 'text-[#B4846C]'
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div
                        className={`rounded-2xl rounded-tl-sm border border-dashed px-3.5 py-2.5 text-xs leading-relaxed ${recessedClass}`}
                      >
                        {renderAdvisorText(m.text)}
                      </div>
                      <div
                        className={`text-[10px] font-mono px-1 tabular-nums ${mutedTextClass} opacity-75`}
                      >
                        {m.cached ? '10m cache · 0 quota' : 'Fresh insight'}
                        {m.snapshotHash ? ` · #${m.snapshotHash}` : ''}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex items-center gap-2 px-1">
              <GeminiStarIcon
                className={`w-3.5 h-3.5 animate-pulse ${
                  isDarkMode ? 'text-[#E6B89C]' : 'text-[#B4846C]'
                }`}
              />
              <span className={`text-xs italic ${mutedTextClass}`}>
                Reviewing sanitized studio metrics...
              </span>
            </div>
          )}

          <div ref={threadEndRef} />
        </div>

        {/* Soft Warm Taupe Dashed Error Notice */}
        {errorMsg && (
          <div
            data-testid="owner-ai-error"
            role="status"
            className={`mx-4 mb-2.5 px-3 py-2 rounded-xl border border-dashed text-xs leading-relaxed flex items-start justify-between gap-2 shrink-0 ${errorNoticeClass}`}
          >
            <div className="flex-1 min-w-0 space-y-1.5">
              <p>{errorMsg}</p>
              {lastFailedRequest && (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() =>
                    sendAiRequest(lastFailedRequest.mode, lastFailedRequest.text, true)
                  }
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-dashed text-[11px] font-medium cursor-pointer disabled:opacity-45 transition-colors ${subtleBtnClass}`}
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Retry</span>
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setLastFailedRequest(null);
              }}
              aria-label="Dismiss notice"
              className="opacity-65 hover:opacity-100 cursor-pointer shrink-0 pt-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Composer + Subtle One-Line Privacy Footer */}
        <div
          className={`px-3.5 pt-3 pb-2.5 border-t border-dashed space-y-2 shrink-0 ${hairlineBorder}`}
        >
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              ref={inputRef}
              data-testid="owner-ai-input"
              type="text"
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              placeholder="Ask about funnel, pricing, or growth..."
              maxLength={500}
              aria-label="Ask AI Analytics Advisor"
              className={`flex-1 min-w-0 px-3 py-2 rounded-xl border border-dashed text-xs focus:outline-none transition-colors ${inputClass}`}
            />
            <button
              data-testid="owner-ai-send-btn"
              type="submit"
              disabled={isLoading || !questionInput.trim()}
              aria-label="Send analytics question"
              className={`w-8 h-8 rounded-xl inline-flex items-center justify-center cursor-pointer disabled:opacity-40 transition-colors shrink-0 ${primaryBtnClass}`}
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </form>

          <div
            data-testid="owner-ai-scope-banner"
            className={`flex items-center justify-between gap-2 text-[10px] leading-tight px-0.5 ${mutedTextClass} opacity-80`}
          >
            <span className="inline-flex items-center gap-1 min-w-0 truncate">
              <ShieldCheck className="w-3 h-3 shrink-0 text-[#5E8568] dark:text-[#8AB89A]" />
              <span className="truncate">
                Aggregated counts only · keys, PINs &amp; emails stay private
              </span>
            </span>
            <span className="font-mono shrink-0 tabular-nums">
              10m cache{rateRemaining !== null ? ` · ${rateRemaining}/6` : ''}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
