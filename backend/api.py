import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()

from fastapi import HTTPException
from pydantic import BaseModel
from predict import app
from range_explain_pipeline import RangeExplainPipeline
from range_schemas import RangeExplainRequest, RangeExplainResponse
import api_range_chat
from insights_pipeline import run_insights_pipeline


@lru_cache(maxsize=1)
def _get_chat_system():
    from pipeline import EnergyForecastingSystem

    return EnergyForecastingSystem(data_path="Energy Consumption Dataset.xlsx")


@lru_cache(maxsize=1)
def _get_range_pipeline():
    return RangeExplainPipeline()

insights_cache = {}

@app.get("/api/operational_insights")
async def get_insights(start: str = None, end: str = None, resolution: str = "hourly"):
    cache_key = f"{start}_{end}_{resolution}"
    if cache_key in insights_cache:
        return insights_cache[cache_key]
    
    result = run_insights_pipeline(start, end, resolution)
    if "error" not in result:
        insights_cache[cache_key] = result
    return result

class QueryRequest(BaseModel):
    query: str
    mode: str = "FORECAST"
    ui_state: dict = {}

class QueryResponse(BaseModel):
    insight: str
    label: str

@app.post("/api/chat", response_model=QueryResponse)
async def chat_endpoint(request: QueryRequest):
    try:
        # Run the multi-agent pipeline
        system = _get_chat_system()
        result = system.process_query(request.query, request.ui_state, request.mode)
        if not result:
             raise HTTPException(status_code=500, detail="Pipeline failed to produce an output.")
        
        # Extract properties safely depending on the mode flow used
        insight_text = result.get("insight") or result.get("final_insight", "")
        
        label_text = result.get("label", "")
        if not label_text and "backend_context" in result:
            label_text = result["backend_context"].get("label", "Forecast Output")

        return QueryResponse(
            insight=insight_text,
            label=label_text or "Forecast Output"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/range-chat", response_model=RangeExplainResponse)
async def range_chat(request: RangeExplainRequest):
    try:
        result = _get_range_pipeline().run(
            start_time=request.start_time,
            end_time=request.end_time,
            user_query=request.user_query,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {exc}")
    return RangeExplainResponse(
        insight=result["insight"],
        analyst_plan=result["analyst_plan"],
        feature_summary=result["feature_summary"],
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
