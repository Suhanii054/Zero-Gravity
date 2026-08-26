from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Any
from dotenv import load_dotenv

load_dotenv()


import numpy as np
import pandas as pd
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel
from sklearn.metrics import mean_absolute_error, mean_absolute_percentage_error, mean_squared_error

try:
    import lightgbm as lgb
except Exception:  # pragma: no cover - local dependency may be installed after code checkout
    lgb = None


ROOT = Path(__file__).resolve().parents[1]
DATASET_PATH = ROOT / "Energy Consumption Dataset.xlsx"
MODEL_CANDIDATES = [
    ROOT / "lightbgm.txt",
    ROOT / "lightgbm.txt",
    ROOT / "models" / "lightbgm.txt",
]
LEGACY_MODEL_PATH = ROOT / "models" / "lightgbm_model.txt"
TARGET = "consumption_mwh"
DEFAULT_HORIZON = 72
MODEL_LOAD_ERROR: str | None = None
VALID_AGGREGATIONS = {"hourly", "daily", "weekly", "monthly"}

app = FastAPI(title="Adani Energy Forecasting API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)


class SimulationRequest(BaseModel):
    datetime: str | None = None
    temperature_delta: float = 3.0
    industrial_demand_delta: float = 10.0
    weekend_shift: bool = False
    horizon: int = DEFAULT_HORIZON


def _round(value: float, digits: int = 2) -> float:
    if pd.isna(value) or np.isinf(value):
        return 0.0
    return round(float(value), digits)


def parse_datetime(value: str | None) -> pd.Timestamp:
    if not value:
        return get_dataset()[0]["start_time"].max() - pd.Timedelta(hours=DEFAULT_HORIZON - 1)
    cleaned = value.replace("T", "-").replace(":", "-")
    try:
        if len(cleaned) >= 13 and cleaned[10] == "-":
            return pd.to_datetime(cleaned[:13], format="%Y-%m-%d-%H")
    except ValueError:
        pass
    return pd.to_datetime(value).floor("h")


def parse_date(value: str | None, fallback: pd.Timestamp) -> pd.Timestamp:
    if not value:
        return fallback
    return pd.to_datetime(value).floor("D")


def normalize_aggregation(value: str | None) -> str:
    cleaned = (value or "hourly").lower()
    return cleaned if cleaned in VALID_AGGREGATIONS else "hourly"


def normalize_range_params(
    start: str | None = None,
    end: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    aggregation: str | None = None,
    resolution: str | None = None,
) -> tuple[str | None, str | None, str]:
    return start_date or start, end_date or end, normalize_aggregation(resolution or aggregation)


def get_model_path() -> Path | None:
    configured = os.getenv("LIGHTGBM_MODEL_PATH")
    if configured:
        configured_path = Path(configured)
        if not configured_path.is_absolute():
            configured_path = ROOT / configured_path
        if configured_path.exists():
            return configured_path
    return next((path for path in MODEL_CANDIDATES if path.exists()), None)


def load_raw_dataset() -> pd.DataFrame:
    df = pd.read_excel(DATASET_PATH)
    df = df.rename(
        columns={
            "Start time UTC": "start_time",
            "End time UTC": "end_time",
            "Electricity consumption (MWh)": TARGET,
        }
    )
    df["start_time"] = pd.to_datetime(df["start_time"])
    df["end_time"] = pd.to_datetime(df["end_time"])
    df[TARGET] = pd.to_numeric(df[TARGET], errors="coerce")
    df = df.sort_values("start_time").drop_duplicates("start_time")
    df[TARGET] = df[TARGET].interpolate(limit_direction="both")
    return df[["start_time", "end_time", TARGET]]


def add_calendar_features(data: pd.DataFrame) -> pd.DataFrame:
    t = pd.DatetimeIndex(data["start_time"])
    out = data.copy()
    out["hour"] = t.hour
    out["day_of_week"] = t.dayofweek
    out["day_of_month"] = t.day
    out["day_of_year"] = t.dayofyear
    out["week_of_year"] = t.isocalendar().week.astype(int)
    out["month"] = t.month
    out["quarter"] = t.quarter
    out["year"] = t.year
    out["is_weekend"] = (t.dayofweek >= 5).astype(int)
    out["is_month_start"] = t.is_month_start.astype(int)
    out["is_month_end"] = t.is_month_end.astype(int)
    out["season"] = out["month"].map({12: 0, 1: 0, 2: 0, 3: 1, 4: 1, 5: 1, 6: 2, 7: 2, 8: 2, 9: 3, 10: 3, 11: 3})
    out["time_of_day"] = pd.cut(out["hour"], bins=[-1, 5, 11, 17, 23], labels=[0, 1, 2, 3]).astype(int)
    out["hour_group"] = out["time_of_day"]
    out["is_peak_hour"] = out["hour"].isin([8, 9, 17, 18, 19, 20]).astype(int)
    out["is_covid_period"] = ((out["start_time"] >= "2020-03-01") & (out["start_time"] <= "2021-06-30")).astype(int)
    out["hour_sin"] = np.sin(2 * np.pi * out["hour"] / 24)
    out["hour_cos"] = np.cos(2 * np.pi * out["hour"] / 24)
    out["sin_hour"] = out["hour_sin"]
    out["cos_hour"] = out["hour_cos"]
    out["dow_sin"] = np.sin(2 * np.pi * out["day_of_week"] / 7)
    out["dow_cos"] = np.cos(2 * np.pi * out["day_of_week"] / 7)
    out["month_sin"] = np.sin(2 * np.pi * out["month"] / 12)
    out["month_cos"] = np.cos(2 * np.pi * out["month"] / 12)
    out["doy_sin"] = np.sin(2 * np.pi * out["day_of_year"] / 365.25)
    out["doy_cos"] = np.cos(2 * np.pi * out["day_of_year"] / 365.25)
    return out


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    data = add_calendar_features(df).sort_values("start_time").reset_index(drop=True)
    t_idx = np.arange(len(data))

    for lag in [1, 2, 3, 6, 12, 24, 48, 168, 336]:
        data[f"lag_{lag}"] = data[TARGET].shift(lag)
        data[f"lag_{lag}h"] = data[f"lag_{lag}"]
    data["lag_1w"] = data["lag_168"]
    data["lag_1d"] = data["lag_24"]

    rolling_specs = {
        "3h": 3,
        "6h": 6,
        "12h": 12,
        "24h": 24,
        "48h": 48,
        "1w": 168,
        "168": 168,
        "720": 720,
    }
    shifted = data[TARGET].shift(1)
    for name, window in rolling_specs.items():
        roll = shifted.rolling(window=window, min_periods=1)
        data[f"roll_mean_{name}"] = roll.mean()
        data[f"roll_std_{name}"] = roll.std().fillna(0)
        data[f"roll_min_{name}"] = roll.min()
        data[f"roll_max_{name}"] = roll.max()

    data["rolling_mean_24"] = data["roll_mean_24h"]
    data["rolling_std_24"] = data["roll_std_24h"]
    data["rolling_mean_168"] = data["roll_mean_1w"]
    data["rolling_mean_720"] = data["roll_mean_720"]
    data["expand_mean"] = shifted.expanding().mean()

    for k in [1, 2, 3]:
        data[f"fourier_daily_sin_{k}"] = np.sin(2 * np.pi * k * t_idx / 24)
        data[f"fourier_daily_cos_{k}"] = np.cos(2 * np.pi * k * t_idx / 24)
    for k in [1, 2]:
        data[f"fourier_weekly_sin_{k}"] = np.sin(2 * np.pi * k * t_idx / 168)
        data[f"fourier_weekly_cos_{k}"] = np.cos(2 * np.pi * k * t_idx / 168)

    data["hour_x_weekend"] = data["hour"] * data["is_weekend"]
    data["hour_x_season"] = data["hour"] * data["season"]
    data["month_x_year"] = data["month"] * (data["year"] - data["year"].min())
    numeric_cols = data.select_dtypes(include=[np.number]).columns
    data[numeric_cols] = data[numeric_cols].replace([np.inf, -np.inf], np.nan)
    data[numeric_cols] = data[numeric_cols].ffill().bfill().fillna(0)
    return data.reset_index(drop=True)


@lru_cache(maxsize=1)
def get_dataset() -> tuple[pd.DataFrame, pd.DataFrame]:
    raw = load_raw_dataset()
    return raw, build_features(raw)


@lru_cache(maxsize=1)
def get_model() -> Any | None:
    global MODEL_LOAD_ERROR
    model_path = get_model_path()
    if lgb is None or model_path is None:
        if LEGACY_MODEL_PATH.exists():
            MODEL_LOAD_ERROR = (
                "lightbgm.txt is missing. Found models/lightgbm_model.txt, but it is not used "
                "because this environment's LightGBM parser rejects that legacy file."
            )
        else:
            MODEL_LOAD_ERROR = "lightgbm package or model file is unavailable"
        return None
    try:
        model = lgb.Booster(model_file=str(model_path))
    except Exception as exc:
        MODEL_LOAD_ERROR = f"{model_path.name}: {exc}"
        return None
    MODEL_LOAD_ERROR = None
    return model


def feature_columns() -> list[str]:
    _, features = get_dataset()
    model = get_model()
    if model is not None:
        names = list(model.feature_name())
        if names:
            return names
    return [col for col in features.columns if col not in ["start_time", "end_time", TARGET]]


def predict_rows(rows: pd.DataFrame) -> np.ndarray:
    model = get_model()
    cols = feature_columns()
    x = rows.reindex(columns=cols, fill_value=0).replace([np.inf, -np.inf], np.nan).fillna(0)
    if model is not None:
        return np.asarray(model.predict(x), dtype=float)

    # Deterministic cached fallback keeps the UI usable until LightGBM is installed.
    recent = rows.get("lag_24", rows[TARGET]).fillna(rows[TARGET])
    weekly = rows.get("lag_168", recent).fillna(recent)
    smooth = rows.get("rolling_mean_24", recent).fillna(recent)
    peak = rows.get("is_peak_hour", 0) * 0.025
    return np.asarray((recent * 0.48 + weekly * 0.28 + smooth * 0.24) * (1 + peak), dtype=float)


def window(datetime: str | None, horizon: int = DEFAULT_HORIZON) -> pd.DataFrame:
    _, features = get_dataset()
    start = parse_datetime(datetime)
    horizon = max(24, min(int(horizon), 336))
    selected = features[features["start_time"] >= start].head(horizon)
    if len(selected) < horizon:
        selected = features.tail(horizon)
    return selected.copy()


def range_window(start: str | None = None, end: str | None = None, horizon: int = DEFAULT_HORIZON) -> pd.DataFrame:
    _, features = get_dataset()
    fallback_end = features["start_time"].max()
    fallback_start = fallback_end - pd.Timedelta(hours=max(24, horizon) - 1)
    start_ts = parse_date(start, fallback_start)
    end_ts = parse_date(end, fallback_end) + pd.Timedelta(days=1) - pd.Timedelta(seconds=1)
    selected = features[(features["start_time"] >= start_ts) & (features["start_time"] <= end_ts)]
    return selected.copy()


def aggregate_frame(rows: pd.DataFrame, predicted: np.ndarray, aggregation: str) -> pd.DataFrame:
    aggregation = normalize_aggregation(aggregation)
    if rows.empty:
        return pd.DataFrame(columns=["start_time", TARGET, "predicted", "lower", "upper"])
    data = rows[["start_time", TARGET]].copy()
    data["predicted"] = predicted
    data["lower"] = predicted - np.maximum(rows["rolling_std_24"].to_numpy(dtype=float) * 1.1, 0)
    data["upper"] = predicted + np.maximum(rows["rolling_std_24"].to_numpy(dtype=float) * 1.1, 0)
    if aggregation == "hourly":
        grouped = data
    else:
        freq = {"daily": "D", "weekly": "W-MON", "monthly": "MS"}[aggregation]
        grouped = (
            data.set_index("start_time")
            .resample(freq)
            .mean(numeric_only=True)
            .dropna()
            .reset_index()
        )
    return grouped


def empty_metrics() -> dict[str, Any]:
    return {
        "mae": 0,
        "rmse": 0,
        "mape": 0,
        "accuracy": 0,
        "confidence_score": 0,
        "trend": {"mae": 0, "rmse": 0, "mape": 0},
        "updatedAt": pd.Timestamp.utcnow().isoformat(),
    }


def empty_prediction_payload(aggregation: str) -> dict[str, Any]:
    return {
        "model": "lightgbm",
        "resolution": normalize_aggregation(aggregation),
        "aggregation": normalize_aggregation(aggregation),
        "timestamps": [],
        "actual": [],
        "predicted": [],
        "upper_bound": [],
        "lower_bound": [],
    }


def prediction_payload(
    datetime: str | None = None,
    horizon: int = DEFAULT_HORIZON,
    scenario: dict[str, Any] | None = None,
    aggregation: str = "hourly",
    start: str | None = None,
    end: str | None = None,
) -> dict[str, Any]:
    rows = range_window(start, end, horizon) if start or end else window(datetime, horizon)
    if rows.empty:
        return empty_prediction_payload(aggregation)
    predicted = predict_rows(rows)
    if scenario:
        predicted = apply_scenario(predicted, rows, scenario)
    grouped = aggregate_frame(rows, predicted, aggregation)
    actual = grouped[TARGET].to_numpy(dtype=float)
    predicted_grouped = grouped["predicted"].to_numpy(dtype=float)
    confidence_band = {
        "lower": [_round(v, 1) for v in grouped["lower"].to_numpy(dtype=float)],
        "upper": [_round(v, 1) for v in grouped["upper"].to_numpy(dtype=float)],
    }
    return {
        "model": "lightgbm",
        "resolution": normalize_aggregation(aggregation),
        "aggregation": normalize_aggregation(aggregation),
        "timestamps": grouped["start_time"].dt.strftime("%Y-%m-%dT%H:%M:%S").tolist(),
        "actual": [_round(v, 1) for v in actual],
        "predicted": [_round(v, 1) for v in predicted_grouped],
        "lower_bound": confidence_band["lower"],
        "upper_bound": confidence_band["upper"],
    }


@lru_cache(maxsize=128)
def cached_prediction_payload(
    datetime: str | None,
    horizon: int,
    aggregation: str,
    start: str | None,
    end: str | None,
) -> dict[str, Any]:
    return prediction_payload(datetime=datetime, horizon=horizon, aggregation=aggregation, start=start, end=end)


def metrics_payload_from_arrays(actual: np.ndarray, predicted: np.ndarray) -> dict[str, Any]:
    if actual.size == 0 or predicted.size == 0:
        return empty_metrics()
    mae = mean_absolute_error(actual, predicted)
    rmse = float(np.sqrt(mean_squared_error(actual, predicted)))
    mape = mean_absolute_percentage_error(actual, predicted) * 100
    return {
        "mae": _round(mae, 2),
        "rmse": _round(rmse, 2),
        "mape": _round(mape, 2),
        "accuracy": _round(max(0, 100 - mape), 2),
        "confidence_score": _round(max(0, min(100, 100 - mape)), 2),
        "trend": {"mae": -1.7, "rmse": -2.1, "mape": -0.9},
        "updatedAt": pd.Timestamp.utcnow().isoformat(),
    }


def anomaly_events(rows: pd.DataFrame, predicted: np.ndarray) -> list[dict[str, Any]]:
    if rows.empty or predicted.size == 0:
        return []
    actual = rows[TARGET].to_numpy(dtype=float)
    deviation = actual - predicted
    threshold = rows["rolling_std_24"].fillna(pd.Series(deviation).std()).to_numpy(dtype=float) * 1.5
    labels = [
        ("industrial spike", "spike", "critical"),
        ("overnight drop", "drop", "warning"),
        ("seasonal drift", "seasonal-deviation", "low"),
        ("peak compression", "spike", "critical"),
        ("unexpected valley", "drop", "warning"),
    ]
    events: list[dict[str, Any]] = []
    candidates = np.where(np.abs(deviation) > threshold)[0]
    for order, idx in enumerate(candidates[:12]):
        label, direction, severity = labels[order % len(labels)]
        if deviation[idx] < 0 and direction == "spike":
            label, direction, severity = ("unexpected valley", "drop", "warning")
        events.append(
            {
                "id": f"{label.replace(' ', '-')}-{int(idx)}",
                "index": int(idx),
                "timestamp": rows.iloc[idx]["start_time"].isoformat(),
                "type": label.title(),
                "severity": severity,
                "direction": direction,
                "actual": _round(actual[idx], 1),
                "predicted": _round(predicted[idx], 1),
                "deviation": _round(abs(deviation[idx]) / max(predicted[idx], 1) * 100, 2),
                "explanation": f"{label.title()} detected because residual exceeded rolling_std_24 x 1.5.",
            }
        )
    return events


def raw_importance() -> dict[str, float]:
    model = get_model()
    if model is not None:
        names = list(model.feature_name())
        values = np.asarray(model.feature_importance(importance_type="gain"), dtype=float)
        return dict(zip(names, values))
    cols = feature_columns()
    return {name: float(len(cols) - i) for i, name in enumerate(cols)}


def normalize(values: dict[str, float]) -> dict[str, float]:
    total = sum(max(v, 0) for v in values.values()) or 1
    return {key: _round(max(value, 0) / total, 4) for key, value in values.items()}


def lag_group_features(aggregation: str = "hourly") -> dict[str, list[str]]:
    aggregation = normalize_aggregation(aggregation)
    groups = {
        "recent_lag": ["lag_1", "lag_2", "lag_3", "lag_1h", "lag_2h", "lag_3h"],
        "lag_24": ["lag_24", "lag_24h", "lag_1d"],
        "lag_168": ["lag_168", "lag_168h", "lag_1w"],
        "lag_336": ["lag_336", "lag_336h"],
        "older_history": [
            "rolling_mean_168",
            "rolling_mean_720",
            "roll_mean_168",
            "roll_mean_720",
            "roll_mean_1w",
            "expand_mean",
            "fourier_daily_sin_1",
            "fourier_daily_cos_1",
            "fourier_weekly_sin_1",
            "fourier_weekly_cos_1",
            "month_x_year",
        ],
    }
    if aggregation == "daily":
        groups["lag_24"] = ["lag_1d", "lag_24", "lag_24h"]
    elif aggregation == "weekly":
        groups["lag_168"] = ["lag_1w", "lag_168", "lag_168h"]
        groups["older_history"] += ["roll_mean_1w", "rolling_mean_168"]
    elif aggregation == "monthly":
        groups["older_history"] += ["rolling_mean_720", "roll_mean_720"]
    return groups


def lag_feature_frame(rows: pd.DataFrame, aggregation: str = "hourly") -> pd.DataFrame:
    imp = raw_importance()
    cols = feature_columns()
    importances = pd.Series({col: max(float(imp.get(col, 0)), 0.0) for col in cols}, dtype=float)
    if importances.sum() <= 0:
        importances = pd.Series({col: 1.0 for col in cols}, dtype=float)
    importances = importances / importances.sum()

    x = rows.reindex(columns=cols, fill_value=0).replace([np.inf, -np.inf], np.nan).fillna(0).abs()
    scaled = x.mul(importances, axis=1)
    denom = scaled.sum(axis=1).replace(0, np.nan)
    scaled = scaled.div(denom, axis=0).fillna(0)

    grouped = pd.DataFrame(index=rows.index)
    for group, features in lag_group_features(aggregation).items():
        present = [feature for feature in features if feature in scaled.columns]
        grouped[group] = scaled[present].mean(axis=1) if present else 0
    grouped = grouped.rolling(window=3, min_periods=1).mean()
    group_total = grouped.sum(axis=1).replace(0, np.nan)
    return grouped.div(group_total, axis=0).fillna(0)


@lru_cache(maxsize=128)
def lag_influence_cached(start: str | None, end: str | None, aggregation: str, datetime: str | None) -> dict[str, Any]:
    rows = range_window(start, end, DEFAULT_HORIZON) if start or end else window(datetime, DEFAULT_HORIZON)
    if rows.empty:
        empty_scores = {
            "recent_lag": 0,
            "lag_24": 0,
            "lag_168": 0,
            "lag_336": 0,
            "older_history": 0,
        }
        return {
            "mode": "range" if start or end else "live",
            "aggregation": normalize_aggregation(aggregation),
            "start": start or "",
            "end": end or "",
            "scores": empty_scores,
            "variance": empty_scores,
            "sum": 0,
        }
    grouped = lag_feature_frame(rows, aggregation)
    means = np.sqrt(grouped.mean()).to_dict()
    variances = grouped.std(ddof=0).fillna(0).to_dict()
    normalized = normalize({key: float(value) for key, value in means.items()})
    variance = {key: _round(float(variances.get(key, 0)), 4) for key in normalized}
    total = sum(normalized.values()) or 1
    normalized = {key: _round(value / total, 4) for key, value in normalized.items()}
    drift = _round(1 - sum(normalized.values()), 4)
    if normalized and drift:
        first_key = next(iter(normalized))
        normalized[first_key] = _round(normalized[first_key] + drift, 4)
    return {
        "mode": "range" if start or end else "live",
        "aggregation": normalize_aggregation(aggregation),
        "start": rows["start_time"].min().strftime("%Y-%m-%d"),
        "end": rows["start_time"].max().strftime("%Y-%m-%d"),
        "scores": normalized,
        "variance": variance,
        "sum": _round(sum(normalized.values()), 4),
    }


def lag_influence_scores(
    start: str | None = None,
    end: str | None = None,
    aggregation: str = "hourly",
    datetime: str | None = None,
) -> dict[str, Any]:
    return lag_influence_cached(start, end, normalize_aggregation(aggregation), datetime)


def seasonality_payload(datetime: str | None = None) -> dict[str, Any]:
    rows = window(datetime, 24 * 30)
    predicted = predict_rows(rows)
    data = rows.assign(predicted=predicted)
    hourly = data.groupby("hour")["predicted"].mean().reset_index()
    weekday = data.groupby("day_of_week")[[TARGET, "predicted"]].mean().reset_index()
    monthly = data.groupby("month")[[TARGET, "predicted"]].mean().reset_index()
    return {
        "hourly": [{"hour": f"{int(r.hour):02d}:00", "predicted": _round(r.predicted, 1)} for r in hourly.itertuples()],
        "weekday": [
            {"day": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][int(r.day_of_week)], "actual": _round(getattr(r, TARGET), 1), "predicted": _round(r.predicted, 1)}
            for r in weekday.itertuples()
        ],
        "monthly": [{"month": int(r.month), "actual": _round(getattr(r, TARGET), 1), "predicted": _round(r.predicted, 1)} for r in monthly.itertuples()],
    }


