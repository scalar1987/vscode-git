import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck } from 'lucide-react';
import { supabase } from '../../lib/centersData';
import { onAuthChange } from '../../lib/auth';
import { loadMyScopes, PROGRAMME_OF, TRACKS_OF, canReviewUnit, type Programme, type ReviewTable } from '../../lib/reviews';

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
      const totals = await Promise.all(
        TABLES.map(t => db.from(t).select('*', { count: 'exact', head: true }).then(r => [t, r.count ?? 0] as const)),
      );
      const reviewed = await db.from('data_reviews').select('table_name, track, status');
      const reviewedBy = new Map<string, number>();
      let changes = 0;
      (reviewed.data ?? []).forEach((r: any) => {
        if (canReviewUnit(s, r.table_name, r.track)) {
          reviewedBy.set(`${r.table_name}|${r.track}`, (reviewedBy.get(`${r.table_name}|${r.track}`) ?? 0) + 1);
        }
        if (r.status === 'changes_requested') changes += 1;
      });
      const counts: Record<Programme, number> = { Advanced: 0, Basic: 0, Greenpreneur: 0, Infrastructure: 0 };
      totals.forEach(([t, n]) => {
        TRACKS_OF[t].forEach(track => {
          if (!canReviewUnit(s, t, track)) return;
          const done = reviewedBy.get(`${t}|${track}`) ?? 0;
          counts[PROGRAMME_OF[t]] += Math.max(0, n - done);
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

  return (
    <section className="px-4 md:px-6 lg:px-8 pt-6">
      <div className="max-w-7xl mx-auto bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="w-6 h-6 text-dg-green-600" />
          <div>
            <p className="text-sm font-semibold text-gray-900">Approvals (GGGI)</p>
            <p className="text-xs text-gray-500">{total} waiting in your scope · {sentBack} sent back to partners</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-6 text-sm">
          {(['Advanced', 'Basic', 'Greenpreneur', 'Infrastructure'] as const).map(p => (
            <div key={p}>
              <p className="text-xs text-gray-500">{p}</p>
              <p className="text-lg font-semibold tabular-nums text-gray-900">{waiting[p]}</p>
            </div>
          ))}
        </div>
        <Link
          to="/data-review"
          className="ml-auto px-4 py-2 rounded-lg bg-dg-green-600 text-white text-sm font-medium hover:bg-dg-green-700"
        >
          Open approvals
        </Link>
      </div>
    </section>
  );
}
