export interface Indicator {
  id: string;
  parent_id: string;
  parent_desc: string;
  label: string;
  baseline: string;
  targets: {
    2024: number | string;
    2025: number | string;
    2026: number | string;
    2027: number | string;
    total: number | string;
  };
  means_of_verification: string;
  source_of_data: string;
  frequency_of_data_collection: string;
}

export interface PerformanceActual {
  date: string;
  source: string;
  values: Record<string, number>;
}

export type TargetStatus = 'On Track' | 'Behind' | 'Ahead' | 'Not Started';

export interface OutcomeIndicator {
  id: string;
  name: string;
  icon: string;
  baseline: number;
  target: number;
  actual: number;
  unit: string;
  status: TargetStatus;
}

export interface OutputGroup {
  id: string;
  name: string;
  description: string;
  component: number;
  indicators: IndicatorProgress[];
}

export interface IndicatorProgress {
  id: string;
  label: string;
  target: number;
  actual: number;
  unit: string;
  status: TargetStatus;
}
