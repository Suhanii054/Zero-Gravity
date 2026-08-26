'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BrainCircuit, GitBranch, ScanSearch } from 'lucide-react';
import GlassPanel from '@/components/GlassPanel';
import { FeatureImportance, ModelKey, ResidualPoint } from '@/types/energy';
import { getExplanationTimeline, getFeatureImportance, getResidualPayload } from '@/utils/mock-energy';

export default function InterpretabilityPanel({
  model,
  featureImportance,
  residualData,
}: {
  model: ModelKey;
  featureImportance?: FeatureImportance[];
  residualData?: ResidualPoint[];
}) {
  const importance = useMemo(() => (featureImportance?.length ? featureImportance : getFeatureImportance(model)), [featureImportance, model]);
  const residuals = useMemo(() => (residualData?.length ? residualData : getResidualPayload(model)), [model, residualData]);
  const timeline = useMemo(() => getExplanationTimeline(model), [model]);

  return (
    <GlassPanel id="model-insights">
      <div className="mb-5 flex items-center gap-2 font-display text-sm font-black uppercase text-accent-cyan">
        <BrainCircuit className="h-4 w-4" />
        Interpretability Panel
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary">
            <GitBranch className="h-4 w-4 text-accent-green" />
            LightGBM feature importance
          </div>
          <div className="space-y-3">
            {importance.map((item, index) => (
              <motion.div
                key={`${item.feature}-${index}`}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.04 }}
              >
                <div className="mb-1 flex justify-between font-mono text-xs">
                  <span className="text-text-secondary">{item.feature}</span>
                  <span className="text-accent-cyan">{Math.round(item.importance * 100)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <motion.div
                    className="h-full rounded-full bg-adani-spectrum"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${item.importance * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: index * 0.05 }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-accent-cyan/20 bg-accent-cyan/10 p-3 text-xs leading-5 text-text-secondary">
            Feature weighting is sourced from the LightGBM importance endpoint and refreshed with the selected horizon.
          </div>
        </div>

        <div>
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary">
            <ScanSearch className="h-4 w-4 text-accent-yellow" />
            Residual plot data
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <ScatterChart data={residuals}>
              <CartesianGrid stroke="rgba(71,100,183,0.16)" strokeDasharray="3 3" />
              <XAxis dataKey="predicted" name="Predicted" tick={{ fill: '#667085', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
              <YAxis dataKey="residual" name="Residual" tick={{ fill: '#667085', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
              <ReferenceLine y={0} stroke="#AA337B" strokeDasharray="4 4" />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{
                  background: 'rgba(255,255,255,0.96)',
                  border: '1px solid rgba(71,100,183,0.25)',
                  borderRadius: 12,
                  color: '#111827',
                  fontFamily: 'JetBrains Mono',
                  fontSize: 11,
                }}
              />
              <Scatter dataKey="residual" fill="#0A78A7" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-4 font-display text-xs font-black uppercase text-accent-magenta">
          Prediction explanation timeline
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {timeline.map((step, index) => (
            <motion.div
              key={step.label}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: index * 0.06 }}
            >
              <div className="font-mono text-xs text-accent-cyan">0{index + 1}</div>
              <div className="mt-2 font-display text-xs font-bold uppercase text-text-primary">{step.label}</div>
              <p className="mt-2 text-xs leading-5 text-text-secondary">{step.detail}</p>
              <div className="mt-3 font-mono text-xs text-accent-green">{Math.round(step.confidence * 100)}% confidence</div>
            </motion.div>
          ))}
        </div>
      </div>
    </GlassPanel>
  );
}
