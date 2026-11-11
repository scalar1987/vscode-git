import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck } from 'lucide-react';
import { supabase } from '../../lib/centersData';
import { onAuthChange } from '../../lib/auth';
import { loadMyScopes, PROGRAMME_OF, TRACKS_OF, canReviewUnit, unitHasData, type Programme, type ReviewTable } from '../../lib/reviews';

// Shown to GGGI approvers only: units waiting for review in their scope, per programme.
// Units = records x tracks. A unit waits when it has no review row; a partner edit deletes the review row.

const TABLES = Object.keys(TRACKS_OF) as ReviewTable[];

export function ApprovalsCard() {
  const [scopes, setScopes] = useState<string[] | null>(null);
  const [waiting, setWaiting] = useState<Record<Programme, number> | null>(null);
  const [sentBack, setSentBack] = useState(0);

  useEffect(() => {
    if (!supabase) return;
    const db = supabase;
    const run = async () => {
      const s = await loadMyScopes();
      setScopes(s);
      if (s.length === 0) return;
      const [tables, reviewed] = await Promise.all([
        Promise.all(TABLES.map(t => db.from(t).select('*').then(r => [t, (r.data ?? []) as any[]] as const))),
        db.from('data_reviews').select('table_name, record_key, track, status'),
      ]);
      const reviewedKeys = new Set<string>();
      let changes = 0;
      (reviewed.data ?? []).forEach((r: any) => {
        reviewedKeys.add(`${r.table_name}|${r.record_key}|${r.track}`);
        if (r.status === 'changes_requested') changes += 1;
      });
      // Same record keys as the review page
      const keyOf = (t: ReviewTable, r: any): string => {
        switch (t) {
          case 'advanced_trainers': case 'greenpreneur_cohorts': case 'greenpreneur_pitch_results': return r.id;
          case 'advanced_cohort_centres': return `${r.cohort_id}|${r.centre_id}`;
          case 'tot_trainees': return `${r.centre_id}|${r.position}`;
          case 'centre_training_basic': return `${r.centre_id}|${r.year}`;
          case 'centre_basic_modules': return `${r.centre_id}|${r.module}`;
          case 'centres': return r.id;
          default: return '';
        }
      };
      // A unit is waiting when it has something entered and no review yet
      const counts: Record<Programme, number> = { Advanced: 0, Basic: 0, Greenpreneur: 0, Infrastructure: 0 };
      tables.forEach(([t, rows]) => {
        rows.forEach(r => {
          TRACKS_OF[t].forEach(track => {
            if (!canReviewUnit(s, t, track)) return;
            if (!unitHasData(t, r, track)) return;
            if (reviewedKeys.has(`${t}|${keyOf(t, r)}|${track}`)) return;
            counts[PROGRAMME_OF[t]] += 1;
          });
        });
      });
      setWaiting(counts);
      setSentBack(changes);
    };
    run();
    return onAuthChange(run);
  }, []);

  if (!scopes || scopes.length === 0 || !waiting) return null;
  const total = waiting.Advanced + waiting.Basic + waiting.Greenpreneur + waiting.Infrastructure;
  // Nothing waiting and nothing sent back: no band at all
  if (total === 0 && sentBack === 0) return null;

  return (
    <section className="px-4 md:px-6 lg:px-8 pt-4">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl bg-dg-green-50/60 px-4 py-2.5 text-sm">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-dg-green-600" />
          <span className="font-medium text-gray-800">Approvals (GGGI)</span>
          <span className="text-xs text-gray-500">{total} waiting in your scope · {sentBack} sent back to partners</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
          {(['Infrastructure', 'Basic', 'Advanced', 'Greenpreneur'] as const).map(p => (
            <span key={p}>
              {p} <span className="font-semibold tabular-nums text-gray-900">{waiting[p]}</span>
            </span>
          ))}
        </div>
        <Link to="/data-review" className="ml-auto text-sm font-medium text-dg-green-700 hover:underline">
          Review →
        </Link>
      </div>
    </section>
  );
}
