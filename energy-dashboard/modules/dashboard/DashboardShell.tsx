'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, CheckCircle2, FileText, RefreshCw, Satellite, Settings, ShieldCheck, Zap } from 'lucide-react';
import AdaniWordmark from '@/components/AdaniWordmark';
import AnimatedEnergyBackground from '@/components/AnimatedEnergyBackground';
import GlassPanel from '@/components/GlassPanel';
import ForecastCharts from '@/modules/charts/ForecastCharts';
import SeasonalityCharts from '@/modules/charts/SeasonalityCharts';
import MetricsPanel from '@/modules/metrics/MetricsPanel';
import DashboardSidebar from '@/modules/dashboard/DashboardSidebar';
import DateRangePicker from '@/modules/dashboard/DateRangePicker';
import TimeAggregationSelector from '@/modules/dashboard/TimeAggregationSelector';
import FloatingChatbot from '@/modules/dashboard/FloatingChatbot';
import AnomalyPanel from '@/modules/anomalies/AnomalyPanel';
import SustainabilityInsights from '@/modules/insights/SustainabilityInsights';
import InterpretabilityPanel from '@/modules/insights/InterpretabilityPanel';
import LagInfluenceMap from '@/modules/insights/LagInfluenceMap';
import EnergyGridPanel from '@/modules/3d-scene/EnergyGridPanel';
import WhatIfSimulationPanel from '@/modules/simulation/WhatIfSimulationPanel';
import InsightsPanel from '@/modules/InsightsPanel';
import { ENERGY_MODELS, ModelKey } from '@/types/energy';
import { useEnergyStore } from '@/store/useEnergyStore';