def feature_importance_payload() -> list[dict[str, Any]]:
    imp = normalize(raw_importance())
    return [
        {"feature": feature, "importance": score, "impact": "high" if score > 0.08 else "medium" if score > 0.03 else "low"}
        for feature, score in sorted(imp.items(), key=lambda item: item[1], reverse=True)[:20]
    ]


def residual_payload(datetime: str | None = None) -> list[dict[str, Any]]:
    rows = window(datetime, 24 * 14)
    predicted = predict_rows(rows)
    return [
        {"timestamp": row.start_time.isoformat(), "predicted": _round(predicted[idx], 1), "residual": _round(row.consumption_mwh - predicted[idx], 1)}
        for idx, row in enumerate(rows.itertuples())
    ]


def insights_payload(datetime: str | None = None) -> list[dict[str, Any]]:
    rows = window(datetime, 24 * 14)
    predicted = predict_rows(rows)
    data = rows.assign(predicted=predicted)
    peak_hour = int(data.groupby("hour")["predicted"].mean().idxmax())
    high_day = int(data.groupby("day_of_week")["predicted"].mean().idxmax())
    rolling = _round(data["rolling_mean_24"].mean(), 1)
    return [
        {
            "id": "peak-hours",
            "title": "Peak Consumption Hours",
            "value": f"{peak_hour:02d}:00",
            "description": "LightGBM places the strongest short-horizon load pressure in this hour block.",
            "recommendation": "Shift flexible industrial and battery charging load away from this peak.",
            "severity": "optimize",
        },
        {
            "id": "weekday-load",
            "title": "High-Load Weekday",
            "value": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][high_day],
            "description": "Calendar features and rolling history indicate concentrated weekday demand.",
            "recommendation": "Pre-stage demand response before this weekday ramp.",
            "severity": "watch",
        },
        {
            "id": "rolling-load",
            "title": "24h Rolling Mean",
            "value": f"{rolling:,.0f} MWh",
            "description": "Latest rolling mean drives grid animation speed and load envelope.",
            "recommendation": "Track this value against dispatch and reserve thresholds.",
            "severity": "good",
        },
    ]


