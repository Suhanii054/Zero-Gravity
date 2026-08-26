import pandas as pd
import numpy as np

def extract_patterns(df: pd.DataFrame) -> dict:
    if df.empty:
        return {}
    
    # We expect columns ['timestamp', 'predicted_mwh']
    df = df.copy()
    if 'timestamp' in df.columns:
        df['hour'] = pd.to_datetime(df['timestamp']).dt.hour
    else:
        df['hour'] = 0

    avg_mwh = float(df['predicted_mwh'].mean())
    std_mwh = float(df['predicted_mwh'].std(ddof=0))
    
    peak_idx = df['predicted_mwh'].idxmax()
    valley_idx = df['predicted_mwh'].idxmin()
    
    peak_hour = int(df.loc[peak_idx, 'hour'])
    peak_mwh = float(df.loc[peak_idx, 'predicted_mwh'])
    
    valley_hour = int(df.loc[valley_idx, 'hour'])
    valley_mwh = float(df.loc[valley_idx, 'predicted_mwh'])
    
    off_peak_mask = df['predicted_mwh'] < (0.85 * avg_mwh)
    off_peak_hours = df.loc[off_peak_mask, 'hour'].unique().tolist()
    off_peak_hours = [int(h) for h in off_peak_hours]
    
    df['delta'] = df['predicted_mwh'].diff().fillna(0)
    max_ramp_idx = df['delta'].abs().idxmax()
    max_ramp_hour = int(df.loc[max_ramp_idx, 'hour'])
    max_ramp_delta = float(df.loc[max_ramp_idx, 'delta'])
    
    # Trend slope using numpy polyfit
    x = np.arange(len(df))
    y = df['predicted_mwh'].values
    if len(df) > 1:
        slope, _ = np.polyfit(x, y, 1)
    else:
        slope = 0.0
        
    trend_direction = "rising" if slope > 0 else "falling"
    
    anomaly_threshold = avg_mwh + 2 * std_mwh
    anomaly_risk_mask = df['predicted_mwh'] > anomaly_threshold
    anomaly_risk_hours = df.loc[anomaly_risk_mask, 'hour'].unique().tolist()
    anomaly_risk_hours = [int(h) for h in anomaly_risk_hours]
    
    return {
        "peak_hour": int(peak_hour),
        "peak_mwh": round(float(peak_mwh), 1),
        "valley_hour": int(valley_hour),
        "valley_mwh": round(float(valley_mwh), 1),
        "avg_mwh": round(float(avg_mwh), 1),
        "off_peak_hours": off_peak_hours,
        "max_ramp_hour": int(max_ramp_hour),
        "max_ramp_delta": round(float(max_ramp_delta), 1),
        "trend_direction": trend_direction,
        "trend_slope_mwh_per_hour": round(float(slope), 2),
        "anomaly_risk_hours": anomaly_risk_hours,
        "total_hours": int(len(df))
    }
