import { supabase } from './centersData';

// Programme-wide Greenpreneur data: cohorts (6-week training, 3-week Investment Readiness),
// their checklists, and the centres linked to the programme.

export type GpTrack = 'training' | 'irp';

// Checklist items per track (index = item_no stored in greenpreneur_cohort_progress)
export const GP_ITEMS: Record<GpTrack, string[]> = {
  training: [
    'Module 0 · Introductory session',
    'Module 1 · Green MVP & Product-Market fit',
    'Module 2 · Customer Research and Sustainable Consumption',
    'Module 3 · Eco-Inclusive Value Proposition',
    'Module 4 · Eco-Prototyping',
    'Module 5 · Financial Modelling',
    'Module 6 · Impact Modelling',
    'Module 7 · Eco-Communication & Green Branding',
    'Module 8 · Fundraising and Budget Management',
    'Module 9 · Green Action Plan',
    'Networking session 1',
    'Networking session 2',
    'Group coaching session',
    'Closing ceremony',
  ],
  irp: [
    'Module 1 · Problem & green value proposition',
    'Module 2 · Investor ecosystem analysis',
    'Module 3 · Preparing for investor engagement',
    'Module 4 · Financial viability & impact framework',
    'Module 5 · Building the financial data',
    'Module 6 · Structuring the investment pitch',
    'Module 7 · Practice',
    'Mentoring session',
  ],
};

export const TRACK_LABEL: Record<GpTrack, string> = {
  training: '6-week training',
  irp: '3-week Investment Readiness',
};

export interface GpCohort {
  id: string;
  track: GpTrack;
  name: string;
  start_date: string | null;
  end_date: string | null;
  enrolled: number;
}

// Extra fields for session-type items (keyed by track and item index)
export type GpExtra = 'sessions' | 'note' | 'mentors';
export const GP_EXTRAS: Record<GpTrack, Partial<Record<number, GpExtra[]>>> = {
  training: {
    10: ['sessions', 'note'], // Networking session 1: sessions + networking name
    11: ['sessions', 'note'], // Networking session 2: sessions + networking name
    12: ['sessions'], // Group coaching session: sessions
  },
  irp: {
    7: ['sessions', 'mentors'], // Mentoring session: sessions + mentors
  },
};

export interface GpProgress {
  cohort_id: string;
  item_no: number;
  completed: boolean;
  completed_date: string | null;
  completed_at: string | null;
  sessions: number | null;
  note: string | null;
  mentors: number | null;
}

// Pitch Competition results (programme-wide, per edition)
export type PitchCategory = 'Operating entrepreneurs' | 'Aspiring entrepreneurs';
export const PITCH_CATEGORIES: PitchCategory[] = ['Operating entrepreneurs', 'Aspiring entrepreneurs'];

export interface PitchResult {
  id: string;
  edition: number;
  category: PitchCategory;
  rank_no: number;
  laureate: string;
  prize_usd: number;
}

export interface PitchEdition {
  edition: number;
  name: string | null;
  held_on: string | null;
}

export interface GpData {
  cohorts: GpCohort[];
  progress: GpProgress[];
  centreIds: string[];
  pitch: PitchResult[];
  editions: PitchEdition[];
}

export async function loadGreenpreneurProgramme(): Promise<GpData> {
  if (!supabase) return { cohorts: [], progress: [], centreIds: [], pitch: [], editions: [] };
  const [c, p, l, pr, ed] = await Promise.all([
    supabase.from('greenpreneur_cohorts').select('id, track, name, start_date, end_date, enrolled').order('start_date', { ascending: true }),
    supabase.from('greenpreneur_cohort_progress').select('cohort_id, item_no, completed, completed_date, completed_at, sessions, note, mentors'),
    supabase.from('greenpreneur_centres').select('centre_id'),
    supabase.from('greenpreneur_pitch_results').select('id, edition, category, rank_no, laureate, prize_usd').order('edition', { ascending: false }).order('rank_no', { ascending: true }),
    supabase.from('greenpreneur_pitch_editions').select('edition, name, held_on').order('edition', { ascending: false }),
  ]);
  return {
    cohorts: (c.data ?? []) as GpCohort[],
    progress: (p.data ?? []) as GpProgress[],
    centreIds: ((l.data ?? []) as Array<{ centre_id: string }>).map(r => r.centre_id),
    pitch: (pr.data ?? []) as PitchResult[],
    editions: (ed.data ?? []) as PitchEdition[],
  };
}

// Registered participants across all training cohorts: the value of indicator 2.2.2.1
export function registeredTotal(cohorts: GpCohort[]): number {
  return cohorts.filter(c => c.track === 'training').reduce((s, c) => s + (c.enrolled || 0), 0);
}

// Finished items for one cohort
export function doneCount(progress: GpProgress[], cohortId: string): number {
  return progress.filter(p => p.cohort_id === cohortId && p.completed).length;
}
