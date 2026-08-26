from __future__ import annotations

import json
import os

from range_schemas import AnalystPlan, DriverFinding, RangeFeatureContext

GEMINI_MODEL = "gemini-2.5-flash"


def _impact(value: float, high: float, medium: float) -> str:
    value = abs(float(value))
    if value >= high:
        return "high"
    if value >= medium:
        return "medium"
    return "low"


def _fallback_plan(context: RangeFeatureContext, user_query: str) -> AnalystPlan:
    drivers: list[DriverFinding] = []
    if context.anomaly_count:
        drivers.append(
            DriverFinding(
                driver_name="anomaly",
                impact="high",
                direction="amplifying",
                evidence=f"{context.anomaly_count} point(s) behaved unusually compared with the recent demand pattern.",
            )
        )
    drivers.extend(
        [
            DriverFinding(
                driver_name="same_time_yesterday",
                impact=_impact(context.lags.vs_actual_delta_24h, 120, 40),
                direction="amplifying" if context.lags.vs_actual_delta_24h > 0 else "dampening",
                evidence=(
                    f"The selected mean is {context.actual_mean} MWh versus {context.lags.lag_24h_mean} MWh "
                    f"at the same hours yesterday, a {context.lags.vs_actual_delta_24h} MWh shift."
                ),
            ),
            DriverFinding(
                driver_name="recent_day_volatility",
                impact=_impact(context.rolling.rolling_std_24, 150, 50),
                direction="amplifying" if context.rolling.volatility_label != "low" else "neutral",
                evidence=(
                    f"Demand over the recent day is moving by about {context.rolling.rolling_std_24} MWh, "
                    f"which is {context.rolling.volatility_label} volatility."
                ),
            ),
            DriverFinding(
                driver_name="season_and_time_of_day" if context.calendar.season_label == "Winter" else "busy_hour_pattern",
                impact=_impact(context.calendar.peak_hour_pct, 60, 25),
                direction="amplifying" if context.calendar.peak_hour_pct > 25 else "neutral",
                evidence=(
                    f"{context.calendar.peak_hour_pct}% of this selection falls in typically busy hours "
                    f"during {context.calendar.season_label}."
                ),
            ),
            DriverFinding(
                driver_name="range_direction",
                impact=_impact(context.trend_slope_mwh_per_hour, 10, 2),
                direction="amplifying" if context.trend_slope_mwh_per_hour > 0 else "dampening",
                evidence=(
                    f"The selected window is {context.trend_direction} at "
                    f"{context.trend_slope_mwh_per_hour} MWh per hour."
                ),
            ),
        ]
    )

    if context.anomaly_count:
        pattern = "anomalous"
    elif context.calendar.season_label == "Winter" and context.vs_global_mean_pct > 5:
        pattern = "seasonal-shift"
    elif context.calendar.peak_hour_pct >= 40:
        pattern = "evening-peak"
    elif context.trend_direction == "rising":
        pattern = "demand-surge"
    elif context.calendar.weekend_pct >= 60:
        pattern = "weekend-effect"
    else:
        pattern = "steady"

    return AnalystPlan(
        pattern_type=pattern,
        confidence="high" if context.mape < 5 else "medium" if context.mape < 12 else "low",
        top_drivers=drivers[:5],
        key_timestamps=[item.timestamp for item in context.anomalies[:3]],
        analyst_summary=(
            f"{pattern} pattern for query '{user_query}' is explained by yesterday's same-hour behavior, "
            f"recent day volatility, calendar timing, and the {context.trend_direction} trend."
        ),
    )


class RangeAnalystAgent:
    def __init__(self) -> None:
        self._api_key = os.environ.get("GEMINI_API_KEY", "")

    def analyze(self, context: RangeFeatureContext, user_query: str) -> AnalystPlan:
        if not self._api_key:
            return _fallback_plan(context, user_query)

        try:
            from google import genai
            from google.genai import types
        except Exception:
            return _fallback_plan(context, user_query)

        client = genai.Client(api_key=self._api_key)
        prompt = f"""
Return strict JSON for an AnalystPlan. Use only numbers in this context.
User question: {user_query}
Context:
{context.model_dump_json(indent=2)}
Required keys: pattern_type, confidence, top_drivers, key_timestamps, analyst_summary.
Each top_drivers item requires driver_name, impact, direction, evidence.
""".strip()
        try:
            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(response_mime_type="application/json", temperature=0.1),
            )
            raw = response.text.strip()
            if raw.startswith("```"):
                raw = raw.strip("`").removeprefix("json").strip()
            data = json.loads(raw)
            return AnalystPlan(**data)
        except Exception:
            return _fallback_plan(context, user_query)
