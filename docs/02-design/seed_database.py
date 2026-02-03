import os
import json
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv
from datetime import datetime

print("🚀 Starting database seeding process...")

# --- CONFIGURATION ---
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))

DATABASE_URL = os.getenv("DATABASE_URL")
PUBLIC_DIR = os.path.join(os.path.dirname(__file__), "..", "public")

FILES = {
    "activities": os.path.join(PUBLIC_DIR, "activities.json"),
    "centers": os.path.join(PUBLIC_DIR, "centers.json"),
    "logframe": os.path.join(PUBLIC_DIR, "logframe_structured.json"),
    "risks": os.path.join(PUBLIC_DIR, "risk_register.json"),
    "mitigations": os.path.join(PUBLIC_DIR, "risk_mitigation.json"),
    "budget_plan": os.path.join(PUBLIC_DIR, "budget_plan.json"),
    "budget_spent": os.path.join(PUBLIC_DIR, "budget_spent.json"),
    "metadata": os.path.join(PUBLIC_DIR, "project_metadata.json"),
}

def get_db_connection():
    """Establishes a connection to the PostgreSQL database."""
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable is not set.")
    try:
        conn = psycopg2.connect(DATABASE_URL)
        print("✅ Database connection successful.")
        return conn
    except psycopg2.OperationalError as e:
        print(f"❌ Could not connect to the database: {e}")
        raise

def seed_activities(cur, data):
    """Seeds the activities table."""
    print("  -> Seeding activities...")
    activities_data = data["activities"]
    
    # Supabase/Postgres expects TIMESTAMPTZ in ISO 8601 format
    now = datetime.now().isoformat()

    values = [
        (
            a.get("id"), a.get("component"), a.get("output"), a.get("outputName"),
            a.get("name"), a.get("description"), a.get("plannedStart"), a.get("plannedEnd"),
            a.get("actualStart"), a.get("actualEnd"), a.get("progress"), a.get("status"),
            a.get("responsible"), a.get("notes"), a.get("linkedIndicators"), a.get("linkedCenters"),
            now # last_updated
        ) for a in activities_data
    ]
    execute_values(
        cur,
        """
        INSERT INTO activities (id, component, output_id, output_name, name, description, 
        planned_start_date, planned_end_date, actual_start_date, actual_end_date, progress, 
        status, responsible, notes, linked_indicators, linked_centers, last_updated)
        VALUES %s ON CONFLICT (id) DO UPDATE SET
            component = EXCLUDED.component,
            output_id = EXCLUDED.output_id,
            output_name = EXCLUDED.output_name,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            planned_start_date = EXCLUDED.planned_start_date,
            planned_end_date = EXCLUDED.planned_end_date,
            actual_start_date = EXCLUDED.actual_start_date,
            actual_end_date = EXCLUDED.actual_end_date,
            progress = EXCLUDED.progress,
            status = EXCLUDED.status,
            responsible = EXCLUDED.responsible,
            notes = EXCLUDED.notes,
            linked_indicators = EXCLUDED.linked_indicators,
            linked_centers = EXCLUDED.linked_centers,
            last_updated = EXCLUDED.last_updated;
        """,
        values
    )
    print(f"  ✅ Seeded {len(values)} activities.")

def seed_centers(cur, data):
    """Seeds the centers table."""
    print("  -> Seeding centers...")
    values = [
        (
            c.get("id"), c.get("name"), c.get("type"), c.get("coordinates")[0] if c.get("coordinates") else None,
            c.get("coordinates")[1] if c.get("coordinates") else None, c.get("region"), c.get("status"),
            c.get("phase"), str(c.get("students")), c.get("computers"), c.get("target_basic_ict"),
            c.get("ongoing_programs"), c.get("linkedActivities"), c.get("note")
        ) for c in data
    ]
    execute_values(
        cur,
        """
        INSERT INTO centers (id, name, type, latitude, longitude, region, status, phase, 
        students, computers, target_basic_ict, ongoing_programs, linked_activities, note)
        VALUES %s ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name, type = EXCLUDED.type, latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude, region = EXCLUDED.region, status = EXCLUDED.status,
            phase = EXCLUDED.phase, students = EXCLUDED.students, computers = EXCLUDED.computers,
            target_basic_ict = EXCLUDED.target_basic_ict, ongoing_programs = EXCLUDED.ongoing_programs,
            linked_activities = EXCLUDED.linked_activities, note = EXCLUDED.note;
        """,
        values
    )
    print(f"  ✅ Seeded {len(values)} centers.")

def seed_logframe(cur, data):
    """Seeds the logframe_indicators table."""
    print("  -> Seeding logframe indicators...")
    values = [
        (
            i.get("id"), i.get("parent_id"), i.get("parent_desc"), i.get("label"),
            i.get("baseline"), json.dumps(i.get("targets")), i.get("means_of_verification"),
            i.get("source_of_data"), i.get("frequency_of_data_collection")
        ) for i in data
    ]
    execute_values(
        cur,
        """
        INSERT INTO logframe_indicators (id, parent_id, parent_desc, label, baseline, targets, 
        means_of_verification, source_of_data, frequency_of_data_collection)
        VALUES %s ON CONFLICT (id) DO UPDATE SET
            parent_id = EXCLUDED.parent_id, parent_desc = EXCLUDED.parent_desc,
            label = EXCLUDED.label, baseline = EXCLUDED.baseline, targets = EXCLUDED.targets,
            means_of_verification = EXCLUDED.means_of_verification,
            source_of_data = EXCLUDED.source_of_data,
            frequency_of_data_collection = EXCLUDED.frequency_of_data_collection;
        """,
        values
    )
    print(f"  ✅ Seeded {len(values)} logframe indicators.")