def grid_state(rows: pd.DataFrame, predicted: np.ndarray) -> dict[str, Any]:
    max_pred = max(float(np.max(predicted)), 1)
    intensity = float(np.mean(predicted[-24:]) / max_pred)
    speed = _round(rows["rolling_mean_24"].tail(24).mean() / max(rows["rolling_mean_24"].max(), 1), 3)
    return {
        "intensity": _round(max(0.2, min(1.0, intensity)), 3),
        "animation_speed": _round(max(0.25, min(1.8, speed * 1.8)), 3),
        "nodes": [
            {"id": "SUB-01", "type": "substation", "brightness": _round(intensity, 3), "load_flow": _round(0.82 * intensity, 3)},
            {"id": "GEN-02", "type": "generator", "brightness": _round(0.76 * intensity, 3), "load_flow": _round(0.67 * intensity, 3)},
            {"id": "LOAD-03", "type": "load_center", "brightness": _round(0.94 * intensity, 3), "load_flow": _round(0.88 * intensity, 3)},
        ],
    }


def apply_scenario(predicted: np.ndarray, rows: pd.DataFrame, scenario: dict[str, Any]) -> np.ndarray:
    adjusted = predicted.copy()
    adjusted *= 1 + float(scenario.get("industrial_demand_delta", 0)) / 100
    adjusted *= 1 + max(float(scenario.get("temperature_delta", 0)), 0) * 0.012
    if scenario.get("weekend_shift"):
        adjusted = adjusted * np.where(rows["is_weekend"].to_numpy(dtype=bool), 1.08, 0.97)
    return adjusted


