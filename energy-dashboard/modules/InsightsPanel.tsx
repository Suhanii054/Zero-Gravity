'use client';

import { useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, AlertTriangle, Zap, DollarSign, Shield, Users, RefreshCw } from 'lucide-react';
import GlassPanel from '@/components/GlassPanel';
import { useEnergyStore } from '@/store/useEnergyStore';

interface InsightCard {
  category: 'demand_response' | 'revenue' | 'grid_stability' | 'customer_advisory';
  title: string;
  reasoning: string;
  action: string;
  impact_score: number;
}

interface PatternsData {
  peak_hour: number;
  peak_mwh: number;
  valley_hour: number;
  valley_mwh: number;
  avg_mwh: number;
  off_peak_hours: number[];
  max_ramp_hour: number;
  max_ramp_delta: number;
  trend_direction: string;
  trend_slope_mwh_per_hour: number;
  anomaly_risk_hours: number[];
  total_hours: number;
  season?: string;
  day_type?: string;
  demand_profile?: string;
  off_peak_opportunity?: boolean;
  anomaly_severity?: string;
  business_context_note?: string;
}

interface InsightsData {
  patterns: PatternsData;
  insights: InsightCard[];
}

const TABS = ['All', 'Demand Response', 'Revenue', 'Grid Stability', 'Customer Advisory'] as const;
type Tab = typeof TABS[number];

const CATEGORY_MAP: Record<string, Tab> = {
  demand_response: 'Demand Response',
  revenue: 'Revenue',
  grid_stability: 'Grid Stability',
  customer_advisory: 'Customer Advisory',
};

