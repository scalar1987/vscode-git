export type ActivityStatus = 'Completed' | 'On Track' | 'Delayed' | 'Critical' | 'Not Started';

export interface Activity {
  id: string;
  output: string;
  outputName: string;
  name: string;
  description: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  progress: number;
  status: ActivityStatus;
  responsible: string;
  notes: string;
}

export interface ActivitiesData {
  projectStart: string;
  projectEnd: string;
  activities: Activity[];
}
