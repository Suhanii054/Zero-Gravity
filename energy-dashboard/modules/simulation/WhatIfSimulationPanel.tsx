'use client';

import { useState } from 'react';
import { Wand2 } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import GlassPanel from '@/components/GlassPanel';
import { PredictionResponse, WhatIfScenario } from '@/types/energy';

export default function WhatIfSimulationPanel({
  data,
  onRun,
  loading,
}: {
  data: PredictionResponse | null;
  onRun: (scenario: WhatIfScenario) => void;
  loading: boolean;
}) {
  const [scenario, setScenario] = useState<WhatIfScenario>({
    temperature_delta: 3,
    industrial_demand_delta: 10,
    weekend_shift: false,
  });

  const rows = data?.timestamps.map((timestamp, index) => ({
    label: new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
    predicted: data.predicted[index],
  })) ?? [];

  return (
    <GlassPanel id="what-if">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 font-display text-sm font-black uppercase text-text-primary">
          <Wand2 className="h-4 w-4 text-accent-magenta" />
          What-if Simulation
        </div>
        <button
          type="button"
          onClick={() => onRun(scenario)}
          disabled={loading}
          className="h-10 rounded-lg bg-adani-spectrum px-4 text-sm font-bold text-white shadow-adani-glow disabled:opacity-60"
        >
          Run Scenario
        </button>
      </div>
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <label className="block text-sm font-bold text-text-primary">
            Temperature +{scenario.temperature_delta}C
            <input
              type="range"
              min="0"
              max="8"
              value={scenario.temperature_delta}
              onChange={(event) => setScenario({ ...scenario, temperature_delta: Number(event.target.value) })}
              className="mt-2 w-full accent-purple-700"
            />
          </label>
          <label className="block text-sm font-bold text-text-primary">
            Industrial demand +{scenario.industrial_demand_delta}%
            <input
              type="range"
              min="0"
              max="30"
              value={scenario.industrial_demand_delta}
              onChange={(event) => setScenario({ ...scenario, industrial_demand_delta: Number(event.target.value) })}
              className="mt-2 w-full accent-purple-700"
            />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-text-primary">
            Weekend shift scenario
            <input
              type="checkbox"
              checked={scenario.weekend_shift}
              onChange={(event) => setScenario({ ...scenario, weekend_shift: event.target.checked })}
              className="h-5 w-5 accent-purple-700"
            />
          </label>
        </div>
        <ResponsiveContainer width="100%" height={230}>
          <LineChart data={rows}>
            <XAxis dataKey="label" tick={{ fill: '#667085', fontSize: 10 }} minTickGap={24} />
            <YAxis tick={{ fill: '#667085', fontSize: 10 }} width={70} />
            <Tooltip />
            <Line isAnimationActive={false} dataKey="predicted" stroke="#AA337B" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </GlassPanel>
  );
}
