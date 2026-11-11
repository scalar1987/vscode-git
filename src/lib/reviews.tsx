import { supabase } from './centersData';

// Approval workflow. GGGI approvers review partner-entered records, each within their own scope.
// A review is per unit: a record and a track. ToT records split into an ICT track and a Green track;
// everything else is one unit ("all"). A unit with no review row is "pending". A partner's edit clears
// the review (database trigger), so the unit is pending again.

export type ReviewTable =
  | 'advanced_trainers'
  | 'advanced_cohort_centres'
  | 'tot_trainees'
  | 'centre_training_basic'
  | 'centre_basic_modules'
  | 'greenpreneur_cohorts'
  | 'greenpreneur_pitch_results'
  | 'centres';

export type Track = 'all' | 'ict' | 'green';
export type ReviewState = 'pending' | 'approved' | 'rejected' | 'changes_requested';
export type Programme = 'Advanced' | 'Basic' | 'Greenpreneur' | 'Infrastructure';

export interface ReviewInfo {
  status: 'approved' | 'rejected' | 'changes_requested';
  comment: string | null;
}

export const PROGRAMME_OF: Record<ReviewTable, Programme> = {
  advanced_trainers: 'Advanced',
  advanced_cohort_centres: 'Advanced',
  tot_trainees: 'Basic',
  centre_training_basic: 'Basic',
  centre_basic_modules: 'Basic',
  greenpreneur_cohorts: 'Greenpreneur',
  greenpreneur_pitch_results: 'Greenpreneur',
  centres: 'Infrastructure',
};

// Units per record: ToT rows are reviewed separately for ICT and Green
export const TRACKS_OF: Record<ReviewTable, Track[]> = {
  advanced_trainers: ['ict', 'green'],
  tot_trainees: ['ict', 'green'],
  advanced_cohort_centres: ['all'],
  centre_training_basic: ['all'],
  centre_basic_modules: ['all'],
  greenpreneur_cohorts: ['all'],
  greenpreneur_pitch_results: ['all'],
  centres: ['all'],
};

// The approver scope a unit needs (matches public.required_scope in the database)
export function requiredScope(table: ReviewTable, track: Track): string {
  if ((table === 'advanced_trainers' || table === 'tot_trainees') && track === 'ict') return 'ict_tot';
  if ((table === 'advanced_trainers' || table === 'tot_trainees') && track === 'green') return 'green_tot';
  if (table === 'advanced_cohort_centres' || table === 'centre_training_basic' || table === 'centre_basic_modules') return 'student';
  if (table === 'greenpreneur_cohorts' || table === 'greenpreneur_pitch_results') return 'greenpreneur';
  if (table === 'centres') return 'infra';
  return 'all';
}

export function canReviewUnit(scopes: string[], table: ReviewTable, track: Track): boolean {
  return scopes.includes('all') || scopes.includes(requiredScope(table, track));
}

export async function loadMyScopes(): Promise<string[]> {
  if (!supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return [];
  const { data } = await supabase.from('approver_scopes').select('scope').eq('email', user.email).maybeSingle();
  return (data?.scope as string[] | undefined) ?? [];
}

export const unitKey = (table: ReviewTable, key: string, track: Track = 'all') => `${table}|${key}|${track}`;

export async function loadReviews(): Promise<Map<string, ReviewInfo>> {
  const map = new Map<string, ReviewInfo>();
  if (!supabase) return map;
  const { data } = await supabase.from('data_reviews').select('table_name, record_key, track, status, comment');
  (data ?? []).forEach((r: any) =>
    map.set(unitKey(r.table_name, r.record_key, r.track), { status: r.status, comment: r.comment }),
  );
  return map;
}

export const STATE_LABEL: Record<ReviewState, string> = {
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
  changes_requested: 'Changes requested',
};

export const STATE_STYLE: Record<ReviewState, string> = {
  pending: 'bg-gray-100 text-gray-700',
  approved: 'bg-dg-green-50 text-dg-green-700',
  rejected: 'bg-red-50 text-red-700',
  changes_requested: 'bg-dg-amber-100 text-dg-amber-700',
};

export function stateOf(reviews: Map<string, ReviewInfo>, table: ReviewTable, key: string, track: Track = 'all'): ReviewState {
  return reviews.get(unitKey(table, key, track))?.status ?? 'pending';
}

export function commentOf(reviews: Map<string, ReviewInfo>, table: ReviewTable, key: string, track: Track = 'all'): string | null {
  return reviews.get(unitKey(table, key, track))?.comment ?? null;
}

// Small status chip shown next to an input row
export function ReviewChip({ state, comment, label, notStarted }: { state: ReviewState; comment?: string | null; label?: string; notStarted?: boolean }) {
  // Nothing entered yet: shown as not started, not as waiting for review
  const text = notStarted ? 'Not started' : STATE_LABEL[state];
  const style = notStarted ? 'bg-white text-gray-400 border border-gray-200' : STATE_STYLE[state];
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${style}`}>
        {label ? `${label}: ` : ''}{text}
      </span>
      {comment && (state === 'changes_requested' || state === 'rejected') && (
        <span className="text-xs text-gray-700 max-w-xs">GGGI: {comment}</span>
      )}
    </span>
  );
}

// A unit is in the review queue once something has been entered for it (or it was already reviewed).
// Units with nothing entered yet are "not started" and are not counted as pending.
export function unitHasData(table: ReviewTable, row: Record<string, any>, track: Track): boolean {
  if (table === 'tot_trainees') {
    return track === 'ict'
      ? !!(row.in_person_ict || row.lms_word || row.lms_excel || row.lms_ppt)
      : !!(row.in_person_green || row.lms_green);
  }
  if (table === 'advanced_trainers') {
    return track === 'ict'
      ? !!(row.in_person_ict || row.lms_ui_ux || row.lms_ios || row.lms_android)
      : !!(row.in_person_green || row.lms_green_business);
  }
  if (table === 'advanced_cohort_centres') return (row.enrolled ?? 0) > 0 || (row.graduated ?? 0) > 0;
  if (table === 'greenpreneur_cohorts') return (row.enrolled ?? 0) > 0;
  return true;
}