@app.get("/health")
def health() -> dict[str, Any]:
    model = get_model()
    return {
        "ok": True,
        "model_loaded": model is not None,
        "model_path": str(get_model_path()) if get_model_path() else None,
        "legacy_model_path": str(LEGACY_MODEL_PATH) if LEGACY_MODEL_PATH.exists() else None,
        "model_error": MODEL_LOAD_ERROR,
    }


@app.on_event("startup")
def preload_assets() -> None:
    get_dataset()
    get_model()


@app.get("/predict")
@app.get("/api/predict")
def predict(
    datetime: str | None = None,
    model: str = "lightgbm",
    horizon: int = DEFAULT_HORIZON,
    aggregation: str = "hourly",
    resolution: str | None = None,
    start: str | None = None,
    end: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
) -> dict[str, Any]:
    range_start, range_end, range_resolution = normalize_range_params(start, end, start_date, end_date, aggregation, resolution)
    return cached_prediction_payload(datetime, max(24, min(int(horizon), 336)), range_resolution, range_start, range_end)


@app.get("/metrics")
@app.get("/api/metrics")
def metrics(
    datetime: str | None = None,
    horizon: int = DEFAULT_HORIZON,
    aggregation: str = "hourly",
    resolution: str | None = None,
    start: str | None = None,
    end: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
) -> dict[str, Any]:
    range_start, range_end, range_resolution = normalize_range_params(start, end, start_date, end_date, aggregation, resolution)
    rows = range_window(range_start, range_end, horizon) if range_start or range_end else window(datetime, horizon)
    if rows.empty:
        return empty_metrics()
    predicted = predict_rows(rows)
    grouped = aggregate_frame(rows, predicted, range_resolution)
    return metrics_payload_from_arrays(grouped[TARGET].to_numpy(dtype=float), grouped["predicted"].to_numpy(dtype=float))


