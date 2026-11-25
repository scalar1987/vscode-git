import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/centersData';
import { onAuthChange } from '../lib/auth';
import {
  STATE_LABEL, STATE_STYLE, TRACKS_OF, PROGRAMME_OF, canReviewUnit, loadMyScopes, loadReviews, unitKey, unitHasData, isBaselineUnit,
  type Programme, type ReviewInfo, type ReviewState, type ReviewTable, type Track,
} from '../lib/reviews';

// GGGI approval page. Each approver sees and acts only on the units in their scope.

type Filter = 'pending' | 'changes_requested' | 'approved' | 'rejected' | 'all';

const FILTER_LABEL: Record<Filter, string> = {
  pending: 'Pending review',
  changes_requested: 'Changes requested',
  approved: 'Approved',
  rejected: 'Rejected',
  all: 'All items',
};

// Shared chip styles: the selected chip is solid so the current choice is visible at a glance
const chipCls = (active: boolean) =>
  `px-3 py-1.5 rounded-full text-sm border transition-colors ${
    active ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
  }`;

interface Item {
  table: ReviewTable;
  key: string;
  track: Track;
  programme: Programme;
  section: string;
  title: string;
  detail: string;
  updatedAt: string | null;
  status: ReviewState;
  comment: string | null;
}

const TRACK_NAME: Record<Track, string> = { all: '', ict: 'ICT', green: 'Green' };
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '-');

// One row per partner submission (from public.my_submissions), with the unit's current review result
interface MySubmission {
  id: number;
  table_name: ReviewTable;
  record_key: string;
  track: Track;
  submitted_at: string;
  change_text: string | null;
  status: ReviewState;
  comment: string | null;
  reviewed_at: string | null;
}

// One entry per review decision on a unit (from public.review_decisions via my_review_history)
interface HistoryEntry {
  table_name: ReviewTable;
  record_key: string;
  track: Track;
  action: 'approved' | 'rejected' | 'changes_requested' | 'reset_by_edit';
  comment: string | null;
  acted_at: string;
}

// Approver view: decisions on every unit in their scope, with who made them
interface ScopeHistoryEntry extends HistoryEntry {
  actor_email: string | null;
}

const HISTORY_LABEL: Record<HistoryEntry['action'], string> = {
  approved: 'Approved by GGGI',
  rejected: 'Rejected by GGGI',
  changes_requested: 'Changes requested by GGGI',
  reset_by_edit: 'Entered or changed by you (back to pending)',
};

const SECTION_OF: Partial<Record<ReviewTable, string>> = {
  advanced_trainers: 'Advanced trainer ToT',
  advanced_cohort_centres: 'Advanced student counts',
  tot_trainees: 'Basic ToT',
  centre_training_basic: 'Basic student training',
  centre_basic_modules: 'Basic student training',
  greenpreneur_cohorts: 'Greenpreneur cohort',
  greenpreneur_pitch_results: 'Greenpreneur pitch',
  centres: 'Centre status',
};

