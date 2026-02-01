export type CenterStatus = 'Operational' | 'Non-Operational';
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
