# Adani AI Energy Forecasting Dashboard 

An advanced AI-powered **Energy Consumption Forecasting and Decision-Support Dashboard** designed for operational energy planning. This system combines traditional machine learning forecasting with a cutting-edge Multi-Agent LLM pipeline to not only predict future energy demand but also intelligently explain the "why" behind the numbers.

---

## 🎯 What We Have Made

We have built an end-to-end forecasting ecosystem that allows energy operations teams to:
- **Predict future demand patterns** across hourly, daily, weekly, and monthly horizons.
- **Detect unusual consumption behavior** instantly using dynamic standard-deviation thresholds.
- **Perform What-If Simulations** to understand how demand responds to temperature changes or industrial shifts.
- **Interact with an AI Assistant** that can contextually read the exact graph you are looking at and explain the hidden features driving the forecast.
- **Visualize the Grid in 3D**, providing an animated, live representation of the predicted load intensity.

---

## ⚡ What We Are Predicting

We are predicting **Electricity Consumption (in MWh)** based on historical telemetry. The system utilizes complex calendar features (Fourier transforms for daily/weekly seasonality), holiday tracking, COVID-19 period adjustments, and multi-lag variables (1h to 336h rolling histories) to understand both short-term spikes and long-term seasonal trends.

---

## 🧠 What Models We Used

1. **Core Forecasting Model: LightGBM**
   - The primary deterministic engine uses a trained **LightGBM** model (`lightbgm.txt`). 
   - LightGBM was chosen for its high accuracy in tabular time-series data, fast inference times, and its ability to natively handle complex extracted features like `rolling_mean`, `fourier_daily_sin`, and `lag_168h`.
2. **Robust Fallbacks**
   - The backend includes a deterministic caching and fallback heuristic (averaging recent lags and rolling means) so the dashboard remains functional even if the main model file is temporarily missing.

---

## 🤖 Agentic AI Implementation

Instead of relying on a single monolithic LLM prone to hallucinations, we implemented a **Strict Multi-Agent Pipeline**. The LLMs do *not* guess the data; they act as translators for the deterministic ML backend.

- **Agent 1: Query Refiner (`gemini-1.5-flash`)**
  - Uses Google GenAI to parse natural language questions. It strictly extracts date ranges, aggregation granularities, and context intent, outputting a rigid JSON via Pydantic schemas.
- **Agent 2: Answer Generator (`llama3-70b-8192` via Groq)**
  - Receives the mathematical context (MAPE, RMSE, trends, anomalies) calculated by the Python backend. It formulates a highly analytical, business-ready explanation of the forecast without hallucinating numbers.
- **Agent 3 & 4: Range Explainer Pipeline**
  - Users can highlight a specific time-range on the frontend graph. These agents dynamically analyze the selected region, isolate the top contributing features (e.g., identifying that a spike was caused by a weekend shift or a temperature drop), and provide a localized readout.

---

## 🛠️ Technology Stack

**Backend (Data & AI Layer):**
- **Language**: Python 3.12
- **Framework**: FastAPI + Uvicorn
- **Machine Learning**: LightGBM, Scikit-learn, Pandas, Numpy
- **Agentic AI**: Google GenAI SDK, Groq SDK, Pydantic (for strict LLM schema enforcement)

**Frontend (Dashboard & Visualization Layer):**
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Framer Motion
- **Data Visualization**: Recharts, Plotly.js
- **3D Graphics**: React Three Fiber, Three.js, Drei
- **State Management**: Zustand

---

## ✨ What Makes This Project Unique

1. **Hybrid Intelligence (No LLM Math Hallucinations)**: The absolute strict separation of concerns. The ML backend does the math; the Multi-Agent LLMs strictly do the interpreting.
2. **Explainable AI (XAI) UI Integration**: Rather than a black-box forecast, the UI actively maps "Lag Influence" and "Feature Importance", letting stakeholders know *why* the model made a specific prediction.
3. **What-If Scenario Sandbox**: Planners can artificially inject temperature deltas (+3°C) or industrial demand spikes to see the immediate localized impact on the grid forecast.
4. **Dynamic 3D Digital Twin**: A real-time 3D React Three Fiber scene representing substations and generators. The animation speed, glow intensity, and load flow physically change based on the predicted MWh load coming from the LightGBM model.
5. **Context-Aware Range Chat**: A specialized drag-and-select feature on the chart that passes the exact highlighted timeline coordinates to the AI, allowing the user to ask "Why did it dip here?" and get a contextually accurate response.
