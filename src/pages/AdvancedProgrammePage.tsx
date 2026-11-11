import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { supabase } from '../lib/centersData';
import { canEditSection, getProfile, getSession, isApproved, onAuthChange, type Profile } from '../lib/auth';
import { AdvancedInputForm } from './CenterDetailPage';
import { ReviewChip, commentOf, loadReviews, stateOf, type ReviewInfo } from '../lib/reviews';

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
  start_month: string; // YYYY-MM (derived from start_date)
  start_date: string | null; // YYYY-MM-DD
  end_date: string | null;
  enrolled: number;
}

interface TrainerRow {
  id: string;
  centre_id: string;
  name: string;
  in_person_ict: boolean | null;
  in_person_green: boolean | null;
  lms_ui_ux: boolean | null;
  lms_ios: boolean | null;
  lms_android: boolean | null;
  lms_green_business: boolean | null;
}

const LMS_KEYS = ['lms_ui_ux', 'lms_ios', 'lms_android', 'lms_green_business'] as const;
const lmsCount = (t: TrainerRow) => LMS_KEYS.filter(k => t[k] === true).length;
const trainerDone = (t: TrainerRow) => t.in_person_ict === true && t.in_person_green === true && lmsCount(t) === LMS_KEYS.length;
const cohortStart = (c: Cohort) => c.start_date ?? `${c.start_month}-01`;
const cohortYear = (c: Cohort) => Number(cohortStart(c).slice(0, 4));
const todayIso = () => new Date().toISOString().slice(0, 10);
// Logframe 1.3.3: DigiFemme advanced ToT trainers (target 19; names are still being collected)
const TRAINER_TARGET = 19;

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
  // Per cohort and centre: registered and graduated counts, and the trainers running it
  const [venueCounts, setVenueCounts] = useState<Record<string, Record<string, { enrolled: number; graduated: number }>>>({});
  const [allTrainers, setAllTrainers] = useState<TrainerRow[]>([]);
  const [venueTrainers, setVenueTrainers] = useState<Record<string, string[]>>({});
  const [newName, setNewName] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [newStart, setNewStart] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteName, setDeleteName] = useState('');
  const [deleting, setDeleting] = useState(false);

  const canEdit = !!profile && (profile.role === 'ggg' || (profile.role === 'partner' && profile.section_access.includes('advanced')));

  // Centre trainers (ToT) and programme counts, entered per centre
  const [centreSel, setCentreSel] = useState('');
  const [centreQuery, setCentreQuery] = useState('');
  const [centreOpen, setCentreOpen] = useState(false);
  const [centreTrainers, setCentreTrainers] = useState<any[]>([]);
  const [centreLoaded, setCentreLoaded] = useState(false);
  const [reviews, setReviews] = useState<Map<string, ReviewInfo>>(new Map());
  const canIctHere = isApproved(profile) && canEditSection(profile, centreSel, 'advanced_ict');
  const canGreenHere = isApproved(profile) && canEditSection(profile, centreSel, 'advanced_green');

  useEffect(() => {
    if (!supabase || !centreSel) return;
    setCentreLoaded(false);
    supabase
      .from('advanced_trainers')
      .select('*')
      .eq('centre_id', centreSel)
      .order('name')
      .then(t => {
        setCentreTrainers(t.data ?? []);
        setCentreLoaded(true);
      });
  }, [centreSel]);

  useEffect(() => {
    const loadProfile = () => {
      getSession().then(s => (s ? getProfile() : null)).then(p => setProfile(p));
    };
    loadProfile();
    return onAuthChange(loadProfile);
  }, []);

  const loadAll = async () => {
    if (!supabase) return;
    const [c, p, ce, v, tr, ct] = await Promise.all([
      supabase.from('advanced_cohorts').select('id, name, start_month, start_date, end_date, enrolled').order('start_month', { ascending: false }),
      supabase.from('advanced_cohort_progress').select('cohort_id, track, month_no, item_no, completed, completed_date, completed_at'),
      supabase.from('centres').select('id, name').order('sort_order'),
      supabase.from('advanced_cohort_centres').select('cohort_id, centre_id, enrolled, graduated'),
      supabase.from('advanced_trainers').select('id, centre_id, name, in_person_ict, in_person_green, lms_ui_ux, lms_ios, lms_android, lms_green_business').order('name'),
      supabase.from('advanced_cohort_trainers').select('cohort_id, centre_id, trainer_id'),
    ]);
    setCentres((ce.data ?? []) as Array<{ id: string; name: string }>);
    const vmap: Record<string, string[]> = {};
    const cmap: Record<string, Record<string, { enrolled: number; graduated: number }>> = {};
    (v.data ?? []).forEach((r: any) => {
      vmap[r.cohort_id] = [...(vmap[r.cohort_id] ?? []), r.centre_id];
      cmap[r.cohort_id] = { ...(cmap[r.cohort_id] ?? {}), [r.centre_id]: { enrolled: r.enrolled ?? 0, graduated: r.graduated ?? 0 } };
    });
    setVenues(vmap);
    setVenueCounts(cmap);
    setAllTrainers((tr.data ?? []) as TrainerRow[]);
    const tmap: Record<string, string[]> = {};
    (ct.data ?? []).forEach((r: any) => {
      const k = `${r.cohort_id}|${r.centre_id}`;
      tmap[k] = [...(tmap[k] ?? []), r.trainer_id];
    });
    setVenueTrainers(tmap);
    setReviews(await loadReviews());
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

  // Programme-wide numbers, from the cohort centre details and the centre trainers
  const overview = useMemo(() => {
    let registered = 0;
    let graduated = 0;
    const centreIds = new Set<string>();
    const byYear: Record<number, { registered: number; graduated: number }> = {
      2025: { registered: 0, graduated: 0 },
      2026: { registered: 0, graduated: 0 },
      2027: { registered: 0, graduated: 0 },
    };
    cohorts.forEach(c => {
      const year = cohortYear(c);
      Object.entries(venueCounts[c.id] ?? {}).forEach(([cid, v]) => {
        registered += v.enrolled;
        graduated += v.graduated;
        centreIds.add(cid);
        if (byYear[year]) {
          byYear[year].registered += v.enrolled;
          byYear[year].graduated += v.graduated;
        }
      });
    });
    return {
      registered,
      graduated,
      centres: centreIds.size,
      trainers: allTrainers.length,
      trainersDone: allTrainers.filter(trainerDone).length,
      byYear,
    };
  }, [cohorts, venueCounts, allTrainers]);

  // Registered and graduated for the selected cohort, summed over its centres
  const cohortTotals = useMemo(() => {
    if (!current) return { registered: 0, graduated: 0 };
    return Object.values(venueCounts[current.id] ?? {}).reduce(
      (t, v) => ({ registered: t.registered + v.enrolled, graduated: t.graduated + v.graduated }),
      { registered: 0, graduated: 0 },
    );
  }, [venueCounts, current]);

  const setItem = (cohortId: string, track: Track, month: number, item: number, patch: Partial<ProgressRow>) => {
    const key = itemKey(cohortId, track, month, item);
    setRows(prev => {
      const cur = prev[key];
      return {
        ...prev,
        [key]: {
          cohort_id: cohortId,
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

  // Ticking a centre saves straight away (no separate save step); only that centre's link changes
  const toggleVenue = async (cohortId: string, centreId: string) => {
    if (!supabase) return;
    const on = (venues[cohortId] ?? []).includes(centreId);
    setSaveMsg('Saving…');
    const res = on
      ? await supabase.from('advanced_cohort_centres').delete().eq('cohort_id', cohortId).eq('centre_id', centreId)
      : await supabase.from('advanced_cohort_centres').insert({ cohort_id: cohortId, centre_id: centreId });
    if (res.error) return setSaveMsg(`Save failed: ${res.error.message}`);
    // Keep the centre's students-by-year in step with its cohorts (this centre is now linked or unlinked)
    const yearErr = await syncCentreYears([centreId]);
    await loadAll();
    setSaveMsg(yearErr ? `Saved, but students by year failed: ${yearErr.message}` : 'Saved');
  };

  const setVenueCount = (cohortId: string, centreId: string, patch: { enrolled?: number; graduated?: number }) =>
    setVenueCounts(prev => {
      const cur = prev[cohortId]?.[centreId] ?? { enrolled: 0, graduated: 0 };
      return {
        ...prev,
        [cohortId]: {
          ...(prev[cohortId] ?? {}),
          [centreId]: { enrolled: patch.enrolled ?? cur.enrolled, graduated: patch.graduated ?? cur.graduated },
        },
      };
    });

  const toggleVenueTrainer = (cohortId: string, centreId: string, trainerId: string) =>
    setVenueTrainers(prev => {
      const k = `${cohortId}|${centreId}`;
      const cur = prev[k] ?? [];
      return { ...prev, [k]: cur.includes(trainerId) ? cur.filter(x => x !== trainerId) : [...cur, trainerId] };
    });

  // Students by year (2025-2027) per centre = sum over its cohorts, by the year each cohort starts.
  // Written to centre_training_advanced so the centre pages and national totals stay in step.
  const syncCentreYears = async (centreIds: string[]) => {
    const db = supabase;
    if (!db || centreIds.length === 0) return null;
    const YEARS = [2025, 2026, 2027];
    const { data, error } = await db
      .from('advanced_cohort_centres')
      .select('centre_id, enrolled, graduated, advanced_cohorts(start_month)')
      .in('centre_id', centreIds);
    if (error) return error;
    const sums = new Map<string, Record<number, { enrolled: number; passed: number }>>();
    centreIds.forEach(cid =>
      sums.set(cid, Object.fromEntries(YEARS.map(y => [y, { enrolled: 0, passed: 0 }])) as Record<number, { enrolled: number; passed: number }>),
    );
    (data ?? []).forEach((r: any) => {
      const year = Number(String(r.advanced_cohorts?.start_month ?? '').slice(0, 4));
      const bucket = sums.get(r.centre_id);
      if (!bucket || !bucket[year]) return;
      bucket[year].enrolled += r.enrolled ?? 0;
      bucket[year].passed += r.graduated ?? 0;
    });
    const { data: { user } } = await db.auth.getUser();
    const now = new Date().toISOString();
    const rows = [...sums.entries()].flatMap(([cid, b]) =>
      YEARS.map(y => ({
        centre_id: cid,
        year: y,
        enrolled: b[y].enrolled,
        passed: b[y].passed,
        updated_at: now,
        updated_by: user?.id ?? null,
      })),
    );
    const { error: upErr } = await db.from('centre_training_advanced').upsert(rows);
    return upErr;
  };

  // Saves registered / graduated counts and the trainers for every centre linked to this cohort
  const saveVenueDetails = async (cohortId: string) => {
    if (!supabase) return;
    setSaving(true);
    setSaveMsg(null);
    const db = supabase;
    const linked = venues[cohortId] ?? [];
    const counts = venueCounts[cohortId] ?? {};
    const updates = await Promise.all(
      linked.map(cid =>
        db
          .from('advanced_cohort_centres')
          .update({ enrolled: counts[cid]?.enrolled ?? 0, graduated: counts[cid]?.graduated ?? 0 })
          .eq('cohort_id', cohortId)
          .eq('centre_id', cid),
      ),
    );
    const del = await supabase.from('advanced_cohort_trainers').delete().eq('cohort_id', cohortId);
    const trainerRows = linked.flatMap(cid =>
      (venueTrainers[`${cohortId}|${cid}`] ?? []).map(tid => ({ cohort_id: cohortId, centre_id: cid, trainer_id: tid })),
    );
    const ins = trainerRows.length ? await supabase.from('advanced_cohort_trainers').insert(trainerRows) : { error: null };
    // Cohort total registered = sum of the registered counts of its centres
    const total = linked.reduce((n, cid) => n + (counts[cid]?.enrolled ?? 0), 0);
    const totalSave = await db.from('advanced_cohorts').update({ enrolled: total }).eq('id', cohortId);
    const yearErr = await syncCentreYears(linked);
    setSaving(false);
    const err = updates.find(u => u.error)?.error ?? del.error ?? ins.error ?? totalSave.error ?? yearErr;
    if (!err) await loadAll();
    setSaveMsg(err ? `Save failed: ${err.message}` : 'Saved');
  };

  const addCohort = async () => {
    if (!supabase) return;
    if (!newName.trim()) return setSaveMsg('Enter a cohort name.');
    setSaving(true);
    const { data, error } = await supabase
      .from('advanced_cohorts')
      .insert({
        name: newName.trim(),
        start_date: newStart,
        start_month: newStart.slice(0, 7),
        end_date: newEnd || null,
        enrolled: 0, // filled automatically from the centres' registered counts
      })
      .select('id')
      .single();
    setSaving(false);
    if (error) return setSaveMsg(`Could not add cohort: ${error.message}`);
    setNewName('');
    setNewEnd('');
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

  const saveProgress = async (cohort: Cohort) => {
    if (!supabase) return;
    setSaving(true);
    setSaveMsg(null);
    const { data: { user } } = await supabase.auth.getUser();
    const now = new Date().toISOString();
    const upserts: any[] = [];
    (['ict', 'green'] as Track[]).forEach(track =>
      CURRICULUM[track].forEach((items, m) =>
        items.forEach((label, i) => {
          const r = rows[itemKey(cohort.id, track, m + 1, i)];
          upserts.push({
            cohort_id: cohort.id,
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
          <div className="ml-auto flex items-center gap-2">
            <Link
              to={mode === 'input' ? '/advanced-programme' : '/advanced-programme/input'}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors"
            >
              {mode === 'input' ? 'Progress' : 'Data input'}
            </Link>
          </div>
        </div>

        {/* Centre trainers (ToT) input, then the cohort list */}
        {mode === 'input' && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-6">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Centre trainers and programmes</h2>
              <p className="text-sm text-gray-600">Choose a centre to enter its trainers' ToT status and its programme counts.</p>
            </div>
            <div className="relative min-w-[280px] max-w-md">
              <input
                type="text"
                value={centreOpen ? centreQuery : (centres.find(c => c.id === centreSel)?.name ?? '')}
                placeholder="Search centre name"
                onFocus={() => {
                  setCentreOpen(true);
                  setCentreQuery('');
                }}
                onChange={e => {
                  setCentreQuery(e.target.value);
                  setCentreOpen(true);
                }}
                onBlur={() => setCentreOpen(false)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-dg-green-500"
              />
              {centreOpen && (
                <ul className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg">
                  {centres
                    .filter(c => c.name.toLowerCase().includes(centreQuery.trim().toLowerCase()))
                    .map(c => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => {
                            setCentreSel(c.id);
                            setCentreOpen(false);
                            setCentreQuery('');
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${c.id === centreSel ? 'text-dg-green-700 font-medium' : 'text-gray-800'}`}
                        >
                          {c.name}
                        </button>
                      </li>
                    ))}
                  {centres.every(c => !c.name.toLowerCase().includes(centreQuery.trim().toLowerCase())) && (
                    <li className="px-3 py-2 text-sm text-gray-500">No centre found</li>
                  )}
                </ul>
              )}
            </div>
            {centreSel && centreLoaded && (
              <>
                <AdvancedInputForm
                  key={`trainers-${centreSel}`}
                  mode="trainers"
                  centreId={centreSel}
                  canSave={canIctHere || canGreenHere}
                  canIct={canIctHere}
                  canGreen={canGreenHere}
                  trainers={centreTrainers}
                  advancedByYear={{}}
                  reviews={reviews}
                />
              </>
            )}
            <p className="text-xs text-gray-500">
              Students enrolled and passed by year are calculated automatically from the cohort centre details below.
            </p>
          </div>
        )}
        {mode === 'input' && canEdit && (
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-wrap items-end gap-3">
            <label className="text-sm text-gray-700">
              Cohort name
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. 2026 Cohort 1"
                className="mt-1 block w-72 px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-dg-green-500"
              />
            </label>
            <label className="text-sm text-gray-700">
              Start date
              <input
                type="date"
                value={newStart}
                onChange={e => setNewStart(e.target.value)}
                className="mt-1 block w-52 px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-dg-green-500"
              />
            </label>
            <label className="text-sm text-gray-700">
              End date
              <input
                type="date"
                value={newEnd}
                onChange={e => setNewEnd(e.target.value)}
                style={{ width: '13rem' }}
                className="mt-1 block w-36 px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-dg-green-500"
              />
            </label>
            <button
              onClick={addCohort}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-gray-900 text-sm font-semibold hover:bg-gray-100 disabled:opacity-60"
            >
              + Add cohort
            </button>
          </div>
        )}

        {mode === 'progress' && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="All cohorts · Registered 1.3.4.1"
              value={String(overview.registered)}
              sub={`Logframe target 900 · ${overview.centres} centres`}
            />
            <StatCard
              label="All cohorts · Passed (graduated) 1.3.4.2"
              value={String(overview.graduated)}
              sub={`Logframe target 575 · ${pctOf(overview.graduated, overview.registered)}% of registered`}
            />
            <StatCard
              label="Trainers ToT complete · 1.3.3"
              value={`${overview.trainersDone} / ${TRAINER_TARGET}`}
              sub={`Logframe target ${TRAINER_TARGET} · ${overview.trainers} trainers listed so far`}
            />
            <StatCard label="Cohorts" value={String(cohorts.length)} sub={`${cohorts.filter(c => c.end_date && c.end_date < todayIso()).length} ended`} />
          </div>
        )}

        {mode === 'progress' && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Students by year (all cohorts)</h3>
            <p className="text-xs text-gray-500 mb-4">
              Registered = logframe 1.3.4.1 (target 900) · Graduated = logframe 1.3.4.2, passed (target 575) · grouped by the year each cohort starts
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500">
                    <th className="py-2 pr-4 font-medium">Year</th>
                    <th className="py-2 pr-4 font-medium text-right">Registered</th>
                    <th className="py-2 font-medium text-right">Graduated</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(overview.byYear).map(([year, v]) => (
                    <tr key={year} className="border-t border-gray-100">
                      <td className="py-2 pr-4 text-gray-700">{year}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{v.registered}</td>
                      <td className="py-2 text-right tabular-nums">{v.graduated}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 font-semibold text-gray-900">
                    <td className="py-2 pr-4">Total</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{overview.registered}</td>
                    <td className="py-2 text-right tabular-nums">{overview.graduated}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {mode === 'progress' && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-wrap items-center gap-3">
          <label className="text-sm text-gray-700">
            Cohort
            <select
              value={selected}
              onChange={e => setSelected(e.target.value)}
              className="ml-2 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white"
              style={{ minWidth: 480 }}
            >
              {cohorts.length === 0 && <option value="">No cohorts yet</option>}
              {cohorts.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({cohortStart(c)} ~ {c.end_date ?? 'end date TBD'}{c.end_date && c.end_date < todayIso() ? ' · ended' : ''})
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
        )}

        {current && progressView && mode === 'progress' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="This cohort · Registered 1.3.4.1" value={String(cohortTotals.registered)} sub={`${(venues[current.id] ?? []).length} centres`} />
              <StatCard
                label="This cohort · Passed (graduated) 1.3.4.2"
                value={String(cohortTotals.graduated)}
                sub={`${pctOf(cohortTotals.graduated, cohortTotals.registered)}% of registered`}
              />
              <StatCard label="Overall progress" value={`${pctOf(doneCount, totalItems)}%`} sub={`${doneCount} of ${totalItems} items`} />
              <StatCard
                label="Outstanding"
                value={String(progressView.outstanding.length)}
                sub="earlier items still open"
                tone={progressView.outstanding.length > 0 ? 'warn' : 'default'}
              />
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-gray-900">Centres and trainers in this cohort</h3>
                <p className="text-xs text-gray-500">
                  {cohortStart(current)}{current.end_date ? ` ~ ${current.end_date}` : ''}
                  {current.end_date && current.end_date < todayIso() ? ' · ended' : ' · running'}
                </p>
              </div>
              {(venues[current.id] ?? []).length === 0 ? (
                <p className="text-sm text-gray-500">No centre selected yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500">
                        <th className="py-2 pr-4 font-medium">Centre</th>
                        <th className="py-2 pr-4 font-medium">Trainers and ToT status</th>
                        <th className="py-2 pr-4 font-medium text-right">Registered</th>
                        <th className="py-2 font-medium text-right">Graduated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {centres
                        .filter(ce => (venues[current.id] ?? []).includes(ce.id))
                        .map(ce => {
                          // All trainers assigned to this centre; those running this cohort are marked
                          const runningIds = venueTrainers[`${current.id}|${ce.id}`] ?? [];
                          const trainers = allTrainers.filter(t => t.centre_id === ce.id);
                          const cnt = venueCounts[current.id]?.[ce.id] ?? { enrolled: 0, graduated: 0 };
                          return (
                            <tr key={ce.id} className="border-t border-gray-100 align-top">
                              <td className="py-2 pr-4">
                                <Link to={`/centers/${ce.id}`} className="text-dg-blue-700 hover:underline">{ce.name}</Link>
                              </td>
                              <td className="py-2 pr-4">
                                {trainers.length === 0 ? (
                                  <span className="text-gray-400">Not assigned yet</span>
                                ) : (
                                  <ul className="space-y-1">
                                    {trainers.map(t => (
                                      <li key={t.id} className="flex flex-wrap items-center gap-2">
                                        <span className="text-gray-900">{t.name}</span>
                                        {runningIds.includes(t.id) && (
                                          <span className="px-2 py-0.5 rounded-full text-xs bg-dg-blue-50 text-dg-blue-700">this cohort</span>
                                        )}
                                        <span className={`px-2 py-0.5 rounded-full text-xs ${trainerDone(t) ? 'bg-dg-green-50 text-dg-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                          {trainerDone(t) ? 'ToT complete' : 'ToT in progress'}
                                        </span>
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-xs ${t.in_person_ict === true ? 'bg-dg-green-50 text-dg-green-700' : 'bg-gray-100 text-gray-500'}`}
                                          title="Entered by Betterworld"
                                        >
                                          ICT in-person: {t.in_person_ict === true ? 'done' : 'not yet'}
                                        </span>
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-xs ${t.in_person_green === true ? 'bg-dg-green-50 text-dg-green-700' : 'bg-gray-100 text-gray-500'}`}
                                          title="Entered by Impact Lab"
                                        >
                                          Green in-person: {t.in_person_green === true ? 'done' : 'not yet'}
                                        </span>
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-xs ${lmsCount(t) === 4 ? 'bg-dg-green-50 text-dg-green-700' : 'bg-gray-100 text-gray-500'}`}
                                          title="Online modules completed out of 4"
                                        >
                                          Online LMS: {lmsCount(t)} / 4
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </td>
                              <td className="py-2 pr-4 text-right tabular-nums">{cnt.enrolled}</td>
                              <td className="py-2 text-right tabular-nums">{cnt.graduated}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gray-200 font-semibold text-gray-900">
                        <td className="py-2 pr-4">Total</td>
                        <td className="py-2 pr-4" />
                        <td className="py-2 pr-4 text-right tabular-nums">{cohortTotals.registered}</td>
                        <td className="py-2 text-right tabular-nums">{cohortTotals.graduated}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

          <details className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <summary className="cursor-pointer text-base font-semibold text-gray-900">Weekly progress and open items</summary>
            <div className="space-y-6 mt-6">
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
          </div>
          </details>
          </>
        )}

        {mode === 'input' && cohorts.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Cohorts</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-200">
                    <th className="py-2 px-3 text-left font-medium">Cohort</th>
                    <th className="py-2 px-3 text-left font-medium">Starts</th>
                    <th className="py-2 px-3 text-right font-medium">Checklist</th>
                    <th className="py-2 px-3" />
                  </tr>
                </thead>
                <tbody>
                  {cohorts.map(c => {
                    const done = (['ict', 'green'] as Track[]).reduce(
                      (n, track) =>
                        n + CURRICULUM[track].reduce((k, items, m) => k + items.filter((label, i) => isFinished(label, rows[itemKey(c.id, track, m + 1, i)])).length, 0),
                      0,
                    );
                    return (
                      <tr key={c.id}>
                        <td className="py-2.5 px-3 font-medium text-gray-900 border-b border-gray-100">{c.name}</td>
                        <td className="py-2.5 px-3 text-gray-700 border-b border-gray-100">{monthLabel(c.start_month, 0)}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-gray-700 border-b border-gray-100">{done} / {totalItems}</td>
                        <td className="py-2.5 px-3 text-right border-b border-gray-100 whitespace-nowrap">
                          {profile?.role === 'ggg' && (
                            <button
                              type="button"
                              onClick={() => { setSelected(c.id); setDeleteName(''); setDeleteOpen(true); }}
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
          </div>
        )}

        {/* Input: every cohort's checklist is shown at once, in the order of the list above */}
        {mode === 'input' &&
          cohorts.map(c => {
            const doneHere = (['ict', 'green'] as Track[]).reduce(
              (n, track) =>
                n + CURRICULUM[track].reduce((k, items, m) => k + items.filter((label, i) => isFinished(label, rows[itemKey(c.id, track, m + 1, i)])).length, 0),
              0,
            );
            const venueIds = venues[c.id] ?? [];
            return (
              <div key={c.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-base font-semibold text-gray-900">
                    {c.name} · starts {monthLabel(c.start_month, 0)} · {c.enrolled} registered (from centres)
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 tabular-nums">{doneHere} / {totalItems} done</span>
                    {profile?.role === 'ggg' && (
                      <button
                        type="button"
                        onClick={() => { setSelected(c.id); setDeleteName(''); setDeleteOpen(true); }}
                        className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-sm font-medium"
                      >
                        Delete cohort
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900">Centres where this cohort runs</span>
                  <details className="relative">
                    <summary className="list-none cursor-pointer px-3 py-2 text-sm border border-gray-300 rounded-md bg-white min-w-[260px] flex items-center justify-between gap-3">
                      <span>{venueIds.length} selected</span>
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
                          .map(ce => (
                            <label key={ce.id} className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 rounded hover:bg-gray-50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={venueIds.includes(ce.id)}
                                disabled={!canEdit}
                                onChange={() => toggleVenue(c.id, ce.id)}
                                className="w-4 h-4 accent-dg-green-600"
                              />
                              <span>{ce.name}</span>
                            </label>
                          ))}
                      </div>
                    </div>
                  </details>
                  <ol className="w-full flex flex-wrap gap-2">
                    {centres
                      .filter(ce => venueIds.includes(ce.id))
                      .map(ce => (
                        <li key={ce.id}>
                          <Link to={`/centers/${ce.id}`} className="inline-block rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-dg-blue-700 hover:bg-white hover:border-dg-blue-300">{ce.name}</Link>
                        </li>
                      ))}
                  </ol>
                </div>

                {venueIds.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900">Centre details for this cohort</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-gray-500">
                            <th className="py-2 pr-4 font-medium">Centre</th>
                            <th className="py-2 pr-4 font-medium">Trainers running it</th>
                            <th className="py-2 pr-4 font-medium text-right">Registered</th>
                            <th className="py-2 font-medium text-right">Graduated</th>
                          </tr>
                        </thead>
                        <tbody>
                          {centres
                            .filter(ce => venueIds.includes(ce.id))
                            .map(ce => {
                              const selectedTrainers = venueTrainers[`${c.id}|${ce.id}`] ?? [];
                              const cnt = venueCounts[c.id]?.[ce.id] ?? { enrolled: 0, graduated: 0 };
                              const options = allTrainers.filter(t => t.centre_id === ce.id);
                              const numCell = 'w-24 px-2 py-1 text-sm text-right border border-gray-200 rounded-md tabular-nums focus:outline-none focus:ring-2 focus:ring-dg-green-500';
                              return (
                                <tr key={ce.id} className="border-t border-gray-100 align-top">
                                  <td className="py-2 pr-4 text-gray-800">
                                    <div className="flex flex-col items-start gap-1">
                                      <span>{ce.name}</span>
                                      <ReviewChip
                                        state={stateOf(reviews, 'advanced_cohort_centres', `${c.id}|${ce.id}`)}
                                        comment={commentOf(reviews, 'advanced_cohort_centres', `${c.id}|${ce.id}`)}
                                      />
                                    </div>
                                  </td>
                                  <td className="py-2 pr-4">
                                    {options.length === 0 ? (
                                      <span className="text-gray-400">No trainer registered for this centre</span>
                                    ) : (
                                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                                        {options.map(t => (
                                          <label key={t.id} className="flex items-center gap-1.5 text-gray-700 cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={selectedTrainers.includes(t.id)}
                                              disabled={!canEdit}
                                              onChange={() => toggleVenueTrainer(c.id, ce.id, t.id)}
                                              className="w-4 h-4 accent-dg-green-600"
                                            />
                                            {t.name}
                                          </label>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2 pr-4 text-right">
                                    <input
                                      type="number"
                                      min={0}
                                      disabled={!canEdit}
                                      value={cnt.enrolled}
                                      onChange={e => setVenueCount(c.id, ce.id, { enrolled: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                                      className={numCell}
                                    />
                                  </td>
                                  <td className="py-2 text-right">
                                    <input
                                      type="number"
                                      min={0}
                                      disabled={!canEdit}
                                      value={cnt.graduated}
                                      onChange={e => setVenueCount(c.id, ce.id, { graduated: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                                      className={numCell}
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => saveVenueDetails(c.id)}
                        disabled={saving}
                        className="px-4 py-2 bg-dg-blue-600 text-white rounded-lg hover:bg-dg-blue-700 disabled:opacity-60 transition-colors font-medium text-sm"
                      >
                        {saving ? 'Saving…' : 'Save centre details'}
                      </button>
                    )}
                  </div>
                )}

                {[0, 1, 2, 3].map(m => (
                  <div key={m} className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900">{monthLabel(c.start_month, m)}</h3>
                    <div className="space-y-2">
                      {CURRICULUM.ict[m].map((label, i) => {
                        const r = rows[itemKey(c.id, 'ict', m + 1, i)];
                        const done = r?.completed === true;
                        return (
                          <div key={i} className="flex flex-wrap items-center gap-3 text-sm">
                            <label className="flex items-center gap-2 flex-1 min-w-[240px] cursor-pointer">
                              <input
                                type="checkbox"
                                checked={done}
                                disabled={!canEdit}
                                onChange={e =>
                                  setItem(c.id, 'ict', m + 1, i, {
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
                                onChange={e => setItem(c.id, 'ict', m + 1, i, { completed_date: e.target.value || null })}
                                className="px-2 py-1 text-sm border border-gray-300 rounded-md disabled:bg-gray-100"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => saveProgress(c)}
                    disabled={!canEdit || saving}
                    className="px-4 py-2 bg-dg-blue-600 text-white rounded-lg hover:bg-dg-blue-700 disabled:opacity-60 font-medium"
                  >
                    {saving ? 'Saving…' : 'Save checklist'}
                  </button>
                </div>
              </div>
            );
          })}
        {mode === 'input' && saveMsg && <p className="text-sm text-gray-700">{saveMsg}</p>}
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
