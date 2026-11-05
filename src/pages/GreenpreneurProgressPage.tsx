import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { loadCenters } from '../lib/centersData';

// Greenpreneur progress across all centres, summed from each centre's yearly block (centre_greenpreneur)
const YEARS = ['2025', '2026', '2027'] as const;

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

interface YearFigures {
  year: string;
  enrolled: number;
  completed: number;
  pitchParticipants: number;
  winners: number;
  seed: number;
}

function figuresFor(gp: any): YearFigures[] {
  return YEARS.map(year => {
    const yr = gp?.[year] ?? {};
    return {
      year,
      enrolled: num(yr?.incubation?.participants_enrolled),
      completed: num(yr?.incubation?.participants_completed),
      pitchParticipants: num(yr?.pitch_competition?.participants),
      winners: num(yr?.pitch_competition?.winners),
      seed: num(yr?.pitch_competition?.total_seed_capital_allocated),
    };
  });
}

const sum = (items: YearFigures[], key: keyof Omit<YearFigures, 'year'>) => items.reduce((s, f) => s + f[key], 0);

export function GreenpreneurProgressPage() {
  const [centres, setCentres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCenters()
      .then(list => setCentres(list))
      .catch(() => setCentres([]))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(
    () =>
      centres.map(c => {
        const years = figuresFor(c.greenpreneur);
        return {
          id: c.id as string,
          name: c.name as string,
          status: (c.greenpreneur?.status ?? 'Not Started') as string,
          years,
          enrolled: sum(years, 'enrolled'),
          completed: sum(years, 'completed'),
          winners: sum(years, 'winners'),
          seed: sum(years, 'seed'),
        };
      }),
    [centres],
  );

  const totals = useMemo(() => {
    const all = rows.flatMap(r => r.years);
    return {
      enrolled: sum(all, 'enrolled'),
      completed: sum(all, 'completed'),
      pitchParticipants: sum(all, 'pitchParticipants'),
      winners: sum(all, 'winners'),
      seed: sum(all, 'seed'),
      withData: rows.filter(r => r.status !== 'Not Started' || r.enrolled + r.winners + r.seed > 0).length,
    };
  }, [rows]);

  const byYear = useMemo(
    () =>
      YEARS.map(year => {
        const items = rows.flatMap(r => r.years.filter(f => f.year === year));
        return {
          year,
          enrolled: sum(items, 'enrolled'),
          completed: sum(items, 'completed'),
          pitchParticipants: sum(items, 'pitchParticipants'),
          winners: sum(items, 'winners'),
          seed: sum(items, 'seed'),
        };
      }),
    [rows],
  );

  const usd = (v: number) => `$${v.toLocaleString()}`;
  const cellCls = 'py-3 px-3 text-sm text-gray-800 border-b border-gray-100 tabular-nums text-right';

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAFAF7' }}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-10 pb-8 space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/?program=greenpreneur" className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" aria-label="Back to dashboard">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Greenpreneur programme: progress</h1>
          <Link
            to="/greenpreneur-input"
            className="ml-auto px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors"
          >
            Data input
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-gray-100 border-l-4 border-l-dg-green-600 shadow-sm p-5">
                <p className="text-xs uppercase tracking-wide text-gray-500">Centres with data</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900 tabular-nums">{totals.withData}</p>
                <p className="mt-1 text-xs text-gray-500">of {rows.length} centres</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 border-l-4 border-l-dg-green-600 shadow-sm p-5">
                <p className="text-xs uppercase tracking-wide text-gray-500">Incubated</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900 tabular-nums">{totals.enrolled.toLocaleString()}</p>
                <p className="mt-1 text-xs text-gray-500">{totals.completed.toLocaleString()} completed</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 border-l-4 border-l-dg-blue-600 shadow-sm p-5">
                <p className="text-xs uppercase tracking-wide text-gray-500">Pitch winners</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900 tabular-nums">{totals.winners.toLocaleString()}</p>
                <p className="mt-1 text-xs text-gray-500">{totals.pitchParticipants.toLocaleString()} pitch participants</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 border-l-4 border-l-dg-blue-600 shadow-sm p-5">
                <p className="text-xs uppercase tracking-wide text-gray-500">Seed capital allocated</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900 tabular-nums">{usd(totals.seed)}</p>
                <p className="mt-1 text-xs text-gray-500">across all centres</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">By year</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b border-gray-200">
                      <th className="py-2 px-3 text-left font-medium">Year</th>
                      <th className="py-2 px-3 text-right font-medium">Enrolled</th>
                      <th className="py-2 px-3 text-right font-medium">Completed</th>
                      <th className="py-2 px-3 text-right font-medium">Pitch participants</th>
                      <th className="py-2 px-3 text-right font-medium">Winners</th>
                      <th className="py-2 px-3 text-right font-medium">Seed capital</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byYear.map(y => (
                      <tr key={y.year}>
                        <td className="py-3 px-3 text-left text-gray-900 font-medium border-b border-gray-100">{y.year}</td>
                        <td className={cellCls}>{y.enrolled.toLocaleString()}</td>
                        <td className={cellCls}>{y.completed.toLocaleString()}</td>
                        <td className={cellCls}>{y.pitchParticipants.toLocaleString()}</td>
                        <td className={cellCls}>{y.winners.toLocaleString()}</td>
                        <td className={cellCls}>{usd(y.seed)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">By centre</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b border-gray-200">
                      <th className="py-2 px-3 text-left font-medium">Centre</th>
                      <th className="py-2 px-3 text-left font-medium">Status</th>
                      <th className="py-2 px-3 text-right font-medium">Enrolled</th>
                      <th className="py-2 px-3 text-right font-medium">Completed</th>
                      <th className="py-2 px-3 text-right font-medium">Winners</th>
                      <th className="py-2 px-3 text-right font-medium">Seed capital</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="py-3 px-3 text-left border-b border-gray-100">
                          <Link to={`/centers/${r.id}`} className="font-medium text-gray-900 hover:underline">
                            {r.name}
                          </Link>
                        </td>
                        <td className="py-3 px-3 text-left text-gray-600 border-b border-gray-100">{r.status}</td>
                        <td className={cellCls}>{r.enrolled.toLocaleString()}</td>
                        <td className={cellCls}>{r.completed.toLocaleString()}</td>
                        <td className={cellCls}>{r.winners.toLocaleString()}</td>
                        <td className={cellCls}>{usd(r.seed)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default GreenpreneurProgressPage;