function StatusToggle({
  icon: Icon,
  label,
  value,
  active,
  onClick,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-3 rounded-lg px-2 py-1 text-left transition hover:bg-slate-50">
      <Icon className="hidden h-4 w-4 text-accent-blue sm:block" />
      <div>
        <div className="text-sm font-black text-text-primary">{label}</div>
        <div className="text-sm text-text-primary">{value}</div>
      </div>
      <span className={`relative h-6 w-11 rounded-full border transition ${active ? 'border-accent-blue/20 bg-adani-spectrum' : 'border-slate-200 bg-slate-200'}`}>
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${active ? 'right-1' : 'left-1'}`} />
      </span>
    </button>
  );
}

export default function DashboardShell() {
  const didBoot = useRef(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const {
    selectedModel,
    selectedStartDate,
    selectedEndDate,
    selectedAggregation,
    lagInfluenceMode,
    telemetryEnabled,
    fallbackEnabled,
    predictionData,
    simulationData,
    metrics,
    anomalies,
    insights,
    lagInfluence,
    seasonality,
    featureImportance,
    residuals,
    loadingState,
    setDateRange,
    setAggregation,
    setLagInfluenceMode,
    setTelemetryEnabled,
    setFallbackEnabled,
    loadModel,
    runSimulation,
    refresh,
  } = useEnergyStore();

  useEffect(() => {
    if (!didBoot.current) {
      didBoot.current = true;
      void loadModel(selectedModel);
    }
  }, [loadModel, selectedModel]);

  useEffect(() => {
    if (!telemetryEnabled) return;
    const interval = window.setInterval(() => {
      void refresh();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [refresh, telemetryEnabled]);

  const loadIntensity = useMemo(() => {
    if (predictionData?.grid_state?.intensity) {
      return predictionData.grid_state.intensity;
    }
    if (!predictionData?.predicted.length) {
      return 0.55;
    }
    const latest = predictionData.predicted.slice(-24);
    const max = Math.max(...predictionData.predicted);
    const average = latest.reduce((sum, value) => sum + value, 0) / latest.length;
    return Math.min(1, Math.max(0.25, average / max));
  }, [predictionData]);

  const navigate = (id: string) => {
    setActiveSection(id);
    const target = document.getElementById(id);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleDateRangeChange = useCallback(
    (start: string, end: string) => {
      void setDateRange(start, end);
    },
    [setDateRange],
  );

  const handleAggregationChange = useCallback(
    (value: typeof selectedAggregation) => {
      void setAggregation(value);
    },
    [setAggregation],
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-bg-primary text-text-primary">
      <AnimatedEnergyBackground />
      <div className="relative z-10 flex min-h-screen w-full">
        <DashboardSidebar
          collapsed={sidebarCollapsed}
          active={activeSection}
          onToggle={() => setSidebarCollapsed((value) => !value)}
          onSelect={navigate}
        />
        <div className={`w-full max-w-none px-6 py-5 transition-[margin] duration-300 ${sidebarCollapsed ? 'lg:ml-[84px]' : 'lg:ml-[260px]'}`}>
          <motion.header
            id="overview"
            className="mb-6 flex flex-col gap-5 rounded-xl border border-slate-300/80 bg-white/95 p-4 shadow-card backdrop-blur-2xl xl:flex-row xl:items-center xl:justify-between"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            <div className="flex min-w-0 items-center gap-4">
              <Link href="/" className="shrink-0 rounded-lg px-1 py-2 transition hover:bg-slate-50" aria-label="Go to dashboard home">
                <AdaniWordmark className="text-[2.55rem]" />
              </Link>
              <div className="hidden h-14 w-px bg-slate-200 md:block" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-lg font-black uppercase tracking-normal text-text-primary sm:text-xl">
                    Adani AI Energy Dashboard
                  </h1>
                  <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[0.65rem] uppercase text-text-secondary">
                    API Linked
                  </span>
                </div>
                <p className="mt-1 text-sm text-text-secondary">
                  LightGBM live forecasting over the trained model and selected dataset range.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <StatusToggle icon={Satellite} label="Telemetry" value={telemetryEnabled ? 'Live' : 'Paused'} active={telemetryEnabled} onClick={() => setTelemetryEnabled(!telemetryEnabled)} />
              <StatusToggle icon={ShieldCheck} label="Source" value={fallbackEnabled ? 'Dataset Only' : 'Dataset Only'} active={!fallbackEnabled} onClick={() => void setFallbackEnabled(false)} />
              <label className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-text-secondary shadow-sm">
                <Activity className="h-4 w-4 text-accent-blue" />
                <span className="font-black text-text-primary">Model</span>
                <select
                  value={selectedModel}
                  onChange={(event) => void loadModel(event.target.value as ModelKey)}
                  className="bg-transparent font-mono text-xs text-text-primary outline-none"
                >
                  {ENERGY_MODELS.filter((model) => model.key === 'lightgbm').map((model) => (
                    <option key={model.key} value={model.key}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </label>
              <DateRangePicker startDate={selectedStartDate} endDate={selectedEndDate} onChange={handleDateRangeChange} />
              <TimeAggregationSelector value={selectedAggregation} onChange={handleAggregationChange} />
              <motion.button
                onClick={() => void refresh()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-adani-spectrum px-4 font-display text-sm font-bold text-white shadow-adani-glow transition hover:-translate-y-0.5"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                disabled={loadingState.isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${loadingState.isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </motion.button>
            </div>
          </motion.header>

          {loadingState.error && (
            <div className="mb-5 rounded-lg border border-accent-red/30 bg-accent-red/10 p-4 text-sm text-accent-red">
              {loadingState.error}
            </div>
          )}

          <section className="grid w-full gap-4 2xl:grid-cols-[360px_minmax(0,1fr)]">
            <div id="grid" className="space-y-4">
              <EnergyGridPanel intensity={loadIntensity} model={selectedModel} gridState={predictionData?.grid_state} />
              <div className="glass-panel rounded-xl p-4 sm:p-5">
                <div className="mb-7 flex items-center gap-2 font-display text-sm font-black uppercase text-text-primary">
                  <Zap className="h-4 w-4" />
                  Load Intensity
                </div>
                <div className="mb-4 text-right font-mono text-4xl font-black text-black">
                  {Math.round(loadIntensity * 100)}%
                </div>
                <div className="h-4 overflow-hidden rounded-full bg-slate-200">
                  <motion.div className="h-full rounded-full bg-adani-spectrum" initial={{ width: 0 }} animate={{ width: `${Math.round(loadIntensity * 100)}%` }} transition={{ duration: 0.8 }} />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div id="metrics">
                <MetricsPanel metrics={metrics} loading={loadingState.isLoading} />
              </div>
              <div id="forecast">
                <ForecastCharts data={predictionData} anomalies={anomalies} simulationData={simulationData} showSupplementary={false} loading={loadingState.isLoading} />
              </div>
            </div>
          </section>

          <section id="lag-map" className="mt-6">
            <LagInfluenceMap
              payload={lagInfluence ?? predictionData?.lag_influence_scores ?? null}
              mode={lagInfluenceMode}
              onModeChange={(mode) => void setLagInfluenceMode(mode)}
            />
          </section>

          <section className="mt-6">
            <SeasonalityCharts data={seasonality} />
          </section>

          <section id="anomalies" className="mt-6">
            <AnomalyPanel data={predictionData} anomalies={anomalies} />
          </section>

          <section id="what-if" className="mt-6">
            <WhatIfSimulationPanel data={simulationData} onRun={(scenario) => void runSimulation(scenario)} loading={loadingState.isLoading} />
          </section>

          <section id="insights" className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.9fr]">
            <div id="interpretability">
              <InterpretabilityPanel model={selectedModel} featureImportance={featureImportance} residualData={residuals} />
            </div>
            <SustainabilityInsights insights={insights} loading={loadingState.isLoading} />
          </section>

          <section id="operational-insights" className="mt-6">
            <InsightsPanel />
          </section>

          <section id="reports" className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <GlassPanel>
              <div className="mb-5 flex items-center gap-2 font-display text-sm font-black uppercase text-text-primary">
                <FileText className="h-4 w-4 text-accent-blue" />
                Reports
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                {[
                  ['Forecast points', predictionData?.timestamps.length ?? 0],
                  ['Detected anomalies', anomalies.length],
                  ['MAE', metrics ? `${metrics.mae} MW` : '--'],
                  ['Confidence', metrics ? `${metrics.confidence_score ?? metrics.accuracy}%` : '--'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-slate-200 bg-white/70 p-4">
                    <div className="font-mono text-[0.68rem] uppercase text-text-muted">{label}</div>
                    <div className="mt-2 font-display text-xl font-black text-text-primary">{value}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-accent-blue/20 bg-accent-blue/10 p-4 text-sm leading-6 text-text-secondary">
                Current report window spans <span className="font-mono text-text-primary">{selectedStartDate}</span> to{' '}
                <span className="font-mono text-text-primary">{selectedEndDate}</span> at{' '}
                <span className="font-mono text-text-primary">{selectedAggregation}</span> resolution.
              </div>
            </GlassPanel>

            <GlassPanel id="settings">
              <div className="mb-5 flex items-center gap-2 font-display text-sm font-black uppercase text-text-primary">
                <Settings className="h-4 w-4 text-accent-magenta" />
                Settings
              </div>
              <div className="space-y-3">
                {[
                  ['Backend API', fallbackEnabled ? 'Cached fallback' : 'FastAPI live'],
                  ['Telemetry loop', telemetryEnabled ? 'Enabled' : 'Paused'],
                  ['Model selector', ENERGY_MODELS.find((model) => model.key === selectedModel)?.label ?? selectedModel],
                  ['Forecast horizon', `${predictionData?.timestamps.length ?? 0} points`],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white/70 p-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
                      <CheckCircle2 className="h-4 w-4 text-accent-green" />
                      {label}
                    </div>
                    <div className="text-right font-mono text-xs text-text-secondary">{value}</div>
                  </div>
                ))}
              </div>
            </GlassPanel>
          </section>
        </div>
      </div>
      <FloatingChatbot />
    </main>
  );
}
