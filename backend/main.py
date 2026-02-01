from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
import os
import json
import pandas as pd
from pypdf import PdfReader
from docx import Document
import io
from typing import List, Dict, Any, Optional

# --- CONFIGURATION ---
ENV_PATH = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path=ENV_PATH, override=True)
api_key = os.getenv("OPENAI_API_KEY")
if api_key:
    api_key = api_key.strip()

# File Paths (relative to backend folder, but data files in public/)
PUBLIC_DIR = os.path.join(os.path.dirname(__file__), "..", "public")
FILE_LOGFRAME = os.path.join(PUBLIC_DIR, "logframe_structured.json")
FILE_ACTIVITIES = os.path.join(PUBLIC_DIR, "activities.json")
FILE_PERFORMANCE = os.path.join(PUBLIC_DIR, "performance_actuals.json")
FILE_NARRATIVES = os.path.join(PUBLIC_DIR, "narratives.json")
FILE_BUDGET_PLAN = os.path.join(PUBLIC_DIR, "budget_plan.json")
FILE_BUDGET_SPENT = os.path.join(PUBLIC_DIR, "budget_spent.json")
CTX_DEFINITIONS = "context/logframe_definitions.txt"
CTX_CORRECTIONS = "context/past_corrections.json"

app = FastAPI()

# --- CORS SETUP ---
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(api_key=api_key)

# --- HELPER 1: LOAD CONTEXT (RAG & IDs) ---
def load_project_ids():
    context_text = ""
    # Load Indicators with full context
    if os.path.exists(FILE_LOGFRAME):
        with open(FILE_LOGFRAME, "r", encoding="utf-8") as f:
            logframe = json.load(f)
            context_text += "=== LOGFRAME STRUCTURE (INDICATOR DEFINITIONS) ===\n\n"

            # Group by parent (Outcome/Output)
            current_parent = None
            for item in logframe:
                parent = item.get("parent_id", "Unknown")
                parent_desc = item.get("parent_desc", "")

                # Print parent header when it changes
                if parent != current_parent:
                    current_parent = parent
                    context_text += f"\n--- {parent}: {parent_desc} ---\n"

                uid = item.get("id", "N/A")
                label = item.get("label", "No Label")
                baseline = item.get("baseline", "0")
                targets = item.get("targets", {})
                total_target = targets.get("total", "N/A")

                context_text += f"  • ID: {uid}\n"
                context_text += f"    Label: {label}\n"
                context_text += f"    Baseline: {baseline} | Total Target: {total_target}\n"
                context_text += f"    Yearly Targets: 2024={targets.get('2024', 0)}, 2025={targets.get('2025', 0)}, 2026={targets.get('2026', 0)}, 2027={targets.get('2027', 0)}\n"

    # Load Activities
    if os.path.exists(FILE_ACTIVITIES):
        with open(FILE_ACTIVITIES, "r", encoding="utf-8") as f:
            activities = json.load(f)
            context_text += "\n\n=== VALID ACTIVITY IDs ===\n"
            for item in activities:
                aid = item.get("id", "N/A")
                name = item.get("name", "No Name")
                status = item.get("status", "Unknown")
                context_text += f"  • ID: {aid} | Name: {name} | Current Status: {status}\n"
    return context_text

def load_rag_knowledge():
    rag_text = ""
    # 1. Project Definitions
    if os.path.exists(CTX_DEFINITIONS):
        with open(CTX_DEFINITIONS, "r") as f:
            rag_text += f"\n=== PROJECT RULES & DEFINITIONS ===\n{f.read()}\n"

    # 2. Past Corrections (Memory)
    if os.path.exists(CTX_CORRECTIONS):
        try:
            with open(CTX_CORRECTIONS, "r") as f:
                corrections = json.load(f)
                rag_text += "\n=== PAST MISTAKES TO AVOID ===\n"
                for item in corrections:
                    rag_text += f"- RULE: {item.get('correction', '')}\n"
        except:
            pass
    return rag_text


def load_budget_context():
    """Load budget plan and spent data for AI context"""
    context = "\n\n=== BUDGET TRACKING ===\n"
    context += "Total Project Budget: $8,250,000 USD\n"
    context += "Activity-based budgeting structure\n\n"

    budget_plan = {}
    budget_spent = {}

    # Load budget plan
    if os.path.exists(FILE_BUDGET_PLAN):
        try:
            with open(FILE_BUDGET_PLAN, "r", encoding="utf-8") as f:
                plan_data = json.load(f)
                for output in plan_data.get("outputs", []):
                    for act in output.get("activities", []):
                        budget_plan[act["id"]] = act["total"]
        except:
            pass

    # Load budget spent
    if os.path.exists(FILE_BUDGET_SPENT):
        try:
            with open(FILE_BUDGET_SPENT, "r", encoding="utf-8") as f:
                spent_data = json.load(f)
                context += f"Cumulative Spent to Date: ${spent_data.get('expenditure_summary', {}).get('cumulative_spent_to_date', 0):,.2f}\n\n"
                for output in spent_data.get("output_expenditure_data", []):
                    for act in output.get("activities", []):
                        budget_spent[act["id"]] = act.get("total_spent", 0)
        except:
            pass

    # Build activity budget status
    context += "Activity Budget Status:\n"
    for act_id in sorted(budget_plan.keys()):
        planned = budget_plan.get(act_id, 0)
        spent = budget_spent.get(act_id, 0)
        pct = (spent / planned * 100) if planned > 0 else 0
        status = "On Budget" if pct <= 100 else "Over Budget"
        context += f"  • {act_id}: Planned ${planned:,.0f} | Spent ${spent:,.0f} ({pct:.1f}%) - {status}\n"

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

