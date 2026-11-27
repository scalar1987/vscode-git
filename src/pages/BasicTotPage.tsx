import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/centersData';
import { canEditSection, getProfile, getSession, isApproved, onAuthChange, type Profile } from '../lib/auth';
import { isEvidenceUrl } from '../lib/evidence';
import { ReviewChip, commentOf, loadReviews, stateOf, type ReviewInfo } from '../lib/reviews';

// Basic ICT & Green Practices ToT: all trainees (3-4 per centre) in one place.
// ICT = in-person (Betterworld) + LMS Word, Excel, PowerPoint. Green = in-person (Impact Lab) + LMS Green Practices.
// A trainee completes ToT when both in-person sessions and all four online modules are done (logframe 1.2.5).

interface Trainee {
  centre_id: string;
  position: number;
  name: string;
  in_person_ict: boolean;
  in_person_ict_date: string | null;
  in_person_green: boolean;
  in_person_green_date: string | null;
  lms_word: boolean;
  lms_excel: boolean;
  lms_ppt: boolean;
  lms_green: boolean;
}

interface LiveRow {
  in_person_ict: boolean;
  in_person_green: boolean;
  lms_word: boolean;
  lms_excel: boolean;
  lms_ppt: boolean;
  lms_green: boolean;
  ict_live: boolean;
  green_live: boolean;
}

const TOT_FIELDS = [
  'in_person_ict', 'in_person_ict_date', 'lms_word', 'lms_excel', 'lms_ppt',
  'in_person_green', 'in_person_green_date', 'lms_green',
] as const;
const ICT_MODULES = [
  { key: 'lms_word', label: 'Word' },
  { key: 'lms_excel', label: 'Excel' },
  { key: 'lms_ppt', label: 'PowerPoint' },
] as const;

const keyOf = (t: { centre_id: string; position: number }) => `${t.centre_id}|${t.position}`;
const ictCount = (t: Omit<LiveRow, 'ict_live' | 'green_live'>) => [t.in_person_ict, t.lms_word, t.lms_excel, t.lms_ppt].filter(Boolean).length;
const greenCount = (t: Omit<LiveRow, 'ict_live' | 'green_live'>) => [t.in_person_green, t.lms_green].filter(Boolean).length;
const isDone = (t: Omit<LiveRow, 'ict_live' | 'green_live'>) => ictCount(t) === 4 && greenCount(t) === 2;
const pctOf = (d: number, t: number) => (t > 0 ? Math.round((d / t) * 100) : 0);
const LOGFRAME_TARGET = 105; // 1.2.5 target (106 trainees are enrolled)

type Status = 'ToT complete' | 'Awaiting approval' | 'Sent back' | 'In progress' | 'Not started';
const STATUS_STYLE: Record<Status, string> = {
  'ToT complete': 'whitespace-nowrap bg-dg-green-50 text-dg-green-700',
  'Awaiting approval': 'whitespace-nowrap bg-dg-amber-100 text-dg-amber-700',
  'Sent back': 'whitespace-nowrap bg-red-50 text-red-700',
  'In progress': 'whitespace-nowrap bg-gray-100 text-gray-600',
  'Not started': 'whitespace-nowrap bg-white text-gray-400 border border-gray-200',
};