const CATEGORY_STYLES: Record<string, { badge: string; border: string; icon: React.ElementType }> = {
  demand_response: { badge: 'bg-blue-100 text-blue-800 border-blue-300', border: 'border-l-blue-500', icon: Zap },
  revenue:         { badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', border: 'border-l-emerald-500', icon: DollarSign },
  grid_stability:  { badge: 'bg-red-100 text-red-800 border-red-300', border: 'border-l-red-500', icon: Shield },
  customer_advisory: { badge: 'bg-purple-100 text-purple-800 border-purple-300', border: 'border-l-purple-500', icon: Users },
};

export default function InsightsPanel() {
  const { selectedStartDate, selectedEndDate, selectedAggregation } = useEnergyStore();
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('All');

  const generateInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedStartDate) params.append('start', selectedStartDate);
      if (selectedEndDate) params.append('end', selectedEndDate);
      params.append('resolution', selectedAggregation || 'hourly');

      const res = await fetch(`/api/operational_insights?${params.toString()}`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e: any) {
      setError(e.message || 'Failed to generate insights');
    } finally {
      setLoading(false);
    }
  };

  const filteredInsights = data?.insights?.filter((card) => {
    if (activeTab === 'All') return true;
    return CATEGORY_MAP[card.category] === activeTab;
  }) ?? [];

  return (
    <GlassPanel>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-accent-blue to-accent-purple shadow-md">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-sm font-black uppercase tracking-wider text-text-primary">
              Operational Insights
            </h2>
            <p className="text-xs text-text-muted">
              Multi-agent AI analysis · {selectedStartDate} → {selectedEndDate}
            </p>
          </div>
        </div>
        <button
          onClick={generateInsights}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-adani-spectrum px-5 py-2.5 text-sm font-bold text-white shadow-adani-glow transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Generating…' : 'Generate Insights'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          ⚠ {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {!loading && data && (
        <>
          {/* Summary stat tiles */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile
              label="Peak Hour"
              value={`${String(data.patterns.peak_hour).padStart(2, '0')}:00`}
              sub={`${data.patterns.peak_mwh} MWh`}
              color="blue"
            />
            <StatTile
              label="Valley Window"
              value={`${String(data.patterns.valley_hour).padStart(2, '0')}:00`}
              sub={`${data.patterns.valley_mwh} MWh`}
              color="emerald"
            />
            <StatTile
              label="Trend"
              value={data.patterns.trend_direction === 'rising' ? '↑ Rising' : '↓ Falling'}
              sub={`${data.patterns.trend_slope_mwh_per_hour} MWh/hr`}
              color={data.patterns.trend_direction === 'rising' ? 'amber' : 'emerald'}
              icon={data.patterns.trend_direction === 'rising' ? TrendingUp : TrendingDown}
            />
            <StatTile
              label="Anomaly Risk"
              value={`${data.patterns.anomaly_risk_hours?.length ?? 0} hrs`}
              sub={data.patterns.anomaly_severity ? `Severity: ${data.patterns.anomaly_severity}` : 'At-risk hours'}
              color={data.patterns.anomaly_risk_hours?.length > 0 ? 'red' : 'emerald'}
              icon={AlertTriangle}
            />
          </div>

          {/* Business context note */}
          {data.patterns.business_context_note && (
            <div className="mb-5 rounded-lg border border-accent-blue/20 bg-accent-blue/5 px-4 py-3 text-sm text-text-secondary">
              💡 <span className="font-medium text-text-primary">{data.patterns.business_context_note}</span>
              {data.patterns.season && (
                <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs capitalize text-text-muted">
                  {data.patterns.season} · {data.patterns.day_type} · {data.patterns.demand_profile}
                </span>
              )}
            </div>
          )}

          {/* Tab bar */}
          <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  activeTab === tab
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab}
                {tab !== 'All' && (
                  <span className="ml-1.5 opacity-60">
                    ({data.insights.filter((c) => CATEGORY_MAP[c.category] === tab).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Insight cards */}
          {filteredInsights.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-text-muted">
              No insights for this category.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredInsights.map((card, i) => {
                const style = CATEGORY_STYLES[card.category] ?? CATEGORY_STYLES.demand_response;
                const Icon = style.icon;
                return (
                  <div
                    key={i}
                    className={`rounded-xl border border-slate-200 bg-white/80 p-5 shadow-sm transition hover:shadow-md border-l-4 ${style.border}`}
                  >
                    {/* Top row */}
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${style.badge}`}>
                        <Icon className="h-3 w-3" />
                        {CATEGORY_MAP[card.category] ?? card.category}
                      </span>
                      {/* Impact score dots */}
                      <div className="flex items-center gap-1" title={`Impact: ${card.impact_score}/5`}>
                        {[1, 2, 3, 4, 5].map((dot) => (
                          <div
                            key={dot}
                            className={`h-2 w-2 rounded-full transition ${dot <= card.impact_score ? 'bg-slate-700' : 'bg-slate-200'}`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="mb-2 text-[14px] font-semibold leading-snug text-text-primary">
                      {card.title}
                    </h3>

                    {/* Reasoning */}
                    <p className="mb-4 text-[13px] leading-relaxed text-text-secondary">
                      {card.reasoning}
                    </p>

                    {/* Recommended action */}
                    <div className="rounded-r-lg border-l-2 border-accent-blue bg-blue-50/60 py-2 pl-3 pr-2">
                      <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-blue">
                        Recommended Action
                      </div>
                      <div className="text-[13px] font-medium text-text-primary">{card.action}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!loading && !data && !error && (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 shadow-inner">
            <BarChart3 className="h-8 w-8 text-slate-400" />
          </div>
          <div>
            <p className="font-semibold text-text-primary">No insights yet</p>
            <p className="mt-1 text-sm text-text-muted">
              Click <span className="font-bold">Generate Insights</span> to run the AI pipeline for the selected date range.
            </p>
          </div>
        </div>
      )}
    </GlassPanel>
  );
}

function StatTile({
  label,
  value,
  sub,
  color,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  color: 'blue' | 'emerald' | 'amber' | 'red';
  icon?: React.ElementType;
}) {
  const colorMap = {
    blue:    'bg-blue-50 border-blue-100 text-blue-700',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    amber:   'bg-amber-50 border-amber-100 text-amber-700',
    red:     'bg-red-50 border-red-100 text-red-700',
  };
  return (
    <div className={`rounded-xl border p-3 ${colorMap[color]}`}>
      <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider opacity-70">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </div>
      <div className="font-mono text-lg font-bold leading-tight">{value}</div>
      <div className="mt-0.5 text-[11px] opacity-70">{sub}</div>
    </div>
  );
}