def seed_risks_and_mitigations(cur, risks_data, mitigations_data):
    """Seeds risks, mitigation_actions, and contingency_plans tables."""
    print("  -> Seeding risks and mitigations...")
    
    # Risks
    risk_values = [(r.get("risk_id"), r.get("title"), r.get("category"), r.get("description"), r.get("likelihood"), r.get("impact"), r.get("risk_score"), r.get("rating"), r.get("direction"), r.get("status")) for r in risks_data["risks"]]
    execute_values(cur, "INSERT INTO risks (risk_id, title, category, description, likelihood, impact, risk_score, rating, direction, status) VALUES %s ON CONFLICT (risk_id) DO NOTHING;", risk_values)
    print(f"  ✅ Seeded {len(risk_values)} risks.")

    # Mitigations and Contingencies
    mitigation_actions = []
    contingency_plans = []
    residual_risk_updates = []

    for plan in mitigations_data["plans"]:
        risk_id = plan["risk_id"]
        if "mitigation_plan" in plan:
            for action in plan["mitigation_plan"]["actions"]:
                mitigation_actions.append((action["action_id"], risk_id, action["description"], action.get("deadline"), action["status"]))
            
            res = plan["mitigation_plan"]
            residual_risk_updates.append((res.get("residual_likelihood"), res.get("residual_impact"), res.get("residual_score"), res.get("residual_rating"), risk_id))

        if "contingency_plan" in plan:
            cont = plan["contingency_plan"]
            contingency_plans.append((risk_id, cont.get("trigger_condition"), cont.get("steps"), cont.get("communication_protocol")))

    execute_values(cur, "INSERT INTO mitigation_actions (action_id, risk_id, description, deadline, status) VALUES %s ON CONFLICT (action_id) DO NOTHING;", mitigation_actions)
    print(f"  ✅ Seeded {len(mitigation_actions)} mitigation actions.")

    execute_values(cur, "INSERT INTO contingency_plans (risk_id, trigger_condition, steps, communication_protocol) VALUES %s ON CONFLICT (risk_id) DO NOTHING;", contingency_plans)
    print(f"  ✅ Seeded {len(contingency_plans)} contingency plans.")

    # Update risks with residual data
    execute_values(cur, "UPDATE risks SET residual_likelihood = data.rl, residual_impact = data.ri, residual_score = data.rs, residual_rating = data.rr FROM (VALUES %s) AS data (rl, ri, rs, rr, risk_id) WHERE risks.risk_id = data.risk_id;", residual_risk_updates)
    print(f"  ✅ Updated {len(residual_risk_updates)} risks with residual ratings.")

def seed_project_metadata(cur, data):
    """Seeds the project_metadata table."""
    print("  -> Seeding project metadata...")
    metadata = data["project_metadata"]
    cur.execute(
        """
        INSERT INTO project_metadata (project_key, project_name, start_date, end_date, raw_data, last_updated)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (project_key) DO UPDATE SET
            project_name = EXCLUDED.project_name,
            start_date = EXCLUDED.start_date,
            end_date = EXCLUDED.end_date,
            raw_data = EXCLUDED.raw_data,
            last_updated = EXCLUDED.last_updated;
        """,
        (
            metadata.get("project_id"), metadata.get("project_name"), metadata.get("implementation_period", {}).get("start_date"),
            metadata.get("implementation_period", {}).get("end_date"), json.dumps(metadata), metadata.get("last_updated")
        )
    )
    print("  ✅ Seeded project metadata.")

def main():
    """Main function to run the seeding process."""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Load all data first
        all_data = {}
        for key, path in FILES.items():
            if os.path.exists(path):
                with open(path, "r", encoding="utf-8") as f:
                    all_data[key] = json.load(f)
            else:
                print(f"  ⚠️  Warning: {path} not found. Skipping.")

        # Seed in order of dependency
        if "activities" in all_data: seed_activities(cur, all_data["activities"])
        if "centers" in all_data: seed_centers(cur, all_data["centers"])
        if "logframe" in all_data: seed_logframe(cur, all_data["logframe"])
        if "risks" in all_data and "mitigations" in all_data:
            seed_risks_and_mitigations(cur, all_data["risks"], all_data["mitigations"])
        if "metadata" in all_data: seed_project_metadata(cur, all_data["metadata"])
        
        # Add other seeding functions here (budget, etc.) as needed

        conn.commit()
        cur.close()
        print("\n🎉 Database seeding completed successfully!")

    except (Exception, psycopg2.DatabaseError) as error:
        print(f"❌ An error occurred: {error}")
        if conn is not None:
            conn.rollback()
    finally:
        if conn is not None:
            conn.close()
            print("🔌 Database connection closed.")

if __name__ == "__main__":
    main()