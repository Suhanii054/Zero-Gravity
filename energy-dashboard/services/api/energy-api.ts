'use client';

import {
  AnomalyEvent,
  FeatureImportance,
  LagInfluencePayload,
  ModelKey,
  ModelMetrics,
  PredictionResponse,
  ResidualPoint,
  SeasonalityPayload,
  SustainabilityInsight,
  TimeAggregation,
  WhatIfScenario,
} from '@/types/energy';

interface QueryOptions {
  datetime?: string;
  startDate?: string;
  endDate?: string;
  aggregation?: TimeAggregation;
  telemetryEnabled?: boolean;
  fallbackEnabled?: boolean;
  horizon?: number;
}

const lagInfluenceCache = new Map<string, LagInfluencePayload>();
const responseCache = new Map<string, { expiresAt: number; promise: Promise<unknown> }>();
const STALE_TIME_MS = 5 * 60 * 1000;

function makeQuery(model: ModelKey, options: QueryOptions = {}) {
  const params = new URLSearchParams({ model });
  if (options.datetime) params.set('datetime', options.datetime);
  if (options.startDate) params.set('start_date', options.startDate);
  if (options.endDate) params.set('end_date', options.endDate);
  if (options.aggregation) params.set('resolution', options.aggregation);
  if (options.horizon) params.set('horizon', String(options.horizon));
  return params.toString();
}

async function getJson<T>(path: string): Promise<T> {
  const cached = responseCache.get(path);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.promise as Promise<T>;
  }

  const promise = (async () => {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }
    return (await response.json()) as T;
  })();
  responseCache.set(path, { expiresAt: now + STALE_TIME_MS, promise });
  promise.catch(() => responseCache.delete(path));
  return promise;
}

export function fetchPrediction(model: ModelKey, options?: QueryOptions) {
  return getJson<PredictionResponse>(`/api/predict?${makeQuery(model, options)}`);
}

export function fetchMetrics(model: ModelKey, options?: QueryOptions) {
  return getJson<ModelMetrics>(`/api/metrics?${makeQuery(model, options)}`);
}

export function fetchAnomalies(model: ModelKey, options?: QueryOptions) {
  return getJson<AnomalyEvent[]>(`/api/anomalies?${makeQuery(model, options)}`);
}

export function fetchInsights(model: ModelKey, options?: QueryOptions) {
  return getJson<SustainabilityInsight[]>(`/api/insights?${makeQuery(model, options)}`);
}

export function fetchLagInfluence(model: ModelKey, options?: QueryOptions) {
  const query = makeQuery(model, options);
  const cacheKey = `${options?.startDate ?? 'live'}:${options?.endDate ?? 'live'}:${options?.aggregation ?? 'hourly'}:${options?.datetime ?? ''}`;
  const cached = lagInfluenceCache.get(cacheKey);
  if (cached) {
    return Promise.resolve(cached);
  }
  return getJson<LagInfluencePayload>(`/api/lag-influence?${query}`).then((payload) => {
    lagInfluenceCache.set(cacheKey, payload);
    return payload;
  });
}

export function fetchSeasonality(model: ModelKey, options?: QueryOptions) {
  return getJson<SeasonalityPayload>(`/api/seasonality?${makeQuery(model, options)}`);
}

export function fetchFeatureImportance(model: ModelKey, options?: QueryOptions) {
  return getJson<FeatureImportance[]>(`/api/feature-importance?${makeQuery(model, options)}`);
}

export function fetchResiduals(model: ModelKey, options?: QueryOptions) {
  return getJson<ResidualPoint[]>(`/api/residuals?${makeQuery(model, options)}`);
}

export async function runWhatIf(model: ModelKey, datetime: string | undefined, scenario: WhatIfScenario) {
  const response = await fetch('/api/what-if', {
    method: 'POST',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      datetime,
      model,
      temperature_delta: scenario.temperature_delta,
      industrial_demand_delta: scenario.industrial_demand_delta,
      weekend_shift: scenario.weekend_shift,
    }),
  });
  if (!response.ok) {
    throw new Error('What-if simulation backend unavailable.');
  }
  return (await response.json()) as PredictionResponse;
}
