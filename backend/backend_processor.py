import pandas as pd
import numpy as np
from prophet import Prophet
from sklearn.metrics import mean_absolute_error, mean_squared_error, mean_absolute_percentage_error
from schemas import QueryRefinerOutput, BackendProcessorOutput, StatsSummary, Metrics
import random # For mock data generation in this example

class BackendProcessor:
    def __init__(self, data_path: str = None):
        # Initialize with optional historical data
        self.data_path = data_path
        # In a real scenario, you'd load the pandas dataframe here
        # self.df = pd.read_csv(self.data_path)
        pass

    def process(self, query_plan: QueryRefinerOutput) -> BackendProcessorOutput:
        # Mocking data processing for the sake of the architecture.
        # In a production environment, you would query the database/dataframe based on date_range.
        
        # 1. Base Analytics
        avg_consumption = np.random.uniform(500, 1500)
        peak_consumption = avg_consumption * np.random.uniform(1.2, 1.8)
        trend = random.choice(["increasing", "decreasing", "stable"])
        has_anomaly = random.choice([True, False])

        forecast_values = []
        mae, rmse, mape = 0.0, 0.0, 0.0
        
        # 2. Run Model if required
        if query_plan.run_model and query_plan.horizon_hours > 0:
            # Here you would train/predict using Prophet
            # df_prophet = self.df[['datetime', 'consumption']].rename(columns={'datetime': 'ds', 'consumption': 'y'})
            # model = Prophet()
            # model.fit(df_prophet)
            # future = model.make_future_dataframe(periods=query_plan.horizon_hours, freq='H')
            # forecast_result = model.predict(future)
            # forecast_values = forecast_result['yhat'].tail(query_plan.horizon_hours).tolist()
            
            # Mocking the Prophet forecast
            forecast_values = [avg_consumption * random.uniform(0.9, 1.1) for _ in range(query_plan.horizon_hours)]
            
            # Mocking performance metrics
            mae = np.random.uniform(10, 50)
            rmse = np.random.uniform(15, 60)
            mape = np.random.uniform(0.02, 0.10)
        
        # 3. Retrieve Contextual Features
        region_facts = [
            "High industrial activity in the region during daytime.",
            "Moderate climate reduces HVAC dependency."
        ]
        
        festival_context = []
        # Basic mock logic for festival context
        if "10-" in query_plan.date_range.start or "11-" in query_plan.date_range.start:
            festival_context.append("Diwali season observed in date range, expect peak lighting loads.")
        elif "12-" in query_plan.date_range.start:
            festival_context.append("Christmas/New Year observed, potential variations in commercial load.")
            
        return BackendProcessorOutput(
            stats_summary=StatsSummary(
                average=round(avg_consumption, 2),
                peak=round(peak_consumption, 2),
                trend=trend,
                anomaly=has_anomaly
            ),
            forecast=[round(v, 2) for v in forecast_values],
            metrics=Metrics(
                MAE=round(mae, 2),
                RMSE=round(rmse, 2),
                MAPE=round(mape, 4)
            ),
            region_facts=region_facts,
            festival_context=festival_context,
            question_type=query_plan.question_type,
            granularity=query_plan.granularity,
            label=f"Energy {query_plan.question_type.capitalize()} ({query_plan.target_start})"
        )

    def run_forecast_mode(self, query_plan, ui_state: dict) -> dict:
        import datetime
        
        # Safely extract from dict or Pydantic model
        if hasattr(query_plan, "model_dump"):
            query_dict = query_plan.model_dump()
        elif hasattr(query_plan, "dict"):
            query_dict = query_plan.dict()
        else:
            query_dict = query_plan if isinstance(query_plan, dict) else {}
            
        horizon = query_dict.get("horizon_hours", 24)
        target_start = query_dict.get("target_start", "2024-01-01T00:00:00Z")
        
        # Simulate a LightGBM forward pass using heuristics from the UI state
        last_mw = ui_state.get("last_predicted_mw") if ui_state and ui_state.get("last_predicted_mw") else 300.0
        
        # Generate trimmed scalar outputs to maintain strict token limits (<400 tokens)
        variation = last_mw * 0.15
        peak_mw = round(last_mw + variation, 2)
        valley_mw = round(last_mw - variation, 2)
        avg_mw = round(last_mw, 2)
        trend_direction = random.choice(["rising", "falling", "stable"])
        
        ci_upper = round(peak_mw * 1.05, 2)
        ci_lower = round(valley_mw * 0.95, 2)
        
        # Determine day type and season from target_start
        try:
            # Basic parsing of the ISO string
            dt = datetime.datetime.fromisoformat(target_start.replace('Z', '+00:00'))
            is_weekend = dt.weekday() >= 5
            month = dt.month
            if month in [12, 1, 2]: season = "Winter"
            elif month in [3, 4, 5]: season = "Spring"
            elif month in [6, 7, 8]: season = "Summer"
            else: season = "Fall"
        except:
            is_weekend = False
            season = "Unknown"
            
        context = {
            "is_holiday": False, # Mocked
            "day_type": "weekend" if is_weekend else "weekday",
            "season": season
        }
        
        # Copy metrics and anomalies directly from ui_state without recomputing
        mae = ui_state.get("mae") if ui_state else None
        mape = ui_state.get("mape") if ui_state else None
        accuracy_pct = ui_state.get("accuracy_pct") if ui_state else None
        confidence_score = ui_state.get("confidence_score") if ui_state else None
        active_anomaly = ui_state.get("active_anomaly") if ui_state else None
        
        return {
            "peak_mw": peak_mw,
            "peak_time": f"T+{random.randint(1, horizon)}h",
            "valley_mw": valley_mw,
            "valley_time": f"T+{random.randint(1, horizon)}h",
            "avg_mw": avg_mw,
            "trend_direction": trend_direction,
            "ci_upper": ci_upper,
            "ci_lower": ci_lower,
            "context": context,
            "mae": mae,
            "mape": mape,
            "accuracy_pct": accuracy_pct,
            "confidence_score": confidence_score,
            "active_anomaly": active_anomaly
        }
