export const MODEL_KEYS = ['lightgbm', 'arima', 'sarima', 'prophet', 'lstm', 'xgboost'] as const;

export type ModelKey = (typeof MODEL_KEYS)[number];
export type TimeAggregation = 'hourly' | 'daily' | 'weekly' | 'monthly';
export type LagInfluenceMode = 'live' | 'range';

export interface ModelOption {
  key: ModelKey;
  label: string;
  description: string;
  accent: string;
}

export const ENERGY_MODELS: ModelOption[] = [
  {
    key: 'lightgbm',
    label: 'LightGBM',
    description: 'Trained gradient boosting production forecaster',
    accent: '#AA337B',
  },
  {
    key: 'arima',
    label: 'ARIMA',
    description: 'Autoregressive statistical baseline',
    accent: '#0A78A7',
  },
  {
    key: 'sarima',
    label: 'SARIMA',
    description: 'Seasonality-aware grid profile model',
    accent: '#2DD4A7',
  },
  {
    key: 'prophet',
    label: 'Prophet',
    description: 'Calendar and trend decomposition',
    accent: '#F3B23C',
  },
  {
    key: 'lstm',
    label: 'LSTM',
    description: 'Sequence model for demand memory',
    accent: '#7B55AD',
  },
  {
    key: 'xgboost',
    label: 'XGBoost',
    description: 'Feature-rich gradient boosted inference',
    accent: '#AA337B',
  },
];

export type AnomalySeverity = 'critical' | 'warning' | 'low';
export type AnomalyDirection = 'spike' | 'drop' | 'seasonal-deviation';

export interface ModelMetrics {
  mae: number;
  rmse: number;
  mape: number;
  accuracy: number;
  confidence_score?: number;
  trend: {
    mae: number;
    rmse: number;
    mape: number;
  };
  updatedAt: string;
}

export interface AnomalyEvent {
  id: string;
  index: number;
  timestamp: string;
  type: string;
  severity: AnomalySeverity;
  direction: AnomalyDirection;
  actual: number;
  predicted: number;
  deviation: number;
  explanation: string;
}

export interface PredictionResponse {
  model: ModelKey;
  resolution?: TimeAggregation;
  aggregation?: TimeAggregation;
  timestamps: string[];
  actual: number[];
  predicted: number[];
  lower_bound?: number[];
  upper_bound?: number[];
  confidence_band?: {
    lower: number[];
    upper: number[];
  };
  lag_influence_scores?: LagInfluencePayload;
  grid_state?: EnergyGridState;
  anomalies?: AnomalyEvent[];
  metrics?: ModelMetrics;
}

export interface LagInfluenceScores {
  recent_lag: number;
  lag_24: number;
  lag_168: number;
  lag_336: number;
  older_history: number;
}

export interface LagInfluencePayload {
  mode: LagInfluenceMode;
  aggregation: TimeAggregation;
  start: string;
  end: string;
  scores: LagInfluenceScores;
  variance: LagInfluenceScores;
  sum: number;
}

export interface EnergyGridState {
  intensity: number;
  animation_speed: number;
  nodes: Array<{
    id: string;
    type: 'substation' | 'generator' | 'load_center';
    brightness: number;
    load_flow: number;
  }>;
}

export interface SeasonalityPayload {
  hourly: Array<{ hour: string; predicted: number }>;
  weekday: Array<{ day: string; actual: number; predicted: number }>;
  monthly: Array<{ month: number | string; actual: number; predicted: number }>;
}

export interface WhatIfScenario {
  temperature_delta: number;
  industrial_demand_delta: number;
  weekend_shift: boolean;
}

export interface SustainabilityInsight {
  id: string;
  title: string;
  value: string;
  description: string;
  recommendation: string;
  severity: 'good' | 'watch' | 'optimize';
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  impact: 'high' | 'medium' | 'low';
}

export interface ResidualPoint {
  timestamp: string;
  residual: number;
  predicted: number;
}

export interface ExplanationStep {
  label: string;
  detail: string;
  confidence: number;
}
