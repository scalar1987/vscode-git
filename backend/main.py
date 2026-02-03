from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI, APIStatusError
from dotenv import load_dotenv
import os
import json
import pandas as pd
from pypdf import PdfReader
from docx import Document
import io
import psycopg2
from psycopg2.extras import execute_values, RealDictCursor
from typing import List, Dict, Any, Optional
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode
from datetime import datetime

# --- CONFIGURATION ---
ENV_PATH = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path=ENV_PATH, override=True)

api_key = os.getenv("OPENAI_API_KEY")
if api_key:
    api_key = api_key.strip()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL:
    DATABASE_URL = DATABASE_URL.strip().strip('"').strip("'").strip()

# Static context files can still be read from the filesystem
CTX_DEFINITIONS = "context/logframe_definitions.txt"

app = FastAPI()

# --- CORS SETUP ---
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "https://digigreen-dashboard.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)

client = OpenAI(api_key=api_key)

# --- DATABASE HELPERS ---

def get_db_connection():
    """Establishes a connection to the PostgreSQL database."""
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable is not set.")
    try:
        # Sanitize DATABASE_URL: psycopg2 doesn't recognize the 'pgbouncer' parameter
        url = DATABASE_URL.strip().strip('"').strip("'").strip()
        parsed = urlparse(url)
        query = parse_qs(parsed.query)

        # Remove pgbouncer and ensure sslmode=require
        query.pop('pgbouncer', None)
        if 'sslmode' not in query:
            query['sslmode'] = ['require']

        new_query = urlencode(query, doseq=True)
        sanitized_url = urlunparse(parsed._replace(query=new_query))

        conn = psycopg2.connect(sanitized_url)
        return conn
    except psycopg2.OperationalError as e:
        print(f"❌ Could not connect to the database: {e}")
        raise

# --- CONTEXT LOADING HELPERS (from Database) ---

def load_project_ids():
    """Load Logframe Indicators and Activities from the database for AI context."""
    context_text = ""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Load Logframe Indicators
            cur.execute("SELECT id, parent_id, parent_desc, label, baseline, targets FROM logframe_indicators ORDER BY id;")
            logframe = cur.fetchall()
            
            context_text += "=== LOGFRAME STRUCTURE (INDICATOR DEFINITIONS) ===\n\n"
            current_parent = None
            for item in logframe:
                if item['parent_id'] != current_parent:
                    current_parent = item['parent_id']
                    context_text += f"\n--- {item['parent_id']}: {item['parent_desc']} ---\n"
                
                targets = item.get('targets', {})
                total_target = targets.get('total', 'N/A')
                context_text += f"  • ID: {item['id']}\n"
                context_text += f"    Label: {item['label']}\n"
                context_text += f"    Baseline: {item['baseline']} | Total Target: {total_target}\n"
                context_text += f"    Yearly Targets: 2024={targets.get('2024', 0)}, 2025={targets.get('2025', 0)}, 2026={targets.get('2026', 0)}, 2027={targets.get('2027', 0)}\n"

            # Load Activities
            cur.execute("SELECT id, name, status FROM activities ORDER BY id;")
            activities = cur.fetchall()
            context_text += "\n\n=== VALID ACTIVITY IDs ===\n"
            for item in activities:
                context_text += f"  • ID: {item['id']} | Name: {item['name']} | Current Status: {item['status']}\n"

    except (Exception, psycopg2.DatabaseError) as error:
        print(f"Error loading project IDs: {error}")
        return "Error: Could not load project IDs from database."
    finally:
        if conn:
            conn.close()
    return context_text

def load_rag_knowledge():
    """Load static definitions and dynamic AI corrections from the database."""
    rag_text = ""
    # 1. Static Project Definitions from file
    if os.path.exists(CTX_DEFINITIONS):
        with open(CTX_DEFINITIONS, "r") as f:
            rag_text += f"\n=== PROJECT RULES & DEFINITIONS ===\n{f.read()}\n"

    # 2. Dynamic Past Corrections (Memory) from Database
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT correction_rule FROM ai_corrections ORDER BY created_at DESC LIMIT 20;")
            corrections = cur.fetchall()
            if corrections:
                rag_text += "\n=== PAST MISTAKES TO AVOID (RULES) ===\n"
                for item in corrections:
                    rag_text += f"- RULE: {item['correction_rule']}\n"
    except (Exception, psycopg2.DatabaseError) as error:
        print(f"Error loading RAG knowledge: {error}")
    finally:
        if conn:
            conn.close()
    return rag_text


