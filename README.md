# DigiGreen Youth M&E Dashboard

A full-stack monitoring and evaluation (M&E) dashboard for the **GENIE DigiGreen Youth Employment Project** in Côte d'Ivoire (May 2024 – December 2027), implemented by Global Green Growth Institute (GGGI) with KOICA funding.

Tracks youth employment outcomes through digital infrastructure and green skills development across **35 Centers**.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS + Framer Motion |
| Charts | Recharts |
| Maps | Leaflet + React-Leaflet |
| Backend | FastAPI (Python) |
| AI | OpenAI GPT-4o (RAG-based report parsing) |
| Deployment | Vercel (frontend) |

---

## Getting Started

### Frontend

```bash
npm install
npm run dev       # Dev server at http://localhost:5173
npm run build     # TypeScript check + production build
```

### Backend

```bash
cd backend
pip install fastapi openai python-dotenv pandas pypdf python-docx uvicorn
python main.py    # API server at http://localhost:8000
```

Create a `.env` file in `backend/` with:

```
OPENAI_API_KEY=your_key_here
```

---

## Features

- **KPI Dashboard** — Real-time tracking of logframe indicators vs. targets
- **Centers Map** — Geographic visualization of 35 project centers across Côte d'Ivoire
- **Activity Tracker** — Progress monitoring per output activity
- **Budget Tracking** — Planned vs. spent by activity
- **Risk Register** — Risk log with mitigation status
- **Smart Uploader** — AI-powered document ingestion (PDF/DOCX/XLSX) that auto-extracts M&E data
- **Report Generator** — Automated narrative report generation

---

## Data Architecture

All M&E data is stored as JSON files:

| File | Description |
|------|-------------|
| `public/logframe_structured.json` | Indicator master list with targets |
| `public/performance_actuals.json` | Current KPI values |
| `public/narratives.json` | Qualitative progress narratives |
| `public/budget_plan.json` / `budget_spent.json` | Budget data |
| `public/risk_register.json` | Risk log |
| `public/centers.json` | Center metadata and locations |

### Data Flow

1. JSON files in `public/` serve as the live data store
2. `src/hooks/useGENIEData.js` merges logframe definitions with actuals and narratives
3. Smart Uploader sends documents to `POST /analyze-report` (GPT-4o extracts structured data)
4. Extracted data is saved via `POST /commit-data`

---

## M&E Context

- **Indicator ID format**: `1.1.4`, `2.2.2.1` (Outcome.Output.Indicator)
- Enrollees ≠ Certified — trainees are only counted after passing assessment
- Both cumulative and annual targets are tracked per indicator
- Total project budget: **$8,250,000 USD**

---

## Project

**GENIE DigiGreen Youth Employment Project**
Implementing Agency: Global Green Growth Institute (GGGI)
Donor: KOICA (Korea International Cooperation Agency)
Country: Côte d'Ivoire
Duration: May 2024 – December 2027
