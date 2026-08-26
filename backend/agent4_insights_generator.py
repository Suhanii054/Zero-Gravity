import os
import json
from groq import Groq

def generate_insights(enriched_dict: dict) -> list:
    client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
    
    system_prompt = """You are an operational strategy analyst for an energy utility.
You will receive a forecast pattern dict with exact scalar values.
Generate a JSON array of exactly 4 recommendation objects, one per 
category. Output ONLY valid JSON — no text before or after, no fences.

Rules:
- Never invent numbers. Every number must come from the dict.
- Each object must have exactly these keys:
  category (one of: demand_response | revenue | grid_stability | 
  customer_advisory),
  title (max 12 words),
  reasoning (2-3 sentences citing exact values from the dict),
  action (one specific operational action for the company),
  impact_score (integer 1-5, realistic not all 5s)

Category guidance:
- demand_response: reference peak_hour and peak_mwh, suggest load shifting
- revenue: reference off_peak_hours and valley_mwh, suggest monetising 
  idle capacity
- grid_stability: reference anomaly_risk_hours and max_ramp_hour
- customer_advisory: reference off_peak_opportunity and valley_hour,
  suggest EV charging or tariff shifts for end customers"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(enriched_dict)}
        ],
        temperature=0.1,
        max_tokens=800
    )
    
    response_text = response.choices[0].message.content.strip()
    if response_text.startswith("```json"):
        response_text = response_text[7:]
    if response_text.endswith("```"):
        response_text = response_text[:-3]
    response_text = response_text.strip()
    
    try:
        insights = json.loads(response_text)
        return insights
    except json.JSONDecodeError:
        return []
