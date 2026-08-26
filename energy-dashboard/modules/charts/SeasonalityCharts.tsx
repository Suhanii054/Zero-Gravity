'use client';

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import GlassPanel from '@/components/GlassPanel';
import { SeasonalityPayload } from '@/types/energy';

export default function SeasonalityCharts({ data }: { data: SeasonalityPayload | null }) {
  return (
    <GlassPanel>
      <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="font-display text-sm font-black uppercase text-text-primary">Seasonality Intelligence</div>
        <div className="font-mono text-xs text-text-muted">Hourly, weekly, and monthly load signatures</div>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white/70 p-4">
        <div className="mb-4 font-display text-xs font-black uppercase text-accent-cyan">Hourly Forecast Trend</div>
        <ResponsiveContainer width="100%" height={230}>
          <LineChart data={data?.hourly ?? []}>
            <CartesianGrid stroke="rgba(71,100,183,0.16)" strokeDasharray="3 3" />
            <XAxis dataKey="hour" tick={{ fill: '#667085', fontSize: 9 }} interval={3} />
            <YAxis tick={{ fill: '#667085', fontSize: 9 }} width={50} />
            <Tooltip />
            <Line isAnimationActive={false} type="monotone" dataKey="predicted" stroke="#0A78A7" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white/70 p-4">
        <div className="mb-4 font-display text-xs font-black uppercase text-accent-magenta">Weekly Seasonal Trend</div>
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={data?.weekday ?? []}>
            <CartesianGrid stroke="rgba(71,100,183,0.16)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: '#667085', fontSize: 10 }} />
            <YAxis tick={{ fill: '#667085', fontSize: 9 }} width={50} />
            <Tooltip />
            <Bar dataKey="actual" fill="#0A78A7" radius={[6, 6, 0, 0]} />
            <Bar dataKey="predicted" fill="#AA337B" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white/70 p-4">
        <div className="mb-4 font-display text-xs font-black uppercase text-accent-purple">Monthly Comparison</div>
        <ResponsiveContainer width="100%" height={230}>
          <AreaChart data={data?.monthly ?? []}>
            <CartesianGrid stroke="rgba(71,100,183,0.16)" strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fill: '#667085', fontSize: 10 }} />
            <YAxis tick={{ fill: '#667085', fontSize: 9 }} width={50} />
            <Tooltip />
            <Area isAnimationActive={false} type="monotone" dataKey="actual" stroke="#7B55AD" fill="#7B55AD" fillOpacity={0.18} />
            <Area isAnimationActive={false} type="monotone" dataKey="predicted" stroke="#0A78A7" fill="#0A78A7" fillOpacity={0.12} />
          </AreaChart>
        </ResponsiveContainer>
        </div>
      </div>
    </GlassPanel>
  );
}
