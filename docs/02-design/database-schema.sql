-- DigiGreen Youth Dashboard Database Schema
-- Target: PostgreSQL (for Supabase)
-- Created: 2026-02-03

-- Drop tables in reverse order of dependency if they exist, for easy re-running.
DROP TABLE IF EXISTS contingency_plans;
DROP TABLE IF EXISTS mitigation_actions;
DROP TABLE IF EXISTS risks;
DROP TABLE IF EXISTS expenditures;
DROP TABLE IF EXISTS project_support_costs_plan;
DROP TABLE IF EXISTS budget_plan;
DROP TABLE IF EXISTS narratives;
DROP TABLE IF EXISTS performance_actuals;
DROP TABLE IF EXISTS logframe_indicators;
DROP TABLE IF EXISTS centers;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS project_metadata;
DROP TABLE IF EXISTS ai_corrections;


-- Table for Activities, based on activities.json
CREATE TABLE activities (
    id VARCHAR(20) PRIMARY KEY,
    component TEXT,
    output_id VARCHAR(20),
    output_name TEXT,
    name TEXT NOT NULL,
    description TEXT,
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    progress INTEGER DEFAULT 0,
    status VARCHAR(50),
    responsible TEXT,
    notes TEXT,
    linked_indicators TEXT[],
    linked_centers TEXT[],
    last_updated TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE activities IS 'Stores project activities, based on activities.json.';

-- Table for DigiGreen Centers, based on centers.json
CREATE TABLE centers (
    id VARCHAR(50) PRIMARY KEY,
    name TEXT NOT NULL,
    type VARCHAR(50),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    region TEXT,
    status VARCHAR(50),
    phase VARCHAR(50),
    students TEXT,
    computers INTEGER,
    target_basic_ict INTEGER,
    ongoing_programs TEXT[],
    linked_activities TEXT[],
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE centers IS 'Stores information about the 35 DigiGreen centers, based on centers.json.';

-- Table for Logframe Indicators, based on logframe_structured.json
CREATE TABLE logframe_indicators (
    id VARCHAR(20) PRIMARY KEY,
    parent_id TEXT,
    parent_desc TEXT,
    label TEXT NOT NULL,
    baseline TEXT,
    targets JSONB,
    means_of_verification TEXT,
    source_of_data TEXT,
    frequency_of_data_collection TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE logframe_indicators IS 'Stores the project logical framework indicators, based on logframe_structured.json.';

-- Table for historical performance data, replacing performance_actuals.json
CREATE TABLE performance_actuals (
    id SERIAL PRIMARY KEY,
    indicator_id VARCHAR(20) NOT NULL REFERENCES logframe_indicators(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    source TEXT,
    value NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX idx_performance_indicator_id ON performance_actuals(indicator_id);

COMMENT ON TABLE performance_actuals IS 'Stores time-series data for indicator performance.';

-- Table for narrative updates, replacing narratives.json
CREATE TABLE narratives (
    id SERIAL PRIMARY KEY,
    indicator_id VARCHAR(20) NOT NULL REFERENCES logframe_indicators(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    source TEXT,
    status VARCHAR(50),
    narrative TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX idx_narratives_indicator_id ON narratives(indicator_id);

COMMENT ON TABLE narratives IS 'Stores narrative updates and stories related to indicators.';

-- Table for planned budget per activity, from budget_plan.json
CREATE TABLE budget_plan (
    id SERIAL PRIMARY KEY,
    activity_id VARCHAR(20) NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    planned_amount NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(activity_id, year)
);

-- Table for planned project support costs, from budget_plan.json
CREATE TABLE project_support_costs_plan (
    id SERIAL PRIMARY KEY,
    category TEXT NOT NULL,
    year INTEGER NOT NULL,
    planned_amount NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(category, year)
);

-- Table for individual expenditure records, replacing budget_spent.json with a transactional model
CREATE TABLE expenditures (
    id SERIAL PRIMARY KEY,
    activity_id VARCHAR(20) REFERENCES activities(id) ON DELETE SET NULL,
    support_cost_category TEXT,
    amount NUMERIC(12, 2) NOT NULL,
    expenditure_date DATE NOT NULL,
    description TEXT,
    source_document TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT chk_expenditure_target CHECK (
        (activity_id IS NOT NULL AND support_cost_category IS NULL) OR
        (activity_id IS NULL AND support_cost_category IS NOT NULL)
    )
);

-- Table for the Risk Register, from risk_register.json
CREATE TABLE risks (
    risk_id VARCHAR(20) PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT,
    description TEXT,
    likelihood INTEGER,
    impact INTEGER,
    risk_score INTEGER,
    rating VARCHAR(50),
    direction VARCHAR(50),
    status VARCHAR(50),
    residual_likelihood INTEGER,
    residual_impact INTEGER,
    residual_score INTEGER,
    residual_rating VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Table for Risk Mitigation Actions, from risk_mitigation.json
CREATE TABLE mitigation_actions (
    action_id VARCHAR(20) PRIMARY KEY,
    risk_id VARCHAR(20) NOT NULL REFERENCES risks(risk_id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    deadline DATE,
    status VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Table for Risk Contingency Plans, from risk_mitigation.json
CREATE TABLE contingency_plans (
    id SERIAL PRIMARY KEY,
    risk_id VARCHAR(20) NOT NULL REFERENCES risks(risk_id) ON DELETE CASCADE UNIQUE,
    trigger_condition TEXT,
    steps TEXT[],
    communication_protocol TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Table for storing project metadata, from project_metadata.json
CREATE TABLE project_metadata (
    id SERIAL PRIMARY KEY,
    project_key VARCHAR(50) UNIQUE NOT NULL,
    project_name TEXT,
    start_date DATE,
    end_date DATE,
    raw_data JSONB,
    last_updated TIMESTAMPTZ
);

-- Table for storing AI self-correction rules, replacing past_corrections.json
CREATE TABLE ai_corrections (
    id SERIAL PRIMARY KEY,
    correction_rule TEXT NOT NULL,
    original_text TEXT,
    ai_prediction TEXT,
    user_correction TEXT,
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);