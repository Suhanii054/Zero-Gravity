import pandas as pd
from insights_processor import extract_patterns
from agent3_insights_refiner import enrich_patterns
from agent4_insights_generator import generate_insights
from predict import range_window, window, predict_rows, aggregate_frame

def run_insights_pipeline(start: str, end: str, resolution: str) -> dict:
    try:
        if start and end:
            rows = range_window(start, end, 72)
        else:
            rows = window(None, 72)
            
        if rows.empty:
            return {"error": "No data available for the given range"}
            
        predicted = predict_rows(rows)
        grouped = aggregate_frame(rows, predicted, resolution or "hourly")
        
        # Prepare dataframe expected by extract_patterns
        df = pd.DataFrame({
            "timestamp": grouped["start_time"],
            "predicted_mwh": grouped["predicted"]
        })
        
        patterns = extract_patterns(df)
        enriched_patterns = enrich_patterns(patterns)
        insights_list = generate_insights(enriched_patterns)
        
        return {
            "patterns": enriched_patterns,
            "insights": insights_list
        }
    except Exception as e:
        return {"error": str(e)}
