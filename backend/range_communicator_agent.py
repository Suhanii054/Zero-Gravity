from __future__ import annotations

import os

from range_schemas import AnalystPlan, RangeFeatureContext

GROQ_MODEL = "llama-3.3-70b-versatile"


def _season_logic(context: RangeFeatureContext) -> str:
    if context.calendar.season_label == "Winter" and context.vs_global_mean_pct > 0:
        return (
            "Because this appears in winter, a human explanation is heating-driven demand: "
            "space heaters, longer indoor evening activity, and darker commute hours can lift consumption."
        )
    if context.calendar.season_label == "Summer" and context.vs_global_mean_pct > 0:
        return (
            "Because this appears in summer, cooling load is a plausible human-side reason, especially "
            "when the selected hours overlap busy daytime or evening periods."
        )
    if context.start_time[5:10] >= "12-24" or context.end_time[5:10] <= "01-02":
        return (
            "The late-year timing also fits holiday and New Year behaviour, where celebration, retail, "
            "lighting, and shifted occupancy can create short-lived demand anomalies."
        )
    return (
        "From a human operations view, night hours usually run lower because commercial activity, offices, "
        "and transport demand slow down, while morning and evening blocks often rise with commuting, work, "
        "cooking, heating, and cooling routines."
    )


def _plain_pattern(pattern: str) -> str:
    return {
        "anomalous": "unusual",
        "evening-peak": "like a busy evening peak",
        "demand-surge": "like a demand rise",
        "seasonal-shift": "seasonally elevated",
        "weekend-effect": "weekend-shaped",
        "steady": "fairly steady",
    }.get(pattern, pattern.replace("-", " "))


def _plain_driver(driver: str) -> str:
    return {
        "anomaly": "an unusual spike or drop",
        "same_time_yesterday": "the same hours yesterday",
        "recent_day_volatility": "how much demand moved during the recent day",
        "season_and_time_of_day": "the season and time of day",
        "busy_hour_pattern": "the busy-hour pattern",
        "range_direction": "the direction of the selected range",
    }.get(driver, driver.replace("_", " "))


def _fallback_text(plan: AnalystPlan, context: RangeFeatureContext, user_query: str) -> str:
    first_driver = plan.top_drivers[0] if plan.top_drivers else None
    driver_name = _plain_driver(first_driver.driver_name) if first_driver else "recent demand and calendar timing"
    driver_evidence = first_driver.evidence if first_driver else "The selected range has stable model-backed evidence."
    anomaly_text = (
        f"{context.anomaly_count} unusual point(s) were flagged, including {plan.key_timestamps[0]}."
        if plan.key_timestamps
        else "No unusually sharp point appeared inside this selection."
    )
    pattern = _plain_pattern(plan.pattern_type)
    return _humanize_text(
        (
        f"The selected range looks {pattern} because the strongest signal is {driver_name}, not a random chart artifact. "
        f"Actual consumption averages {context.actual_mean} MWh, peaks at {context.actual_max} MWh, and sits {context.vs_global_mean_pct:+.1f}% versus the full dataset baseline, so the region is being explained against the real historical load profile."
        "\n\n"
        f"The logic is simple in human terms: compare this range with the same hours yesterday and last week, then check whether the time of day would normally be busy or quiet. {driver_evidence} The same hours yesterday averaged {context.lags.lag_24h_mean} MWh, the same hours last week averaged {context.lags.lag_168h_mean} MWh, and the recent daily baseline is {context.rolling.rolling_mean_24} MWh with {context.rolling.rolling_std_24} MWh movement. "
        f"{_season_logic(context)}"
        "\n\n"
        f"The model fit in this slice is usable for explanation: average error is {context.mae} MWh, larger misses average {context.rmse} MWh, and percentage error is {context.mape}%. {anomaly_text} "
        f"My recommendation is to treat this range as a {context.trend_direction} operational window and compare it with the same hours yesterday and last week before changing dispatch or alert thresholds."
        ),
        context,
    )


def _humanize_text(text: str, context: RangeFeatureContext) -> str:
    replacements = {
        "anomaly": "unusual point",
        "Anomaly": "Unusual point",
        "anomalies": "unusual points",
        "Anomalies": "Unusual points",
        "volatility": "movement",
        "Volatility": "Movement",
        "deviation": "difference",
        "Deviation": "Difference",
        "predicted value": "expected value",
        "Predicted value": "Expected value",
        "lag": "same-time history",
        "Lag": "Same-time history",
    }
    for source, target in replacements.items():
        text = text.replace(source, target)

    needs_winter_logic = context.calendar.season_label == "Winter" and "heater" not in text.lower()
    needs_night_logic = context.calendar.hour_min <= 5 and "night" not in text.lower()
    if needs_winter_logic or needs_night_logic:
        paragraphs = text.split("\n\n")
        extra: list[str] = []
        if needs_winter_logic:
            extra.append("In winter, heaters, darker commute hours, and longer indoor evening activity can keep demand elevated.")
        if needs_night_logic:
            extra.append("At night, offices, machines, and traffic usually slow down, so any high value there is more suspicious than the same value in a busy daytime block.")
        insert = " ".join(extra)
        if len(paragraphs) >= 2:
            paragraphs[1] = f"{paragraphs[1]} {insert}"
            text = "\n\n".join(paragraphs)
        else:
            text = f"{text}\n\n{insert}"
    return text


class RangeCommunicatorAgent:
    def __init__(self) -> None:
        self._api_key = os.environ.get("GROQ_API_KEY", "")

    def communicate(self, analyst_plan: AnalystPlan, context: RangeFeatureContext, user_query: str) -> str:
        if not self._api_key:
            return _fallback_text(analyst_plan, context, user_query)

        try:
            from groq import Groq
        except Exception:
            return _fallback_text(analyst_plan, context, user_query)

        client = Groq(api_key=self._api_key)
        prompt = f"""
Write exactly 3 short paragraphs. Answer the question directly and ground every claim in these numbers.
Question: {user_query}
Analyst plan: {analyst_plan.model_dump_json(indent=2)}
Feature context: {context.model_dump_json(indent=2)}
Use human language. Do not say "lag", "rolling", "feature", "Fourier", or other machine-learning jargon in the final answer.
Translate model evidence into phrases like "same hours yesterday", "same hours last week", "recent daily baseline", "busy evening period", or "quiet night period".
Include logical domain reasoning for a European/France-like dataset when seasonality, night hours, traffic/commute hours, heaters, cooling, weekends, or New Year/holiday timing support it.
No bullets, no markdown, no invented numbers.
""".strip()
        try:
            completion = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": "You are a concise grid operations analyst. Use only provided numbers."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.25,
                max_tokens=380,
            )
            return _humanize_text(completion.choices[0].message.content.strip(), context)
        except Exception:
            return _fallback_text(analyst_plan, context, user_query)
