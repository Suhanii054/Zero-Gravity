from __future__ import annotations

from typing import Any

from range_analyst_agent import RangeAnalystAgent
from range_communicator_agent import RangeCommunicatorAgent
from range_feature_extractor import RangeFeatureExtractor


def _dump_model(model: Any) -> dict[str, Any]:
    if hasattr(model, "model_dump"):
        return model.model_dump()
    return model.dict()


def _compact_feature_summary(context: Any) -> dict[str, Any]:
    return {
        "window": {
            "start": context.start_time,
            "end": context.end_time,
            "duration_hours": context.duration_hours,
        },
        "consumption": {
            "mean_mwh": context.actual_mean,
            "max_mwh": context.actual_max,
            "min_mwh": context.actual_min,
            "std_mwh": context.actual_std,
            "vs_global_pct": context.vs_global_mean_pct,
        },
        "model": {
            "mae": context.mae,
            "rmse": context.rmse,
            "mape_pct": context.mape,
            "bias": context.mean_bias,
        },
        "trend": {
            "direction": context.trend_direction,
            "slope_mwh_per_hour": context.trend_slope_mwh_per_hour,
        },
        "calendar": _dump_model(context.calendar),
        "lags": _dump_model(context.lags),
        "rolling": _dump_model(context.rolling),
        "anomalies": {
            "count": context.anomaly_count,
            "items": [_dump_model(item) for item in context.anomalies[:5]],
        },
        "dominant_cycle": context.dominant_cycle,
    }


class RangeExplainPipeline:
    def __init__(self) -> None:
        self._extractor = RangeFeatureExtractor()
        self._analyst = RangeAnalystAgent()
        self._communicator = RangeCommunicatorAgent()

    def run(self, start_time: str, end_time: str, user_query: str) -> dict[str, Any]:
        context = self._extractor.extract(start_time=start_time, end_time=end_time)
        analyst_plan = self._analyst.analyze(context=context, user_query=user_query)
        insight = self._communicator.communicate(
            analyst_plan=analyst_plan,
            context=context,
            user_query=user_query,
        )
        return {
            "insight": insight,
            "analyst_plan": _dump_model(analyst_plan),
            "feature_summary": _compact_feature_summary(context),
        }
