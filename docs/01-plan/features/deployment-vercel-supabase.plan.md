# Plan: Simplified Deployment with Vercel and Supabase

> **Feature**: deployment-vercel-supabase
> **Created**: 2026-02-03
> **Status**: Draft
> **Phase**: Plan

---

## 1. Executive Summary

This plan outlines a simplified, cost-effective, and scalable deployment strategy for the DigiGreen Youth Dashboard. It replaces the multi-provider (Vercel + Railway + Supabase) recommendation from the `dashboard-expansion` plan with a streamlined two-provider setup: **Vercel** for hosting the frontend and backend, and **Supabase** for the database and authentication.

This approach leverages Vercel's free tier for serverless functions, eliminating the need for a separate backend host like Railway for this stage of the project.

---

## 2. Target Architecture

The application will be structured as follows:

| Component | Technology | Hosting Provider | Description |
| :--- | :--- | :--- | :--- |
| **Frontend** | React (Vite) | **Vercel** | The user-facing web interface. Served as a fast static site. |
| **Backend** | FastAPI (Python) | **Vercel Serverless Functions** | The API layer that processes requests, interacts with the AI, and communicates with the database. |
| **Database** | PostgreSQL | **Supabase** | The persistent data store, replacing the local JSON files. |
| **Authentication** | Supabase Auth | **Supabase** | Manages user login, roles, and access control. |

**Data Flow:**
`User's Browser (Vercel Frontend) <--> API (Vercel Serverless Function) <--> Database (Supabase)`

---

## 3. Migration and Deployment Plan

This plan supersedes the JSON file-based storage and prepares the application for a production environment.

### Phase 1: Database Setup (Supabase)

**Goal**: Create a cloud-hosted PostgreSQL database and schema that mirrors the existing data structure.

**Steps**:
1.  **Create Supabase Project**:
    *   Sign up for a free account at supabase.com.
    *   Create a new project.
    *   Save the Project URL, `anon` key, and database connection string (for the backend).

2.  **Define Database Schema**:
    *   Use the Supabase Table Editor or SQL scripts to create tables.
    *   **`activities` table**: Based on `public/activities.json`. Columns should include `id`, `name`, `description`, `status`, `progress`, `plannedStart`, `plannedEnd`, etc.
    *   **`centers` table**: Based on `public/centers.json`. To store details for all 35 centers.
    *   **`logframe` table**: Based on `public/logframe_structured.json`.
    *   **`performance_actuals` table**: To store historical indicator data.
    *   **`narratives` table**: To store narrative updates.
    *   **`budget_plan` table**: Based on `public/budget_plan.json`. To store the planned budget for each activity.
    *   **`budget_spent` table**: Based on `public/budget_spent.json`. To track expenditures against the plan.
    *   **`risks` table**: Based on `public/risk_register.json`. To store the project's risk register.
    *   **`mitigations` table**: Based on `public/risk_mitigation.json`. To store risk mitigation strategies.
    *   **`project_metadata` table**: Based on `public/project_metadata.json`. For storing overall project metadata like key dates.
    *   **`ai_corrections` table**: To replace `context/past_corrections.json`.

3.  **Seed Initial Data (Optional but Recommended)**:
    *   Write a one-time script to read the existing JSON files and populate the new Supabase tables. This ensures the dashboard has data on first launch.

---

### Phase 2: Backend Refactoring (FastAPI)

**Goal**: Modify the FastAPI application to communicate with Supabase instead of local JSON files.

**Steps**:
1.  **Add Database Client**:
    *   Install a Python library for interacting with PostgreSQL. `psycopg2-binary` or `sqlalchemy` are good choices.
    *   `pip install psycopg2-binary python-dotenv`

2.  **Update Environment Variables**:
    *   Add the Supabase database connection string to the `.env` file in the `backend` directory.
    *   `DATABASE_URL="postgresql://..."`

3.  **Refactor Data Helpers**:
    *   Remove `update_json_file()` from `backend/main.py`.
    *   Rewrite `load_project_ids()`, `load_rag_knowledge()`, `load_budget_context()`, and `update_budget_spent()` to query the Supabase database instead of reading local files.
    *   All file paths (`FILE_LOGFRAME`, `FILE_ACTIVITIES`, etc.) should be removed.

4.  **Update Endpoints**:
    *   **`/commit-data`**: Modify this endpoint to execute `INSERT` or `UPDATE` SQL queries against the Supabase tables.
    *   **`/learn-mistake`**: Modify this to `INSERT` a new rule into the `ai_corrections` table.
    *   **`/analyze-report`**: This endpoint will now fetch its context (`ids_list`, `knowledge_base`) from the database.

---

### Phase 3: Vercel Deployment

**Goal**: Configure and deploy the entire application (frontend + backend) to Vercel.

**Steps**:
1.  **Project Setup**:
    *   Create a new project on Vercel and connect it to your GitHub repository.

2.  **Configure `vercel.json`**:
    *   Create a `vercel.json` file in the root of the project to configure the serverless function and routing. This tells Vercel how to handle requests to your Python backend.

    ```json
    {
      "builds": [
        {
          "src": "backend/main.py",
          "use": "@vercel/python"
        },
        {
          "src": "package.json",
          "use": "@vercel/static-build",
          "config": { "distDir": "dist" }
        }
      ],
      "rewrites": [
        {
          "source": "/api/(.*)",
          "destination": "/backend/main.py"
        },
        {
          "source": "/(.*)",
          "destination": "/index.html"
        }
      ]
    }
    ```
    *Note: The frontend `rewrites` rule ensures that client-side routing works correctly.*

3.  **Configure Backend Dependencies**:
    *   Create a `requirements.txt` file in the `backend` directory listing all Python dependencies (e.g., `fastapi`, `uvicorn`, `openai`, `psycopg2-binary`). Vercel uses this to install packages for the serverless function.

4.  **Update Frontend API Calls**:
    *   Ensure the frontend is making API calls to the relative path `/api/...` (e.g., `/api/analyze-report`). The `rewrites` in `vercel.json` will route these to the backend function.

5.  **Set Environment Variables in Vercel**:
    *   In the Vercel project settings, add the `OPENAI_API_KEY` and `DATABASE_URL` environment variables. **Do not commit these to your repository.**

6.  **Deploy**:
    *   Push your code to the main branch. Vercel will automatically build and deploy the application.
    *   Vercel will provide a public URL (e.g., `digigreen-dashboard.vercel.app`).

---

## 4. Success Metrics

| Metric | Target | How to Measure |
| :--- | :--- | :--- |
| **Deployment** | Public URL is live and accessible | Vercel dashboard |
| **Functionality** | Smart Uploader saves data successfully | Manual test: Upload a report, commit data, verify in Supabase |
| **Data Persistence** | Data remains after a browser refresh | Refresh the page and see if data persists |
| **Performance** | Initial page load < 3 seconds | Vercel Analytics / Browser DevTools |

---

## 5. Next Steps

1.  **Approve this plan.**
2.  **Begin Phase 1**: Set up the Supabase project and schema.
3.  **Proceed to Phase 2**: Refactor the backend to use the new database.
4.  **Complete Phase 3**: Configure Vercel and deploy.
