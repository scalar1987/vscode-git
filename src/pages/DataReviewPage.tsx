import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/centersData';
import { onAuthChange } from '../lib/auth';
import {
  STATE_LABEL, STATE_STYLE, TRACKS_OF, PROGRAMME_OF, canReviewUnit, loadMyScopes, loadReviews, unitKey,
  type Programme, type ReviewInfo, type ReviewState, type ReviewTable, type Track,
} from '../lib/reviews';

// GGGI approval page. Each approver sees and acts only on the units in their scope.

type Filter = 'pending' | 'all';

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

export function DataReviewPage() {
  const [scopes, setScopes] = useState<string[] | null>(null);
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
    setScopes(await loadMyScopes());
    const [
      centres, advCohorts, trainers, cohortCentres, totTrainees, basicTraining, basicModules,
      gpCohorts, gpPitch, reviews,
    ] = await Promise.all([
      db.from('centres').select('id, name, status, updated_at'),
      db.from('advanced_cohorts').select('id, name'),
      db.from('advanced_trainers').select('id, centre_id, name, updated_at'),
      db.from('advanced_cohort_centres').select('cohort_id, centre_id, enrolled, graduated'),
      db.from('tot_trainees').select('centre_id, position, name, updated_at'),
      db.from('centre_training_basic').select('centre_id, year, enrolled, passed, updated_at'),
      db.from('centre_basic_modules').select('centre_id, module, passed, updated_at'),
      db.from('greenpreneur_cohorts').select('id, name, track, enrolled, created_at'),
      db.from('greenpreneur_pitch_results').select('id, edition, category, rank_no, laureate, prize_usd, created_at'),
      loadReviews(),
    ]);

    const centreName = new Map((centres.data ?? []).map((c: any) => [c.id, c.name]));
    const cohortName = new Map((advCohorts.data ?? []).map((c: any) => [c.id, c.name]));
    const centre = (id: string) => centreName.get(id) ?? id;
    const rows: Item[] = [];
    const push = (
      table: ReviewTable, key: string, section: string, title: string, detail: string, updatedAt: string | null,
      track: Track = 'all',
    ) => {
      const r: ReviewInfo | undefined = reviews.get(unitKey(table, key, track));
      rows.push({
        table, key, track, programme: PROGRAMME_OF[table], section, title, detail, updatedAt,
        status: r?.status ?? 'pending', comment: r?.comment ?? null,
      });
    };

    (trainers.data ?? []).forEach((r: any) => {
      push('advanced_trainers', r.id, 'Advanced trainer ToT', `${r.name} · ICT`, centre(r.centre_id), r.updated_at, 'ict');
      push('advanced_trainers', r.id, 'Advanced trainer ToT', `${r.name} · Green`, centre(r.centre_id), r.updated_at, 'green');
    });
    (cohortCentres.data ?? []).forEach((r: any) =>
      push('advanced_cohort_centres', `${r.cohort_id}|${r.centre_id}`, 'Advanced student counts',
        `${cohortName.get(r.cohort_id) ?? r.cohort_id} · ${centre(r.centre_id)}`,
        `Registered ${r.enrolled ?? 0} · Graduated ${r.graduated ?? 0}`, r.updated_at));
    (totTrainees.data ?? []).forEach((r: any) => {
      const name = r.name ? r.name : `Trainer ${r.position}`;
      push('tot_trainees', `${r.centre_id}|${r.position}`, 'Basic ToT', `${name} · ICT`, centre(r.centre_id), r.updated_at, 'ict');
      push('tot_trainees', `${r.centre_id}|${r.position}`, 'Basic ToT', `${name} · Green`, centre(r.centre_id), r.updated_at, 'green');
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
        `${r.track === 'irp' ? 'Investment Readiness' : '6-week training'} · registered ${r.enrolled ?? 0}`, r.created_at));
    (gpPitch.data ?? []).forEach((r: any) =>
      push('greenpreneur_pitch_results', r.id, 'Greenpreneur pitch', `Edition ${r.edition} · ${r.category} · rank ${r.rank_no}`,
        `${r.laureate} · USD ${r.prize_usd ?? 0}`, r.created_at));

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

  const visible = useMemo(
    () =>
      mine.filter(i =>
        (filter === 'all' || i.status === 'pending' || i.status === 'changes_requested') &&
        (programmeFilter === 'All' || i.programme === programmeFilter),
      ),
    [mine, filter, programmeFilter],
  );

  const counts = useMemo(() => {
    const c: Record<ReviewState, number> = { pending: 0, approved: 0, rejected: 0, changes_requested: 0 };
    mine.forEach(i => (c[i.status] += 1));
    return c;
  }, [mine]);

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

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAFAF7' }}>
      <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" aria-label="Back to dashboard">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Approvals</h1>
        </div>

        {scopes !== null && scopes.length === 0 && (
          <p className="text-sm text-gray-600">You have no approval scope. Ask GGGI to assign one.</p>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {(['pending', 'changes_requested', 'approved', 'rejected'] as ReviewState[]).map(s => (
            <div key={s} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <p className="text-xs uppercase tracking-wide text-gray-500">{STATE_LABEL[s]}</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-gray-900">{counts[s]}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(['pending', 'all'] as Filter[]).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm border ${filter === f ? 'bg-white border-dg-green-500 text-gray-900' : 'bg-white border-gray-200 text-gray-600'}`}
            >
              {f === 'pending' ? 'Needs review' : 'All items'}
            </button>
          ))}
          <span className="mx-2 h-5 w-px bg-gray-200" />
          {(['All', 'Basic', 'Advanced', 'Greenpreneur', 'Infrastructure'] as const).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setProgrammeFilter(p)}
              className={`px-3 py-1.5 rounded-lg text-sm border ${programmeFilter === p ? 'bg-white border-dg-green-500 text-gray-900' : 'bg-white border-gray-200 text-gray-600'}`}
            >
              {p}
            </button>
          ))}
          {msg && <span className="ml-3 text-sm text-gray-700">{msg}</span>}
        </div>

        <div className="space-y-3">
          {!loaded && <p className="text-sm text-gray-500">Loading…</p>}
          {loaded && visible.length === 0 && <p className="text-sm text-gray-500">Nothing waiting for review in your scope.</p>}
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
