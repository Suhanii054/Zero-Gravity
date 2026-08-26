import os
from groq import Groq
from schemas import BackendProcessorOutput

# Initialize Groq API
client = Groq(api_key=os.environ.get("GROQ_API_KEY", "your-groq-api-key"))

class AnswerGenerator:
    def __init__(self):
        self.model_name = "llama-3.3-70b-versatile"

    def generate(self, context: BackendProcessorOutput) -> str:
        
        context_json = context.model_dump_json(indent=2)
        
        system_prompt = """
        You are an expert energy data analyst. Your role is to convert structured backend data into a human-readable insight.
        
        STRICT REQUIREMENTS:
        - Start with a direct answer
        - Explain key insights using stats
        - Reference MAE / RMSE / MAPE for reliability (if model was run and values are > 0)
        - Mention anomalies if present
        - Use region + festival context when relevant
        - Do NOT hallucinate data
        - Do NOT ignore provided metrics
        - NEVER output raw JSON
        
        Response Structure:
        1. Direct answer
        2. Key insights (data-backed)
        3. Reliability explanation (if applicable)
        4. Contextual factors (region/festival/anomaly)
        5. Optional recommendation
        
        Tone:
        - Analytical
        - Clear
        - Concise
        - Confident
        """
        
        user_prompt = f"Please generate an insight based on the following backend data:\n{context_json}"
        
        try:
            chat_completion = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                model=self.model_name,
                temperature=0.3,
                max_tokens=300
            )
            return chat_completion.choices[0].message.content
        except Exception as e:
            return f"Error generating answer: {str(e)}"

    def generate_forecast_answer(self, data_dict: dict, user_query: str) -> str:
        import json
        data_json = json.dumps(data_dict, indent=2)
        
        system_prompt = """
You are a professional AI Energy Forecasting Assistant.

Your job is to present structured data in a clean, readable, well-formatted way.

STRICT FORMATTING RULES:
- Each section header MUST be on its own line
- Content MUST start on the next line (never same line as header)
- Leave ONE blank line between sections
- Use bullet points only inside sections
- Never merge sections into a paragraph
- Keep formatting visually clean and consistent

STYLE:
- Professional, analytical tone
- Concise but structured
- Highlight key numbers using **bold**

SECTIONS TO INCLUDE (use exactly these titles):

🔹 Forecast Overview  
🔹 Key Metrics  
🔹 Model Confidence  
🔹 Context Insights  
🔹 AI Insight  

IMPORTANT:
If formatting rules are broken, regenerate the response correctly.
"""
        
        user_prompt = f"""
Use the following data to generate a structured forecast response.

DATA:
{data_json}

USER QUERY:
{user_query}

Instructions:
- Follow the exact section structure
- Do not change section titles
- Do not compress into one paragraph
- Ensure proper spacing and line breaks
"""
        
        try:
            chat_completion = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt.strip()},
                    {"role": "user", "content": user_prompt.strip()}
                ],
                model=self.model_name,
                temperature=0.1,
                max_tokens=400
            )

            response = chat_completion.choices[0].message.content.strip()

            # Post-processing to enforce formatting (non-hardcoded)
            response = self._post_process_format(response)

            return response

        except Exception as e:
            return f"Error generating forecast answer: {str(e)}"

    def _post_process_format(self, text: str) -> str:
        import re

        sections = [
            "🔹 Forecast Overview",
            "🔹 Key Metrics",
            "🔹 Model Confidence",
            "🔹 Context Insights",
            "🔹 AI Insight"
        ]

        for section in sections:
            text = re.sub(rf"{section}\s*", f"\n{section}\n", text)

        text = re.sub(r"\n{3,}", "\n\n", text)

        return text.strip()