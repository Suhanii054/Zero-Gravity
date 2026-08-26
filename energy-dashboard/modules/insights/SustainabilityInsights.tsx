'use client';

import { motion } from 'framer-motion';
import { Clock3, Leaf, Lightbulb, Waves } from 'lucide-react';
import GlassPanel from '@/components/GlassPanel';
import { SustainabilityInsight } from '@/types/energy';

const icons = [Clock3, Waves, Leaf, Lightbulb];

const severity = {
  good: 'text-accent-green border-accent-green/25 bg-accent-green/10',
  watch: 'text-accent-yellow border-accent-yellow/25 bg-accent-yellow/10',
  optimize: 'text-accent-cyan border-accent-cyan/25 bg-accent-cyan/10',
};

export default function SustainabilityInsights({
  insights,
  loading,
}: {
  insights: SustainabilityInsight[];
  loading: boolean;
}) {
  if (loading && insights.length === 0) {
    return (
      <GlassPanel>
        <div className="mb-5">
          <div className="flex items-center gap-2 font-display text-sm font-black uppercase text-accent-green">
            <Leaf className="h-4 w-4" />
            Sustainability Insights
          </div>
          <p className="mt-2 text-sm text-text-secondary">
            Generated from prediction JSON: peak hours, high-load weekdays, monthly peaks, and optimization moves.
          </p>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel>
      <div className="mb-5">
        <div className="flex items-center gap-2 font-display text-sm font-black uppercase text-accent-green">
          <Leaf className="h-4 w-4" />
          Sustainability Insights
        </div>
        <p className="mt-2 text-sm text-text-secondary">
          Generated from prediction JSON: peak hours, high-load weekdays, monthly peaks, and optimization moves.
        </p>
      </div>
      <div className="space-y-3">
        {insights.map((insight, index) => {
          const Icon = icons[index % icons.length];
          return (
            <motion.article
              key={insight.id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
              initial={{ opacity: 0, x: 18 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: index * 0.06 }}
              whileHover={{ x: 4 }}
            >
              <div className="flex gap-4">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${severity[insight.severity]}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-display text-xs font-bold uppercase text-text-primary">
                      {insight.title}
                    </h3>
                    <span className="font-mono text-sm font-bold text-accent-green">{insight.value}</span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-text-secondary">{insight.description}</p>
                  <p className="mt-2 rounded-lg border border-accent-cyan/15 bg-accent-cyan/10 p-3 text-xs leading-5 text-accent-cyan">
                    {insight.recommendation}
                  </p>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>
    </GlassPanel>
  );
}
