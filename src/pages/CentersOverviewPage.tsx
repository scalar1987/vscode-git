import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { CENTER_STATUSES, CENTER_STATUS_COLORS, type CenterStatus } from '../types/center';
import { loadCenters, loadTotRecords } from '../lib/centersData';

// One table row per centre. Data: public/centers.json + public/training_records.json
interface CenterRow {
  id: string;
  name: string;
  type: string;
  region: string;
  status: CenterStatus;
  phase: string;
  target_basic_ict: number;
  center_coordinators?: Array<{ name: string }>;
  infrastructure?: any;
  training?: any;
}

interface TotRecord {
  center_id: string;
  in_person_completed: boolean | null;
  lms_completed: boolean | null;
}

const PASS_RATE = 0.64; // pass target = 64% of enrolment target (logframe 1.2.7.1 / 1.2.6)

// Network totals shown on the main dashboard (public/biannual_2026_06.json)
interface BiannualRow {
  id: string;
  target_total: number;
  cumulative: number;
}

const SHORT_STATUS: Record<CenterStatus, string> = {
  'Operational': 'Operational',
  'Works completed – awaiting provisional acceptance': 'Awaiting acceptance',
  'Works in progress / finishing': 'In progress',
  'Works not started': 'Not started',
};

interface RowData {
  c: CenterRow;
  renov: number;
  equip: number;
  totDone: number;
  coords: number;
  enrolled: number;
  passed: number;
  target: number;
  passTarget: number;
}

// Same colour rule everywhere: complete = green, started = amber, not started = grey
const barColor = (pct: number) => (pct >= 100 ? 'bg-dg-green-500' : pct > 0 ? 'bg-dg-amber-500' : 'bg-gray-300');
const pctOf = (v: number, t: number) => (t > 0 ? Math.min(100, Math.round((v / t) * 100)) : 0);

