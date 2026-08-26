'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, SendHorizontal } from 'lucide-react';
import GlassPanel from '@/components/GlassPanel';
import { useUIStateSnapshot } from '@/hooks/useUIStateSnapshot';

type AssistantMode = 1 | 2 | 3;

interface Message {
  role: 'user' | 'ai';
  text: string;
  featureSummary?: Record<string, any>;
}

interface RangeSelection {
  start_time: string;
  end_time: string;
}

const initialByMode: Record<AssistantMode, Message[]> = {
  1: [{ role: 'ai', text: 'Ask about the current graph view and I will use the dashboard state to explain it.' }],
  2: [{ role: 'ai', text: 'Ask for a forecast or operational readout and I will use the existing forecasting assistant.' }],
  3: [{ role: 'ai', text: 'Select a region on the forecast chart, click Ask AI, then ask why that selected range behaves that way.' }],
};

function renderMessageText(text: string) {
  return text.split('\n').map((line, index) => (
    <span key={`${line}-${index}`}>
      {line}
      {index < text.split('\n').length - 1 && <br />}
    </span>
  ));
}

function formatRange(value: string) {
  if (!value) return '--';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

function FeatureCards({ summary }: { summary?: Record<string, any> }) {
  if (!summary) return null;
  const cards = [
    ['Mean', summary.consumption?.mean_mwh ? `${summary.consumption.mean_mwh} MWh` : '--'],
    ['MAPE', summary.model?.mape_pct !== undefined ? `${summary.model.mape_pct}%` : '--'],
    ['Trend', summary.trend?.direction ?? '--'],
  ];
  return (
    <div className="mb-3 grid grid-cols-3 gap-2">
      {cards.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
          <div className="text-[0.65rem] font-bold uppercase text-text-muted">{label}</div>
          <div className="truncate font-mono text-xs text-text-primary">{value}</div>
        </div>
      ))}
    </div>
  );
}

export default function AiAssistantPanel({
  compact = false,
  initialMode = 2,
  initialRange = null,
}: {
  compact?: boolean;
  initialMode?: AssistantMode;
  initialRange?: RangeSelection | null;
}) {
  const uiState = useUIStateSnapshot();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [messagesByMode, setMessagesByMode] = useState<Record<AssistantMode, Message[]>>(initialByMode);
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<AssistantMode>(initialMode);
  const [rangeSelection, setRangeSelection] = useState<RangeSelection | null>(null);

  const messages = messagesByMode[activeMode] || [];
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (initialRange?.start_time && initialRange?.end_time) {
      setRangeSelection(initialRange);
      setActiveMode(3);
    }
  }, [initialRange]);

  useEffect(() => {
    const handleRangeSelected = (event: Event) => {
      const detail = (event as CustomEvent<RangeSelection>).detail;
      if (!detail?.start_time || !detail?.end_time) return;
      setRangeSelection({ start_time: detail.start_time, end_time: detail.end_time });
      setActiveMode(3);
    };
    window.addEventListener('rangeSelected', handleRangeSelected);
    return () => window.removeEventListener('rangeSelected', handleRangeSelected);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  const appendMessage = (message: Message) => {
    setMessagesByMode((current) => ({
      ...current,
      [activeMode]: [...(current[activeMode] ?? []), message],
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const question = draft.trim();
    if (!question || isLoading) return;

    appendMessage({ role: 'user', text: question });
    setDraft('');
    setIsLoading(true);

    try {
      const isRangeMode = activeMode === 3;
      if (isRangeMode && !rangeSelection) {
        throw new Error('Select a chart range first, then click Ask AI.');
      }

      const endpoint = isRangeMode ? '/api/range-chat' : '/api/chat';
      const body = isRangeMode
        ? {
          start_time: rangeSelection?.start_time,
          end_time: rangeSelection?.end_time,
          user_query: question,
        }
        : {
          query: question,
          mode: 'FORECAST',
          ui_state: uiState,
        };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || data.error || 'AI backend request failed.');
      }

      const data = await response.json();
      appendMessage({
        role: 'ai',
        text: data.insight ?? data.label ?? 'The assistant returned no explanation.',
        featureSummary: data.feature_summary,
      });
    } catch (error) {
      appendMessage({
        role: 'ai',
        text: error instanceof Error ? error.message : 'Unable to connect to the AI backend.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GlassPanel className={`flex flex-col ${compact ? 'min-h-[430px]' : 'min-h-[528px]'}`}>
      <div className="mb-4 flex items-center gap-2 font-display text-sm font-black uppercase text-text-primary">
        <Bot className="h-4 w-4 text-accent-magenta" />
        AI Energy Assistant
      </div>

      <div className="mb-4 flex rounded-lg bg-slate-100 p-1 text-xs font-bold text-text-secondary">
        {[
          [1, 'Explain Graph'],
          [2, 'Predict Future'],
          [3, 'Explain w/ Graph'],
        ].map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            onClick={() => setActiveMode(mode as AssistantMode)}
            className={`flex-1 rounded-md px-2 py-1.5 transition ${activeMode === mode ? 'bg-white text-text-primary shadow-sm' : 'hover:bg-slate-200/50'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

        {activeMode === 3 && (
          <div className="mb-4 rounded-lg border border-accent-purple/20 bg-slate-50 px-3 py-2 font-mono text-xs text-text-secondary">
            <span className="font-bold text-text-primary">Selected range:</span>{' '}
            {rangeSelection ? `${formatRange(rangeSelection.start_time)} to ${formatRange(rangeSelection.end_time)}` : 'No chart range selected'}
          </div>
        )}

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-2 pb-2">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={message.role === 'user' ? 'text-right' : 'text-left'}>
              <div className="mb-2 text-sm font-bold text-text-primary">{message.role === 'user' ? 'User' : 'AI'}</div>
              {message.role === 'ai' && <FeatureCards summary={message.featureSummary} />}
              <div
                className={
                  message.role === 'user'
                    ? 'ml-auto max-w-[82%] rounded-lg bg-adani-spectrum px-4 py-3 text-left text-sm leading-5 text-white shadow-adani-glow'
                    : 'max-w-[94%] rounded-lg bg-slate-100 px-4 py-3 text-sm leading-6 text-text-primary shadow-sm'
                }
              >
                {message.role === 'ai' ? renderMessageText(message.text) : message.text}
              </div>
            </div>
          ))}
          {isLoading && <div className="text-sm text-text-muted">Thinking through the selected features...</div>}
          <div ref={messagesEndRef} />
        </div>

        <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/20"
            placeholder={activeMode === 3 ? 'Ask about the selected range...' : 'Ask AI Assistant...'}
          />
          <button
            type="submit"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-adani-spectrum px-4 text-sm font-bold text-white shadow-adani-glow transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading || !draft.trim()}
          >
            <SendHorizontal className="h-4 w-4" />
          </button>
        </form>
    </GlassPanel>
  );
}