# --- HELPER 3: JSON UPDATER ---
def update_json_file(filename: str, new_data: Any, mode: str = "append"):
    if not os.path.exists(filename):
        with open(filename, "w") as f:
            json.dump([] if mode != "dict" else {}, f)

    with open(filename, "r+") as f:
        try:
            current_db = json.load(f)
        except json.JSONDecodeError:
            current_db = []

        if mode == "append":
            if not isinstance(current_db, list): current_db = []
            current_db.append(new_data)
        elif mode == "overwrite_activities":
            if not isinstance(current_db, list): current_db = []
            updates_map = {item['id']: item for item in new_data}
            for activity in current_db:
                act_id = activity.get("id")
                if act_id in updates_map:
                    new_vals = updates_map[act_id]
                    if "progress" in new_vals: activity["progress"] = new_vals["progress"]
                    if "status" in new_vals: activity["status"] = new_vals["status"]
                    if "notes" in new_vals: activity["notes"] = new_vals["notes"]
                    activity["last_updated"] = new_vals.get("date_extracted", "Unknown")

        f.seek(0)
        json.dump(current_db, f, indent=2)
        f.truncate()

# --- DATA MODELS ---
class ValidatedUpdate(BaseModel):
    date: str
    source: str
    indicator_updates: List[Dict[str, Any]]
    activity_updates: List[Dict[str, Any]]
    budget_updates: List[Dict[str, Any]] = []  # New: budget expenditure updates

# NEW: Model for Self-Learning
class CorrectionFeedback(BaseModel):
    original_text: str  # Context (e.g., "150 students enrolled")
    ai_prediction: Any  # What AI got wrong (e.g., 150)
    user_correction: Any # What user fixed (e.g., 0)
    comments: str = ""

# --- ENDPOINTS ---

@app.post("/analyze-report")
async def analyze_report(file: UploadFile = File(...)):
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

    except Exception as e:
        print(f"AI Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze report")

# --- NEW ENDPOINT: LEARN FROM MISTAKES ---
@app.post("/learn-mistake")
async def learn_mistake(feedback: CorrectionFeedback):
    """
    Takes a user correction, generalizes it into a rule, and saves it to past_corrections.json
    """
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
        
        # Save to memory
        new_entry = {
            "trigger_keyword": "Auto-Learned",
            "correction": new_rule,
            "source_mistake": str(feedback.user_correction)
        }
        
        update_json_file(CTX_CORRECTIONS, new_entry, mode="append")
        return {"status": "success", "new_rule": new_rule}

    except Exception as e:
        print(f"Learning Error: {e}")
        # We don't raise an error here to avoid blocking the main save process
        return {"status": "error", "detail": str(e)}

@app.post("/commit-data")
async def commit_data(data: ValidatedUpdate):
    try:
        # 1. Save Indicators
        if data.indicator_updates:
            new_performance = {
                "date": data.date,
                "source": data.source,
                "values": {item["id"]: item["value"] for item in data.indicator_updates}
            }
            update_json_file(FILE_PERFORMANCE, new_performance, mode="append")

            new_narratives = {
                "date": data.date,
                "source": data.source,
                "stories": {
                    item["id"]: {"status": "Updated", "narrative": item["narrative"]}
                    for item in data.indicator_updates
                }
            }
            update_json_file(FILE_NARRATIVES, new_narratives, mode="append")

        # 2. Save Activities
        if data.activity_updates:
            for act in data.activity_updates:
                act["date_extracted"] = data.date
            update_json_file(FILE_ACTIVITIES, data.activity_updates, mode="overwrite_activities")

        # 3. Save Budget Updates
        if data.budget_updates:
            update_budget_spent(data.budget_updates)

        return {"status": "success"}

    except Exception as e:
        print(f"Save Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def update_budget_spent(budget_updates: List[Dict[str, Any]]):
    """Update budget_spent.json with new expenditure data"""
    if not os.path.exists(FILE_BUDGET_SPENT):
        return

    with open(FILE_BUDGET_SPENT, "r", encoding="utf-8") as f:
        spent_data = json.load(f)

    # Create a lookup for quick access
    activity_lookup = {}
    for output in spent_data.get("output_expenditure_data", []):
        for act in output.get("activities", []):
            activity_lookup[act["id"]] = act

    # Apply updates
    for update in budget_updates:
        act_id = update.get("activity_id")
        amount = update.get("amount", 0)
        year = update.get("year", 2026)

        if act_id in activity_lookup:
            act = activity_lookup[act_id]
            year_key = f"spent_{year}"
            # Add to existing year spend
            current = act.get(year_key, 0)
            act[year_key] = current + amount
            # Recalculate total
            act["total_spent"] = sum(
                act.get(f"spent_{y}", 0) for y in [2024, 2025, 2026, 2027]
            )

    # Recalculate cumulative total
    total_spent = sum(
        act.get("total_spent", 0)
        for output in spent_data.get("output_expenditure_data", [])
        for act in output.get("activities", [])
    )
    # Add support costs
    for cost in spent_data.get("support_costs_spent", []):
        total_spent += cost.get("total", 0)

    spent_data["expenditure_summary"]["cumulative_spent_to_date"] = total_spent

    with open(FILE_BUDGET_SPENT, "w", encoding="utf-8") as f:
        json.dump(spent_data, f, indent=2)

@app.get("/")
def health_check():
    return {"status": "DigiGreen Brain Online", "mode": "RAG + Self-Learning Enabled"}