function Tabs<T extends string>({ tabs, value, onChange }: { tabs: ReadonlyArray<readonly [T, string]>; value: T; onChange: (t: T) => void }) {
  return (
    <div className="flex gap-1 border-b border-gray-200" role="tablist">
      {tabs.map(([tab, label]) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={value === tab}
          onClick={() => onChange(tab)}
          className={`px-4 py-2 -mb-px text-sm font-medium border-b-2 transition-colors ${
            value === tab ? 'border-dg-green-600 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function BasicTotPage({ mode = 'progress' }: { mode?: 'progress' | 'input' }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [centres, setCentres] = useState<Array<{ id: string; name: string }>>([]);
  const [saved, setSaved] = useState<Trainee[]>([]);
  const [live, setLive] = useState<Map<string, LiveRow>>(new Map());
  const [reviews, setReviews] = useState<Map<string, ReviewInfo>>(new Map());
  const [evidence, setEvidence] = useState<Record<string, string | null>>({});
  const [evidenceDraft, setEvidenceDraft] = useState<Record<string, string>>({});
  const [reported, setReported] = useState<{ value: number; target: number; date: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const progressTab: 'overview' | 'centres' | 'trainees' =
    (['overview', 'centres', 'trainees'] as const).find(t => t === searchParams.get('tab')) ?? 'overview';
  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(searchParams);
    if (v) next.set(k, v);
    else next.delete(k);
    setSearchParams(next, { replace: true });
  };
  const centreFilter = searchParams.get('centre') ?? '';
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | Status>('');
  const [openCentres, setOpenCentres] = useState<Set<string>>(new Set());

  // Input state
  const [drafts, setDrafts] = useState<Record<string, Trainee>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const canIct = isApproved(profile) && canEditSection(profile, '', 'tot_ict');
  const canGreen = isApproved(profile) && canEditSection(profile, '', 'tot_green');
  const canInput = canIct || canGreen;

  useEffect(() => {
    const loadProfile = () => getSession().then(s => (s ? getProfile() : null)).then(setProfile);
    loadProfile();
    return onAuthChange(loadProfile);
  }, []);

  const loadAll = async () => {
    if (!supabase) return;
    const [ce, t, l, ev, rv] = await Promise.all([
      supabase.from('centres').select('id, name').order('sort_order'),
      supabase
        .from('tot_trainees')
        .select('centre_id, position, name, in_person_ict, in_person_ict_date, in_person_green, in_person_green_date, lms_word, lms_excel, lms_ppt, lms_green')
        .order('centre_id')
        .order('position'),
      // Counts use approved values only (rejected or changes-requested values are not counted)
      supabase.from('tot_trainees_live').select('centre_id, position, in_person_ict, in_person_green, lms_word, lms_excel, lms_ppt, lms_green, ict_live, green_live'),
      supabase.from('tot_track_evidence').select('track, evidence_url'),
      loadReviews(),
    ]);
    setCentres((ce.data ?? []) as Array<{ id: string; name: string }>);
    setSaved(
      ((t.data ?? []) as any[]).map(r => ({
        centre_id: r.centre_id,
        position: r.position,
        name: r.name ?? '',
        in_person_ict: r.in_person_ict === true,
        in_person_ict_date: r.in_person_ict_date ?? null,
        in_person_green: r.in_person_green === true,
        in_person_green_date: r.in_person_green_date ?? null,
        lms_word: r.lms_word === true,
        lms_excel: r.lms_excel === true,
        lms_ppt: r.lms_ppt === true,
        lms_green: r.lms_green === true,
      })),
    );
    setLive(
      new Map(
        ((l.data ?? []) as any[]).map(r => [
          keyOf(r),
          {
            in_person_ict: r.in_person_ict === true,
            in_person_green: r.in_person_green === true,
            lms_word: r.lms_word === true,
            lms_excel: r.lms_excel === true,
            lms_ppt: r.lms_ppt === true,
            lms_green: r.lms_green === true,
            ict_live: r.ict_live !== false,
            green_live: r.green_live !== false,
          },
        ]),
      ),
    );
    setEvidence(Object.fromEntries(((ev.data ?? []) as any[]).map(r => [r.track, r.evidence_url ?? null])));
    setReviews(rv);
    setLoaded(true);
  };

  useEffect(() => {
    loadAll();
    fetch('/biannual_2026_06.json')
      .then(r => r.json())
      .then((d: { date?: string; indicators?: Array<{ id: string; cumulative: number; target_total: number }> }) => {
        const row = d.indicators?.find(i => i.id === '1.2.5');
        if (row) setReported({ value: row.cumulative, target: row.target_total || LOGFRAME_TARGET, date: d.date ?? '' });
      })
      .catch(() => setReported(null));
  }, []);

  const centreName = useMemo(() => new Map(centres.map(c => [c.id, c.name])), [centres]);
  const centreOrder = useMemo(() => new Map(centres.map((c, i) => [c.id, i])), [centres]);

  // Approved view of a trainee, and its status
  const liveOf = (t: Trainee): LiveRow =>
    live.get(keyOf(t)) ?? { ...t, ict_live: true, green_live: true };
  const statusOf = (t: Trainee): Status => {
    const k = keyOf(t);
    const sent = (['ict', 'green'] as const).some(tr => {
      const s = stateOf(reviews, 'tot_trainees', k, tr);
      return (s === 'rejected' || s === 'changes_requested') && reviews.has(`tot_trainees|${k}|${tr}`);
    });
    if (sent) return 'Sent back';
    const l = liveOf(t);
    if (isDone(l)) return 'ToT complete';
    if (!l.ict_live || !l.green_live) return 'Awaiting approval';
    return ictCount(t) + greenCount(t) > 0 ? 'In progress' : 'Not started';
  };

  const sorted = useMemo(
    () => [...saved].sort((a, b) => (centreOrder.get(a.centre_id) ?? 999) - (centreOrder.get(b.centre_id) ?? 999) || a.position - b.position),
    [saved, centreOrder],
  );

  const totals = useMemo(() => {
    const ls = sorted.map(liveOf);
    return {
      trainees: sorted.length,
      complete: ls.filter(isDone).length,
      ictInPerson: ls.filter(l => l.in_person_ict).length,
      ictLms: ls.filter(l => l.lms_word && l.lms_excel && l.lms_ppt).length,
      greenInPerson: ls.filter(l => l.in_person_green).length,
      greenLms: ls.filter(l => l.lms_green).length,
      status: sorted.reduce((m, t) => ({ ...m, [statusOf(t)]: (m[statusOf(t)] ?? 0) + 1 }), {} as Partial<Record<Status, number>>),
    };
  }, [sorted, live, reviews]);

  const filtered = (list: Trainee[]) => {
    const q = query.trim().toLowerCase();
    return list.filter(
      t =>
        (!centreFilter || t.centre_id === centreFilter) &&
        (!statusFilter || statusOf(t) === statusFilter) &&
        (!q || t.name.toLowerCase().includes(q) || (centreName.get(t.centre_id) ?? '').toLowerCase().includes(q)),
    );
  };

  // ---------- input ----------
  const rowOf = (t: Trainee) => drafts[keyOf(t)] ?? t;
  const changedKeys = useMemo(() => {
    const out = new Set<string>();
    Object.entries(drafts).forEach(([k, d]) => {
      const s = saved.find(t => keyOf(t) === k);
      if (s && TOT_FIELDS.some(f => (d as any)[f] !== (s as any)[f])) out.add(k);
    });
    return out;
  }, [drafts, saved]);

  const edit = (t: Trainee, patch: Partial<Trainee>) => {
    setDrafts(prev => ({ ...prev, [keyOf(t)]: { ...rowOf(t), ...patch } }));
    setMsg(null);
  };
  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, k: string) => {
    const next = new Set(set);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setter(next);
  };

  const save = async () => {
    const db = supabase;
    if (!db) return;
    setSaving(true);
    setMsg(null);
    const { data: { user } } = await db.auth.getUser();
    const now = new Date().toISOString();
    const errors: string[] = [];
    for (const k of changedKeys) {
      const d = drafts[k];
      const s = saved.find(t => keyOf(t) === k);
      if (!d || !s) continue;
      const next = { ...d };
      if (!next.in_person_ict) next.in_person_ict_date = null;
      if (!next.in_person_green) next.in_person_green_date = null;
      // Send only the changed fields, so one organisation never rewrites the other's track
      const patch: Record<string, unknown> = {};
      TOT_FIELDS.forEach(f => {
        if ((next as any)[f] !== (s as any)[f]) patch[f] = (next as any)[f];
      });
      if (!Object.keys(patch).length) continue;
      patch.updated_at = now;
      patch.updated_by = user?.id ?? null;
      const { error } = await db.from('tot_trainees').update(patch).eq('centre_id', s.centre_id).eq('position', s.position);
      if (error) errors.push(`${s.name}: ${error.message}`);
    }
    const n = changedKeys.size;
    setSaving(false);
    setDrafts({});
    await loadAll();
    setMsg(errors.length ? `Some changes were not saved: ${errors.join('; ')}` : `Saved ${n} trainee${n === 1 ? '' : 's'}`);
  };

  const saveEvidence = async (track: 'ict' | 'green') => {
    const db = supabase;
    if (!db) return;
    const value = (evidenceDraft[track] ?? '').trim();
    if (!isEvidenceUrl(value)) return setMsg('The evidence link must start with https://');
    const { data: { user } } = await db.auth.getUser();
    const { error } = await db
      .from('tot_track_evidence')
      .update({ evidence_url: value, updated_at: new Date().toISOString(), updated_by: user?.id ?? null })
      .eq('track', track);
    if (error) return setMsg(`Save failed: ${error.message}`);
    setEvidenceDraft(prev => {
      const next = { ...prev };
      delete next[track];
      return next;
    });
    setEvidence(prev => ({ ...prev, [track]: value }));
    setMsg(`${track === 'ict' ? 'ICT' : 'Green'} evidence link saved`);
  };

  if (mode === 'input' && profile && !canInput) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#FAFAF7' }}>
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-16">
          <Link to="/basic-tot" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" /> Back to progress
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-gray-900">Basic ToT data input</h1>
          <p className="mt-3 text-sm text-gray-600">Your organisation does not have access to Basic ToT data input.</p>
        </div>
      </div>
    );
  }

  const filterBar = (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search trainee or centre"
        className="flex-1 min-w-[220px] max-w-sm px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-dg-green-500"
      />
      <select
        value={centreFilter}
        onChange={e => setParam('centre', e.target.value)}
        className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white max-w-[260px]"
      >
        <option value="">All centres</option>
        {centres.filter(c => saved.some(t => t.centre_id === c.id)).map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <select
        value={statusFilter}
        onChange={e => setStatusFilter(e.target.value as '' | Status)}
        className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white"
      >
        <option value="">All statuses</option>
        {(Object.keys(STATUS_STYLE) as Status[]).map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </div>
  );

  const shownValue = reported?.value ?? totals.complete;
  const target = reported?.target ?? LOGFRAME_TARGET;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAFAF7' }}>
      <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/?program=capacity" className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" aria-label="Back to dashboard">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{mode === 'input' ? 'Basic ToT: data input' : 'Basic ToT: progress'}</h1>
          <div className="ml-auto">
            {(mode === 'input' || canInput) && (
              <Link
                to={mode === 'input' ? '/basic-tot' : `/basic-tot/input${centreFilter ? `?centre=${centreFilter}` : ''}`}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors"
              >
                {mode === 'input' ? 'Progress' : 'Data input'}
              </Link>
            )}
          </div>
        </div>

        {!loaded && <p className="text-sm text-gray-400">Loading…</p>}

        {/* ---------------- Progress ---------------- */}
        {loaded && mode === 'progress' && (
          <>
            <Tabs
              tabs={[['overview', 'Overview'], ['centres', 'Centres'], ['trainees', 'Trainees']] as const}
              value={progressTab}
              onChange={t => setParam('tab', t)}
            />

            {progressTab === 'overview' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1 bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-gray-500">1.2.5</p>
                        <h3 className="text-sm font-semibold text-gray-900">Trainees with ToT complete</h3>
                        <p className="text-xs text-gray-500">Basic ICT & Green Practices</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-dg-green-50 text-dg-green-700 tabular-nums">
                        {pctOf(shownValue, target)}%
                      </span>
                    </div>
                    <p className="mt-4 tabular-nums">
                      <span className="text-3xl font-semibold text-gray-900">{shownValue}</span>
                      <span className="text-base text-gray-500"> / {target}</span>
                    </p>
                    <p className="text-xs text-gray-500">{reported ? `Reported · biannual report ${reported.date}` : 'Entered in this dashboard'}</p>
                    <div className="mt-3 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-2 rounded-full bg-dg-green-500" style={{ width: `${Math.min(100, pctOf(shownValue, target))}%` }} />
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 space-y-1 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Remaining to target</span>
                        <span className="tabular-nums font-semibold text-gray-900">{Math.max(0, target - shownValue)}</span>
                      </div>
                      {reported && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Entered in dashboard</span>
                          <span className={`tabular-nums font-semibold ${totals.complete < reported.value ? 'text-amber-700' : 'text-gray-900'}`}>
                            {totals.complete}
                          </span>
                        </div>
                      )}
                      <p className="text-xs text-gray-500">{totals.trainees} trainees enrolled · approved values only</p>
                    </div>
                  </div>

                  <div className="md:col-span-2 grid grid-cols-2 gap-4">
                    {([
                      ['ICT in-person', 'Betterworld', totals.ictInPerson],
                      ['ICT online (Word, Excel, PowerPoint)', 'LMS', totals.ictLms],
                      ['Green in-person', 'Impact Lab', totals.greenInPerson],
                      ['Green online (Green Practices)', 'LMS', totals.greenLms],
                    ] as const).map(([label, who, n]) => (
                      <div key={label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <p className="text-xs text-gray-500">{who}</p>
                        <h4 className="text-sm font-semibold text-gray-900">{label}</h4>
                        <p className="mt-2 tabular-nums">
                          <span className="text-2xl font-semibold text-gray-900">{n}</span>
                          <span className="text-sm text-gray-500"> / {totals.trainees}</span>
                        </p>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-1.5 rounded-full bg-dg-blue-500" style={{ width: `${pctOf(n, totals.trainees)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-gray-600 mr-1">Trainees by status</span>
                  {(Object.keys(STATUS_STYLE) as Status[]).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setStatusFilter(s);
                        setParam('tab', 'trainees');
                      }}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[s]} hover:opacity-80`}
                    >
                      {s} {totals.status[s] ?? 0}
                    </button>
                  ))}
                </div>
              </>
            )}

            {progressTab === 'centres' && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">Centres</h2>
                <p className="text-xs text-gray-500 mb-4">Click a centre to see its trainees · approved values only</p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                        <th className="py-2 pr-4 font-medium">Centre</th>
                        <th className="py-2 pr-4 font-medium text-right">Trainees</th>
                        <th className="py-2 pr-4 font-medium text-right">ToT complete</th>
                        <th className="py-2 font-medium w-48">Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {centres
                        .filter(c => saved.some(t => t.centre_id === c.id))
                        .map(c => {
                          const list = sorted.filter(t => t.centre_id === c.id);
                          const done = list.filter(t => isDone(liveOf(t))).length;
                          const isOpen = openCentres.has(c.id);
                          return (
                            <Fragment key={c.id}>
                              <tr onClick={() => toggle(openCentres, setOpenCentres, c.id)} className="border-b border-gray-100 cursor-pointer hover:bg-gray-50">
                                <td className="py-2 pr-4">
                                  <span className="text-gray-400 mr-2">{isOpen ? '▾' : '▸'}</span>
                                  <Link to={`/centers/${c.id}`} onClick={e => e.stopPropagation()} className="text-dg-blue-700 hover:underline">
                                    {c.name}
                                  </Link>
                                </td>
                                <td className="py-2 pr-4 text-right tabular-nums">{list.length}</td>
                                <td className="py-2 pr-4 text-right tabular-nums">{done}</td>
                                <td className="py-2">
                                  <div className="flex items-center gap-2">
                                    <div className="h-2 flex-1 rounded-full bg-gray-100 overflow-hidden">
                                      <div className="h-2 rounded-full bg-dg-green-500" style={{ width: `${pctOf(done, list.length)}%` }} />
                                    </div>
                                    <span className="w-10 text-right text-xs text-gray-600 tabular-nums">{pctOf(done, list.length)}%</span>
                                  </div>
                                </td>
                              </tr>
                              {isOpen && (
                                <tr className="border-b border-gray-100 bg-gray-50/60">
                                  <td colSpan={4} className="py-2 pl-8 pr-4">
                                    <ul className="space-y-1">
                                      {list.map(t => {
                                        const l = liveOf(t);
                                        const s = statusOf(t);
                                        return (
                                          <li key={keyOf(t)} className="flex flex-wrap items-center gap-2 text-sm">
                                            <span className="text-gray-900">{t.name}</span>
                                            <span className="text-xs text-gray-600 tabular-nums">ICT {ictCount(l)}/4 · Green {greenCount(l)}/2</span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[s]}`}>{s}</span>
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {progressTab === 'trainees' && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Trainees · ToT status (1.2.5)</h2>
                  <p className="text-xs text-gray-500">
                    Approved values only. ICT = in-person + Word, Excel, PowerPoint · Green = in-person + Green Practices
                  </p>
                </div>
                {filterBar}
                {(() => {
                  const list = filtered(sorted);
                  return (
                    <>
                      <p className="text-xs text-gray-500">Showing {list.length} of {sorted.length}</p>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[620px] text-sm">
                          <thead>
                            <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                              <th className="py-2 pr-4 font-medium">Trainee</th>
                              <th className="py-2 pr-4 font-medium">Centre</th>
                              <th className="py-2 pr-4 font-medium text-right">ICT</th>
                              <th className="py-2 pr-4 font-medium text-right">Green</th>
                              <th className="py-2 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {list.map(t => {
                              const l = liveOf(t);
                              const s = statusOf(t);
                              return (
                                <tr key={keyOf(t)} className="border-b border-gray-100">
                                  <td className="py-2 pr-4 text-gray-900">{t.name}</td>
                                  <td className="py-2 pr-4 text-xs text-gray-600">{centreName.get(t.centre_id) ?? t.centre_id}</td>
                                  <td className={`py-2 pr-4 text-right tabular-nums ${ictCount(l) === 4 ? 'text-dg-green-700 font-semibold' : 'text-gray-700'}`}>{ictCount(l)}/4</td>
                                  <td className={`py-2 pr-4 text-right tabular-nums ${greenCount(l) === 2 ? 'text-dg-green-700 font-semibold' : 'text-gray-700'}`}>{greenCount(l)}/2</td>
                                  <td className="py-2">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[s]}`}>{s}</span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </>
        )}

        {/* ---------------- Data input ---------------- */}
        {loaded && mode === 'input' && (
          <>
            {/* One evidence folder per track */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Basic ToT evidence</h2>
                <p className="text-sm text-gray-600">One evidence folder link per track.</p>
              </div>
              {(['ict', 'green'] as const)
                .filter(track => (track === 'ict' ? canIct : canGreen))
                .map(track => {
                  const value = evidenceDraft[track] ?? evidence[track] ?? '';
                  return (
                    <div key={track} className="space-y-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {track === 'ict' ? 'ICT evidence link (Betterworld)' : 'Green evidence link (Impact Lab)'}
                      </span>
                      <div className="flex flex-wrap items-center gap-3">
                        <input
                          type="url"
                          value={value}
                          onChange={e => setEvidenceDraft(prev => ({ ...prev, [track]: e.target.value }))}
                          placeholder="https://… evidence folder"
                          className="flex-1 min-w-[280px] px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-dg-green-500"
                        />
                        {evidenceDraft[track] !== undefined && (
                          <button
                            type="button"
                            onClick={() => saveEvidence(track)}
                            className="px-3 py-2 rounded-lg bg-dg-blue-600 text-white text-sm font-medium hover:bg-dg-blue-700"
                          >
                            Save link
                          </button>
                        )}
                        {evidenceDraft[track] === undefined && isEvidenceUrl(evidence[track]) && (
                          <a href={evidence[track] ?? undefined} target="_blank" rel="noreferrer" className="text-sm font-medium text-dg-green-700 hover:underline">
                            Open folder ↗
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Trainees</h2>
                <p className="text-sm text-gray-600">
                  {sorted.length} trainees · click a trainee to enter ToT progress
                  {canIct && !canGreen ? ' · you can enter ICT' : !canIct && canGreen ? ' · you can enter Green' : ''}
                </p>
              </div>
              {filterBar}
              <ul className="space-y-2">
                {filtered(sorted).map(base => {
                  const k = keyOf(base);
                  const t = rowOf(base);
                  const changed = changedKeys.has(k);
                  const open = changed || expanded.has(k);
                  const st = statusOf(base);
                  if (!open) {
                    return (
                      <li key={k} className="rounded-lg border border-gray-200">
                        <button
                          type="button"
                          onClick={() => toggle(expanded, setExpanded, k)}
                          className="w-full grid items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-gray-50 rounded-lg"
                          style={{ gridTemplateColumns: 'minmax(150px, 1.3fr) minmax(140px, 1.5fr) 4.5rem 4.5rem 8.5rem 1rem' }}
                        >
                          <span className="font-medium text-gray-900 truncate">{t.name}</span>
                          <span className="text-xs text-gray-600 truncate">{centreName.get(t.centre_id) ?? t.centre_id}</span>
                          <span className={`text-xs tabular-nums ${ictCount(t) === 4 ? 'text-dg-green-700 font-semibold' : 'text-gray-600'}`}>ICT {ictCount(t)}/4</span>
                          <span className={`text-xs tabular-nums ${greenCount(t) === 2 ? 'text-dg-green-700 font-semibold' : 'text-gray-600'}`}>Green {greenCount(t)}/2</span>
                          <span className={`justify-self-start px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[st]}`}>{st}</span>
                          <span className="text-gray-400">▸</span>
                        </button>
                      </li>
                    );
                  }
                  const box = 'w-4 h-4 accent-dg-green-600';
                  const dateCls = 'px-2 py-1 text-sm border border-gray-300 rounded-md disabled:bg-gray-100';
                  return (
                    <li key={k} className={`p-4 rounded-lg border ${changed ? 'border-dg-blue-300 bg-dg-blue-50/30' : 'border-gray-200'}`}>
                      <div className="flex flex-wrap items-center gap-3">
                        {!changed && (
                          <button type="button" onClick={() => toggle(expanded, setExpanded, k)} aria-label="Collapse" className="text-gray-400 hover:text-gray-700 rotate-90">
                            ▸
                          </button>
                        )}
                        <span className="text-sm font-semibold text-gray-900">{t.name}</span>
                        <span className="text-xs text-gray-500">{centreName.get(t.centre_id) ?? t.centre_id}</span>
                        <span className="ml-auto flex flex-wrap items-center gap-2">
                          <ReviewChip
                            label="ICT"
                            notStarted={ictCount(t) === 0}
                            state={stateOf(reviews, 'tot_trainees', k, 'ict')}
                            comment={commentOf(reviews, 'tot_trainees', k, 'ict')}
                          />
                          <ReviewChip
                            label="Green"
                            notStarted={greenCount(t) === 0}
                            state={stateOf(reviews, 'tot_trainees', k, 'green')}
                            comment={commentOf(reviews, 'tot_trainees', k, 'green')}
                          />
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-md bg-gray-50 px-3 py-2 space-y-2">
                          <p className="text-xs font-semibold text-gray-700">ICT · Betterworld</p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-700">
                            <label className="flex items-center gap-2">
                              <input type="checkbox" className={box} checked={t.in_person_ict} disabled={!canIct} onChange={e => edit(base, { in_person_ict: e.target.checked })} />
                              In-person
                            </label>
                            {t.in_person_ict && (
                              <input type="date" className={dateCls} value={t.in_person_ict_date ?? ''} disabled={!canIct} onChange={e => edit(base, { in_person_ict_date: e.target.value || null })} />
                            )}
                            {ICT_MODULES.map(m => (
                              <label key={m.key} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 accent-dg-blue-600"
                                  checked={t[m.key]}
                                  disabled={!canIct}
                                  onChange={e => edit(base, { [m.key]: e.target.checked } as Partial<Trainee>)}
                                />
                                LMS {m.label}
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-md bg-gray-50 px-3 py-2 space-y-2">
                          <p className="text-xs font-semibold text-gray-700">Green · Impact Lab</p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-700">
                            <label className="flex items-center gap-2">
                              <input type="checkbox" className={box} checked={t.in_person_green} disabled={!canGreen} onChange={e => edit(base, { in_person_green: e.target.checked })} />
                              In-person
                            </label>
                            {t.in_person_green && (
                              <input type="date" className={dateCls} value={t.in_person_green_date ?? ''} disabled={!canGreen} onChange={e => edit(base, { in_person_green_date: e.target.value || null })} />
                            )}
                            <label className="flex items-center gap-2">
                              <input type="checkbox" className="w-4 h-4 accent-dg-blue-600" checked={t.lms_green} disabled={!canGreen} onChange={e => edit(base, { lms_green: e.target.checked })} />
                              LMS Green Practices
                            </label>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {(changedKeys.size > 0 || msg) && (
              <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-md">
                {changedKeys.size > 0 && (
                  <>
                    <span className="text-sm text-gray-700">
                      {changedKeys.size} trainee{changedKeys.size === 1 ? '' : 's'} with unsaved changes
                    </span>
                    <button
                      type="button"
                      onClick={save}
                      disabled={saving}
                      className="px-4 py-2 bg-dg-blue-600 text-white rounded-lg hover:bg-dg-blue-700 disabled:opacity-60 text-sm font-medium"
                    >
                      {saving ? 'Saving…' : 'Save changes'}
                    </button>
                    <button type="button" onClick={() => setDrafts({})} disabled={saving} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                      Discard
                    </button>
                  </>
                )}
                {msg && <span className="text-sm text-gray-700">{msg}</span>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default BasicTotPage;
