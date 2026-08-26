# EnergyAI - AI Energy Consumption Forecasting Dashboard

A hackathon-demo-ready **Next.js 14** dashboard for energy consumption forecasting, anomaly detection, model metrics, interpretability placeholders, sustainability insights, and an interactive 3D grid.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

If you are in the repository root (`ps1_zerogravity`) instead of this folder, the root `package.json`
changes into `energy-dashboard` before running `npm run dev`, `npm run build`, `npm run start`, or `npm run lint`.

## Tech Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- Recharts
- Lucide Icons
- React Three Fiber
- Zustand
- Orbitron, Exo 2, JetBrains Mono

## Project Structure

```text
energy-dashboard/
app/
components/
modules/dashboard/
modules/charts/
modules/metrics/
modules/anomalies/
modules/insights/
modules/3d-scene/
services/api/
store/
types/
utils/
```

## API Contract

The frontend calls:

- `/api/predict?model=lstm`
- `/api/metrics?model=lstm`
- `/api/anomalies?model=lstm`
- `/api/insights?model=lstm`

Prediction responses follow:

```json
{
  "timestamps": [],
  "actual": [],
  "predicted": [],
  "anomalies": [],
  "metrics": {
    "mae": 0,
    "rmse": 0,
    "mape": 0
  }
}
```

The current API routes use deterministic mock inference in `utils/mock-energy.ts`. Replace the route handler seam in `app/api/predict/route.ts` with a backend call that loads saved ARIMA, SARIMA, Prophet, LSTM, or XGBoost artifacts.
