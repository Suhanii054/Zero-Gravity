import {
  AnomalyDirection,
  AnomalyEvent,
  ENERGY_MODELS,
  ExplanationStep,
  FeatureImportance,
  ModelKey,
  ModelMetrics,
  MODEL_KEYS,
  PredictionResponse,
  ResidualPoint,
  SustainabilityInsight,
} from '@/types/energy';

const HOUR = 60 * 60 * 1000;
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const MODEL_PROFILES: Record<ModelKey, { seed: number; noise: number; bias: number; lag: number }> = {
  lightgbm: { seed: 113, noise: 8, bias: -0.5, lag: 0.025 },
  arima: { seed: 19, noise: 24, bias: 8, lag: 0.12 },
  sarima: { seed: 37, noise: 18, bias: 4.5, lag: 0.08 },
  prophet: { seed: 53, noise: 20, bias: -3, lag: 0.06 },
  lstm: { seed: 71, noise: 13, bias: 1.5, lag: 0.04 },
  xgboost: { seed: 97, noise: 10, bias: -1, lag: 0.03 },
};

const ANOMALY_BLUEPRINTS: Array<{
  offsetFromEnd: number;
  type: string;
  direction: AnomalyDirection;
  severity: AnomalyEvent['severity'];
  delta: number;
  explanation: string;
}> = [
  {
    offsetFromEnd: 985,
    type: 'Industrial Spike',
    direction: 'spike',
    severity: 'critical',
    delta: 118,
    explanation: 'Unexpected industrial feeder load exceeded the model envelope during a weekday ramp.',
  },
  {
    offsetFromEnd: 721,
    type: 'Overnight Drop',
    direction: 'drop',
    severity: 'warning',
    delta: -96,
    explanation: 'Consumption fell sharply below baseline, consistent with sensor dropout or upstream curtailment.',
  },
  {
    offsetFromEnd: 496,
    type: 'Seasonal Drift',
    direction: 'seasonal-deviation',
    severity: 'low',
    delta: 64,
    explanation: 'The weekly seasonal curve shifted above recent weekends, likely weather or event driven.',
  },
  {
    offsetFromEnd: 214,
    type: 'Peak Compression',
    direction: 'spike',
    severity: 'critical',
    delta: 132,
    explanation: 'Evening demand compressed into a narrow peak window and breached normal ramp limits.',
  },
  {
    offsetFromEnd: 42,
    type: 'Unexpected Valley',
    direction: 'drop',
    severity: 'warning',
    delta: -74,
    explanation: 'Recent load valley is deeper than forecast and should be checked against meter health.',
  },
];

function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function round(value: number, precision = 1) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function gaussian(hour: number, center: number, width: number, amplitude: number) {
  return amplitude * Math.exp(-((hour - center) ** 2) / (2 * width ** 2));
}

export function normalizeModel(model?: string | null): ModelKey {
  const candidate = (model || 'lightgbm').toLowerCase();
  return MODEL_KEYS.includes(candidate as ModelKey) ? (candidate as ModelKey) : 'lightgbm';
}

export function getModelOption(model: ModelKey) {
  return ENERGY_MODELS.find((option) => option.key === model) ?? ENERGY_MODELS[4];
}

export function getPredictionPayload(modelInput?: string | null): PredictionResponse {
  const model = normalizeModel(modelInput);
  const profile = MODEL_PROFILES[model];
  const random = seededRandom(profile.seed);
  const pointCount = 45 * 24;
  const now = new Date();
  now.setMinutes(0, 0, 0);

  const timestamps: string[] = [];
  const actual: number[] = [];
  const predicted: number[] = [];
  const anomalyMap = new Map<number, (typeof ANOMALY_BLUEPRINTS)[number]>();

  for (const blueprint of ANOMALY_BLUEPRINTS) {
    anomalyMap.set(pointCount - blueprint.offsetFromEnd, blueprint);
  }

  for (let i = 0; i < pointCount; i += 1) {
    const timestamp = new Date(now.getTime() - (pointCount - 1 - i) * HOUR);
    const hour = timestamp.getHours();
    const day = timestamp.getDay();
    const month = timestamp.getMonth();
    const isWeekend = day === 0 || day === 6;

    const dailyShape = gaussian(hour, 8, 2.8, 76) + gaussian(hour, 18, 3.2, 122);
    const overnight = gaussian(hour, 3, 2.4, -42);
    const weekly = isWeekend ? -54 : day === 1 ? 28 : day === 5 ? 18 : 0;
    const seasonal = Math.sin(((month + 1) / 12) * Math.PI * 2) * 28;
    const randomNoise = (random() - 0.5) * 34;
    const ramp = Math.sin((i / pointCount) * Math.PI * 3) * 18;

    let actualValue = 306 + dailyShape + overnight + weekly + seasonal + ramp + randomNoise;
    const anomaly = anomalyMap.get(i);
    if (anomaly) {
      actualValue += anomaly.delta;
    }

    const delayedSignal = Math.sin(((hour - 1) / 24) * Math.PI * 2) * 25 * profile.lag;
    const modelNoise = (random() - 0.5) * profile.noise;
    const predictedValue = actualValue - (anomaly?.delta ?? 0) * 0.78 + profile.bias + modelNoise + delayedSignal;

    timestamps.push(timestamp.toISOString());
    actual.push(round(Math.max(92, actualValue)));
    predicted.push(round(Math.max(92, predictedValue)));
  }

  const anomalies = buildAnomalies(timestamps, actual, predicted, anomalyMap);
  const metrics = calculateMetrics(actual, predicted, model);

  return {
    model,
    timestamps,
    actual,
    predicted,
    anomalies,
    metrics,
  };
}

