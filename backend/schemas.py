from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Union

class DateRange(BaseModel):
    start: str = Field(..., description="Start date in YYYY-MM-DD format")
    end: str = Field(..., description="End date in YYYY-MM-DD format")

class QueryRefinerOutput(BaseModel):
    query_type: str = Field(..., description="peak | average | range | specific_hour | trend")
    target_start: str = Field(..., description="ISO datetime string")
    horizon_hours: int
    granularity: str = Field(..., description="hourly | daily")
    run_model: bool = Field(..., description="Always true for this mode")

class StatsSummary(BaseModel):
    average: float
    peak: float
    trend: str = Field(..., description="increasing | decreasing | stable")
    anomaly: bool

class Metrics(BaseModel):
    MAE: float
    RMSE: float
    MAPE: float

class BackendProcessorOutput(BaseModel):
    stats_summary: StatsSummary
    forecast: List[float]
    metrics: Metrics
    region_facts: List[str]
    festival_context: List[str]
    question_type: str
    granularity: str
    label: str
