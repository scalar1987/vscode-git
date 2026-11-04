// Status categories follow the Excel "Establishment status of the 35 GENIE centres" summary table.
export const CENTER_STATUSES = [
  'Operational',
  'Works completed – awaiting provisional acceptance',
  'Works in progress / finishing',
  'Works not started',
] as const;

export type CenterStatus = (typeof CENTER_STATUSES)[number];

export const CENTER_STATUS_COLORS: Record<CenterStatus, string> = {
  'Operational': '#16a34a',
  'Works completed – awaiting provisional acceptance': '#2563eb',
  'Works in progress / finishing': '#f59e0b',
  'Works not started': '#9CA3AF',
};

export type CenterType = 'University' | 'School' | 'Mairie';
export type CenterPhase = 'Phase I' | 'Phase II';

export interface Center {
  id: string;
  name: string;
  type: CenterType;
  coordinates: [number, number]; // [lat, lng]
  region: string;
  status: CenterStatus;
  phase: CenterPhase;
  students: number | string; // number for schools/universities, "Incubator" for Mairies
  computers: number;
  target_basic_ict: number;
  ongoing_programs: string[];
  note: string;
}
