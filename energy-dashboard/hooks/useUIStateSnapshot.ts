import { useEnergyStore } from '@/store/useEnergyStore';

export function useUIStateSnapshot() {
  const store = useEnergyStore();

  // 1. current_date_range: The timestamps visible in ForecastCharts
  const timestamps = store.predictionData?.timestamps || [];
  const current_date_range = {
    start: store.selectedStartDate || (timestamps.length > 0 ? timestamps[0] : null),
    end: store.selectedEndDate || (timestamps.length > 0 ? timestamps[timestamps.length - 1] : null),
  };
  
  const resolution = store.selectedAggregation || 'hourly';

  // 2. last_actual_mw & last_predicted_mw
  const actuals = store.predictionData?.actual || [];
  const predicted = store.predictionData?.predicted || [];
  const last_actual_mw = actuals.length > 0 ? actuals[actuals.length - 1] : null;
  const last_predicted_mw = predicted.length > 0 ? predicted[predicted.length - 1] : null;

  // 3. metrics
  const mae = store.metrics?.mae ?? null;
  const rmse = store.metrics?.rmse ?? null;
  const mape = store.metrics?.mape ?? null;
  const accuracy_pct = store.metrics?.accuracy ?? null;
  const confidence_score = store.metrics?.confidence_score ?? null;

  // 4. active_anomaly
  // Just grabbing the first active one if it exists
  const active_anomaly =
    store.anomalies && store.anomalies.length > 0
      ? {
          type: store.anomalies[0].type,
          severity: store.anomalies[0].severity,
          explanation: store.anomalies[0].explanation,
        }
      : null;

  // 5. load_intensity_pct
  // Replicating the logic from DashboardShell.tsx's useMemo
  let load_intensity_pct = 55; // Default fallback from UI
  if (store.predictionData?.grid_state?.intensity) {
    load_intensity_pct = Math.round(store.predictionData.grid_state.intensity * 100);
  } else if (predicted.length > 0) {
    const latest = predicted.slice(-24);
    const max = Math.max(...predicted);
    const average = latest.reduce((sum, value) => sum + value, 0) / latest.length;
    const rawIntensity = Math.min(1, Math.max(0.25, average / max));
    load_intensity_pct = Math.round(rawIntensity * 100);
  }

  return {
    current_date_range,
    last_actual_mw,
    last_predicted_mw,
    mae,
    rmse,
    mape,
    accuracy_pct,
    confidence_score,
    active_anomaly,
    load_intensity_pct,
    resolution,
  };
}
