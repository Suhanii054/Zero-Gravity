'use client';

import { startTransition } from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit, DatabaseZap } from 'lucide-react';
import GlassPanel from '@/components/GlassPanel';
import { ENERGY_MODELS, ModelKey } from '@/types/energy';
import { useEnergyStore } from '@/store/useEnergyStore';

export default function ModelSelectionPanel() {
  const { selectedModel, loadModel, loadingState } = useEnergyStore();

  const handleSelect = (model: ModelKey) => {
    startTransition(() => {
      void loadModel(model);
    });
  };

  return (
    <GlassPanel>
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-[0.2em] text-accent-cyan">
            <BrainCircuit className="h-4 w-4" />
            Model Selection
          </div>
          <p className="mt-2 text-sm text-text-secondary">
            Switching a model triggers <span className="font-mono text-accent-green">/api/predict?model=lstm</span>-style inference calls.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-2 font-mono text-xs text-text-muted">
          <DatabaseZap className="h-4 w-4 text-accent-green" />
          Saved model artifacts, no UI upload
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {ENERGY_MODELS.map((model, index) => {
          const isActive = selectedModel === model.key;
          return (
            <motion.button
              key={model.key}
              onClick={() => handleSelect(model.key)}
              className="group relative overflow-hidden rounded-2xl border p-4 text-left transition"
              style={{
                borderColor: isActive ? `${model.accent}75` : 'rgba(255,255,255,0.1)',
                background: isActive ? `${model.accent}16` : 'rgba(255,255,255,0.035)',
              }}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: index * 0.06 }}
              whileHover={{ y: -4, boxShadow: `0 0 32px ${model.accent}22` }}
              whileTap={{ scale: 0.98 }}
              disabled={loadingState.isLoading && isActive}
            >
              <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${model.accent}, transparent)` }} />
              <div className="font-display text-lg font-black uppercase tracking-[0.16em]" style={{ color: model.accent }}>
                {model.label}
              </div>
              <p className="mt-2 min-h-12 text-xs leading-5 text-text-secondary">{model.description}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-text-muted">
                  {isActive ? 'Selected' : 'Standby'}
                </span>
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: isActive ? model.accent : 'rgba(123,158,192,0.35)', boxShadow: isActive ? `0 0 18px ${model.accent}` : 'none' }}
                />
              </div>
            </motion.button>
          );
        })}
      </div>
    </GlassPanel>
  );
}