def load_budget_context():
    """Load budget plan and spent data for AI context"""
    context = "\n\n=== BUDGET TRACKING ===\n"
    context += "Total Project Budget: $8,250,000 USD\n"
    context += "Activity-based budgeting structure.\n\n"

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Calculate cumulative spent
            cur.execute("SELECT SUM(amount) as total FROM expenditures;")
            total_spent = cur.fetchone()['total'] or 0
            context += f"Cumulative Spent to Date: ${total_spent:,.2f}\n\n"

            # Get planned and spent per activity
            query = """
            SELECT 
                bp.activity_id,
                SUM(bp.planned_amount) as planned,
                (SELECT SUM(e.amount) FROM expenditures e WHERE e.activity_id = bp.activity_id) as spent
            FROM budget_plan bp
            GROUP BY bp.activity_id
            ORDER BY bp.activity_id;
            """
            cur.execute(query)
            budget_summary = cur.fetchall()

            context += "Activity Budget Status:\n"
            for item in budget_summary:
                planned = item['planned'] or 0
                spent = item['spent'] or 0
                pct = (spent / planned * 100) if planned > 0 else 0
                status = "On Budget" if pct <= 100 else "Over Budget"
                context += f"  • {item['activity_id']}: Planned ${planned:,.0f} | Spent ${spent:,.0f} ({pct:.1f}%) - {status}\n"
    except (Exception, psycopg2.DatabaseError) as error:
        print(f"Error loading budget context: {error}")
    finally:
        if conn:
            conn.close()
    return context

# --- HELPER 2: TEXT EXTRACTION ---
def extract_text_from_file(file_content: bytes, filename: str) -> str:
    file_stream = io.BytesIO(file_content)
    text = ""
    try:
        if filename.endswith(".pdf"):
            reader = PdfReader(file_stream)
            for page in reader.pages:
                text += page.extract_text() + "\n"
        elif filename.endswith(".docx"):
            doc = Document(file_stream)
            for para in doc.paragraphs:
                text += para.text + "\n"
        elif filename.endswith(".xlsx") or filename.endswith(".xls"):
            df = pd.read_excel(file_stream)
            text = df.to_string()
        elif filename.endswith(".json"):
            data = json.load(file_stream)
            text = json.dumps(data, indent=2)
        else:
            text = file_content.decode("utf-8")
        return text
    except Exception as e:
        return f"Error reading file: {str(e)}"

# --- DATA MODELS ---
class ValidatedUpdate(BaseModel):
    date: str
    source: str
    indicator_updates: List[Dict[str, Any]]
    activity_updates: List[Dict[str, Any]]
    budget_updates: List[Dict[str, Any]] = []  # New: budget expenditure updates

class CorrectionFeedback(BaseModel):
    original_text: str  # Context (e.g., "150 students enrolled")
    ai_prediction: Any  # What AI got wrong (e.g., 150)
    user_correction: Any # What user fixed (e.g., 0)
    comments: str = ""

# --- ENDPOINTS ---

