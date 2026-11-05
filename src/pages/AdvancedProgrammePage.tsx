import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { supabase } from '../lib/centersData';
import { getProfile, getSession, onAuthChange, type Profile } from '../lib/auth';

// Each cohort runs ICT (DigiFemmes) and Green Business together, over 4 months.
type Track = 'ict' | 'green';

// Items copied from the DigiFemmes timetable (Aug - Nov 2025), grouped by cohort month
const CURRICULUM: Record<Track, string[][]> = {
  ict: [
    [
      'Week 1 · 🎉 Kickoff ceremony (DigiFemmes)',
      'Week 1 · 🎉 Kickoff ceremony (Green Business)',
      'Week 1 · 📚 Online: UI/UX Understanding UI and UX (part 1) [L1 et L2]',
      'Week 1 · 📚 Online: UI/UX UX Design Process and User Research (part 1) [L3 et L4]',
      'Week 1 · 🤝 In-Person: Peer debrief',
      'Week 1 · 🏛 In-Person: Practical Workshop - Coaching session (with trainer)',
      'Week 1 · 🏛 Free-work slot / On-demand support',
      'Week 2 · 📚 Online: UI/UX Principles of Effective UI Design (part 1) [L5 à L8]',
      'Week 2 · Monday 🌴 Online: Green Business Module introductif Module 1 : Introduction aux pratiques vertes et à la durabilité [P1 à P3]',
      'Week 2 · 🤝 In-Person: Peer debrief',
      'Week 2 · 🏛 In-Person: Practical Workshop - Coaching session (with trainer)',
      'Week 2 · 🏛 Free-work slot / On-demand support',
      'Week 2 · 🏛 In-Person: Job-readiness session - Design your professional career as a tech talent',
      'Week 2 · 🗣️Expert session - Industry Engagement (iCT Academy)',
      'Week 2 · Friday 🌴 Online: Green Business Module introductif Module 1 : Introduction aux pratiques vertes et à la durabilité [P1 à P3]',
      'Week 3 · 📚 Online: UI/UX Exploring UI/UX Design Tools (part 1) [L9 à L10]',
      'Week 3 · 📚 Online: UI/UX UX Design Process and User Research (part 2) [L11]',
      'Week 3 · 🤝 In-Person: Peer debrief',
      'Week 3 · 🏛 In-Person: Practical Workshop - Coaching session (with trainer)',
      'Week 3 · 🏛 Free-work slot / On-demand support',
      'Week 3 · 🌴 Online: Green Business PARTIR 1 Module 2 : Réchauffement et Changement climatique [P1 à P3]',
      'Week 4 · 📚 Online: UI/UX UX Design Process and User Research (part 3) [L13]',
      'Week 4 · 📚 Online: UI/UX Exploring UI/UX Design Tools (part 2) [L14]',
      'Week 4 · 📚 Online: UI/UX Understanding UI and UX (part 2) [L15]',
      'Week 4 · 🤝 Peer Session',
      'Week 4 · 🤝 In-Person: Peer debrief',
      'Week 4 · 🏳️ launch of final UI/UX projects',
      'Week 4 · 🏛 Free-work slot / On-demand support',
      'Week 4 · 🏛 In-Person: Job-readiness session - Profesional etiquette (use of email, workplace behaviour...)',
      'Week 4 · 🗣️Expert session - Industry Engagement (Green Business)',
    ],
    [
      'Week 5 · 🏛 In-Person: Job-readiness session - Create your first portfolio',
      'Week 5 · Monday 📝 Group work session on UI/UX end-of-module projects',
      'Week 5 · Wednesday 📝 Group work session on UI/UX end-of-module projects',
      'Week 5 · 🌴 Online: Green Business PARTIR 1 Module 3 : Conservation de l’énergie et des ressources [P1 à P3]',
      'Week 5 · 📽️ Presentation of end-of-module UI/UX projects',
      'Week 5 · 🌴 Online: Green Business PARTIR 1 Module 4: Réduction des déchets et recyclage [P1 à P3]',
      'Week 6 · 📚 In-Person : Android Concepts d\'Android, configuration & Kotlin [L1 à L3]',
      'Week 6 · 🤝 In-Person: Peer debrief',
      'Week 6 · 🏛 In-Person: Practical Workshop - Coaching session (with trainer)',
      'Week 6 · 🏛 Free-work slot / On-demand support',
      'Week 6 · 🌴 Online: Green Business PARTIR 1 Module 5: Transports durables et écomobilité',
      'Week 6 · 🏛 In-Person: Job-readiness session - LinkedIn Branding (profil optimization, editorial calendar)',
      'Week 6 · 🗣️Expert session - Industry Engagement (iCT Academy)',
      'Week 6 · 🌴 Online: Green Business PARTIR 1 Module 6 : Consommation responsable et modes de vie durables',
      'Week 6 · 🌴 Online: Green Business PARTIR 2 Module 1 : Introduction de l’économie verte et fondamentaux de l’entreprise verte',
      'Week 7 · 📚 Online: Android Designing Android User Interfaces: View & Event [L5 à L10]',
      'Week 7 · 🤝 In-Person: Peer debrief',
      'Week 7 · 🏛 In-Person: Practical Workshop - Coaching session (with trainer)',
      'Week 7 · 🏛 Free-work slot / On-demand support',
      'Week 7 · 🌴 Online: Green Business PARTIR 2 Module 2 : Moteurs de croissance des entreprises vertes',
      'Week 7 · 🌴 Online: Green Business PARTIR 2 Module 3 : Modèles économiques dans les entreprises vertes',
      'Week 7 · 🌴 Online: Green Business PARTIR 2 Module 4 : Défis et opportunités',
      'Week 8 · 📚 Online: Événements, Permission [L11 à L15]',
      'Week 8 · 🤝 In-Person: Peer debrief',
      'Week 8 · 🏛 In-Person: Practical Workshop - Coaching session (with trainer)',
      'Week 8 · 🏛 Free-work slot / On-demand support',
      'Week 8 · 🌴 Online: Green Business PARTIR 2 Module 5 : L’avenir des entreprises vertes',
      'Week 8 · 🌴 Online: Green Business PARTIR 2 Module 6 : Fondamentaux des technologies vertes',
      'Week 8 · 🗣️Expert session - Industry Engagement (Green Business)',
    ],
    [
      'Week 9 · 📚 Online: Context et Ressources, Notification, Activity et Broadcast Receiver [L16 à L20]',
      'Week 9 · 🤝 In-Person: Peer debrief',
      'Week 9 · 🏛 In-Person: Practical Workshop - Coaching session (with trainer)',
      'Week 9 · 🏛 Free-work slot / On-demand support',
      'Week 9 · 🌴 Online: Green Business PARTIR 2 Module 7 : Énergies renouvelables',
      'Week 9 · 🌴 Online: Green Business PARTIR 2 Module 8 : Gestion des déchets et valorisation',
      'Week 10 · 📚 Online: Service, Content Provider, Capteur et réseau [L 21 à 24]',
      'Week 10 · 🤝 In-Person: Peer debrief',
      'Week 10 · 🏛 In-Person: Practical Workshop - Coaching session (with trainer)',
      'Week 10 · 🏛 Free-work slot / On-demand support',
      'Week 10 · 🏛 In-Person: Job-readiness session - Job search and job interview tips',
      'Week 10 · 🗣️Expert session - Industry Engagement (Green Business)',
      'Week 10 · 🌴 Online: Green Business PARTIR 2 Module 9 : Résilience climatique et technologies adaptées [P1 à P3]',
      'Week 11 · 📚 Online: Firebase Build & Release process [L 25 à 30]',
      'Week 11 · 🤝 In-Person: Peer debrief',
      'Week 11 · 🏛 In-Person: Practical Workshop - Coaching session (with trainer)',
      'Week 11 · 🏛 Free-work slot / On-demand support',
      'Week 11 · 🌴 Online: Green Business PARTIR 2 Module 10 : Mise à l’échelle des technologies vertes',
      'Week 11 · 🏛 In-Person: Job-readiness session - Job search and job interview tips',
      'Week 12 · Monday 🏛 In-Person: Project Work / Final Project Support (1o1 coaching)',
      'Week 12 · Monday 🏛 In-Person: Practical Workshop Art of the pitch - Coaching session (with trainer)',
      'Week 12 · Wednesday 🏛 In-Person: Project Work / Final Project Support (1o1 coaching)',
      'Week 12 · Wednesday 🏛 In-Person: Practical Workshop Art of the pitch - Coaching session (with trainer)',
      'Week 12 · Friday 🏛 In-Person: Project Work / Final Project Support (1o1 coaching)',
      'Week 12 · Friday 🏛 In-Person: Practical Workshop Art of the pitch - Coaching session (with trainer)',
    ],
    [
      'Week 13 · Monday 🏛 In-Person: Project Work / Final Project Support (1o1 coaching)',
      'Week 13 · 🏛 In-Person: Practical Workshop Art of the pitch - Coaching session (with trainer)',
      'Week 13 · Wednesday 🏛 In-Person: Project Work / Final Project Support (1o1 coaching)',
      'Week 13 · 🎉 Final Project Presentations',
      'Week 13 · 🎉 Graduation ceremony',
    ],
  ],
  green: [
    [],
    [],
    [],
    [],
  ],
};