function buildAnomalies(
  timestamps: string[],
  actual: number[],
  predicted: number[],
  anomalyMap: Map<number, (typeof ANOMALY_BLUEPRINTS)[number]>,
): AnomalyEvent[] {
  return Array.from(anomalyMap.entries())
    .filter(([index]) => index >= 0 && index < timestamps.length)
    .map(([index, blueprint]) => {
      const actualValue = actual[index];
      const predictedValue = predicted[index];
      const deviation = Math.abs(((actualValue - predictedValue) / predictedValue) * 100);

      return {
        id: `${blueprint.direction}-${index}`,
        index,
        timestamp: timestamps[index],
        type: blueprint.type,
        severity: blueprint.severity,
        direction: blueprint.direction,
        actual: actualValue,
        predicted: predictedValue,
        deviation: round(deviation),
        explanation: blueprint.explanation,
      };
    });
}

export function calculateMetrics(actual: number[], predicted: number[], model: ModelKey): ModelMetrics {
  const count = actual.length;
  const absoluteErrors = actual.map((value, index) => Math.abs(value - predicted[index]));
  const squaredErrors = absoluteErrors.map((value) => value ** 2);
  const percentageErrors = absoluteErrors.map((value, index) => (value / Math.max(actual[index], 1)) * 100);
  const mae = absoluteErrors.reduce((sum, value) => sum + value, 0) / count;
  const rmse = Math.sqrt(squaredErrors.reduce((sum, value) => sum + value, 0) / count);
  const mape = percentageErrors.reduce((sum, value) => sum + value, 0) / count;
  const profileBonus = model === 'lightgbm' ? 2.2 : model === 'xgboost' ? 1.8 : model === 'lstm' ? 1.2 : model === 'sarima' ? 0.5 : 0;
  const trendBase = MODEL_PROFILES[model].noise / 10;

  return {
    mae: round(mae),
    rmse: round(rmse),
    mape: round(Math.max(1.5, mape - profileBonus)),
    accuracy: round(Math.max(88, 100 - mape + profileBonus)),
    confidence_score: round(Math.max(88, 100 - mape + profileBonus)),
    trend: {
      mae: round(-(trendBase + 0.7), 1),
      rmse: round(-(trendBase + 1.1), 1),
      mape: round(-(trendBase / 2 + 0.4), 1),
    },
    updatedAt: new Date().toISOString(),
  };
}

export function getMetricsPayload(model?: string | null): ModelMetrics {
  const payload = getPredictionPayload(model);
  return payload.metrics ?? calculateMetrics(payload.actual, payload.predicted, normalizeModel(model));
}

export function getAnomaliesPayload(model?: string | null): AnomalyEvent[] {
  return getPredictionPayload(model).anomalies ?? [];
}

export function getFeatureImportance(modelInput?: string | null): FeatureImportance[] {
  const model = normalizeModel(modelInput);
  const modelBias: Record<ModelKey, string> = {
    lightgbm: 'Lag 24 hours',
    arima: 'Lag 1 hour',
    sarima: 'Weekly seasonality',
    prophet: 'Holiday calendar',
    lstm: 'Lag 24 hours',
    xgboost: 'Temperature proxy',
  };

  const base: FeatureImportance[] = [
    { feature: 'Hour of day', importance: 0.24, impact: 'high' },
    { feature: modelBias[model], importance: 0.2, impact: 'high' },
    { feature: 'Lag 24 hours', importance: 0.17, impact: 'high' },
    { feature: 'Weekday index', importance: 0.13, impact: 'medium' },
    { feature: 'Rolling mean 7 days', importance: 0.11, impact: 'medium' },
    { feature: 'Month seasonality', importance: 0.08, impact: 'medium' },
    { feature: 'Holiday flag', importance: 0.04, impact: 'low' },
    { feature: 'Residual drift', importance: 0.03, impact: 'low' },
  ];

  return base.sort((a, b) => b.importance - a.importance);
}

