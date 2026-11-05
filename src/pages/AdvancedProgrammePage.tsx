import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
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

export function AdvancedProgrammePage() {
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
      supabase.from('advanced_cohort_progress').select('cohort_id, track, month_no, item_no, completed, completed_date'),
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" aria-label="Back to dashboard">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Advanced programme progress</h1>
        </div>

        {canEdit && (
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
        </div>

        {current && (
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-gray-900">Centres where this cohort runs</span>
            <details className="relative">
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
            </details>
            <ol className="w-full list-decimal list-inside space-y-1 text-sm text-gray-700">
              {centres
                .filter(ce => (venues[current.id] ?? []).includes(ce.id))
                .map(ce => (
                  <li key={ce.id}>
                    <Link to={`/centers/${ce.id}`} className="text-dg-blue-700 hover:underline">{ce.name}</Link>
                  </li>
                ))}
            </ol>
            {(venues[current.id] ?? []).length === 0 && <p className="text-sm text-gray-500">No centre selected yet.</p>}
          </div>
        )}

        {current &&
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

        {current && canEdit && (
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
        {current && !canEdit && (
          <p className="text-sm text-gray-500">Sign in with a DigiFemme or GGGI account to update progress.</p>
        )}
        {!current && saveMsg && <p className="text-sm text-gray-700">{saveMsg}</p>}
      </div>
    </div>
  );
}

export default AdvancedProgrammePage;