export function DataReviewPage() {
  const [scopes, setScopes] = useState<string[] | null>(null);
  const [mySubs, setMySubs] = useState<MySubmission[]>([]);
  const [myHistory, setMyHistory] = useState<HistoryEntry[]>([]);
  const [scopeHistory, setScopeHistory] = useState<ScopeHistoryEntry[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<Filter>('pending');
  const [programmeFilter, setProgrammeFilter] = useState<Programme | 'All'>('All');
  const [comments, setComments] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    if (!supabase) return;
    const db = supabase;
    const s = await loadMyScopes();
    setScopes(s);
    if (s.length === 0) {
      // Partner (submitter) view: their own submissions and the current review result
      const [subs, hist] = await Promise.all([db.rpc('my_submissions'), db.rpc('my_review_history')]);
      setMySubs((subs.data ?? []) as MySubmission[]);
      setMyHistory((hist.data ?? []) as HistoryEntry[]);
      setLoaded(true);
      return;
    }
    const [
      centres, advCohorts, trainers, cohortCentres, totTrainees, basicTraining, basicModules,
      gpCohorts, gpPitch, reviews,
    ] = await Promise.all([
      db.from('centres').select('id, name, status, updated_at'),
      db.from('advanced_cohorts').select('id, name'),
      db.from('advanced_trainers').select('id, centre_id, name, updated_at, in_person_ict, in_person_green, lms_ui_ux, lms_ios, lms_android, lms_green_business'),
      db.from('advanced_cohort_centres').select('cohort_id, centre_id, enrolled, graduated, updated_at'),
      db.from('tot_trainees').select('centre_id, position, name, updated_at, in_person_ict, in_person_green, lms_word, lms_excel, lms_ppt, lms_green'),
      db.from('centre_training_basic').select('centre_id, year, enrolled, passed, updated_at'),
      db.from('centre_basic_modules').select('centre_id, module, passed, updated_at'),
      db.from('greenpreneur_cohorts').select('id, name, track, enrolled, created_at, updated_at'),
      db.from('greenpreneur_pitch_results').select('id, edition, category, rank_no, laureate, prize_usd, created_at'),
      loadReviews(),
    ]);

    const centreName = new Map((centres.data ?? []).map((c: any) => [c.id, c.name]));
    const cohortName = new Map((advCohorts.data ?? []).map((c: any) => [c.id, c.name]));
    const centre = (id: string) => centreName.get(id) ?? id;
    const rows: Item[] = [];
    const push = (
      table: ReviewTable, key: string, section: string, title: string, detail: string, updatedAt: string | null,
      track: Track = 'all', started = true,
    ) => {
      const r: ReviewInfo | undefined = reviews.get(unitKey(table, key, track));
      // Nothing entered yet and never reviewed: not started, so not in the queue
      if (!started && !r) return;
      // Entered before the review baseline and never reviewed: not in the queue
      if (!r && isBaselineUnit(updatedAt)) return;
      rows.push({
        table, key, track, programme: PROGRAMME_OF[table], section, title, detail, updatedAt,
        status: r?.status ?? 'pending', comment: r?.comment ?? null,
      });
    };

    (trainers.data ?? []).forEach((r: any) => {
      push('advanced_trainers', r.id, 'Advanced trainer ToT', `${r.name} · ICT`, centre(r.centre_id), r.updated_at, 'ict', unitHasData('advanced_trainers', r, 'ict'));
      push('advanced_trainers', r.id, 'Advanced trainer ToT', `${r.name} · Green`, centre(r.centre_id), r.updated_at, 'green', unitHasData('advanced_trainers', r, 'green'));
    });
    (cohortCentres.data ?? []).forEach((r: any) =>
      push('advanced_cohort_centres', `${r.cohort_id}|${r.centre_id}`, 'Advanced student counts',
        `${cohortName.get(r.cohort_id) ?? r.cohort_id} · ${centre(r.centre_id)}`,
        `Registered ${r.enrolled ?? 0} · Graduated ${r.graduated ?? 0}`, r.updated_at, 'all', unitHasData('advanced_cohort_centres', r, 'all')));
    (totTrainees.data ?? []).forEach((r: any) => {
      const name = r.name ? r.name : `Trainer ${r.position}`;
      push('tot_trainees', `${r.centre_id}|${r.position}`, 'Basic ToT', `${name} · ICT`, centre(r.centre_id), r.updated_at, 'ict', unitHasData('tot_trainees', r, 'ict'));
      push('tot_trainees', `${r.centre_id}|${r.position}`, 'Basic ToT', `${name} · Green`, centre(r.centre_id), r.updated_at, 'green', unitHasData('tot_trainees', r, 'green'));
    });
    (basicTraining.data ?? []).forEach((r: any) =>
      push('centre_training_basic', `${r.centre_id}|${r.year}`, 'Basic student training',
        `${centre(r.centre_id)} · ${r.year}`, `Enrolled ${r.enrolled ?? 0} · Passed ${r.passed ?? 0}`, r.updated_at));
    (basicModules.data ?? []).forEach((r: any) =>
      push('centre_basic_modules', `${r.centre_id}|${r.module}`, 'Basic student training',
        `${centre(r.centre_id)} · ${r.module}`, `Passed ${r.passed ?? 0}`, r.updated_at));
    (centres.data ?? []).forEach((r: any) =>
      push('centres', r.id, 'Centre status', r.name, `Status: ${r.status ?? '-'}`, r.updated_at));
    (gpCohorts.data ?? []).forEach((r: any) =>
      push('greenpreneur_cohorts', r.id, 'Greenpreneur cohort', r.name,
        `${r.track === 'irp' ? 'Investment Readiness' : '6-week training'} · registered ${r.enrolled ?? 0}`, r.updated_at ?? r.created_at, 'all', unitHasData('greenpreneur_cohorts', r, 'all')));
    (gpPitch.data ?? []).forEach((r: any) =>
      push('greenpreneur_pitch_results', r.id, 'Greenpreneur pitch', `Edition ${r.edition} · ${r.category} · rank ${r.rank_no}`,
        `${r.laureate} · USD ${r.prize_usd ?? 0}`, r.created_at));

    const scopeHist = await db.rpc('review_history_in_scope');
    setScopeHistory((scopeHist.data ?? []) as ScopeHistoryEntry[]);

    // Keep only units this approver can act on; unit tracks are declared in TRACKS_OF
    setItems(rows.filter(i => TRACKS_OF[i.table].includes(i.track)));
    setLoaded(true);
  };

  useEffect(() => {
    load();
    return onAuthChange(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mine = useMemo(
    () => items.filter(i => scopes !== null && canReviewUnit(scopes, i.table, i.track)),
    [items, scopes],
  );

  const [reviewQuery, setReviewQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const visible = useMemo(() => {
    const q = reviewQuery.trim().toLowerCase();
    return mine.filter(i =>
      (filter === 'all' || i.status === filter) &&
      (programmeFilter === 'All' || i.programme === programmeFilter) &&
      (!q || [i.title, i.detail, i.section].join(' ').toLowerCase().includes(q)),
    );
  }, [mine, filter, programmeFilter, reviewQuery]);

  const counts = useMemo(() => {
    const c: Record<ReviewState, number> = { pending: 0, approved: 0, rejected: 0, changes_requested: 0 };
    mine.forEach(i => (c[i.status] += 1));
    return c;
  }, [mine]);

  // Decision log: every decision in scope, joined to the item's current label
  const [tab, setTab] = useState<'review' | 'log'>('review');
  const [logDecision, setLogDecision] = useState<'all' | ScopeHistoryEntry['action']>('all');
  const [logQuery, setLogQuery] = useState('');
  const itemOf = useMemo(() => new Map(items.map(i => [unitKey(i.table, i.key, i.track), i])), [items]);
  const logRows = useMemo(() => {
    const q = logQuery.trim().toLowerCase();
    return scopeHistory
      .map(h => ({ h, item: itemOf.get(unitKey(h.table_name, h.record_key, h.track as Track)) }))
      .filter(({ h, item }) => {
        if (logDecision !== 'all' && h.action !== logDecision) return false;
        if (q) {
          const hay = [item?.title, item?.detail, item?.section, h.actor_email, h.comment, h.record_key].join(' ').toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
  }, [scopeHistory, itemOf, logDecision, logQuery]);

  const decide = async (item: Item, status: 'approved' | 'rejected' | 'changes_requested') => {
    if (!supabase) return;
    const k = unitKey(item.table, item.key, item.track);
    setBusyKey(k);
    setMsg(null);
    const { data: { user } } = await supabase.auth.getUser();
    const comment = (comments[k] ?? '').trim() || null;
    if (status !== 'approved' && !comment) {
      setBusyKey(null);
      setMsg('Add a comment for rejected or changed items.');
      return;
    }
    const { error } = await supabase.from('data_reviews').upsert(
      {
        table_name: item.table,
        record_key: item.key,
        track: item.track,
        status,
        comment,
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      },
      { onConflict: 'table_name,record_key,track' },
    );
    setBusyKey(null);
    if (error) return setMsg(`Save failed: ${error.message}`);
    setComments(prev => ({ ...prev, [k]: '' }));
    await load();
    setMsg('Saved');
  };

  // Partners (no approver scope) see what they submitted and how GGGI has reviewed it
  if (scopes !== null && scopes.length === 0) {
    const pendingCount = mySubs.filter(s => s.status === 'pending').length;
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#FAFAF7' }}>
        <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" aria-label="Back to dashboard">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">My submissions</h1>
          </div>
          <p className="text-sm text-gray-600">
            Every change you entered, with its review status. {pendingCount} waiting for GGGI review.
            Changing a record again sends it back to pending.
          </p>
          {!loaded && <p className="text-sm text-gray-500">Loading…</p>}
          {loaded && mySubs.length === 0 && <p className="text-sm text-gray-500">You have not submitted any data yet.</p>}
          <div className="space-y-3">
            {mySubs.map(s => (
              <div key={s.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">
                      {SECTION_OF[s.table_name] ?? s.table_name}{TRACK_NAME[s.track] ? ` · ${TRACK_NAME[s.track]}` : ''}
                    </p>
                    <p className="text-sm text-gray-800">{s.change_text ?? 'Entered data'}</p>
                    <p className="text-xs text-gray-400 mt-1">Submitted {fmt(s.submitted_at)}</p>
                    {s.reviewed_at && <p className="text-xs text-gray-400">Last review {fmt(s.reviewed_at)}</p>}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATE_STYLE[s.status]}`}>
                    {STATE_LABEL[s.status]}
                  </span>
                </div>
                {s.comment && (s.status === 'changes_requested' || s.status === 'rejected') && (
                  <p className="mt-3 text-sm text-gray-700 bg-gray-50 rounded-md p-3">GGGI comment: {s.comment}</p>
                )}
                {(() => {
                  const unit = myHistory.filter(h => h.table_name === s.table_name && h.record_key === s.record_key && h.track === s.track);
                  if (unit.length === 0) return null;
                  return (
                    <details className="mt-3 text-sm">
                      <summary className="cursor-pointer text-gray-600 hover:text-gray-900">History ({unit.length})</summary>
                      <ol className="mt-2 space-y-1.5 border-l-2 border-gray-100 pl-3">
                        {unit.map((h, i) => (
                          <li key={`${h.acted_at}-${i}`} className="text-gray-700">
                            <span className="text-xs text-gray-400 mr-2">{fmt(h.acted_at)}</span>
                            {HISTORY_LABEL[h.action]}
                            {h.comment && <span className="text-gray-600"> — {h.comment}</span>}
                          </li>
                        ))}
                      </ol>
                    </details>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const tabBar = (
    <div className="flex items-center gap-2">
      {(['review', 'log'] as const).map(t => (
        <button
          key={t}
          type="button"
          onClick={() => setTab(t)}
          className={`px-3 py-1.5 rounded-lg text-sm border ${tab === t ? 'bg-white border-dg-green-500 text-gray-900' : 'bg-white border-gray-200 text-gray-600'}`}
        >
          {t === 'review' ? 'Review' : `Decision log (${scopeHistory.length})`}
        </button>
      ))}
    </div>
  );

  if (tab === 'log') {
    const decisionLabel: Record<ScopeHistoryEntry['action'], string> = {
      approved: 'Approved',
      rejected: 'Rejected',
      changes_requested: 'Changes requested',
      reset_by_edit: 'Entered / changed',
    };
    const decisionStyle: Record<ScopeHistoryEntry['action'], string> = {
      approved: STATE_STYLE.approved,
      rejected: STATE_STYLE.rejected,
      changes_requested: STATE_STYLE.changes_requested,
      reset_by_edit: 'bg-gray-100 text-gray-700',
    };
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#FAFAF7' }}>
        <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-8 space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/" className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" aria-label="Back to dashboard">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Approvals</h1>
            <div className="ml-auto">{tabBar}</div>
          </div>

          <button
            type="button"
            onClick={() => setFiltersOpen(o => !o)}
            className="md:hidden self-start px-3 py-1.5 rounded-lg text-sm border border-gray-200 bg-white text-gray-700"
          >
            {filtersOpen ? 'Hide filters' : 'Filters'}
          </button>
          <div className={`${filtersOpen ? 'flex' : 'hidden'} md:flex flex-col gap-3`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-gray-400 mr-1">Decision</span>
              {(['all', 'approved', 'rejected', 'changes_requested', 'reset_by_edit'] as const).map(d => {
                const n = d === 'all' ? scopeHistory.length : scopeHistory.filter(h => h.action === d).length;
                return (
                  <button key={d} type="button" onClick={() => setLogDecision(d)} aria-pressed={logDecision === d} className={chipCls(logDecision === d)}>
                    {d === 'all' ? 'All' : decisionLabel[d]} <span className="tabular-nums opacity-70">{n}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <input
                  type="search"
                  value={logQuery}
                  onChange={e => setLogQuery(e.target.value)}
                  placeholder="Search name, centre, person, comment"
                  className="w-full px-3 py-1.5 pr-8 text-sm border border-gray-200 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-dg-green-500"
                />
                {logQuery && (
                  <button
                    type="button"
                    onClick={() => setLogQuery('')}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                  >
                    ×
                  </button>
                )}
              </div>
              {(logDecision !== 'all' || logQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setLogDecision('all');
                    setLogQuery('');
                  }}
                  className="text-sm text-dg-green-700 hover:underline"
                >
                  Reset filters
                </button>
              )}
            </div>
          </div>

          <p className="text-sm text-gray-500">{logRows.length} of {scopeHistory.length} entries</p>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">When</th>
                  <th className="px-4 py-2.5 font-medium">Decision</th>
                  <th className="px-4 py-2.5 font-medium">Programme · section</th>
                  <th className="px-4 py-2.5 font-medium">Item</th>
                  <th className="px-4 py-2.5 font-medium">By</th>
                  <th className="px-4 py-2.5 font-medium">Comment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logRows.map(({ h, item }, idx) => (
                  <tr key={`${h.acted_at}-${idx}`} className="align-top">
                    <td className="px-4 py-2.5 whitespace-nowrap text-gray-600 tabular-nums">{fmt(h.acted_at)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${decisionStyle[h.action]}`}>
                        {decisionLabel[h.action]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">
                      {item ? `${item.programme} · ${item.section}` : (SECTION_OF[h.table_name] ?? h.table_name)}
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-gray-900">
                        {item ? item.title : 'Item no longer in the database'}
                        {TRACK_NAME[h.track as Track] && !item?.title.endsWith(TRACK_NAME[h.track as Track]) ? ` · ${TRACK_NAME[h.track as Track]}` : ''}
                      </p>
                      {item?.detail && <p className="text-xs text-gray-500">{item.detail}</p>}
                      {!item && <p className="text-xs text-gray-400 break-all">{h.record_key}</p>}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700 break-all">{h.actor_email ?? '-'}</td>
                    <td className="px-4 py-2.5 text-gray-700">{h.comment ?? ''}</td>
                  </tr>
                ))}
                {logRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No entries match these filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAFAF7' }}>
      <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" aria-label="Back to dashboard">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Approvals</h1>
          <div className="ml-auto">{tabBar}</div>
        </div>

        {scopes !== null && scopes.length === 0 && (
          <p className="text-sm text-gray-600">You have no approval scope. Ask GGGI to assign one.</p>
        )}

        {/* Status cards double as the status filter: click one to show only that status */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {(['pending', 'changes_requested', 'approved', 'rejected'] as const).map(s => {
            const active = filter === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(active ? 'all' : s)}
                aria-pressed={active}
                className={`text-left bg-white rounded-xl p-5 shadow-sm border transition-all ${
                  active ? 'border-dg-green-500 ring-2 ring-dg-green-500 -translate-y-0.5' : 'border-gray-100 hover:border-gray-300'
                }`}
              >
                <p className="text-xs uppercase tracking-wide text-gray-500">{STATE_LABEL[s]}</p>
                <p className="mt-2 text-3xl font-semibold tabular-nums text-gray-900">{counts[s]}</p>
                <p className={`mt-1 text-xs ${active ? 'text-dg-green-700 font-medium' : 'text-gray-400'}`}>
                  {active ? 'Showing · click to clear' : 'Click to show'}
                </p>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setFiltersOpen(o => !o)}
          className="md:hidden self-start px-3 py-1.5 rounded-full text-sm border border-gray-200 bg-white text-gray-700"
        >
          {filtersOpen ? 'Hide filters' : 'Filters'}
        </button>
        <div className={`${filtersOpen ? 'flex' : 'hidden'} md:flex flex-col gap-3`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-gray-400 mr-1">Programme</span>
            {(['All', 'Basic', 'Advanced', 'Greenpreneur', 'Infrastructure'] as const).map(p => (
              <button key={p} type="button" onClick={() => setProgrammeFilter(p)} className={chipCls(programmeFilter === p)}>
                {p}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <input
                type="search"
                value={reviewQuery}
                onChange={e => setReviewQuery(e.target.value)}
                placeholder="Search name or centre"
                className="w-full px-3 py-1.5 pr-8 text-sm border border-gray-200 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-dg-green-500"
              />
              {reviewQuery && (
                <button
                  type="button"
                  onClick={() => setReviewQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  ×
                </button>
              )}
            </div>
            {(filter !== 'pending' || programmeFilter !== 'All' || reviewQuery) && (
              <button
                type="button"
                onClick={() => {
                  setFilter('pending');
                  setProgrammeFilter('All');
                  setReviewQuery('');
                }}
                className="text-sm text-dg-green-700 hover:underline"
              >
                Reset filters
              </button>
            )}
          </div>
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium text-gray-900">{visible.length}</span> · {FILTER_LABEL[filter]}
            {programmeFilter !== 'All' ? ` · ${programmeFilter}` : ''}
            {reviewQuery ? ` · "${reviewQuery}"` : ''}
          </p>
        </div>
        {msg && <span className="text-sm text-gray-700">{msg}</span>}

        <div className="space-y-3">
          {!loaded && <p className="text-sm text-gray-500">Loading…</p>}
          {loaded && visible.length === 0 && <p className="text-sm text-gray-500">Nothing in this view for your scope.</p>}
          {visible.map(item => {
            const k = unitKey(item.table, item.key, item.track);
            return (
              <div key={k} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">
                      {item.programme} · {item.section}{TRACK_NAME[item.track] ? ` · ${TRACK_NAME[item.track]}` : ''}
                    </p>
                    <p className="text-base font-semibold text-gray-900">{item.title}</p>
                    <p className="text-sm text-gray-600">{item.detail}</p>
                    <p className="text-xs text-gray-400 mt-1">Last changed {fmt(item.updatedAt)}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATE_STYLE[item.status]}`}>
                    {STATE_LABEL[item.status]}
                  </span>
                </div>
                {item.comment && (
                  <p className="mt-3 text-sm text-gray-700 bg-gray-50 rounded-md p-3">Comment: {item.comment}</p>
                )}
                {(() => {
                  const unit = scopeHistory.filter(h => h.table_name === item.table && h.record_key === item.key && h.track === item.track);
                  if (unit.length === 0) return null;
                  return (
                    <details className="mt-3 text-sm">
                      <summary className="cursor-pointer text-gray-600 hover:text-gray-900">History ({unit.length})</summary>
                      <ol className="mt-2 space-y-1.5 border-l-2 border-gray-100 pl-3">
                        {unit.map((h, i) => (
                          <li key={`${h.acted_at}-${i}`} className="text-gray-700">
                            <span className="text-xs text-gray-400 mr-2">{fmt(h.acted_at)}</span>
                            {h.action === 'reset_by_edit'
                              ? `Entered or changed by ${h.actor_email ?? 'partner'} (back to pending)`
                              : `${HISTORY_LABEL[h.action]}${h.actor_email ? ` by ${h.actor_email}` : ''}`}
                            {h.comment && <span className="text-gray-600"> — {h.comment}</span>}
                          </li>
                        ))}
                      </ol>
                    </details>
                  );
                })()}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={comments[k] ?? ''}
                    onChange={e => setComments(prev => ({ ...prev, [k]: e.target.value }))}
                    placeholder="Comment (required to reject or request changes)"
                    className="flex-1 min-w-[240px] px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-dg-green-500"
                  />
                  <button
                    type="button"
                    disabled={busyKey === k}
                    onClick={() => decide(item, 'approved')}
                    className="px-3 py-1.5 text-sm rounded-md bg-dg-green-600 text-white hover:bg-dg-green-700 disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busyKey === k}
                    onClick={() => decide(item, 'changes_requested')}
                    className="px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-60"
                  >
                    Request changes
                  </button>
                  <button
                    type="button"
                    disabled={busyKey === k}
                    onClick={() => decide(item, 'rejected')}
                    className="px-3 py-1.5 text-sm rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
