'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Activity, ArrowRight, BarChart3, BrainCircuit, Cpu, Gauge } from 'lucide-react';
import AdaniWordmark from '@/components/AdaniWordmark';
import AnimatedEnergyBackground from '@/components/AnimatedEnergyBackground';

const featureCards = [
  {
    icon: BrainCircuit,
    title: 'Model Inference API',
    detail: 'Switch ARIMA, SARIMA, Prophet, LSTM, and XGBoost without uploading a dataset.',
  },
  {
    icon: BarChart3,
    title: 'Animated Forecasts',
    detail: 'Actual vs predicted curves, zoomable trends, anomaly overlays, and seasonal summaries.',
  },
  {
    icon: Cpu,
    title: '3D Grid Telemetry',
    detail: 'React Three Fiber energy nodes pulse from forecast load intensity.',
  },
];

export default function HeroLanding() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-bg-primary text-text-primary">
      <AnimatedEnergyBackground />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <nav className="flex items-center justify-between">
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div>
              <AdaniWordmark className="text-[2.55rem]" />
              <div className="mt-1 font-mono text-[0.65rem] uppercase tracking-[0.24em] text-text-muted">
                EnergyAI Forecast OS
              </div>
            </div>
          </motion.div>
          <Link
            href="/dashboard"
            className="hidden rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-text-secondary transition hover:border-accent-cyan/40 hover:text-accent-cyan sm:inline-flex"
          >
            Launch Console
          </Link>
        </nav>

        <section className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <motion.div
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent-green/30 bg-accent-green/10 px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-accent-green"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Activity className="h-4 w-4" />
              Live Forecast Inference Ready
            </motion.div>
            <motion.h1
              className="max-w-4xl font-display text-5xl font-black uppercase leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.18 }}
            >
              Adani AI Energy Consumption Forecasting
            </motion.h1>
            <motion.p
              className="mt-6 max-w-2xl text-lg leading-8 text-text-secondary sm:text-xl"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.28 }}
            >
              A power-grid control center for model selection, prediction monitoring, anomaly detection,
              interpretability, and sustainability recommendations.
            </motion.p>
            <motion.div
              className="mt-9 flex flex-col gap-3 sm:flex-row"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.38 }}
            >
              <Link
                href="/dashboard"
                className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-adani-spectrum px-6 py-4 font-display text-sm font-black uppercase tracking-[0.18em] text-white shadow-adani-glow transition hover:-translate-y-0.5 hover:shadow-[0_0_52px_rgba(170,51,123,0.38)]"
              >
                Open Forecast Dashboard
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </Link>
              <Link
                href="/dashboard#model-insights"
                className="inline-flex items-center justify-center gap-3 rounded-2xl border border-accent-green/35 bg-accent-green/10 px-6 py-4 font-display text-sm font-bold uppercase tracking-[0.18em] text-accent-green transition hover:-translate-y-0.5 hover:bg-accent-green/15"
              >
                View Model Insights
              </Link>
              <Link
                href="/dashboard#analytics"
                className="inline-flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 font-display text-sm font-bold uppercase tracking-[0.18em] text-text-primary transition hover:-translate-y-0.5 hover:border-accent-cyan/35"
              >
                Energy Analytics
              </Link>
            </motion.div>
          </div>

          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.32 }}
          >
            <div className="glass-panel gradient-border rounded-[2rem] p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="font-display text-sm font-bold uppercase tracking-[0.2em] text-accent-cyan">
                    Forecast Core
                  </div>
                  <div className="mt-1 font-mono text-xs text-text-muted">/api/predict?model=lstm</div>
                </div>
                <div className="rounded-full border border-accent-green/30 bg-accent-green/10 px-3 py-1 font-mono text-xs text-accent-green">
                  ONLINE
                </div>
              </div>
              <div className="grid gap-3">
                {featureCards.map((card, index) => {
                  const Icon = card.icon;
                  return (
                    <motion.div
                      key={card.title}
                      className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"
                      initial={{ opacity: 0, x: 18 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.55, delay: 0.55 + index * 0.12 }}
                    >
                      <div className="flex gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-accent-cyan/25 bg-accent-cyan/10 text-accent-cyan">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-display text-sm font-bold uppercase tracking-[0.15em] text-text-primary">
                            {card.title}
                          </div>
                          <p className="mt-1 text-sm leading-6 text-text-secondary">{card.detail}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  ['MAE', '10.8'],
                  ['RMSE', '17.5'],
                  ['MAPE', '3.9%'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-bg-primary/50 p-4 text-center">
                    <div className="font-mono text-2xl font-bold text-accent-green">{value}</div>
                    <div className="mt-1 font-display text-[0.62rem] uppercase tracking-[0.2em] text-text-muted">{label}</div>
                  </div>
                ))}
              </div>
            </div>
            <Gauge className="absolute -right-4 -top-5 h-16 w-16 rotate-12 text-accent-cyan/40" />
          </motion.div>
        </section>
      </div>
    </main>
  );
}