function ProgressCell({ value, total, label }: { value: number; total: number; label: string }) {
  const pct = pctOf(value, total);
  // Value on top, bar underneath at full cell width, so neighbouring cells never overlap
  return (
    <div className="min-w-0">
      <p className="text-right text-xs tabular-nums text-gray-700 whitespace-nowrap">{label}</p>
      <div className="mt-1 ml-auto h-1.5 w-24 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor(pct)}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// accent: left colour strip per metric (Tailwind border colour class)
function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 border-l-4 ${accent} shadow-sm p-4`}>
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold text-gray-900 tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

function summarize(items: RowData[]) {
  const n = items.length;
  const sum = (f: (r: RowData) => number) => items.reduce((s, r) => s + f(r), 0);
  return {
    count: n,
    renovAvg: n ? Math.round(sum(r => r.renov) / n) : 0,
    equipAvg: n ? Math.round(sum(r => r.equip) / n) : 0,
    totDone: sum(r => r.totDone),
    coords: sum(r => r.coords),
    enrolled: sum(r => r.enrolled),
    target: sum(r => r.target),
    passed: sum(r => r.passed),
    passTarget: sum(r => r.passTarget),
  };
}

export function CentersOverviewPage() {
  const navigate = useNavigate();
  const [centers, setCenters] = useState<CenterRow[]>([]);
  const [tot, setTot] = useState<TotRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'all' | CenterStatus>('all');
  const [phase, setPhase] = useState<'all' | string>('all');
  const [type, setType] = useState<'all' | string>('all');
  const [query, setQuery] = useState('');
  const [national, setNational] = useState<Map<string, BiannualRow>>(new Map());
  const [asOf, setAsOf] = useState('');

  useEffect(() => {
    Promise.all([loadCenters(), loadTotRecords()])
      .then(([c, records]) => {
        setCenters(c);
        setTot(records);
      })
      .catch(() => setCenters([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch('/biannual_2026_06.json')
      .then(r => r.json() as Promise<{ date: string; indicators: BiannualRow[] }>)
      .then(data => {
        setNational(new Map(data.indicators.map(i => [i.id, i])));
        setAsOf(data.date);
      })
      .catch(() => setNational(new Map()));
  }, []);

  const phases = useMemo(() => [...new Set(centers.map(c => c.phase).filter(Boolean))].sort(), [centers]);

  const rows: RowData[] = useMemo(() => {
    const totByCenter = new Map<string, TotRecord[]>();
    tot.forEach(r => totByCenter.set(r.center_id, [...(totByCenter.get(r.center_id) ?? []), r]));
    return centers.map(c => {
      const recs = totByCenter.get(c.id) ?? [];
      const basic = c.training?.basic_ict_green;
      const target = c.target_basic_ict ?? 0;
      return {
        c,
        renov: c.infrastructure?.renovation?.completion_percentage ?? 0,
        equip: c.infrastructure?.equipment?.completion_percentage ?? 0,
        totDone: recs.filter(r => r.in_person_completed === true && r.lms_completed === true).length,
        coords: c.center_coordinators?.length ?? 0,
        enrolled: (basic?.school_students?.enrolled ?? 0) + (basic?.university_students?.enrolled ?? 0),
        passed: basic?.school_students?.passed_assessment ?? 0,
        target,
        passTarget: Math.round(target * PASS_RATE),
      };
    });
  }, [centers, tot]);

  const filtered = rows.filter(
    r =>
      (status === 'all' || r.c.status === status) &&
      (phase === 'all' || r.c.phase === phase) &&
      (type === 'all' || r.c.type === type) &&
      r.c.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  // Network totals (same indicators as the main dashboard). Filters do not change these yet.
  const tot15 = national.get('1.2.5');
  const enr16 = national.get('1.2.6');
  const pas171 = national.get('1.2.7.1');

  const filtersActive = status !== 'all' || phase !== 'all' || type !== 'all' || query.trim() !== '';
  const s = summarize(filtered);
  const operational = filtered.filter(r => r.c.status === 'Operational').length;

  const headCls = 'sticky top-0 z-10 bg-gray-50 px-3 py-3 text-left text-xs font-semibold text-gray-600 border-b border-gray-200 whitespace-nowrap';
  const cellCls = 'px-3 py-3 text-sm text-gray-800 border-b border-gray-100 align-middle';
  // Extra right padding keeps the dropdown arrow clear of the text
  const selectCls = 'py-2.5 pl-3 pr-10 min-w-[150px] text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-dg-green-500';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8 space-y-5">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" aria-label="Back to dashboard">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">All GENIE Centres</h1>
          <span className="text-sm text-gray-500">{filtered.length} of {rows.length}</span>
        </div>

        {/* Summary of the centres currently shown */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="Centres" value={String(s.count)} sub={`${operational} operational · ${s.count - operational} not yet`} accent="border-l-dg-blue-600" />
          <Stat label="Renovation" value={`${s.renovAvg}%`} sub="average completion" accent="border-l-dg-green-600" />
          <Stat label="Equipment" value={`${s.equipAvg}%`} sub="average completion" accent="border-l-dg-green-600" />
          <Stat
            label="Basic ToT"
            value={tot15 ? `${tot15.cumulative} / ${tot15.target_total}` : '—'}
            sub={`trainers completed · network${asOf ? `, ${asOf}` : ''}`}
            accent="border-l-dg-amber-500"
          />
          <Stat
            label="Students enrolled"
            value={enr16 ? enr16.cumulative.toLocaleString() : '—'}
            sub={`of ${enr16 ? enr16.target_total.toLocaleString() : '—'} target · ${pas171 ? pas171.cumulative.toLocaleString() : '—'} passed`}
            accent="border-l-gray-500"
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search centres"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-dg-green-500"
            />
          </div>
          <select value={phase} onChange={e => setPhase(e.target.value)} className={selectCls} aria-label="Filter by phase">
            <option value="all">All phases</option>
            {phases.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select value={status} onChange={e => setStatus(e.target.value as 'all' | CenterStatus)} className={selectCls} aria-label="Filter by status">
            <option value="all">All status</option>
            {CENTER_STATUSES.map(st => (
              <option key={st} value={st}>{SHORT_STATUS[st]}</option>
            ))}
          </select>
          <select value={type} onChange={e => setType(e.target.value)} className={selectCls} aria-label="Filter by type">
            <option value="all">All types</option>
            <option value="University">University</option>
            <option value="School">School</option>
            <option value="Mairie">Mairie</option>
          </select>
          {filtersActive && (
            <button
              type="button"
              onClick={() => { setQuery(''); setPhase('all'); setStatus('all'); setType('all'); }}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 underline-offset-2 hover:underline"
            >
              Reset
            </button>
          )}
        </div>

        {/* Table (scrolls horizontally on small screens; header stays visible) */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-auto max-h-[75vh]">
          {loading ? (
            <p className="p-6 text-sm text-gray-500">Loading centres…</p>
          ) : (
            <table className="w-full min-w-[1000px] table-fixed border-separate border-spacing-0">
              <colgroup>
                <col style={{ width: '26%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '12%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th className={headCls}>Centre</th>
                  <th className={headCls}>Status</th>
                  <th className={`${headCls} text-right`}>Renovation</th>
                  <th className={`${headCls} text-right`}>Equipment</th>
                  <th className={`${headCls} text-right`}>Basic ToT</th>
                  <th className={`${headCls} text-right`}>Enrolled / target</th>
                  <th className={`${headCls} text-right`}>Passed / pass target</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500">No centres match these filters</td>
                  </tr>
                )}
                {filtered.map(r => (
                  <tr
                    key={r.c.id}
                    onClick={() => navigate(`/centers/${r.c.id}`)}
                    className="cursor-pointer even:bg-gray-50/40 hover:bg-gray-100/70 transition-colors"
                  >
                    <td className={cellCls}>
                      <p className="font-medium text-gray-900 leading-snug">{r.c.name}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{r.c.phase} · {r.c.type} · {r.c.region}</p>
                    </td>
                    <td className={cellCls}>
                      <span
                        className="inline-flex max-w-full items-start gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium leading-snug text-gray-800"
                        style={{ backgroundColor: `${CENTER_STATUS_COLORS[r.c.status]}1f` }}
                      >
                        <span className="mt-1 w-1.5 h-1.5 shrink-0 rounded-full" style={{ backgroundColor: CENTER_STATUS_COLORS[r.c.status] }} />
                        {SHORT_STATUS[r.c.status]}
                      </span>
                    </td>
                    <td className={cellCls}>
                      <ProgressCell value={r.renov} total={100} label={`${r.renov}%`} />
                    </td>
                    <td className={cellCls}>
                      <ProgressCell value={r.equip} total={100} label={`${r.equip}%`} />
                    </td>
                    <td className={cellCls}>
                      <ProgressCell value={r.totDone} total={r.coords} label={`${r.totDone} / ${r.coords}`} />
                    </td>
                    <td className={cellCls}>
                      <ProgressCell value={r.enrolled} total={r.target} label={`${r.enrolled.toLocaleString()} / ${r.target.toLocaleString()}`} />
                    </td>
                    <td className={cellCls}>
                      <ProgressCell value={r.passed} total={r.passTarget} label={`${r.passed.toLocaleString()} / ${r.passTarget.toLocaleString()}`} />
                    </td>
                  </tr>
                ))}
                {filtered.length > 0 && (
                  <tr className="bg-gray-50 font-semibold">
                    <td className={cellCls}>
                      Total <span className="text-xs font-normal text-gray-500">({s.count} centres)</span>
                    </td>
                    <td className={cellCls} />
                    <td className={`${cellCls} text-right tabular-nums`}>{s.renovAvg}% <span className="text-xs font-normal text-gray-400">avg</span></td>
                    <td className={`${cellCls} text-right tabular-nums`}>{s.equipAvg}% <span className="text-xs font-normal text-gray-400">avg</span></td>
                    <td className={`${cellCls} text-right tabular-nums`}>{s.totDone} / {s.coords}</td>
                    <td className={`${cellCls} text-right tabular-nums`}>{s.enrolled.toLocaleString()} / {s.target.toLocaleString()}</td>
                    <td className={`${cellCls} text-right tabular-nums`}>{s.passed.toLocaleString()} / {s.passTarget.toLocaleString()}</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default CentersOverviewPage;
