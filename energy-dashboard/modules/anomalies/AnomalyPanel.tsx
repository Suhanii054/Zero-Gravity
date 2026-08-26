'use client';

import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarClock,
  ShieldAlert,
} from 'lucide-react';
import GlassPanel from '@/components/GlassPanel';
import { AnomalyEvent, PredictionResponse } from '@/types/energy';

const severityStyles = {
  critical: {
    color: '#FF3D6B',
    bg: 'rgba(255,61,107,0.1)',
    border: 'rgba(255,61,107,0.35)',
  },
  warning: {
    color: '#F3B23C',
    bg: 'rgba(243,178,60,0.12)',
    border: 'rgba(243,178,60,0.35)',
  },
  low: {
    color: '#2D9E83',
    bg: 'rgba(45,212,167,0.12)',
    border: 'rgba(45,212,167,0.35)',
  },
};

function directionIcon(direction: AnomalyEvent['direction']) {
  if (direction === 'spike') return ArrowUpCircle;
  if (direction === 'drop') return ArrowDownCircle;
  return CalendarClock;
}

export default function AnomalyPanel({
  data,
  anomalies,
}: {
  data: PredictionResponse | null;
  anomalies: AnomalyEvent[];
}) {
  const totalPoints = data?.timestamps.length ?? 1;

  return (
    <GlassPanel>
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 font-display text-sm font-black uppercase text-accent-red">
            <ShieldAlert className="h-4 w-4" />
            Anomaly Detection Visualization
          </div>
          <p className="mt-2 text-sm text-text-secondary">
            Spikes, unexpected drops, and seasonal deviations are highlighted with red glow indicators.
          </p>
        </div>
        <div className="rounded-md border border-accent-red/25 bg-accent-red/10 px-3 py-1 font-mono text-xs text-accent-red">
          {anomalies.length} events from /api/anomalies
        </div>
      </div>

      <div className="relative mb-6 h-20 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="absolute left-4 right-4 top-1/2 h-px -translate-y-1/2 bg-adani-spectrum opacity-55" />
        {anomalies.map((anomaly, index) => {
          const style = severityStyles[anomaly.severity];
          const position = Math.min(95, Math.max(4, (anomaly.index / totalPoints) * 100));
          return (
            <motion.div
              key={anomaly.id}
              className="absolute top-1/2 -translate-y-1/2"
              style={{ left: `${position}%` }}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: [1, 1.25, 1] }}
              transition={{ delay: index * 0.1, duration: 1.6, repeat: Infinity, repeatDelay: 2.5 }}
              title={anomaly.explanation}
            >
              <span className="block h-4 w-4 rounded-full" style={{ background: style.color, boxShadow: `0 0 24px ${style.color}` }} />
            </motion.div>
          );
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {anomalies.map((anomaly, index) => {
          const style = severityStyles[anomaly.severity];
          const Icon = directionIcon(anomaly.direction);
          return (
            <motion.article
              key={anomaly.id}
              className="rounded-lg border p-4"
              style={{ borderColor: style.border, background: style.bg }}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.45, delay: index * 0.06 }}
              whileHover={{ y: -4, boxShadow: `0 0 32px ${style.color}22` }}
            >
              <div className="mb-3 flex items-center justify-between">
                <motion.div
                  className="rounded-lg border p-2"
                  style={{ borderColor: style.border, color: style.color }}
                  animate={{ rotate: anomaly.severity === 'critical' ? [0, -7, 7, 0] : 0 }}
                  transition={{ duration: 0.9, repeat: anomaly.severity === 'critical' ? Infinity : 0, repeatDelay: 2 }}
                >
                  <Icon className="h-4 w-4" />
                </motion.div>
                <AlertTriangle className="h-4 w-4" style={{ color: style.color }} />
              </div>
              <div className="font-display text-xs font-bold uppercase tracking-[0.18em]" style={{ color: style.color }}>
                {anomaly.type}
              </div>
              <div className="mt-2 font-mono text-xl font-bold text-text-primary">{anomaly.deviation.toFixed(1)}%</div>
              <p className="mt-2 text-xs leading-5 text-text-secondary">{anomaly.explanation}</p>
              <div className="mt-3 border-t border-slate-200 pt-3 font-mono text-[0.68rem] text-text-muted">
                Actual {anomaly.actual} MW / Forecast {anomaly.predicted} MW
              </div>
            </motion.article>
          );
        })}
      </div>
    </GlassPanel>
  );
}
