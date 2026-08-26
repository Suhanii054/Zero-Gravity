'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import GlassPanel from '@/components/GlassPanel';
import { AnomalyEvent, PredictionResponse } from '@/types/energy';

interface ChartRow {
  label: string;
  timestamp: string;
  actual: number;
  predicted: number;
  simulation?: number;
  residual: number;
  lower?: number;
  upper?: number;
  anomaly?: AnomalyEvent;
}

interface SelectedRange {
  start_timestamp: string;
  end_timestamp: string;
  selected_points: Array<{ ts: string; display: string; actual: number; predicted: number }>;
  summary: { avg_actual: number; avg_predicted: number; avg_error: number; point_count: number };
}

function formatLabel(timestamp: string, mode: 'short' | 'hour' = 'short') {
  const date = new Date(timestamp);
  if (mode === 'hour') {
    return new Intl.DateTimeFormat('en-US', { hour: '2-digit', hour12: false }).format(date);
  }
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', hour: '2-digit', hour12: false }).format(date);
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) {
    return null;
  }

  const row = payload[0]?.payload as ChartRow;
  return (
    <div className="custom-tooltip min-w-56 rounded-lg border border-accent-blue/25 bg-white/95 p-4 shadow-card backdrop-blur-xl">
      <div className="mb-2 font-mono text-xs text-text-muted">{label}</div>
      {payload.map((item: any) => (
        <div key={item.dataKey} className="flex items-center justify-between gap-5 font-mono text-xs">
          <span style={{ color: item.color }}>{item.name}</span>
          <strong className="text-text-primary">{Number(item.value).toFixed(1)} MW</strong>
        </div>
      ))}
      {row?.anomaly && (
        <div className="mt-3 rounded-xl border border-accent-red/25 bg-accent-red/10 p-3 text-xs text-accent-red">
          {row.anomaly.explanation}
        </div>
      )}
    </div>
  );
}

function aggregateByHour(rows: ChartRow[]) {
  return Array.from({ length: 24 }, (_, hour) => {
    const values = rows.filter((row) => new Date(row.timestamp).getHours() === hour);
    const predicted = values.length ? values.reduce((sum, row) => sum + row.predicted, 0) / values.length : 0;
    return {
      hour: `${String(hour).padStart(2, '0')}:00`,
      predicted: Number(predicted.toFixed(1)),
    };
  });
}

function aggregateByWeekday(rows: ChartRow[]) {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return names.map((day, dayIndex) => {
    const values = rows.filter((row) => new Date(row.timestamp).getDay() === dayIndex);
    const divisor = Math.max(values.length, 1);
    return {
      day,
      predicted: Number((values.reduce((sum, row) => sum + row.predicted, 0) / divisor).toFixed(1)),
      actual: Number((values.reduce((sum, row) => sum + row.actual, 0) / divisor).toFixed(1)),
    };
  });
}

function aggregateByMonth(rows: ChartRow[]) {
  const buckets = new Map<string, ChartRow[]>();
  rows.forEach((row) => {
    const label = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(row.timestamp));
    buckets.set(label, [...(buckets.get(label) ?? []), row]);
  });

  return Array.from(buckets.entries()).map(([month, values]) => ({
    month,
    actual: Number((values.reduce((sum, row) => sum + row.actual, 0) / values.length).toFixed(1)),
    predicted: Number((values.reduce((sum, row) => sum + row.predicted, 0) / values.length).toFixed(1)),
  }));
}

