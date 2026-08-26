'use client';

import { create } from 'zustand';
import {
  AnomalyEvent,
  FeatureImportance,
  LagInfluenceMode,
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
import {
  fetchAnomalies,
  fetchFeatureImportance,
  fetchInsights,
  fetchLagInfluence,
  fetchMetrics,
  fetchPrediction,
  fetchResiduals,
  fetchSeasonality,
  runWhatIf,
} from '@/services/api/energy-api';

interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

interface EnergyStore {
  selectedModel: ModelKey;
  selectedDateTime: string;
  selectedStartDate: string;
  selectedEndDate: string;
  selectedAggregation: TimeAggregation;
  lagInfluenceMode: LagInfluenceMode;
  telemetryEnabled: boolean;
  fallbackEnabled: boolean;
  predictionData: PredictionResponse | null;
  simulationData: PredictionResponse | null;
  metrics: ModelMetrics | null;
  anomalies: AnomalyEvent[];
  insights: SustainabilityInsight[];
  lagInfluence: LagInfluencePayload | null;
  seasonality: SeasonalityPayload | null;
  featureImportance: FeatureImportance[];
  residuals: ResidualPoint[];
  loadingState: LoadingState;
  setDateTime: (datetime: string) => Promise<void>;
  setDateRange: (startDate: string, endDate: string) => Promise<void>;
  setAggregation: (aggregation: TimeAggregation) => Promise<void>;
  setLagInfluenceMode: (mode: LagInfluenceMode) => Promise<void>;
  setTelemetryEnabled: (enabled: boolean) => void;
  setFallbackEnabled: (enabled: boolean) => Promise<void>;
  loadModel: (model?: ModelKey) => Promise<void>;
  runSimulation: (scenario: WhatIfScenario) => Promise<void>;
  refresh: () => Promise<void>;
}

let latestRequestId = 0;

export const useEnergyStore = create<EnergyStore>((set, get) => ({
  selectedModel: 'lightgbm',
  selectedDateTime: '2021-01-01-00',
  selectedStartDate: '2021-03-01',
  selectedEndDate: '2021-03-10',
  selectedAggregation: 'hourly',
  lagInfluenceMode: 'range',
  telemetryEnabled: true,
  fallbackEnabled: false,
  predictionData: null,
  simulationData: null,
  metrics: null,
  anomalies: [],
  insights: [],
  lagInfluence: null,
  seasonality: null,
  featureImportance: [],
  residuals: [],
  loadingState: {
    isLoading: false,
    error: null,
  },
  loadModel: async (model = get().selectedModel) => {
    const requestId = ++latestRequestId;

    set({
      selectedModel: model,
      loadingState: {
        isLoading: true,
        error: null,
      },
    });

    try {
      const options = {
        datetime: get().selectedDateTime,
        startDate: get().selectedStartDate,
        endDate: get().selectedEndDate,
        aggregation: get().selectedAggregation,
        telemetryEnabled: get().telemetryEnabled,
        fallbackEnabled: get().fallbackEnabled,
      };
      const lagOptions = {
        ...options,
        startDate: get().lagInfluenceMode === 'range' ? get().selectedStartDate : undefined,
        endDate: get().lagInfluenceMode === 'range' ? get().selectedEndDate : undefined,
      };
      const [predictionData, metrics, anomalies, insights, lagInfluence, seasonality, featureImportance, residuals] = await Promise.all([
        fetchPrediction(model, options),
        fetchMetrics(model, options),
        fetchAnomalies(model, options),
        fetchInsights(model, options),
        fetchLagInfluence(model, lagOptions),
        fetchSeasonality(model, options),
        fetchFeatureImportance(model, options),
        fetchResiduals(model, options),
      ]);

      if (requestId !== latestRequestId || get().selectedModel !== model) {
        return;
      }

      set({
        predictionData,
        simulationData: null,
        metrics,
        anomalies,
        insights,
        lagInfluence,
        seasonality,
        featureImportance,
        residuals,
        loadingState: {
          isLoading: false,
          error: null,
        },
      });
    } catch (error) {
      if (requestId !== latestRequestId || get().selectedModel !== model) {
        return;
      }

      set({
        loadingState: {
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unable to load forecast data.',
        },
      });
    }
  },
  setDateTime: async (datetime: string) => {
    set({ selectedDateTime: datetime });
    await get().loadModel(get().selectedModel);
  },
  setDateRange: async (startDate: string, endDate: string) => {
    set({
      selectedStartDate: startDate,
      selectedEndDate: endDate,
      lagInfluenceMode: 'range',
      predictionData: null,
      simulationData: null,
      anomalies: [],
      lagInfluence: null,
    });
    await get().loadModel(get().selectedModel);
  },
  setAggregation: async (aggregation: TimeAggregation) => {
    set({
      selectedAggregation: aggregation,
      predictionData: null,
      simulationData: null,
      anomalies: [],
      lagInfluence: null,
    });
    await get().loadModel(get().selectedModel);
  },
  setLagInfluenceMode: async (mode: LagInfluenceMode) => {
    set({ lagInfluenceMode: mode });
    await get().loadModel(get().selectedModel);
  },
  setTelemetryEnabled: (enabled: boolean) => {
    set({ telemetryEnabled: enabled });
  },
  setFallbackEnabled: async (enabled: boolean) => {
    set({ fallbackEnabled: enabled });
    await get().loadModel(get().selectedModel);
  },
  runSimulation: async (scenario: WhatIfScenario) => {
    set({ loadingState: { isLoading: true, error: null } });
    try {
      const simulationData = await runWhatIf(get().selectedModel, get().selectedDateTime, scenario);
      set({ simulationData, loadingState: { isLoading: false, error: null } });
    } catch (error) {
      set({
        loadingState: {
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unable to run simulation.',
        },
      });
    }
  },
  refresh: async () => {
    await get().loadModel(get().selectedModel);
  },
}));