export function getResidualPayload(model?: string | null): ResidualPoint[] {
  const payload = getPredictionPayload(model);
  return payload.timestamps
    .map((timestamp, index) => ({
      timestamp,
      residual: round(payload.actual[index] - payload.predicted[index]),
      predicted: payload.predicted[index],
    }))
    .filter((_, index) => index % 12 === 0)
    .slice(-80);
}

export function getExplanationTimeline(model?: string | null): ExplanationStep[] {
  const option = getModelOption(normalizeModel(model));
  return [
    {
      label: 'Load model artifact',
      detail: `${option.label} artifact selected from the inference registry.`,
      confidence: 0.98,
    },
    {
      label: 'Generate horizon',
      detail: 'Recent hourly load, calendar seasonality, and lag features are transformed into a forecast window.',
      confidence: 0.94,
    },
    {
      label: 'Score residual envelope',
      detail: 'Prediction errors are compared with rolling thresholds to identify spikes, drops, and seasonal deviations.',
      confidence: 0.91,
    },
    {
      label: 'Emit explainability hooks',
      detail: 'Feature importance, residual plots, SHAP-ready slots, and attention placeholders are prepared for the UI.',
      confidence: 0.88,
    },
  ];
}

export function getInsightsPayload(model?: string | null): SustainabilityInsight[] {
  const payload = getPredictionPayload(model);
  const metrics = payload.metrics ?? calculateMetrics(payload.actual, payload.predicted, normalizeModel(model));
  const hourlyAverage = Array.from({ length: 24 }, (_, hour) => {
    const points = payload.predicted.filter((_, index) => new Date(payload.timestamps[index]).getHours() === hour);
    const average = points.reduce((sum, value) => sum + value, 0) / points.length;
    return { hour, average };
  }).sort((a, b) => b.average - a.average);

  const weekdayAverage = Array.from({ length: 7 }, (_, day) => {
    const points = payload.predicted.filter((_, index) => new Date(payload.timestamps[index]).getDay() === day);
    const average = points.reduce((sum, value) => sum + value, 0) / points.length;
    return { day, average };
  }).sort((a, b) => b.average - a.average);

  const monthAverage = new Map<string, number[]>();
  payload.timestamps.forEach((timestamp, index) => {
    const label = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(timestamp));
    const values = monthAverage.get(label) ?? [];
    values.push(payload.predicted[index]);
    monthAverage.set(label, values);
  });

  const monthlyPeak = Array.from(monthAverage.entries())
    .map(([month, values]) => ({
      month,
      average: values.reduce((sum, value) => sum + value, 0) / values.length,
    }))
    .sort((a, b) => b.average - a.average)[0];

  const peakHours = hourlyAverage.slice(0, 2).map(({ hour }) => `${String(hour).padStart(2, '0')}:00`);
  const highLoadDay = weekdayAverage[0];

  return [
    {
      id: 'peak-hours',
      title: 'Peak Consumption Hours',
      value: peakHours.join(' / '),
      description: `Forecasted load concentrates around ${peakHours.join(' and ')}.`,
      recommendation: 'Shift flexible HVAC and battery charging away from the evening peak window.',
      severity: 'optimize',
    },
    {
      id: 'weekday-load',
      title: 'High-Load Weekday',
      value: DAY_NAMES[highLoadDay.day],
      description: `${DAY_NAMES[highLoadDay.day]} averages ${round(highLoadDay.average)} MW in the forecast horizon.`,
      recommendation: 'Schedule demand-response nudges and maintenance checks before this weekday ramp.',
      severity: 'watch',
    },
    {
      id: 'monthly-peak',
      title: 'Monthly Seasonal Peak',
      value: monthlyPeak?.month ?? 'Current',
      description: `${monthlyPeak?.month ?? 'Current month'} shows the strongest seasonal load signature.`,
      recommendation: 'Pre-position storage capacity and tariff alerts for the monthly seasonal crest.',
      severity: 'watch',
    },
    {
      id: 'optimization',
      title: 'Optimization Suggestion',
      value: `${round(metrics.accuracy)}% fit`,
      description: 'Model fit is stable enough for short-horizon operational recommendations.',
      recommendation: 'Use predictive pre-cooling, staggered EV charging, and targeted high-load alerts.',
      severity: 'good',
    },
  ];
}