export default function ForecastCharts({
  data,
  anomalies,
  simulationData,
  showMain = true,
  showSupplementary = true,
  loading = false,
}: {
  data: PredictionResponse | null;
  anomalies: AnomalyEvent[];
  simulationData?: PredictionResponse | null;
  showMain?: boolean;
  showSupplementary?: boolean;
  loading?: boolean;
}) {
  const [refAreaLeft, setRefAreaLeft] = useState<string>('');
  const [refAreaRight, setRefAreaRight] = useState<string>('');
  const [isSelecting, setIsSelecting] = useState<boolean>(false);
  const [selectedRange, setSelectedRange] = useState<SelectedRange | null>(null);
  const [boxStart, setBoxStart] = useState<{ y: number } | null>(null);
  const [boxEnd, setBoxEnd] = useState<{ y: number } | null>(null);

  const rows = useMemo<ChartRow[]>(() => {
    if (!data) {
      return [];
    }
    const anomalyByIndex = new Map(anomalies.map((anomaly) => [anomaly.index, anomaly]));
    const simulationByTimestamp = new Map(
      simulationData?.timestamps.map((timestamp, index) => [timestamp, simulationData.predicted[index]]) ?? []
    );
    return data.timestamps.map((timestamp, index) => ({
      timestamp,
      label: formatLabel(timestamp),
      actual: data.actual[index],
      predicted: data.predicted[index],
      lower: data.lower_bound?.[index] ?? data.confidence_band?.lower[index],
      upper: data.upper_bound?.[index] ?? data.confidence_band?.upper[index],
      simulation: simulationByTimestamp.get(timestamp) ?? simulationData?.predicted[index],
      residual: Number((data.actual[index] - data.predicted[index]).toFixed(1)),
      anomaly: anomalyByIndex.get(index),
    }));
  }, [anomalies, data, simulationData]);

  const [visibleCount, setVisibleCount] = useState(900);
  const rangeKey = data ? `${data.timestamps[0] ?? 'empty'}:${data.timestamps[data.timestamps.length - 1] ?? 'empty'}:${data.resolution ?? data.aggregation ?? 'hourly'}` : 'empty';

  useEffect(() => {
    setVisibleCount(Math.min(900, rows.length));
    if (rows.length <= 900) return;
    let frame = 0;
    const grow = () => {
      setVisibleCount((count) => {
        const next = Math.min(rows.length, count + 1200);
        if (next < rows.length) {
          frame = window.requestAnimationFrame(grow);
        }
        return next;
      });
    };
    frame = window.requestAnimationFrame(grow);
    return () => window.cancelAnimationFrame(frame);
  }, [rangeKey, rows.length]);

  const mainRows = rows.slice(0, visibleCount);
  const hourlyRows = aggregateByHour(rows);
  const weeklyRows = aggregateByWeekday(rows);
  const monthlyRows = aggregateByMonth(rows);

  return (
    <div className={showMain && showSupplementary ? 'space-y-6' : ''}>
      {showMain && (
      <GlassPanel>
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-display text-sm font-black uppercase text-text-primary">
              Actual vs Predicted Energy Consumption
            </div>
            <div className="mt-1 font-mono text-xs text-text-muted">
              {rows.length ? `${rows.length.toLocaleString()} dataset points returned` : 'No data available for selected range'}
            </div>
          </div>
          <div className="flex gap-4 font-mono text-xs text-text-secondary">
            <span className="flex items-center gap-2"><span className="h-0.5 w-5 bg-accent-cyan" /> Actual</span>
            <span className="flex items-center gap-2"><span className="h-0.5 w-5 bg-accent-magenta" /> Predicted</span>
            {simulationData && <span className="flex items-center gap-2"><span className="h-0.5 w-5 bg-accent-purple" /> Simulation</span>}
          </div>
        </div>
        {loading && !rows.length ? (
          <div className="h-[318px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-5">
            <div className="mb-5 h-5 w-44 animate-pulse rounded bg-slate-200" />
            <div className="flex h-[250px] items-end gap-2">
              {Array.from({ length: 36 }, (_, index) => (
                <div
                  key={index}
                  className="flex-1 animate-pulse rounded-t bg-slate-200"
                  style={{ height: `${30 + ((index * 17) % 62)}%`, animationDelay: `${index * 18}ms` }}
                />
              ))}
            </div>
          </div>
        ) : !rows.length ? (
          <div className="flex h-[318px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 font-mono text-sm text-text-muted">
            No data available for selected range
          </div>
        ) : (
        <>
        <motion.div key={rangeKey} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <ResponsiveContainer width="100%" height={318}>
            <LineChart 
              data={mainRows}
              onMouseDown={(e: any) => {
                if (e?.activeLabel && e.chartY !== undefined) {
                  setRefAreaLeft(e.activeLabel);
                  setBoxStart({ y: e.chartY });
                  setBoxEnd({ y: e.chartY });
                  setIsSelecting(true);
                }
              }}
              onMouseMove={(e: any) => {
                if (isSelecting && e?.activeLabel && e.chartY !== undefined) {
                  setRefAreaRight(e.activeLabel);
                  setBoxEnd({ y: e.chartY });
                }
              }}
              onMouseUp={() => {
                if (refAreaLeft && refAreaRight && refAreaLeft !== refAreaRight) {
                  const startIdx = mainRows.findIndex((r) => r.label === refAreaLeft);
                  const endIdx = mainRows.findIndex((r) => r.label === refAreaRight);
                  if (startIdx !== -1 && endIdx !== -1) {
                    const [minIdx, maxIdx] = [Math.min(startIdx, endIdx), Math.max(startIdx, endIdx)];
                    const selectedPoints = mainRows.slice(minIdx, maxIdx + 1);
                    
                    const avg_actual = selectedPoints.reduce((sum, r) => sum + r.actual, 0) / selectedPoints.length;
                    const avg_predicted = selectedPoints.reduce((sum, r) => sum + r.predicted, 0) / selectedPoints.length;
                    const avg_error = avg_actual - avg_predicted;
                    
                    const range: SelectedRange = {
                      start_timestamp: selectedPoints[0].timestamp,
                      end_timestamp: selectedPoints[selectedPoints.length - 1].timestamp,
                      selected_points: selectedPoints.map(r => ({
                        ts: r.timestamp,
                        display: r.label,
                        actual: r.actual,
                        predicted: r.predicted
                      })),
                      summary: {
                        avg_actual: Number(avg_actual.toFixed(1)),
                        avg_predicted: Number(avg_predicted.toFixed(1)),
                        avg_error: Number(avg_error.toFixed(1)),
                        point_count: selectedPoints.length
                      }
                    };
                    setSelectedRange(range);
                  }
                } else {
                  setBoxStart(null);
                  setBoxEnd(null);
                }
                setIsSelecting(false);
                setRefAreaLeft('');
                setRefAreaRight('');
              }}
            >
              <defs>
                <linearGradient id="actualEnergy" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#0A78A7" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#0A78A7" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="predictedEnergy" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#AA337B" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#AA337B" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#C8CDD3" strokeDasharray="0" />
              <XAxis dataKey="label" minTickGap={28} tick={{ fill: '#111827', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={{ stroke: '#111827' }} tickLine={{ stroke: '#111827' }} />
              <YAxis tick={{ fill: '#111827', fontSize: 10, fontFamily: 'JetBrains Mono' }} unit=" MW" width={72} axisLine={{ stroke: '#111827' }} tickLine={{ stroke: '#111827' }} />
              <Tooltip content={<CustomTooltip />} />
              <Line isAnimationActive={false} connectNulls type="monotone" dataKey="actual" name="Actual" stroke="#0A78A7" strokeWidth={2.2} dot={false} />
              <Line isAnimationActive={false} connectNulls type="monotone" dataKey="predicted" name="Predicted" stroke="#AA337B" strokeWidth={2.2} dot={false} />
              {simulationData && (
                <Line
                  isAnimationActive={false}
                  connectNulls
                  type="monotone"
                  dataKey="simulation"
                  name="Simulation"
                  stroke="#7B55AD"
                  strokeWidth={2.2}
                  strokeDasharray="6 5"
                  dot={false}
                />
              )}
              {isSelecting && refAreaLeft && refAreaRight && boxStart && boxEnd && (
                <ReferenceArea 
                  x1={refAreaLeft} 
                  x2={refAreaRight} 
                  shape={(props: any) => {
                    const { x, width } = props;
                    if (x === undefined || width === undefined) return <g />;
                    const top = Math.min(boxStart.y, boxEnd.y);
                    const bottom = Math.max(boxStart.y, boxEnd.y);
                    const h = Math.max(bottom - top, 2);
                    return (
                      <rect 
                        x={x} y={top} width={width} height={h} 
                        fill="#6d28d9" fillOpacity={0.12} 
                        stroke="#6d28d9" strokeDasharray="4 4" strokeWidth={1}
                      />
                    );
                  }}
                />
              )}
              {!isSelecting && selectedRange && boxStart && boxEnd && (
                <ReferenceArea 
                  x1={selectedRange.selected_points[0].display} 
                  x2={selectedRange.selected_points[selectedRange.selected_points.length - 1].display} 
                  shape={(props: any) => {
                    const { x, width } = props;
                    if (x === undefined || width === undefined) return <g />;
                    const top = Math.min(boxStart.y, boxEnd.y);
                    const bottom = Math.max(boxStart.y, boxEnd.y);
                    const h = Math.max(bottom - top, 2);
                    return (
                      <rect 
                        x={x} y={top} width={width} height={h} 
                        fill="#6d28d9" fillOpacity={0.18} 
                        stroke="#7c3aed" strokeWidth={1.5} 
                      />
                    );
                  }}
                />
              )}
              <Brush
                dataKey="label"
                height={24}
                stroke="#7B55AD"
                fill="rgba(123,85,173,0.08)"
                onChange={(range: any) => {
                  if (typeof range?.startIndex !== 'number' || typeof range?.endIndex !== 'number') return;
                  const [minIdx, maxIdx] = [Math.min(range.startIndex, range.endIndex), Math.max(range.startIndex, range.endIndex)];
                  const selectedPoints = mainRows.slice(minIdx, maxIdx + 1);
                  if (!selectedPoints.length) return;
                  const avg_actual = selectedPoints.reduce((sum, row) => sum + row.actual, 0) / selectedPoints.length;
                  const avg_predicted = selectedPoints.reduce((sum, row) => sum + row.predicted, 0) / selectedPoints.length;
                  setSelectedRange({
                    start_timestamp: selectedPoints[0].timestamp,
                    end_timestamp: selectedPoints[selectedPoints.length - 1].timestamp,
                    selected_points: selectedPoints.map((row) => ({
                      ts: row.timestamp,
                      display: row.label,
                      actual: row.actual,
                      predicted: row.predicted,
                    })),
                    summary: {
                      avg_actual: Number(avg_actual.toFixed(1)),
                      avg_predicted: Number(avg_predicted.toFixed(1)),
                      avg_error: Number((avg_actual - avg_predicted).toFixed(1)),
                      point_count: selectedPoints.length,
                    },
                  });
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {selectedRange && (
          <div className="mt-4 flex flex-col gap-4 rounded-xl border border-accent-purple/20 bg-[#1A1A1A] p-4 text-sm md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-text-primary">
                {selectedRange.selected_points[0].display} <span className="text-text-muted">→</span> {selectedRange.selected_points[selectedRange.selected_points.length - 1].display}
              </span>
              <span className="text-xs text-text-secondary">
                {selectedRange.summary.point_count} points selected
              </span>
            </div>
            <div className="flex gap-6 font-mono text-sm">
              <div className="flex flex-col">
                <span className="text-xs text-text-secondary">Avg Actual</span>
                <span className="text-accent-cyan">{selectedRange.summary.avg_actual} MWh</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-text-secondary">Avg Predicted</span>
                <span className="text-accent-magenta">{selectedRange.summary.avg_predicted} MWh</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-text-secondary">Δ</span>
                <span className={selectedRange.summary.avg_predicted > selectedRange.summary.avg_actual ? "text-red-500" : "text-green-500"}>
                  {Math.abs(selectedRange.summary.avg_error).toFixed(1)} MWh
                  {selectedRange.summary.avg_predicted > selectedRange.summary.avg_actual ? ' (Over)' : ' (Under)'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                className="rounded-lg bg-[#7c3aed] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#6d28d9]"
                onClick={() => window.dispatchEvent(new CustomEvent('rangeSelected', { 
                  detail: { 
                    start_time: selectedRange.start_timestamp, 
                    end_time: selectedRange.end_timestamp 
                  } 
                }))}
              >
                Ask AI →
              </button>
              <button
                className="rounded-lg border border-text-secondary/30 px-4 py-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-white/5 hover:text-white"
                onClick={() => {
                  setSelectedRange(null);
                  setBoxStart(null);
                  setBoxEnd(null);
                }}
              >
                ✕ Clear
              </button>
            </div>
          </div>
        )}
        </>
        )}
      </GlassPanel>
      )}

      {showSupplementary && (
      <div className="grid gap-4 xl:grid-cols-3">
        <GlassPanel>
          <div className="mb-4 font-display text-xs font-black uppercase text-accent-cyan">
            Hourly Forecast Trend
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={hourlyRows}>
              <CartesianGrid stroke="rgba(71,100,183,0.16)" strokeDasharray="3 3" />
              <XAxis dataKey="hour" tick={{ fill: '#667085', fontSize: 9, fontFamily: 'JetBrains Mono' }} interval={3} />
              <YAxis tick={{ fill: '#667085', fontSize: 9, fontFamily: 'JetBrains Mono' }} width={50} />
              <Tooltip content={<CustomTooltip />} />
              <Line isAnimationActive={false} connectNulls type="monotone" dataKey="predicted" name="Predicted" stroke="#0A78A7" strokeWidth={2.5} dot={false} />
              <Brush dataKey="hour" height={22} stroke="#4764B7" fill="rgba(71,100,183,0.08)" />
            </LineChart>
          </ResponsiveContainer>
        </GlassPanel>

        <GlassPanel>
          <div className="mb-4 font-display text-xs font-black uppercase text-accent-magenta">
            Weekly Seasonal Trend
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={weeklyRows}>
              <CartesianGrid stroke="rgba(71,100,183,0.16)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#667085', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
              <YAxis tick={{ fill: '#667085', fontSize: 9, fontFamily: 'JetBrains Mono' }} width={50} />
              <Tooltip content={<CustomTooltip />} />
              <Bar isAnimationActive dataKey="actual" name="Actual" fill="#0A78A7" radius={[6, 6, 0, 0]} />
              <Bar isAnimationActive dataKey="predicted" name="Predicted" fill="#AA337B" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassPanel>

        <GlassPanel>
          <div className="mb-4 font-display text-xs font-black uppercase text-accent-purple">
            Monthly Comparison
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={monthlyRows}>
              <CartesianGrid stroke="rgba(71,100,183,0.16)" strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fill: '#667085', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
              <YAxis tick={{ fill: '#667085', fontSize: 9, fontFamily: 'JetBrains Mono' }} width={50} />
              <Tooltip content={<CustomTooltip />} />
              <Area isAnimationActive type="monotone" dataKey="actual" name="Actual" stroke="#7B55AD" fill="#7B55AD" fillOpacity={0.18} />
              <Area isAnimationActive type="monotone" dataKey="predicted" name="Predicted" stroke="#0A78A7" fill="#0A78A7" fillOpacity={0.12} />
            </AreaChart>
          </ResponsiveContainer>
        </GlassPanel>
      </div>
      )}
    </div>
  );
}