@app.post("/analyze-report")
async def analyze_report(file: UploadFile = File(...)):
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured.")

    # 1. Read File
    content = await file.read()
    raw_text = extract_text_from_file(content, file.filename)

    # 2. Load Context (RAG + IDs + Budget)
    ids_list = load_project_ids()
    knowledge_base = load_rag_knowledge()
    budget_context = load_budget_context()

    # 3. Prompt
    system_prompt = f"""
    You are the Senior M&E Database Manager for DigiGreen.

    === YOUR KNOWLEDGE BASE (RULES & MISTAKES) ===
    {knowledge_base}

    === REFERENCE DATA (ONLY USE THESE IDs) ===
    {ids_list}

    {budget_context}

    TASK:
    Analyze the report. Extract updates for INDICATORS, ACTIVITIES, and BUDGET expenditures.

    OUTPUT FORMAT (Strict JSON):
    {{
        "date": "YYYY-MM-DD",
        "source": "{file.filename}",
        "indicator_updates": [
            {{ "id": "MATCHING_ID", "value": <number>, "narrative": "<explanation>" }}
        ],
        "activity_updates": [
            {{ "id": "MATCHING_ID", "status": "<Delayed/On Track/Completed>", "progress": <0-100>, "notes": "<reason>" }}
        ],
        "budget_updates": [
            {{ "activity_id": "MATCHING_ID", "amount": <number>, "year": <2024|2025|2026|2027>, "category": "<Equipment/Training/etc>", "description": "<what was purchased>" }}
        ]
    }}

    BUDGET EXTRACTION RULES:
    - Only extract if explicit dollar amounts are mentioned
    - Match activity_id to valid activity IDs (e.g., 1.1.4, 2.2.2)
    - Year should match when the expenditure occurred
    - If no budget data found, return empty budget_updates array
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Analyze this report:\n\n{raw_text[:15000]}"}
            ],
            temperature=0,
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)

    except APIStatusError as e:
        print(f"OpenAI API Error: {e.status_code} - {e.response}")
        raise HTTPException(status_code=e.status_code, detail=f"OpenAI API error: {e.message}")
    except Exception as e:
        print(f"AI Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze report: {str(e)}")

@app.post("/learn-mistake")
async def learn_mistake(feedback: CorrectionFeedback):
    try:
        learning_prompt = f"""
        Analyze this mistake to create a general rule for future reports.
        
        CONTEXT:
        - Report Text Context: "{feedback.original_text}"
        - AI Guessed: {feedback.ai_prediction}
        - User Corrected to: {feedback.user_correction}
        - User Comment: "{feedback.comments}"
        
        TASK:
        Write a concise, negative rule (what NOT to do) or a clarification rule.
        Format: "IF report mentions [keyword], THEN [instruction]."
        Example: "IF report mentions 'enrolled', THEN count is 0 until certified."
        """
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "system", "content": learning_prompt}],
            temperature=0
        )
        
        new_rule = response.choices[0].message.content.strip()
        
        # Save the new rule to the database
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO ai_corrections (correction_rule, original_text, ai_prediction, user_correction, comments)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (new_rule, feedback.original_text, json.dumps(feedback.ai_prediction), json.dumps(feedback.user_correction), feedback.comments)
                )
            conn.commit()
            return {"status": "success", "new_rule": new_rule}
        except (Exception, psycopg2.DatabaseError) as db_error:
            print(f"Database Error during learning: {db_error}")
            raise HTTPException(status_code=500, detail="Failed to save learning rule to database.")
        finally:
            if conn:
                conn.close()

    except Exception as e:
        print(f"Learning Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process learning feedback: {str(e)}")

@app.post("/commit-data")
async def commit_data(data: ValidatedUpdate):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            # 1. Save Indicator Performance Actuals
            if data.indicator_updates:
                perf_values = [
                    (item['id'], data.date, data.source, item['value'])
                    for item in data.indicator_updates if 'value' in item and item['value'] is not None
                ]
                if perf_values:
                    execute_values(cur, "INSERT INTO performance_actuals (indicator_id, date, source, value) VALUES %s", perf_values)

            # 2. Save Indicator Narratives
            if data.indicator_updates:
                narr_values = [
                    (item['id'], data.date, data.source, "Updated", item['narrative'])
                    for item in data.indicator_updates if 'narrative' in item and item['narrative']
                ]
                if narr_values:
                    execute_values(cur, "INSERT INTO narratives (indicator_id, date, source, status, narrative) VALUES %s", narr_values)

            # 3. Save Activity Updates
            if data.activity_updates:
                update_values = [
                    (item['progress'], item['status'], item['notes'], datetime.now().isoformat(), item['id'])
                    for item in data.activity_updates
                ]
                if update_values:
                    execute_values(cur, 
                        """
                        UPDATE activities SET progress = data.progress, status = data.status, notes = data.notes, last_updated = data.last_updated::timestamptz
                        FROM (VALUES %s) AS data(progress, status, notes, last_updated, id)
                        WHERE activities.id = data.id;
                        """, 
                        update_values,
                        template="(%s, %s, %s, %s, %s)"
                    )

            # 4. Save Budget Expenditures
            if data.budget_updates:
                exp_values = [
                    (item.get('activity_id'), item.get('amount'), data.date, item.get('description', ''))
                    for item in data.budget_updates if 'amount' in item and item['amount'] is not None
                ]
                if exp_values:
                    execute_values(cur, "INSERT INTO expenditures (activity_id, amount, expenditure_date, description) VALUES %s", exp_values)

        conn.commit()
        return {"status": "success"}

    except (Exception, psycopg2.DatabaseError) as e:
        if conn:
            conn.rollback()
        print(f"Save Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

@app.get("/")
def health_check():
    return {"status": "DigiGreen Brain Online", "mode": "RAG + Self-Learning Enabled"}