# Energy Forecasting Multi-Agent System

I have successfully designed and implemented the 2-agent + deterministic backend architecture. The code has been generated in the `e:\Zerogravity_final\ps1_zerogravity\backend` directory.

## Architecture Overview

1. **Agent 1: Query Refiner** (`agent1_refiner.py`)
   - Uses `google.generativeai` with the `gemini-1.5-flash` model.
   - Extracts date ranges, granularity, and question types.
   - Outputs strict, valid JSON constrained by Pydantic models.

2. **Deterministic Backend** (`backend_processor.py`)
   - Fully deterministic Python code (no LLM).
   - Generates mock forecasting logic using `Prophet` structure.
   - Computes stats (average, peak, trend, anomaly) and standard error metrics (MAE, RMSE, MAPE).
   - Includes region-based logic and festival context based on dates.
   - Outputs a structured context JSON.

3. **Agent 2: Answer Generator** (`agent2_generator.py`)
   - Uses the `groq` API with the `llama3-70b-8192` model.
   - Receives the backend JSON context.
   - Generates a highly analytical, natural language response answering the user's query while utilizing the backend stats and performance metrics.
   - Strictly controlled prompt ensures it maintains token efficiency and concise language.

4. **Data Definitions** (`schemas.py`)
   - Defined strict Pydantic schemas enforcing input/output rules across all layers of the pipeline.

5. **Main Execution** (`pipeline.py`)
   - Wires up the whole flow for low-latency end-to-end execution.

## How to Run

1. **Install Dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Set Environment Variables**
   Set the API keys for the services before running:
   - `GEMINI_API_KEY`
   - `GROQ_API_KEY`
   *(In PowerShell)*:
   ```powershell
   $env:GEMINI_API_KEY="your_api_key_here"
   $env:GROQ_API_KEY="your_api_key_here"
   ```

3. **Run the Pipeline**
   ```bash
   python pipeline.py
   ```

## Next Steps
- **Data Integration:** The `backend_processor.py` currently has mock Prophet and metrics logic placeholders. You will need to plug in the actual pandas dataframe loading logic and the real `.fit()` and `.predict()` commands using your dataset (like `Energy Consumption Dataset.xlsx`).
- **UI Integration:** The pipeline outputs `final_insight` and `backend_context.label`, which can be easily shipped directly to your Streamlit or Next.js frontend!
