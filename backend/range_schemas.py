from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class RangeExplainRequest(BaseModel):
    start_time: str
    end_time: str
    user_query: str = Field(min_length=1)


class CalendarBreakdown(BaseModel):
    hour_min: int
    hour_max: int
    dominant_hour: int
    weekday_pct: float
    weekend_pct: float
    season_label: str
    peak_hour_pct: float


class LagComparison(BaseModel):
    lag_24h_mean: float
    lag_168h_mean: float
    vs_actual_delta_24h: float
    vs_actual_delta_168h: float


class RollingContext(BaseModel):
    rolling_mean_24: float
    rolling_std_24: float
    rolling_mean_168: float
    volatility_label: Literal["low", "moderate", "high"]


class AnomalyItem(BaseModel):
    timestamp: str
    actual: float
    predicted: float
    deviation_pct: float
    direction: Literal["spike", "drop"]


class RangeFeatureContext(BaseModel):
    start_time: str
    end_time: str
    duration_hours: int
    actual_mean: float
    actual_max: float
    actual_min: float
    actual_std: float
    predicted_mean: float
    mae: float
    rmse: float
    mape: float
    residual_mean: float
    residual_std: float
    mean_bias: Literal["over-predicted", "under-predicted", "balanced"]
    trend_direction: Literal["rising", "falling", "flat", "volatile"]
    trend_slope_mwh_per_hour: float
    calendar: CalendarBreakdown
    lags: LagComparison
    rolling: RollingContext
    anomalies: list[AnomalyItem]
    anomaly_count: int
    dominant_cycle: str
    vs_global_mean_pct: float


class DriverFinding(BaseModel):
    driver_name: str
    impact: Literal["high", "medium", "low"]
    direction: Literal["amplifying", "dampening", "neutral"]
    evidence: str


class AnalystPlan(BaseModel):
    pattern_type: str
    confidence: Literal["high", "medium", "low"]
    top_drivers: list[DriverFinding]
    key_timestamps: list[str]
    analyst_summary: str


class RangeExplainResponse(BaseModel):
    insight: str
    analyst_plan: dict[str, Any]
    feature_summary: dict[str, Any]
