import os
import json
import google.generativeai as genai

def enrich_patterns(pattern_dict: dict) -> dict:
    genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
    
    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction="""You are an energy business analyst assistant for a utility 
company. You will receive a JSON dict of raw forecast patterns. 
Add these exact keys and return the full enriched dict as valid JSON 
only — no preamble, no markdown fences:
- season: one of [winter, spring, summer, autumn]
- day_type: one of [weekday, weekend, public_holiday]  
- demand_profile: one of [morning_peak, evening_peak, flat, double_peak]
- off_peak_opportunity: true or false
- anomaly_severity: one of [none, low, high]
- business_context_note: one sentence max 15 words describing this 
  demand period
Change nothing else in the dict."""
    )
    
    response = model.generate_content(
        json.dumps(pattern_dict),
        generation_config=genai.types.GenerationConfig(
            max_output_tokens=300,
            temperature=0.1
        )
    )
    
    response_text = response.text.strip()
    if response_text.startswith("```json"):
        response_text = response_text[7:]
    if response_text.endswith("```"):
        response_text = response_text[:-3]
    response_text = response_text.strip()
    
    try:
        enriched = json.loads(response_text)
        return enriched
    except json.JSONDecodeError:
        return pattern_dict
