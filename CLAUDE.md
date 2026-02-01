# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DigiGreen Youth M&E Dashboard - A full-stack monitoring and evaluation system for the GENIE DigiGreen Youth Employment Project in Côte d'Ivoire (May 2024 - December 2027). Tracks youth employment through digital infrastructure and green skills development across 35 Centers.

## Commands

```bash
# Frontend (from root)
npm install          # Install dependencies
npm run dev          # Start dev server on http://localhost:5173
npm run build        # TypeScript check + Vite production build

# Backend
cd backend
pip install fastapi openai python-dotenv pandas pypdf python-docx
python main.py       # FastAPI server on http://localhost:8000
```

## Architecture

**Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + Leaflet maps

**Backend**: FastAPI + OpenAI GPT-4o for RAG-based report analysis

**Data Storage**: JSON files in `public/` (frontend access) and `backend/` (processing)

### Key Data Flow

1. JSON files in `public/` contain all M&E data (logframe, actuals, budgets, risks, centers)
2. `useGENIEData.js` hook merges logframe definitions with performance actuals and narratives
3. SmartUploader component sends documents to `/analyze-report` endpoint
4. Backend uses GPT-4o with context from `logframe_definitions.txt` to extract structured data
5. Extracted data commits back to JSON files via `/commit-data` endpoint

### Frontend Structure

- **Pages**: Dashboard, CentersMap, ActivityTracker, TargetsMilestones, BudgetTracking, RiskRegister, SmartUploader
- **Path alias**: `@/` → `src/`
- **Routing**: React Router DOM in `App.tsx`

### Backend Endpoints

- `POST /analyze-report` - AI-powered document parsing (PDF/DOCX/XLSX)
- `POST /learn-mistake` - Self-learning from user corrections
- `POST /commit-data` - Save extracted data to JSON files

## M&E Domain Context

**Indicator ID patterns**: `1.1.4`, `2.2.2.1` (Outcome.Output.Indicator)

**Key rules**:
- Enrollees ≠ Certified (not counted until assessment pass)
- Training completion requires assessment results
- Cumulative vs. Annual targets differ by indicator

**Budget**: $8,250,000 USD total, activity-based budgeting

## Key Files

| File | Purpose |
|------|---------|
| `src/hooks/useGENIEData.js` | Data merging logic (logframe + actuals + narratives) |
| `backend/main.py` | FastAPI server with RAG logic |
| `backend/context/logframe_definitions.txt` | M&E rulebook for AI extraction |
| `public/logframe_structured.json` | Indicator master list with targets |
| `public/performance_actuals.json` | Current KPI values |

## Environment

Backend requires `.env` with `OPENAI_API_KEY` (not tracked in git).

CORS configured for `localhost:5173` and `localhost:5174`.
