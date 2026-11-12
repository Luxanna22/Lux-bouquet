import React, { useState } from 'react';
import { Sparkles, Send, ShieldCheck } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  cached?: boolean;
  snapshotHash?: string;
}

interface OwnerAiAdvisorPanelProps {
  adminSessionToken: string;
  deviceTokenHash: string;
  isDarkMode: boolean;
}

const STARTER_PROMPTS = [
  'Where is the biggest drop-off in our conversion funnel?',
  'Analyze PH (₱) vs INTL ($) buyer pricing & tier revenue.',
  'What happens to monthly revenue at 2,000 daily visitors?',
  'Which Couture features trigger the most upgrade views?',
];

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
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span aria-hidden="true" className="opacity-50 select-none">
                ·
              </span>
              <span className="flex-1">{renderInlineSegments(trimmed.slice(2))}</span>
            </div>
          );
        }
        return <p key={idx}>{renderInlineSegments(trimmed)}</p>;
      })}
    </div>
  );
}

export const OwnerAiAdvisorPanel: React.FC<OwnerAiAdvisorPanelProps> = ({
  adminSessionToken,
  deviceTokenHash,
  isDarkMode,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [questionInput, setQuestionInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rateRemaining, setRateRemaining] = useState<number | null>(null);

  const panelClass = isDarkMode
    ? 'bg-[#352C29] border-[#5E4E49]/80'
    : 'bg-[#FFFDF9] border-[#DECBB9]';
  const hairlineBorder = isDarkMode ? 'border-[#5E4E49]/70' : 'border-[#DECBB9]/85';
  const inputClass = isDarkMode
    ? 'bg-[#2B2321] border-[#5E4E49] text-[#F5EBE6] placeholder:text-[#9A877B] focus:border-[#E6B89C]'
    : 'bg-[#FAF4EE] border-[#DECBB9] text-[#2C2523] placeholder:text-[#9A877B] focus:border-[#6E4434]';
  const primaryBtnClass = isDarkMode
    ? 'bg-[#E6B89C] text-[#231C18] hover:bg-[#F0C8AE]'
    : 'bg-[#6E4434] text-[#FFFDF9] hover:bg-[#593527]';

  const sendAiRequest = async (mode: 'overview' | 'question', text: string) => {
    if (!adminSessionToken || isLoading) return;
    if (mode === 'question' && !text.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);

    const displayUserPrompt =
      mode === 'overview'
        ? 'Generate executive analytics & revenue overview'
        : text.trim();

    const userMessage: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: displayUserPrompt,
    };

    const nextHistory = messages.slice(-4).map((m) => ({
      role: m.role,
      text: m.text.slice(0, 400),
    }));

    setMessages((prev) => [...prev, userMessage]);
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
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMsg(
          data.message || 'AI Advisor could not complete your request right now.'
        );
        return;
      }

      if (typeof data.rateRemaining === 'number') {
        setRateRemaining(data.rateRemaining);
      }

      const assistantMsg: ChatMessage = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        text: data.answer,
        cached: Boolean(data.cached),
        snapshotHash: data.snapshotHash,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setErrorMsg('Network error reaching the AI Analytics endpoint.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendAiRequest('question', questionInput);
  };

  return (
    <div className="space-y-5 animate-[fadeIn_180ms_ease-out]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
            className="text-2xl sm:text-3xl font-normal"
          >
            Analytics Advisor
          </h1>
          <p className="text-xs opacity-65">
            On-demand executive analysis powered by server-side Gemini. Runs only when requested.
          </p>
        </div>

        <button
          data-testid="owner-ai-overview-btn"
          type="button"
          disabled={isLoading}
          onClick={() => sendAiRequest('overview', '')}
          className={`px-4 py-2 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 self-start sm:self-auto ${primaryBtnClass}`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isLoading ? 'Analyzing...' : 'Generate Overview'}</span>
        </button>
      </div>

      {/* Strict Privacy & Quota Efficiency Scope Banner */}
      <div
        data-testid="owner-ai-scope-banner"
        className={`rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${panelClass}`}
      >
        <div className="flex items-start sm:items-center gap-2 opacity-80">
          <ShieldCheck className="w-4 h-4 shrink-0 text-[#5A7F64] dark:text-[#8AB89A] mt-0.5 sm:mt-0" />
          <span>
            Strict context allowlist: aggregated counts, currency totals & style popularity only.
            Pass keys, PINs, emails & device IDs never leave the server.
          </span>
        </div>
        <span className="font-mono text-[11px] opacity-60 shrink-0 tabular-nums">
          5m snapshot cache{rateRemaining !== null ? ` · ${rateRemaining}/10 live calls left` : ''}
        </span>
      </div>

      {/* Main Advisor Surface */}
      <section className={`rounded-xl border overflow-hidden flex flex-col ${panelClass}`}>
        {/* Starter Prompts */}
        <div className={`p-4 border-b ${hairlineBorder} flex flex-wrap gap-2`}>
          {STARTER_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={isLoading}
              onClick={() => sendAiRequest('question', prompt)}
              className={`px-3 py-1.5 rounded-lg border text-xs text-left transition-colors cursor-pointer disabled:opacity-50 ${hairlineBorder} hover:bg-current/5`}
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Conversation Thread */}
        <div
          data-testid="owner-ai-thread"
          className="p-4 sm:p-5 space-y-4 min-h-[260px] max-h-[440px] overflow-y-auto"
        >
          {messages.length === 0 ? (
            <div className="py-10 text-center space-y-2 max-w-md mx-auto">
              <p
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
                className="text-lg italic opacity-70"
              >
                Click “Generate Overview” or ask a question about revenue, funnel conversion, or buyer scaling.
              </p>
              <p className="text-xs opacity-50">
                No background API calls fire on page load — zero idle quota usage.
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col gap-1 ${
                  m.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[90%] rounded-xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                    m.role === 'user'
                      ? `${primaryBtnClass} whitespace-pre-wrap`
                      : `border ${hairlineBorder} ${
                          isDarkMode ? 'bg-[#2B2321]/75' : 'bg-[#FAF4EE]/80'
                        }`
                  }`}
                >
                  {m.role === 'assistant' ? renderAdvisorText(m.text) : m.text}
                </div>
                {m.role === 'assistant' && (
                  <div className="text-[11px] opacity-50 font-mono px-1 tabular-nums">
                    {m.cached ? 'Served from 5m cache · 0 quota used' : 'Fresh snapshot insight'}
                    {m.snapshotHash ? ` · #${m.snapshotHash}` : ''}
                  </div>
                )}
              </div>
            ))
          )}

          {isLoading && (
            <div className="text-xs italic opacity-60 px-1">
              Reviewing sanitized studio metrics...
            </div>
          )}
        </div>

        {errorMsg && (
          <div
            data-testid="owner-ai-error"
            className="mx-4 mb-3 px-3.5 py-2.5 rounded-lg border border-rose-500/35 bg-rose-500/10 text-xs text-rose-700 dark:text-rose-300"
          >
            {errorMsg}
          </div>
        )}

        {/* Chat Input */}
        <form
          onSubmit={handleSubmit}
          className={`p-3.5 border-t ${hairlineBorder} flex items-center gap-2`}
        >
          <input
            data-testid="owner-ai-input"
            type="text"
            value={questionInput}
            onChange={(e) => setQuestionInput(e.target.value)}
            placeholder="Ask about conversion bottlenecks, PH/INTL pricing, or revenue projections..."
            maxLength={500}
            aria-label="Ask AI Analytics Advisor"
            className={`flex-1 min-w-0 px-3.5 py-2 rounded-lg border text-xs focus:outline-none ${inputClass}`}
          />
          <button
            data-testid="owner-ai-send-btn"
            type="submit"
            disabled={isLoading || !questionInput.trim()}
            aria-label="Send analytics question"
            className={`px-3.5 py-2 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-45 shrink-0 ${primaryBtnClass}`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Ask</span>
          </button>
        </form>
      </section>
    </div>
  );
};