interface Cohort {
  id: string;
  name: string;
  start_month: string; // YYYY-MM
}

interface ProgressRow {
  cohort_id: string;
  track: Track;
  month_no: number;
  item_no: number;
  completed: boolean;
  completed_date: string | null;
  completed_at: string | null;
}

// "2025-08" + offset months -> "August 2025"
function monthLabel(start: string, offset: number) {
  const [y, m] = start.split('-').map(Number);
  const d = new Date(y, m - 1 + offset, 1);
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

// Ceremonies, pitches and presentations always take a real date
const needsDate = (label: string) => /ceremony|pitch|presentation|coaching|job-readiness/i.test(label);

// A date item is finished only when ticked AND dated
const isFinished = (label: string, r?: { completed: boolean; completed_date: string | null }) =>
  needsDate(label) ? !!r?.completed && !!r?.completed_date : !!r?.completed;

const itemKey = (cohortId: string, track: Track, month: number, item: number) => `${cohortId}|${track}|${month}|${item}`;

// "Week 6 · ..." -> 6 (0 if the label has no week prefix)
const weekOf = (label: string) => {
  const m = label.match(/^Week (\d+)/);
  return m ? Number(m[1]) : 0;
};

function StatCard({ label, value, sub, tone = 'default' }: { label: string; value: string; sub?: string; tone?: 'default' | 'warn' }) {
  return (
    <div className={`rounded-xl p-5 shadow-sm border ${tone === 'warn' ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'}`}>
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tabular-nums ${tone === 'warn' ? 'text-amber-700' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

export function AdvancedProgrammePage({ mode = 'progress' }: { mode?: 'progress' | 'input' }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [rows, setRows] = useState<Record<string, ProgressRow>>({});
  const [centres, setCentres] = useState<Array<{ id: string; name: string }>>([]);
  const [venues, setVenues] = useState<Record<string, string[]>>({});
  const [venueQuery, setVenueQuery] = useState('');
  const [newName, setNewName] = useState('');
  const [newStart, setNewStart] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteName, setDeleteName] = useState('');
  const [deleting, setDeleting] = useState(false);

  const canEdit = !!profile && (profile.role === 'ggg' || (profile.role === 'partner' && profile.section_access.includes('advanced')));

  useEffect(() => {
    const loadProfile = () => {
      getSession().then(s => (s ? getProfile() : null)).then(p => setProfile(p));
    };
    loadProfile();
    return onAuthChange(loadProfile);
  }, []);

  const loadAll = async () => {
    if (!supabase) return;
    const [c, p, ce, v] = await Promise.all([
      supabase.from('advanced_cohorts').select('id, name, start_month').order('start_month', { ascending: false }),
      supabase.from('advanced_cohort_progress').select('cohort_id, track, month_no, item_no, completed, completed_date, completed_at'),
      supabase.from('centres').select('id, name').order('sort_order'),
      supabase.from('advanced_cohort_centres').select('cohort_id, centre_id'),
    ]);
    setCentres((ce.data ?? []) as Array<{ id: string; name: string }>);
    const vmap: Record<string, string[]> = {};
    (v.data ?? []).forEach((r: any) => (vmap[r.cohort_id] = [...(vmap[r.cohort_id] ?? []), r.centre_id]));
    setVenues(vmap);
    const list = (c.data ?? []) as Cohort[];
    setCohorts(list);
    setSelected(prev => (prev && list.some(x => x.id === prev) ? prev : list[0]?.id ?? ''));
    const map: Record<string, ProgressRow> = {};
    (p.data ?? []).forEach((r: any) => (map[itemKey(r.cohort_id, r.track, r.month_no, r.item_no)] = r));
    setRows(map);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const current = cohorts.find(c => c.id === selected);
  const totalItems = CURRICULUM.ict.flat().length + CURRICULUM.green.flat().length;

  const doneCount = useMemo(() => {
    if (!current) return 0;
    let n = 0;
    (['ict', 'green'] as Track[]).forEach(track =>
      CURRICULUM[track].forEach((items, m) =>
        items.forEach((label, i) => {
          if (isFinished(label, rows[itemKey(current.id, track, m + 1, i)])) n++;
        }),
      ),
    );
    return n;
  }, [rows, current]);

  // Summary for the progress view: per-month counts, latest dated completions, and what is next
  const progressView = useMemo(() => {
    if (!current) return null;
    const monthStats = [0, 1, 2, 3].map(m => ({
      m,
      total: CURRICULUM.ict[m].length + CURRICULUM.green[m].length,
      done: 0,
    }));
    const all: { label: string; month: number; done: boolean; at: string | null; week: number }[] = [];
    (['ict', 'green'] as Track[]).forEach(track =>
      CURRICULUM[track].forEach((items, m) =>
        items.forEach((label, i) => {
          const r = rows[itemKey(current.id, track, m + 1, i)];
          const done = isFinished(label, r);
          if (done) monthStats[m].done++;
          all.push({ label, month: m, done, at: r?.completed_at ?? null, week: weekOf(label) });
        }),
      ),
    );
    // Completed items ordered by when they were ticked (oldest first; items without a time count as oldest)
    const byTime = all
      .map((x, idx) => ({ ...x, idx }))
      .filter(x => x.done)
      .sort((a, b) => (a.at ?? '').localeCompare(b.at ?? '') || a.idx - b.idx);
    const recent = byTime.slice(-5).reverse();
    // Next up: the six unfinished items that come after the most recently ticked item in programme order
    const latestIdx = byTime.length ? byTime[byTime.length - 1].idx : -1;
    const next = all.slice(latestIdx + 1).filter(x => !x.done).slice(0, 5);
    // Outstanding: earlier items (before the most recently ticked one) that are still not done
    const outstanding = all.slice(0, Math.max(latestIdx, 0)).filter(x => !x.done);
    // Cumulative items per programme week: planned (curriculum) vs actual (ticked)
    let plannedSum = 0;
    let actualSum = 0;
    const weekly = Array.from({ length: 13 }, (_, k) => k + 1).map(w => {
      plannedSum += all.filter(x => x.week === w).length;
      actualSum += all.filter(x => x.week === w && x.done).length;
      return { week: `W${w}`, planned: plannedSum, actual: actualSum };
    });
    return { monthStats, recent, next, outstanding, weekly };
  }, [rows, current]);

  const pctOf = (d: number, t: number) => (t > 0 ? Math.round((d / t) * 100) : 0);

  const setItem = (track: Track, month: number, item: number, patch: Partial<ProgressRow>) => {
    if (!current) return;
    const key = itemKey(current.id, track, month, item);
    setRows(prev => {
      const cur = prev[key];
      return {
        ...prev,
        [key]: {
          cohort_id: current.id,
          track,
          month_no: month,
          item_no: item,
          completed: cur?.completed ?? false,
          completed_date: cur?.completed_date ?? null,
          completed_at: cur?.completed_at ?? null,
          ...patch,
        },
      };
    });
    setSaveMsg(null);
  };

  // Ticking a centre saves straight away (no separate save step)
  const toggleVenue = async (centreId: string) => {
    if (!supabase || !current) return;
    const cohortId = current.id;
    const list = venues[cohortId] ?? [];
    const next = list.includes(centreId) ? list.filter(x => x !== centreId) : [...list, centreId];
    setVenues(prev => ({ ...prev, [cohortId]: next }));
    setSaveMsg('Saving…');
    const del = await supabase.from('advanced_cohort_centres').delete().eq('cohort_id', cohortId);
    const ins = next.length
      ? await supabase.from('advanced_cohort_centres').insert(next.map(cid => ({ cohort_id: cohortId, centre_id: cid })))
      : { error: null };
    const err = del.error ?? ins.error;
    setSaveMsg(err ? `Save failed: ${err.message}` : 'Saved');
  };

  const addCohort = async () => {
    if (!supabase) return;
    if (!newName.trim()) return setSaveMsg('Enter a cohort name.');
    setSaving(true);
    const { data, error } = await supabase
      .from('advanced_cohorts')
      .insert({ name: newName.trim(), start_month: newStart })
      .select('id')
      .single();
    setSaving(false);
    if (error) return setSaveMsg(`Could not add cohort: ${error.message}`);
    setNewName('');
    await loadAll();
    setSelected(data.id);
    setSaveMsg('Cohort added');
  };

  // Deleting a cohort also removes its progress rows and venue links (ON DELETE CASCADE)
  const deleteCohort = async () => {
    if (!supabase || !current) return;
    setDeleting(true);
    const { data, error } = await supabase.from('advanced_cohorts').delete().eq('id', current.id).select('id');
    setDeleting(false);
    if (error) return setSaveMsg(`Could not delete cohort: ${error.message}`);
    if (!data || data.length === 0) return setSaveMsg('Could not delete cohort: permission denied.');
    const name = current.name;
    setDeleteOpen(false);
    setDeleteName('');
    await loadAll();
    setSaveMsg(`Deleted "${name}"`);
  };

  const saveProgress = async () => {
    if (!supabase || !current) return;
    setSaving(true);
    setSaveMsg(null);
    const { data: { user } } = await supabase.auth.getUser();
    const now = new Date().toISOString();
    const upserts: any[] = [];
    (['ict', 'green'] as Track[]).forEach(track =>
      CURRICULUM[track].forEach((items, m) =>
        items.forEach((label, i) => {
          const r = rows[itemKey(current.id, track, m + 1, i)];
          upserts.push({
            cohort_id: current.id,
            track,
            month_no: m + 1,
            item_no: i,
            completed: isFinished(label, r),
            completed_date: needsDate(label) && r?.completed_date ? r.completed_date : null,
            completed_at: r?.completed ? (r.completed_at ?? now) : null,
            updated_at: now,
            updated_by: user?.id ?? null,
          });
        }),
      ),
    );
    const { error } = await supabase.from('advanced_cohort_progress').upsert(upserts);
    setSaving(false);
    setSaveMsg(error ? `Save failed: ${error.message}` : 'Saved');
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAFAF7' }}>
      <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/?program=capacity" className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" aria-label="Back to dashboard">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{mode === 'input' ? 'Advanced programme: data input' : 'Advanced programme: progress'}</h1>
          <Link
            to={mode === 'input' ? '/advanced-programme' : '/advanced-programme/input'}
            className="ml-auto px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors"
          >
            {mode === 'input' ? 'Progress' : 'Data input'}
          </Link>
        </div>

        {mode === 'input' && canEdit && (
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-wrap items-end gap-3">
            <label className="text-sm text-gray-700">
              New cohort name
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. 2026 Cohort 1"
                className="mt-1 block px-3 py-2 text-sm border border-gray-300 rounded-md"
              />
            </label>
            <label className="text-sm text-gray-700">
              Start month
              <input
                type="month"
                value={newStart}
                onChange={e => setNewStart(e.target.value)}
                className="mt-1 block px-3 py-2 text-sm border border-gray-300 rounded-md"
              />
            </label>
            <button
              onClick={addCohort}
              disabled={saving}
              className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm font-medium disabled:opacity-60"
            >
              + Add cohort
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-wrap items-center gap-3">
          <label className="text-sm text-gray-700">
            Cohort
            <select
              value={selected}
              onChange={e => setSelected(e.target.value)}
              className="ml-2 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white"
              style={{ minWidth: 300 }}
            >
              {cohorts.length === 0 && <option value="">No cohorts yet</option>}
              {cohorts.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} (starts {monthLabel(c.start_month, 0)})
                </option>
              ))}
            </select>
          </label>
          {current && (
            <span className="ml-auto text-sm text-gray-600 tabular-nums">
              {doneCount} / {totalItems} done
            </span>
          )}
          {current && mode === 'input' && profile?.role === 'ggg' && (
            <button
              type="button"
              onClick={() => { setDeleteName(''); setDeleteOpen(true); }}
              className="px-3 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-sm font-medium"
            >
              Delete cohort
            </button>
          )}
        </div>


        {current && progressView && mode === 'progress' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Overall progress" value={`${pctOf(doneCount, totalItems)}%`} sub={`${doneCount} of ${totalItems} items`} />
              <StatCard label="Items completed" value={String(doneCount)} sub={`${totalItems - doneCount} remaining`} />
              <StatCard label="Centres" value={String((venues[current.id] ?? []).length)} sub="running this cohort" />
              <StatCard
                label="Outstanding"
                value={String(progressView.outstanding.length)}
                sub="earlier items still open"
                tone={progressView.outstanding.length > 0 ? 'warn' : 'default'}
              />
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-gray-900">Planned vs actual</h3>
                <p className="text-xs text-gray-500">Cumulative items completed by programme week</p>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progressView.weekly} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="week" tickLine={false} axisLine={{ stroke: '#e5e7eb' }} tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#e5e7eb', fontSize: 12 }} />
                    <Legend verticalAlign="top" align="right" iconType="plainline" wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} />
                    <Line type="monotone" dataKey="planned" name="Planned" stroke="#9ca3af" strokeDasharray="6 4" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="actual" name="Actual" stroke="#15803d" strokeWidth={3} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Monthly progress</h3>
              <div className="space-y-4">
                {progressView.monthStats.map(s => (
                  <div key={s.m} className="grid items-center gap-4" style={{ gridTemplateColumns: '9rem 1fr 5rem' }}>
                    <span className="text-sm text-gray-700">{monthLabel(current.start_month, s.m)}</span>
                    <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-2.5 rounded-full bg-dg-green-500" style={{ width: `${pctOf(s.done, s.total)}%` }} />
                    </div>
                    <span className="text-sm text-gray-600 text-right tabular-nums">{s.done} / {s.total}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Latest completed</h3>
                {progressView.recent.length === 0 ? (
                  <p className="text-sm text-gray-500">Nothing completed yet.</p>
                ) : (
                  <ul className="space-y-4">
                    {progressView.recent.map((x, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check className="mt-0.5 w-4 h-4 shrink-0 text-dg-green-600" />
                        <div className="min-w-0">
                          <p className="text-sm text-gray-900">{x.label}</p>
                          <p className="text-xs text-gray-500">{monthLabel(current.start_month, x.month)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Next up</h3>
                {progressView.next.length === 0 ? (
                  <p className="text-sm text-gray-500">All items are done.</p>
                ) : (
                  <ul className="space-y-4">
                    {progressView.next.map((x, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="mt-1.5 w-2 h-2 shrink-0 rounded-full bg-gray-300" />
                        <div className="min-w-0">
                          <p className="text-sm text-gray-900">{x.label}</p>
                          <p className="text-xs text-gray-500">{monthLabel(current.start_month, x.month)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className={`rounded-xl p-6 shadow-sm border ${progressView.outstanding.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
                <h3 className="text-base font-semibold text-gray-900">Outstanding</h3>
                <span className="text-xs text-gray-600">Earlier items not yet done</span>
              </div>
              {progressView.outstanding.length === 0 ? (
                <p className="text-sm text-gray-500">No earlier items are left open.</p>
              ) : (
                <ul className="space-y-4">
                  {progressView.outstanding.map((x, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-1.5 w-2 h-2 shrink-0 rounded-full bg-amber-500" />
                      <div className="min-w-0">
                        <p className="text-sm text-gray-900">{x.label}</p>
                        <p className="text-xs text-gray-600">{monthLabel(current.start_month, x.month)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {current && (
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-gray-900">Centres where this cohort runs</span>
            {mode === 'input' && <details className="relative">
              <summary className="list-none cursor-pointer px-3 py-2 text-sm border border-gray-300 rounded-md bg-white min-w-[260px] flex items-center justify-between gap-3">
                <span>{(venues[current.id] ?? []).length} selected</span>
                <span className="text-gray-400">▾</span>
              </summary>
              <div className="absolute z-20 mt-1 w-[320px] bg-white border border-gray-200 rounded-lg shadow-lg p-2">
                <input
                  type="text"
                  value={venueQuery}
                  onChange={e => setVenueQuery(e.target.value)}
                  placeholder="Search centre"
                  className="w-full mb-2 px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-dg-green-500"
                />
                <div className="max-h-56 overflow-y-auto space-y-1">
                  {centres
                    .filter(ce => ce.name.toLowerCase().includes(venueQuery.trim().toLowerCase()))
                    .map(ce => {
                      const on = (venues[current.id] ?? []).includes(ce.id);
                      return (
                        <label key={ce.id} className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 rounded hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={on}
                            disabled={!canEdit}
                            onChange={() => toggleVenue(ce.id)}
                            className="w-4 h-4 accent-dg-green-600"
                          />
                          <span>{ce.name}</span>
                        </label>
                      );
                    })}
                </div>
              </div>
            </details>}
            <ol className="w-full flex flex-wrap gap-2">
              {centres
                .filter(ce => (venues[current.id] ?? []).includes(ce.id))
                .map(ce => (
                  <li key={ce.id}>
                    <Link to={`/centers/${ce.id}`} className="inline-block rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-dg-blue-700 hover:bg-white hover:border-dg-blue-300">{ce.name}</Link>
                  </li>
                ))}
            </ol>
            {(venues[current.id] ?? []).length === 0 && <p className="text-sm text-gray-500">No centre selected yet.</p>}
          </div>
        )}

        {current && mode === 'input' &&
          [0, 1, 2, 3].map(m => (
            <div key={m} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
              <h2 className="text-base font-semibold text-gray-900">{monthLabel(current.start_month, m)}</h2>
              {(['ict'] as Track[]).map(track => (
                <div key={track}>
                  
                  <div className="space-y-2">
                    {CURRICULUM[track][m].map((label, i) => {
                      const r = rows[itemKey(current.id, track, m + 1, i)];
                      const done = r?.completed === true;
                      return (
                        <div key={i} className="flex flex-wrap items-center gap-3 text-sm">
                          <label className="flex items-center gap-2 flex-1 min-w-[240px] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={done}
                              disabled={!canEdit}
                              onChange={e =>
                                setItem(track, m + 1, i, {
                                  completed: e.target.checked,
                                  completed_at: e.target.checked ? new Date().toISOString() : null,
                                  completed_date: e.target.checked ? (r?.completed_date ?? null) : null,
                                })
                              }
                              className="w-4 h-4 accent-dg-green-600"
                            />
                            <span className={isFinished(label, r) ? 'text-gray-900' : 'text-gray-700'}>{label}</span>
                            {isFinished(label, r) && <Check className="w-4 h-4 text-dg-green-600" />}
                          </label>
                          {needsDate(label) && done && (
                            <input
                              type="date"
                              value={r?.completed_date ?? ''}
                              disabled={!canEdit}
                              onChange={e => setItem(track, m + 1, i, { completed_date: e.target.value || null })}
                              className="px-2 py-1 text-sm border border-gray-300 rounded-md disabled:bg-gray-100"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}

        {mode === 'input' && current && canEdit && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={saveProgress}
              disabled={saving}
              className="px-4 py-2 bg-dg-blue-600 text-white rounded-lg hover:bg-dg-blue-700 disabled:opacity-60 font-medium"
            >
              {saving ? 'Saving…' : 'Save to database'}
            </button>
            {saveMsg && <span className="text-sm text-gray-700">{saveMsg}</span>}
          </div>
        )}
        {mode === 'input' && current && !canEdit && (
          <p className="text-sm text-gray-500">Sign in with a DigiFemme or GGGI account to update progress.</p>
        )}
        {deleteOpen && current && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => { setDeleteOpen(false); setDeleteName(''); }}
            role="dialog"
            aria-modal="true"
          >
            <div onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Delete cohort?</h3>
              <p className="text-sm text-gray-700">
                This permanently deletes <strong>{current.name}</strong>, including {doneCount} completed items and {(venues[current.id] ?? []).length} linked centres. This cannot be undone.
              </p>
              <label className="block text-sm text-gray-700">
                Type the cohort name to confirm
                <input
                  type="text"
                  value={deleteName}
                  onChange={e => setDeleteName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setDeleteOpen(false); setDeleteName(''); }}
                  className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={deleteCohort}
                  disabled={deleting || deleteName !== current.name}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm font-medium disabled:opacity-40"
                >
                  {deleting ? 'Deleting…' : 'Delete cohort'}
                </button>
              </div>
            </div>
          </div>
        )}

        {!current && saveMsg && <p className="text-sm text-gray-700">{saveMsg}</p>}
      </div>
    </div>
  );
}

export default AdvancedProgrammePage;
