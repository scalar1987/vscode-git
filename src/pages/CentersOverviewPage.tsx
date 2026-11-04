import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { CENTER_STATUSES, CENTER_STATUS_COLORS, type CenterStatus } from '../types/center';

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

const SHORT_STATUS: Record<CenterStatus, string> = {
  'Operational': 'Operational',
  'Works completed – awaiting provisional acceptance': 'Awaiting acceptance',
  'Works in progress / finishing': 'In progress',
  'Works not started': 'Not started',
};

const INFRA_STATUS_CLS: Record<string, string> = {
  Completed: 'bg-dg-green-100 text-dg-green-700',
  'In Progress': 'bg-dg-amber-100 text-dg-amber-700',
  Pending: 'bg-gray-100 text-gray-500',
};

interface RowData {
  c: CenterRow;
  renov: number;
  equip: number;
  internet: string;
  elec: string;
  totDone: number;
  coords: number;
  enrolled: number;
  passed: number;
  target: number;
  passTarget: number;
}

function Bar({ value, max, cls }: { value: number; max: number; cls: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
      <div className={`h-full ${cls}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Pill({ text, cls }: { text: string; cls: string }) {
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cls}`}>{text}</span>;
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
  const [type, setType] = useState<'all' | string>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/centers.json').then(r => r.json()),
      fetch('/training_records.json').then(r => r.json()),
    ])
      .then(([c, t]) => {
        setCenters(c);
        setTot(t.tot_basic ?? []);
      })
      .catch(() => setCenters([]))
      .finally(() => setLoading(false));
  }, []);

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
        internet: c.infrastructure?.internet_infrastructure?.status ?? 'Pending',
        elec: c.infrastructure?.electricity?.status ?? 'Pending',
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
      (type === 'all' || r.c.type === type) &&
      r.c.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const headCls = 'sticky top-0 z-10 bg-gray-50 px-3 py-2.5 text-left text-xs font-semibold text-gray-600 border-b border-gray-200 whitespace-nowrap';
  const cellCls = 'px-3 py-2.5 text-sm text-gray-800 border-b border-gray-100 align-middle';
  const numCls = `${cellCls} tabular-nums text-right whitespace-nowrap`;

  const TotalRow = ({ label, items }: { label: string; items: RowData[] }) => {
    const s = summarize(items);
    return (
      <tr className="bg-gray-50 font-semibold">
        <td className={cellCls} colSpan={2}>
          {label} <span className="text-xs font-normal text-gray-500">({s.count} centres)</span>
        </td>
        <td className={numCls}>{s.renovAvg}% <span className="text-xs font-normal text-gray-400">avg</span></td>
        <td className={numCls}>{s.equipAvg}% <span className="text-xs font-normal text-gray-400">avg</span></td>
        <td className={cellCls} colSpan={2}></td>
        <td className={numCls}>{s.totDone} / {s.coords}</td>
        <td className={numCls}>{s.enrolled.toLocaleString()} / {s.target.toLocaleString()}</td>
        <td className={numCls}>{s.passed.toLocaleString()} / {s.passTarget.toLocaleString()}</td>
      </tr>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/" className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" aria-label="Back to dashboard">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">All GENIE Centres</h1>
          <span className="text-sm text-gray-500">{filtered.length} of {rows.length}</span>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4 flex flex-wrap items-center gap-3">
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
          <select
            value={status}
            onChange={e => setStatus(e.target.value as 'all' | CenterStatus)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
            aria-label="Filter by status"
          >
            <option value="all">All status</option>
            {CENTER_STATUSES.map(s => (
              <option key={s} value={s}>{SHORT_STATUS[s]}</option>
            ))}
          </select>
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
            aria-label="Filter by type"
          >
            <option value="all">All types</option>
            <option value="University">University</option>
            <option value="School">School</option>
            <option value="Mairie">Mairie</option>
          </select>
        </div>

        {/* Table (scrolls horizontally on small screens; header stays visible) */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-auto max-h-[75vh]">
          {loading ? (
            <p className="p-6 text-sm text-gray-500">Loading centres…</p>
          ) : (
            <table className="w-full min-w-[1100px] border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className={`${headCls} min-w-[260px]`}>Centre</th>
                  <th className={headCls}>Status</th>
                  <th className={`${headCls} text-right`}>Renovation</th>
                  <th className={`${headCls} text-right`}>Equipment</th>
                  <th className={headCls}>Internet</th>
                  <th className={headCls}>Electricity</th>
                  <th className={`${headCls} text-right`}>Basic ToT (coordinators done / total)</th>
                  <th className={`${headCls} text-right`}>Basic enrolled / target</th>
                  <th className={`${headCls} text-right`}>Basic passed / pass target (64%)</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500">No centres match these filters</td>
                  </tr>
                )}
                {filtered.map(r => (
                  <tr
                    key={r.c.id}
                    onClick={() => navigate(`/centers/${r.c.id}`)}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <td className={`${cellCls} min-w-[260px]`}>
                      <p className="font-medium text-gray-900">{r.c.name}</p>
                      <p className="text-xs text-gray-500">{r.c.phase} · {r.c.type} · {r.c.region}</p>
                    </td>
                    <td className={cellCls}>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CENTER_STATUS_COLORS[r.c.status] }} />
                        {SHORT_STATUS[r.c.status]}
                      </span>
                    </td>
                    <td className={numCls}>
                      <span className="inline-block w-24 align-middle mr-2">
                        <Bar value={r.renov} max={100} cls="bg-dg-green-500" />
                      </span>
                      {r.renov}%
                    </td>
                    <td className={numCls}>
                      <span className="inline-block w-24 align-middle mr-2">
                        <Bar value={r.equip} max={100} cls="bg-dg-amber-500" />
                      </span>
                      {r.equip}%
                    </td>
                    <td className={cellCls}>
                      <Pill text={r.internet} cls={INFRA_STATUS_CLS[r.internet] ?? INFRA_STATUS_CLS.Pending} />
                    </td>
                    <td className={cellCls}>
                      <Pill text={r.elec} cls={INFRA_STATUS_CLS[r.elec] ?? INFRA_STATUS_CLS.Pending} />
                    </td>
                    <td className={numCls}>{r.totDone} / {r.coords}</td>
                    <td className={numCls}>
                      {r.enrolled.toLocaleString()} <span className="text-gray-400">/ {r.target.toLocaleString()}</span>
                    </td>
                    <td className={numCls}>
                      {r.passed.toLocaleString()} <span className="text-gray-400">/ {r.passTarget.toLocaleString()}</span>
                    </td>
                  </tr>
                ))}
                {filtered.length > 0 && <TotalRow label="Total" items={filtered} />}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default CentersOverviewPage;
