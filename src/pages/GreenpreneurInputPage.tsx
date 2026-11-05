import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { loadCenters, supabase } from '../lib/centersData';
import { getProfile, getSession, onAuthChange, type Profile } from '../lib/auth';
import {
  GP_EXTRAS,
  GP_ITEMS,
  TRACK_LABEL,
  loadGreenpreneurProgramme,
  type GpCohort,
  type GpData,
  type GpTrack,
  PITCH_CATEGORIES,
  type PitchCategory,
} from '../lib/greenpreneurProgramme';

interface CentreLite {
  id: string;
  name: string;
}

// Checklist state of one item (completion plus the session details for session-type items)
interface LocalRow {
  completed: boolean;
  completed_date: string | null;
  sessions: number | null;
  note: string | null;
  mentors: number | null;
}

type ChecklistState = Record<number, LocalRow>;

const inputCls =
  'mt-1 block w-36 px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-dg-green-500';

export function GreenpreneurInputPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [centres, setCentres] = useState<CentreLite[]>([]);
  const [data, setData] = useState<GpData>({ cohorts: [], progress: [], centreIds: [], pitch: [] });
  // Checklist state for every cohort, keyed by cohort id, so all checklists can be shown at once
  const [checks, setChecks] = useState<Record<string, ChecklistState>>({});
  const [newCohort, setNewCohort] = useState({ track: 'training' as GpTrack, name: '', start: '', end: '', enrolled: '' });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [centreQuery, setCentreQuery] = useState('');
  const [pitchForm, setPitchForm] = useState({
    edition: String(new Date().getFullYear()),
    category: 'Operating entrepreneurs' as PitchCategory,
    rank: '1',
    laureate: '',
    prize: '',
  });

  const addPitch = async () => {
    if (!supabase || !canEdit) return;
    if (!pitchForm.laureate.trim()) return setMsg('Enter the laureate name.');
    setBusy(true);
    const { error } = await supabase.from('greenpreneur_pitch_results').insert({
      edition: Number(pitchForm.edition),
      category: pitchForm.category,
      rank_no: Number(pitchForm.rank) || 1,
      laureate: pitchForm.laureate.trim(),
      prize_usd: Number(pitchForm.prize) || 0,
    });
    setBusy(false);
    if (error) return setMsg(`Could not add result: ${error.message}`);
    setPitchForm({ ...pitchForm, rank: '1', laureate: '', prize: '' });
    setMsg('Pitch result added');
    await reload();
  };

  const deletePitch = async (id: string) => {
    if (!supabase || !canEdit) return;
    const { error } = await supabase.from('greenpreneur_pitch_results').delete().eq('id', id);
    setMsg(error ? `Could not delete: ${error.message}` : 'Deleted');
    await reload();
  };

  const canEdit = !!profile && (profile.role === 'ggg' || (profile.role === 'partner' && profile.section_access.includes('greenpreneur')));
  const isGgg = profile?.role === 'ggg';

  useEffect(() => {
    const loadProfile = () => {
      getSession().then(s => (s ? getProfile() : null)).then(p => setProfile(p));
    };
    loadProfile();
    return onAuthChange(loadProfile);
  }, []);

  const reload = async () => {
    setData(await loadGreenpreneurProgramme());
  };

  useEffect(() => {
    reload();
    loadCenters().then(list => setCentres(list as CentreLite[]));
  }, []);

  // Fill every cohort's checklist from the saved progress
  useEffect(() => {
    const next: Record<string, ChecklistState> = {};
    data.cohorts.forEach(c => {
      const rows: ChecklistState = {};
      data.progress
        .filter(p => p.cohort_id === c.id)
        .forEach(p => {
          rows[p.item_no] = { completed: p.completed, completed_date: p.completed_date, sessions: p.sessions, note: p.note, mentors: p.mentors };
        });
      next[c.id] = rows;
    });
    setChecks(next);
  }, [data]);

  const linked = useMemo(() => new Set(data.centreIds), [data.centreIds]);

  const toggleCentre = async (id: string) => {
    if (!supabase || !canEdit) return;
    setBusy(true);
    const next = linked.has(id) ? [...linked].filter(x => x !== id) : [...linked, id];
    await supabase.from('greenpreneur_centres').delete().neq('centre_id', '');
    if (next.length) {
      await supabase.from('greenpreneur_centres').insert(next.map(centre_id => ({ centre_id })));
    }
    setBusy(false);
    await reload();
  };

  const addCohort = async () => {
    if (!supabase || !canEdit) return;
    if (!newCohort.name.trim()) return setMsg('Enter a cohort name.');
    setBusy(true);
    const { error } = await supabase.from('greenpreneur_cohorts').insert({
      track: newCohort.track,
      name: newCohort.name.trim(),
      start_date: newCohort.start || null,
      end_date: newCohort.end || null,
      enrolled: Number(newCohort.enrolled) || 0,
    });
    setBusy(false);
    if (error) return setMsg(`Could not add cohort: ${error.message}`);
    setNewCohort({ track: newCohort.track, name: '', start: '', end: '', enrolled: '' });
    setMsg('Cohort added');
    await reload();
  };

  const updateEnrolled = async (c: GpCohort, value: string) => {
    if (!supabase || !canEdit) return;
    const n = Math.max(0, Number(value) || 0);
    if (n === c.enrolled) return;
    const { error } = await supabase.from('greenpreneur_cohorts').update({ enrolled: n }).eq('id', c.id);
    setMsg(error ? `Save failed: ${error.message}` : 'Saved');
    await reload();
  };

  const deleteCohort = async (c: GpCohort) => {
    if (!supabase || !isGgg) return;
    if (!window.confirm(`Delete "${c.name}" and its checklist?`)) return;
    const { data: removed, error } = await supabase.from('greenpreneur_cohorts').delete().eq('id', c.id).select('id');
    if (error || !removed || removed.length === 0) return setMsg(error ? `Could not delete: ${error.message}` : 'Could not delete: permission denied.');
    setMsg(`Deleted "${c.name}"`);
    await reload();
  };

  const saveChecklist = async (c: GpCohort) => {
    if (!supabase || !canEdit) return;
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const now = new Date().toISOString();
    const mine = checks[c.id] ?? {};
    const rows = GP_ITEMS[c.track].map((_, i) => {
      const r = mine[i];
      return {
        cohort_id: c.id,
        item_no: i,
        completed: !!r?.completed,
        completed_date: r?.completed ? r.completed_date : null,
        sessions: r?.sessions ?? null,
        note: r?.note ?? null,
        mentors: r?.mentors ?? null,
        completed_at: r?.completed ? now : null,
        updated_at: now,
        updated_by: user?.id ?? null,
      };
    });
    const { error } = await supabase.from('greenpreneur_cohort_progress').upsert(rows, { onConflict: 'cohort_id,item_no' });
    setBusy(false);
    setMsg(error ? `Save failed: ${error.message}` : `Saved ${c.name}`);
    await reload();
  };

  const setItem = (cohortId: string, i: number, patch: Partial<LocalRow>) =>
    setChecks(prev => {
      const cur = prev[cohortId] ?? {};
      const row = cur[i];
      return {
        ...prev,
        [cohortId]: {
          ...cur,
          [i]: {
            completed: row?.completed ?? false,
            completed_date: row?.completed_date ?? null,
            sessions: row?.sessions ?? null,
            note: row?.note ?? null,
            mentors: row?.mentors ?? null,
            ...patch,
          },
        },
      };
    });

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAFAF7' }}>
      <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 pt-10 pb-8 space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/?program=greenpreneur" className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" aria-label="Back to dashboard">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Greenpreneur programme: data input</h1>
          <Link
            to="/greenpreneur-progress"
            className="ml-auto px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors"
          >
            Progress
          </Link>
        </div>

        {!canEdit && profile && (
          <p className="text-sm text-gray-500">View only: your account cannot change the Greenpreneur programme data.</p>
        )}
        {msg && <p className="text-sm text-gray-700">{msg}</p>}

        {/* Add cohort: same pattern as the Advanced programme */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm text-gray-700">
              Programme
              <select
                value={newCohort.track}
                onChange={e => setNewCohort({ ...newCohort, track: e.target.value as GpTrack })}
                className={inputCls}
                disabled={!canEdit}
              >
                <option value="training">{TRACK_LABEL.training}</option>
                <option value="irp">{TRACK_LABEL.irp}</option>
              </select>
            </label>
            <label className="text-sm text-gray-700">
              Cohort name
              <input
                value={newCohort.name}
                onChange={e => setNewCohort({ ...newCohort, name: e.target.value })}
                placeholder="e.g. Cohort 5"
                className={inputCls}
                disabled={!canEdit}
              />
            </label>
            <label className="text-sm text-gray-700">
              Start
              <input type="date" value={newCohort.start} onChange={e => setNewCohort({ ...newCohort, start: e.target.value })} className={inputCls} disabled={!canEdit} />
            </label>
            <label className="text-sm text-gray-700">
              End
              <input type="date" value={newCohort.end} onChange={e => setNewCohort({ ...newCohort, end: e.target.value })} className={inputCls} disabled={!canEdit} />
            </label>
            <label className="text-sm text-gray-700">
              Registered
              <input
                type="number"
                min={0}
                value={newCohort.enrolled}
                onChange={e => setNewCohort({ ...newCohort, enrolled: e.target.value })}
                className={inputCls}
                disabled={!canEdit}
              />
            </label>
          </div>
          <button
            type="button"
            onClick={addCohort}
            disabled={!canEdit || busy}
            className="px-4 py-2 rounded-lg text-gray-900 text-sm font-semibold hover:bg-gray-100 disabled:opacity-60"
          >
            + Add cohort
          </button>
        </div>

        {/* Cohort list: registered counts are editable here */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Cohorts</h2>
          {data.cohorts.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">No cohorts yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-200">
                    <th className="py-2 px-3 text-left font-medium">Cohort</th>
                    <th className="py-2 px-3 text-left font-medium">Programme</th>
                    <th className="py-2 px-3 text-left font-medium">Dates</th>
                    <th className="py-2 px-3 text-right font-medium">Registered</th>
                    <th className="py-2 px-3 text-right font-medium">Checklist</th>
                    <th className="py-2 px-3" />
                  </tr>
                </thead>
                <tbody>
                  {data.cohorts.map(c => {
                    const done = Object.values(checks[c.id] ?? {}).filter(r => r.completed).length;
                    const total = GP_ITEMS[c.track].length;
                    return (
                      <tr key={c.id}>
                        <td className="py-2.5 px-3 font-medium text-gray-900 border-b border-gray-100">{c.name}</td>
                        <td className="py-2.5 px-3 text-gray-700 border-b border-gray-100">{TRACK_LABEL[c.track]}</td>
                        <td className="py-2.5 px-3 text-gray-600 border-b border-gray-100 whitespace-nowrap">
                          {c.start_date ?? '—'} → {c.end_date ?? '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right border-b border-gray-100">
                          <input
                            type="number"
                            min={0}
                            defaultValue={c.enrolled}
                            disabled={!canEdit}
                            onBlur={e => updateEnrolled(c, e.target.value)}
                            className="w-24 px-2 py-1 text-right text-sm border border-gray-300 rounded-md tabular-nums"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-gray-700 border-b border-gray-100">{done} / {total}</td>
                        <td className="py-2.5 px-3 text-right border-b border-gray-100 whitespace-nowrap">
                          {isGgg && (
                            <button
                              type="button"
                              onClick={() => deleteCohort(c)}
                              className="px-3 py-1.5 rounded-md border border-red-200 text-red-700 hover:bg-red-50 text-xs font-medium"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Checklists: every cohort shown at once, in the order of the list above */}
        {data.cohorts.map(c => {
          const mine = checks[c.id] ?? {};
          const done = Object.values(mine).filter(r => r.completed).length;
          return (
            <div key={c.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold text-gray-900">{c.name} · {TRACK_LABEL[c.track]} checklist</h2>
                <span className="text-sm text-gray-600 tabular-nums">{done} / {GP_ITEMS[c.track].length} done</span>
              </div>
              <div className="mt-4 space-y-2">
                {GP_ITEMS[c.track].map((label, i) => {
                  const r = mine[i];
                  const done = !!r?.completed;
                  const extras = GP_EXTRAS[c.track][i] ?? [];
                  return (
                    <div key={i} className="flex flex-wrap items-center gap-3 text-sm">
                      <label className="flex items-center gap-2 flex-1 min-w-[260px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={done}
                          disabled={!canEdit}
                          onChange={e => setItem(c.id, i, { completed: e.target.checked, completed_date: e.target.checked ? (r?.completed_date ?? null) : null })}
                          className="w-4 h-4 accent-dg-green-600"
                        />
                        <span className={done ? 'text-gray-900' : 'text-gray-700'}>{label}</span>
                      </label>
                      {done && (
                        <input
                          type="date"
                          value={r?.completed_date ?? ''}
                          disabled={!canEdit}
                          onChange={e => setItem(c.id, i, { completed_date: e.target.value || null })}
                          className="px-2 py-1 text-sm border border-gray-300 rounded-md disabled:bg-gray-100"
                        />
                      )}
                      {extras.includes('sessions') && (
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          Sessions
                          <input
                            type="number"
                            min={0}
                            value={r?.sessions ?? ''}
                            disabled={!canEdit}
                            onChange={e => setItem(c.id, i, { sessions: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })}
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-md disabled:bg-gray-100 tabular-nums"
                          />
                        </label>
                      )}
                      {extras.includes('note') && (
                        <label className="flex items-center gap-2 text-sm text-gray-700 flex-1 min-w-[240px]">
                          Networking name
                          <input
                            type="text"
                            value={r?.note ?? ''}
                            disabled={!canEdit}
                            placeholder="e.g. Partner meetup with ..."
                            onChange={e => setItem(c.id, i, { note: e.target.value || null })}
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md disabled:bg-gray-100"
                          />
                        </label>
                      )}
                      {extras.includes('mentors') && (
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          Mentors
                          <input
                            type="number"
                            min={0}
                            value={r?.mentors ?? ''}
                            disabled={!canEdit}
                            onChange={e => setItem(c.id, i, { mentors: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })}
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-md disabled:bg-gray-100 tabular-nums"
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => saveChecklist(c)}
                disabled={!canEdit || busy}
                className="mt-5 px-4 py-2 rounded-lg bg-dg-blue-600 hover:bg-dg-blue-700 disabled:opacity-60 text-white text-sm font-medium"
              >
                {busy ? 'Saving…' : 'Save checklist'}
              </button>
            </div>
          );
        })}

        {/* Pitch competition results (programme-wide, per edition) */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-5">
          <h2 className="text-base font-semibold text-gray-900">Pitch competition</h2>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm text-gray-700">
              Edition
              <input
                type="number"
                value={pitchForm.edition}
                onChange={e => setPitchForm({ ...pitchForm, edition: e.target.value })}
                disabled={!canEdit}
                className={inputCls}
              />
            </label>
            <label className="text-sm text-gray-700">
              Category
              <select
                value={pitchForm.category}
                onChange={e => setPitchForm({ ...pitchForm, category: e.target.value as PitchCategory })}
                disabled={!canEdit}
                className={`${inputCls} w-56`}
              >
                {PITCH_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-gray-700">
              Placing
              <input
                type="number"
                min={1}
                value={pitchForm.rank}
                onChange={e => setPitchForm({ ...pitchForm, rank: e.target.value })}
                disabled={!canEdit}
                className={inputCls}
              />
            </label>
            <label className="text-sm text-gray-700">
              Laureate
              <input
                type="text"
                value={pitchForm.laureate}
                onChange={e => setPitchForm({ ...pitchForm, laureate: e.target.value })}
                placeholder="Enterprise name"
                disabled={!canEdit}
                className={inputCls}
              />
            </label>
            <label className="text-sm text-gray-700">
              Prize (USD)
              <input
                type="number"
                min={0}
                value={pitchForm.prize}
                onChange={e => setPitchForm({ ...pitchForm, prize: e.target.value })}
                disabled={!canEdit}
                className={inputCls}
              />
            </label>
            <button
              type="button"
              onClick={addPitch}
              disabled={!canEdit || busy}
              className="px-4 py-2 rounded-lg text-gray-900 text-sm font-semibold hover:bg-gray-100 disabled:opacity-60"
            >
              + Add result
            </button>
          </div>

          {data.pitch.length === 0 ? (
            <p className="text-sm text-gray-500">No pitch competition results yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-200">
                    <th className="py-2 px-3 text-left font-medium">Edition</th>
                    <th className="py-2 px-3 text-left font-medium">Category</th>
                    <th className="py-2 px-3 text-right font-medium">Placing</th>
                    <th className="py-2 px-3 text-left font-medium">Laureate</th>
                    <th className="py-2 px-3 text-right font-medium">Prize (USD)</th>
                    <th className="py-2 px-3" />
                  </tr>
                </thead>
                <tbody>
                  {data.pitch.map(r => (
                    <tr key={r.id}>
                      <td className="py-2.5 px-3 text-gray-900 border-b border-gray-100 tabular-nums">{r.edition}</td>
                      <td className="py-2.5 px-3 text-gray-700 border-b border-gray-100">{r.category}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-gray-700 border-b border-gray-100">{r.rank_no}</td>
                      <td className="py-2.5 px-3 text-gray-900 border-b border-gray-100">{r.laureate}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-gray-700 border-b border-gray-100">{r.prize_usd.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right border-b border-gray-100">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => deletePitch(r.id)}
                            className="px-3 py-1.5 rounded-md border border-red-200 text-red-700 hover:bg-red-50 text-xs font-medium"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Linked centres (compact: same pattern as the Advanced programme venues) */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-gray-900">Centres linked to the programme</span>
          <details className="relative">
            <summary className="list-none cursor-pointer px-3 py-2 text-sm border border-gray-300 rounded-md bg-white min-w-[260px] flex items-center justify-between gap-3">
              <span>{linked.size} selected</span>
              <span className="text-gray-400">▾</span>
            </summary>
            <div className="absolute z-20 mt-1 w-[320px] bg-white border border-gray-200 rounded-lg shadow-lg p-2">
              <input
                type="text"
                value={centreQuery}
                onChange={e => setCentreQuery(e.target.value)}
                placeholder="Search centre"
                className="w-full mb-2 px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-dg-green-500"
              />
              <div className="max-h-56 overflow-y-auto space-y-1">
                {centres
                  .filter(ce => ce.name.toLowerCase().includes(centreQuery.trim().toLowerCase()))
                  .map(ce => (
                    <label key={ce.id} className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 rounded hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={linked.has(ce.id)}
                        disabled={!canEdit || busy}
                        onChange={() => toggleCentre(ce.id)}
                        className="w-4 h-4 accent-dg-green-600"
                      />
                      <span>{ce.name}</span>
                    </label>
                  ))}
              </div>
            </div>
          </details>
          <ol className="w-full list-decimal list-inside space-y-1 text-sm text-gray-700">
            {centres
              .filter(ce => linked.has(ce.id))
              .map(ce => (
                <li key={ce.id}>
                  <Link to={"/centers/" + ce.id} className="text-dg-blue-700 hover:underline">{ce.name}</Link>
                </li>
              ))}
          </ol>
          {linked.size === 0 && <p className="text-sm text-gray-500">No centre selected yet.</p>}
        </div>
      </div>
    </div>
  );
}

export default GreenpreneurInputPage;
