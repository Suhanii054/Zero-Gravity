'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownRight, Gauge, Sigma, Target, TrendingDown } from 'lucide-react';
import GlassPanel from '@/components/GlassPanel';
import { ModelMetrics } from '@/types/energy';

function AnimatedMetric({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let frame = 0;
    let animationFrame = 0;
    const totalFrames = 36;
    const tick = () => {
      frame += 1;
      const progress = 1 - (1 - frame / totalFrames) ** 3;
      setDisplay(value * progress);
      if (frame < totalFrames) {
        animationFrame = requestAnimationFrame(tick);
      }
    };
    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [value]);

  return (
    <span className="font-mono text-3xl font-black text-black">
      {display.toFixed(value >= 10 ? 1 : 2)}
      {suffix}
    </span>
  );
}

export default function MetricsPanel({ metrics, loading }: { metrics: ModelMetrics | null; loading: boolean }) {
  const cards = [
    {
      label: 'MAE',
      value: metrics?.mae ?? 0,
      suffix: ' MW',
      trend: metrics?.trend.mae ?? 0,
      icon: Target,
      color: '#0A78A7',
      detail: 'Mean absolute error',
    },
    {
      label: 'RMSE',
      value: metrics?.rmse ?? 0,
      suffix: ' MW',
      trend: metrics?.trend.rmse ?? 0,
      icon: Sigma,
      color: '#7B55AD',
      detail: 'Root mean squared error',
    },
    {
      label: 'MAPE',
      value: metrics?.mape ?? 0,
      suffix: '%',
      trend: metrics?.trend.mape ?? 0,
      icon: Gauge,
      color: '#AA337B',
      detail: 'Mean absolute percent error',
    },
  ];

  return (
    <GlassPanel>
      <div className="mb-4 flex items-center justify-between">
        <div className="font-display text-sm font-black uppercase text-text-primary">Model Performance Metrics</div>
        <div className="hidden rounded-md bg-slate-100 px-3 py-1 font-mono text-xs text-text-secondary sm:block">
          Accuracy {metrics?.accuracy.toFixed(1) ?? '--'}%
        </div>
      </div>
      <div className="grid gap-0 md:grid-cols-3">
        {cards.map((card, index) => {
          const Icon = card.icon;
          const trendImproved = card.trend <= 0;
          return (
            <motion.div
              key={card.label}
              className={`relative overflow-hidden px-2 py-1 md:px-6 ${index > 0 ? 'border-t border-slate-200 md:border-l md:border-t-0' : ''}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              whileHover={{ y: -2 }}
            >
              <div className="mb-2 flex items-center gap-2">
                <div className="font-display text-sm font-medium uppercase text-text-primary">{card.label}</div>
                <div className="rounded-md p-1.5 text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #0A78A7, #7B55AD, #AA337B)' }}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              {loading ? (
                <div className="h-9 w-28 animate-pulse rounded-lg bg-slate-100" />
              ) : (
                <AnimatedMetric value={card.value} suffix={card.suffix} />
              )}
              <div className="mt-2 flex items-center gap-1.5 font-mono text-xs">
                {trendImproved ? (
                  <TrendingDown className="h-3.5 w-3.5 text-emerald-700" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5 rotate-180 text-accent-red" />
                )}
                <span className={trendImproved ? 'text-emerald-700' : 'text-accent-red'}>
                  {card.trend > 0 ? '+' : ''}
                  {Math.abs(card.trend).toFixed(2)}%
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </GlassPanel>
  );
}