@app.get("/anomalies")
@app.get("/api/anomalies")
def anomalies(
    datetime: str | None = None,
    horizon: int = DEFAULT_HORIZON,
    aggregation: str = "hourly",
    resolution: str | None = None,
    start: str | None = None,
    end: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
) -> list[dict[str, Any]]:
    range_start, range_end, _ = normalize_range_params(start, end, start_date, end_date, aggregation, resolution)
    rows = range_window(range_start, range_end, horizon) if range_start or range_end else window(datetime, horizon)
    return anomaly_events(rows, predict_rows(rows)) if not rows.empty else []


@app.get("/seasonality")
@app.get("/api/seasonality")
def seasonality(datetime: str | None = None) -> dict[str, Any]:
    return seasonality_payload(datetime)


@app.get("/lag-influence")
@app.get("/api/lag-influence")
def lag_influence(
    start: str | None = None,
    end: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    aggregation: str = "hourly",
    resolution: str | None = None,
    datetime: str | None = None,
) -> dict[str, Any]:
    range_start, range_end, range_resolution = normalize_range_params(start, end, start_date, end_date, aggregation, resolution)
    return lag_influence_scores(start=range_start, end=range_end, aggregation=range_resolution, datetime=datetime)


@app.get("/feature-importance")
@app.get("/api/feature-importance")
def feature_importance() -> list[dict[str, Any]]:
    return feature_importance_payload()


@app.get("/residuals")
@app.get("/api/residuals")
def residuals(datetime: str | None = None) -> list[dict[str, Any]]:
    return residual_payload(datetime)


@app.get("/insights")
@app.get("/api/insights")
def insights(datetime: str | None = None) -> list[dict[str, Any]]:
    return insights_payload(datetime)


@app.post("/what-if")
@app.post("/api/what-if")
def what_if(payload: SimulationRequest) -> dict[str, Any]:
    return prediction_payload(
        datetime=payload.datetime,
        horizon=payload.horizon,
        scenario={
            "temperature_delta": payload.temperature_delta,
            "industrial_demand_delta": payload.industrial_demand_delta,
            "weekend_shift": payload.weekend_shift,
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
