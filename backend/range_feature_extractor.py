from __future__ import annotations

import numpy as np
import pandas as pd
from scipy import stats as scipy_stats

try:
    from predict import TARGET, _round, get_dataset, predict_rows
except ImportError:  # pragma: no cover - package import fallback
    from .predict import TARGET, _round, get_dataset, predict_rows

from range_schemas import (
    AnomalyItem,
    CalendarBreakdown,
    LagComparison,
    RangeFeatureContext,
    RollingContext,
)

SEASON_LABELS = {0: "Winter", 1: "Spring", 2: "Summer", 3: "Autumn"}
PEAK_HOURS = {8, 9, 17, 18, 19, 20}


def _parse_ts(value: str) -> pd.Timestamp:
    return pd.to_datetime(value).floor("h")


def _safe_col(rows: pd.DataFrame, *candidates: str, fallback_col: str = TARGET) -> pd.Series:
    for column in candidates:
        if column in rows.columns:
            return rows[column]
    return rows[fallback_col]


def _volatility_label(std: float) -> str:
    if std < 50:
        return "low"
    if std < 150:
        return "moderate"
    return "high"


def _trend_direction(slope: float, std: float) -> str:
    if std <= 0 or abs(slope) < 0.02 * (std + 1e-9):
        return "flat"
    if abs(slope) > 0.15 * (std + 1e-9) and std > 200:
        return "volatile"
    return "rising" if slope > 0 else "falling"


def _dominant_fourier_cycle(rows: pd.DataFrame) -> str:
    daily_cols = [col for col in rows.columns if col.startswith("fourier_daily_")]
    weekly_cols = [col for col in rows.columns if col.startswith("fourier_weekly_")]
    daily_amp = rows[daily_cols].abs().mean().mean() if daily_cols else 0.0
    weekly_amp = rows[weekly_cols].abs().mean().mean() if weekly_cols else 0.0
    if daily_amp == 0 and weekly_amp == 0:
        return "none"
    if daily_amp > weekly_amp * 1.5:
        return "daily"
    if weekly_amp > daily_amp * 1.5:
        return "weekly"
    return "mixed"


def _detect_anomalies(rows: pd.DataFrame, predicted: np.ndarray) -> list[AnomalyItem]:
    actual = rows[TARGET].to_numpy(dtype=float)
    deviation = actual - predicted
    fallback_std = float(pd.Series(deviation).std()) if len(deviation) > 1 else 0.0
    std_series = _safe_col(rows, "roll_std_24h", "rolling_std_24", fallback_col=TARGET)
    threshold = std_series.fillna(fallback_std).to_numpy(dtype=float) * 1.5
    events: list[AnomalyItem] = []
    for idx in np.where(np.abs(deviation) > threshold)[0][:8]:
        events.append(
            AnomalyItem(
                timestamp=rows.iloc[idx]["start_time"].isoformat(),
                actual=_round(float(actual[idx]), 1),
                predicted=_round(float(predicted[idx]), 1),
                deviation_pct=_round(abs(float(deviation[idx])) / max(abs(float(predicted[idx])), 1) * 100, 2),
                direction="spike" if deviation[idx] > 0 else "drop",
            )
        )
    return events


