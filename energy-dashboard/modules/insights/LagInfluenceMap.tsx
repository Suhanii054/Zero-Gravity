'use client';

import { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { GitBranch } from 'lucide-react';
import GlassPanel from '@/components/GlassPanel';
import { LagInfluenceMode, LagInfluencePayload, LagInfluenceScores } from '@/types/energy';

const labels: Array<{ key: keyof LagInfluenceScores; label: string; detail: string; tooltip: string }> = [
  {
    key: 'recent_lag',
    label: 'Recent Lag',
    detail: 'lag_1 / lag_2 / lag_3',
    tooltip: 'Represents short-term consumption persistence',
  },
  {
    key: 'lag_24',
    label: 'Lag 24',
    detail: 'same hour yesterday',
    tooltip: 'Represents same-hour consumption yesterday',
  },
  {
    key: 'lag_168',
    label: 'Lag 168',
    detail: 'same hour last week',
    tooltip: 'Represents same-hour consumption last week',
  },
  {
    key: 'lag_336',
    label: 'Lag 336',
    detail: 'two-week memory',
    tooltip: 'Represents same-hour consumption two weeks ago',
  },
  {
    key: 'older_history',
    label: 'Older History',
    detail: 'rolling and trend memory',
    tooltip: 'Represents long-term seasonal memory',
  },
];

function AnimatedPercent({ value }: { value: number }) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (latest) => `${Math.round(latest)}%`);
  const [display, setDisplay] = useState('0%');

  useEffect(() => {
    const unsubscribe = rounded.on('change', setDisplay);
    const controls = animate(motionValue, value * 100, { duration: 0.6, ease: 'easeOut' });
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [motionValue, rounded, value]);

  return <span>{display}</span>;
}

export default function LagInfluenceMap({
  payload,
  mode,
  onModeChange,
}: {
  payload: LagInfluencePayload | null;
  mode: LagInfluenceMode;
  onModeChange: (mode: LagInfluenceMode) => void;
}) {
  const scores = payload?.scores;
  const variance = payload?.variance;

  return (
    <GlassPanel>
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 font-display text-sm font-black uppercase text-text-primary">
            <GitBranch className="h-4 w-4 text-accent-magenta" />
            Live Lag Influence Map
          </div>
          <div className="mt-1 font-mono text-xs text-text-muted">
            {payload ? `${payload.mode.toUpperCase()} | ${payload.aggregation.toUpperCase()} | ${payload.start} to ${payload.end}` : 'Waiting for lag influence data'}
          </div>
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          {(['live', 'range'] as LagInfluenceMode[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onModeChange(option)}
              className={`h-9 rounded-md px-4 text-xs font-black uppercase transition ${
                mode === option ? 'bg-adani-spectrum text-white shadow-adani-glow' : 'text-text-secondary hover:bg-slate-50'
              }`}
            >
              {option === 'live' ? 'Live Mode' : 'Range Mode'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-5">
        {labels.map((item, index) => {
          const score = scores?.[item.key] ?? 0;
          const band = variance?.[item.key] ?? 0;
          return (
            <motion.div
              key={item.key}
              className="group relative rounded-lg border border-slate-200 bg-slate-50 p-3"
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
              title={item.tooltip}
            >
              <div className="pointer-events-none absolute left-3 right-3 top-3 z-20 rounded-md border border-slate-200 bg-white/95 p-2 text-xs leading-5 text-text-secondary opacity-0 shadow-card transition group-hover:opacity-100">
                {item.tooltip}
              </div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-black text-text-primary">{item.label}</div>
                  <div className="text-xs text-text-muted">{item.detail}</div>
                </div>
                <div className="text-right font-mono text-sm font-black text-accent-magenta">
                  <AnimatedPercent value={score} />
                  <div className="text-[0.65rem] text-text-muted">± {Math.round(band * 100)}%</div>
                </div>
              </div>
              <div className="h-28 overflow-hidden rounded-md bg-white">
                <div className="flex h-full items-end px-4 pb-3">
                  <motion.div
                    className="w-full rounded-t-md bg-adani-spectrum shadow-adani-glow"
                    initial={{ height: '8%', opacity: 0.45 }}
                    animate={{ height: `${Math.max(8, score * 100)}%`, opacity: 1 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </GlassPanel>
  );
}
