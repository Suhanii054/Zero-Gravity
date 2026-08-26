from __future__ import annotations

from functools import lru_cache

from fastapi import HTTPException

from predict import app
from range_explain_pipeline import RangeExplainPipeline
from range_schemas import RangeExplainRequest, RangeExplainResponse


@lru_cache(maxsize=1)
def _get_range_pipeline() -> RangeExplainPipeline:
    return RangeExplainPipeline()


@app.post("/api/range-chat", response_model=RangeExplainResponse)
async def range_chat(request: RangeExplainRequest) -> RangeExplainResponse:
    try:
        result = _get_range_pipeline().run(
            start_time=request.start_time,
            end_time=request.end_time,
            user_query=request.user_query,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {exc}") from exc
    return RangeExplainResponse(
        insight=result["insight"],
        analyst_plan=result["analyst_plan"],
        feature_summary=result["feature_summary"],
    )