class RangeFeatureExtractor:
    def __init__(self) -> None:
        self._raw, self._features = get_dataset()

    def extract(self, start_time: str, end_time: str) -> RangeFeatureContext:
        start = _parse_ts(start_time)
        end = _parse_ts(end_time)
        if end < start:
            start, end = end, start

        rows = self._features[
            (self._features["start_time"] >= start) & (self._features["start_time"] <= end)
        ].copy().reset_index(drop=True)
        if rows.empty:
            min_time = self._features["start_time"].min()
            max_time = self._features["start_time"].max()
            target_year = int(max_time.year if start > max_time else min_time.year)
            try:
                mapped_start = start.replace(year=target_year)
                mapped_end = end.replace(year=target_year)
            except ValueError:
                mapped_start = start.replace(year=target_year, day=28)
                mapped_end = end.replace(year=target_year, day=28)
            if mapped_end < min_time or mapped_start > max_time:
                duration = max(1, int((end - start) / pd.Timedelta(hours=1)) + 1)
                mapped_end = max_time
                mapped_start = max(min_time, mapped_end - pd.Timedelta(hours=duration - 1))
            rows = self._features[
                (self._features["start_time"] >= mapped_start) & (self._features["start_time"] <= mapped_end)
            ].copy().reset_index(drop=True)
        if rows.empty:
            raise ValueError(f"No dataset rows found between {start.isoformat()} and {end.isoformat()}")

        predicted = predict_rows(rows)
        actual = rows[TARGET].to_numpy(dtype=float)
        actual_mean = float(np.mean(actual))
        predicted_mean = float(np.mean(predicted))
        residual = actual - predicted

        mae = float(np.mean(np.abs(residual)))
        rmse = float(np.sqrt(np.mean(residual**2)))
        mape = float(np.mean(np.abs(residual / np.maximum(np.abs(actual), 1))) * 100)
        residual_mean = float(np.mean(residual))
        if residual_mean > 50:
            mean_bias = "under-predicted"
        elif residual_mean < -50:
            mean_bias = "over-predicted"
        else:
            mean_bias = "balanced"

        slope = 0.0
        if len(actual) > 1:
            slope = float(scipy_stats.linregress(np.arange(len(actual), dtype=float), actual).slope)
        actual_std = float(np.std(actual))

        hours = _safe_col(rows, "hour").to_numpy(dtype=int)
        is_weekend = _safe_col(rows, "is_weekend").to_numpy(dtype=int)
        seasons = _safe_col(rows, "season").to_numpy(dtype=int)
        peak = _safe_col(rows, "is_peak_hour", fallback_col=TARGET)
        if peak.name == TARGET:
            peak_values = np.array([1 if hour in PEAK_HOURS else 0 for hour in hours], dtype=int)
        else:
            peak_values = peak.to_numpy(dtype=int)
        season_mode = int(pd.Series(seasons).mode().iloc[0])

        calendar = CalendarBreakdown(
            hour_min=int(hours.min()),
            hour_max=int(hours.max()),
            dominant_hour=int(pd.Series(hours).mode().iloc[0]),
            weekday_pct=_round(float((1 - is_weekend).mean() * 100), 1),
            weekend_pct=_round(float(is_weekend.mean() * 100), 1),
            season_label=SEASON_LABELS.get(season_mode, "Unknown"),
            peak_hour_pct=_round(float(peak_values.mean() * 100), 1),
        )

        lag_24 = float(_safe_col(rows, "lag_24h", "lag_24", "lag_1d").mean())
        lag_168 = float(_safe_col(rows, "lag_168h", "lag_168", "lag_1w").mean())
        lags = LagComparison(
            lag_24h_mean=_round(lag_24, 1),
            lag_168h_mean=_round(lag_168, 1),
            vs_actual_delta_24h=_round(actual_mean - lag_24, 1),
            vs_actual_delta_168h=_round(actual_mean - lag_168, 1),
        )

        rolling_mean_24 = float(_safe_col(rows, "roll_mean_24h", "rolling_mean_24").mean())
        rolling_std_24 = float(_safe_col(rows, "roll_std_24h", "rolling_std_24").mean())
        rolling_mean_168 = float(_safe_col(rows, "roll_mean_1w", "rolling_mean_168").mean())
        rolling = RollingContext(
            rolling_mean_24=_round(rolling_mean_24, 1),
            rolling_std_24=_round(rolling_std_24, 1),
            rolling_mean_168=_round(rolling_mean_168, 1),
            volatility_label=_volatility_label(rolling_std_24),
        )

        anomalies = _detect_anomalies(rows, predicted)
        global_mean = float(self._raw[TARGET].mean())

        return RangeFeatureContext(
            start_time=rows["start_time"].min().isoformat(),
            end_time=rows["start_time"].max().isoformat(),
            duration_hours=int(len(rows)),
            actual_mean=_round(actual_mean, 1),
            actual_max=_round(float(np.max(actual)), 1),
            actual_min=_round(float(np.min(actual)), 1),
            actual_std=_round(actual_std, 1),
            predicted_mean=_round(predicted_mean, 1),
            mae=_round(mae, 2),
            rmse=_round(rmse, 2),
            mape=_round(mape, 2),
            residual_mean=_round(residual_mean, 1),
            residual_std=_round(float(np.std(residual)), 1),
            mean_bias=mean_bias,
            trend_direction=_trend_direction(slope, actual_std),
            trend_slope_mwh_per_hour=_round(slope, 3),
            calendar=calendar,
            lags=lags,
            rolling=rolling,
            anomalies=anomalies,
            anomaly_count=len(anomalies),
            dominant_cycle=_dominant_fourier_cycle(rows),
            vs_global_mean_pct=_round((actual_mean - global_mean) / max(global_mean, 1) * 100, 2),
        )
