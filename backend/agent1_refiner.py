import json
import os
from google import genai
from google.genai import types
from schemas import QueryRefinerOutput

# Initialize Gemini Client
# It will automatically pick up GEMINI_API_KEY from environment variables
api_key = os.environ.get("GEMINI_API_KEY", "")
if api_key:
    client = genai.Client(api_key=api_key)
else:
    client = genai.Client()

class QueryRefiner:
    def __init__(self):
        # Use gemini-2.5-flash for the new SDK
        self.model_name = "gemini-2.5-flash"

    def refine(self, user_query: str, ui_state: dict = None) -> QueryRefinerOutput:
        ui_state_json = json.dumps(ui_state, indent=2) if ui_state else "{}"
        prompt = f"""
        You are a query refinement agent. Read the incoming user query AND the ui_state JSON that arrives with it.
        Extract and return ONLY a strict JSON object with these exact fields:
        - query_type (one of: "peak", "average", "range", "specific_hour", "trend")
        - target_start (ISO datetime string)
        - horizon_hours (integer)
        - granularity (one of: "hourly", "daily")
        - run_model (always true for this mode)
        
        CRITICAL RULES:
        1. Look at `resolution` in the UI state and use it to set `granularity` (if resolution is daily, granularity is daily, etc.).
        2. Look at `current_date_range.start` and `current_date_range.end` to calculate `horizon_hours` (the difference between end and start in hours). Set `target_start` to the start date.
        3. Only adjust these dates if the user query explicitly overrides them (e.g. "for tomorrow").
        4. Never write any natural language explanation. Output raw JSON only. No markdown, no preamble.
        
        UI State:
        {ui_state_json}
        
        User Query: {user_query}
        """
        
        response = client.models.generate_content(
            model=self.model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            )
        )
        try:
            data = json.loads(response.text)
            return QueryRefinerOutput(**data)
        except Exception as e:
            raise ValueError(f"Failed to parse Agent 1 output: {e}\nRaw output: {response.text}")
