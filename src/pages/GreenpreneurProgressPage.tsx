import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { loadCenters } from '../lib/centersData';
import {
  GP_ITEMS,
  TRACK_LABEL,
  doneCount,
  loadGreenpreneurProgramme,
  registeredTotal,
  type GpData,
} from '../lib/greenpreneurProgramme';

// Programme-wide Greenpreneur progress: registered participants, cohort checklists and linked centres
export function GreenpreneurProgressPage() {
  const [data, setData] = useState<GpData>({ cohorts: [], progress: [], centreIds: [] });
  const [centres, setCentres] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([loadGreenpreneurProgramme(), loadCenters()])
      .then(([d, list]) => {
        setData(d);
        setCentres(list as Array<{ id: string; name: string }>);
      })
      .finally(() => setLoading(false));
  }, []);

  const training = useMemo(() => data.cohorts.filter(c => c.track === 'training'), [data.cohorts]);
  const irp = useMemo(() => data.cohorts.filter(c => c.track === 'irp'), [data.cohorts]);
  const registered = registeredTotal(data.cohorts);
  const irpEnrolled = irp.reduce((s, c) => s + (c.enrolled || 0), 0);
  const linkedCentres = centres.filter(c => data.centreIds.includes(c.id));

  const pct = (d: number, t: number) => (t > 0 ? Math.round((d / t) * 100) : 0);

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
                <p className="text-xs uppercase tracking-wide text-gray-500">Registered (6-week training)</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900 tabular-nums">{registered.toLocaleString()}</p>
                <p className="mt-1 text-xs text-gray-500">{training.length} cohorts · counts toward indicator 2.2.2.1</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 border-l-4 border-l-dg-blue-600 shadow-sm p-5">
                <p className="text-xs uppercase tracking-wide text-gray-500">Investment Readiness</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900 tabular-nums">{irpEnrolled.toLocaleString()}</p>
                <p className="mt-1 text-xs text-gray-500">{irp.length} cohorts</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 border-l-4 border-l-dg-green-600 shadow-sm p-5">
                <p className="text-xs uppercase tracking-wide text-gray-500">Centres linked</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900 tabular-nums">{linkedCentres.length}</p>
                <p className="mt-1 text-xs text-gray-500">hosting the programme</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 border-l-4 border-l-dg-blue-600 shadow-sm p-5">
                <p className="text-xs uppercase tracking-wide text-gray-500">Cohorts</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900 tabular-nums">{data.cohorts.length}</p>
                <p className="mt-1 text-xs text-gray-500">all programmes</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Cohorts</h2>
              {data.cohorts.length === 0 ? (
                <p className="text-sm text-gray-500">No cohorts yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 border-b border-gray-200">
                        <th className="py-2 px-3 text-left font-medium">Cohort</th>
                        <th className="py-2 px-3 text-left font-medium">Programme</th>
                        <th className="py-2 px-3 text-left font-medium">Dates</th>
                        <th className="py-2 px-3 text-right font-medium">Registered</th>
                        <th className="py-2 px-3 text-left font-medium w-56">Checklist</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.cohorts.map(c => {
                        const done = doneCount(data.progress, c.id);
                        const total = GP_ITEMS[c.track].length;
                        return (
                          <tr key={c.id} className="hover:bg-gray-50">
                            <td className="py-3 px-3 font-medium text-gray-900 border-b border-gray-100">{c.name}</td>
                            <td className="py-3 px-3 text-gray-700 border-b border-gray-100">{TRACK_LABEL[c.track]}</td>
                            <td className="py-3 px-3 text-gray-600 border-b border-gray-100 whitespace-nowrap">
                              {c.start_date ?? '—'} → {c.end_date ?? '—'}
                            </td>
                            <td className="py-3 px-3 text-right tabular-nums text-gray-900 border-b border-gray-100">{c.enrolled.toLocaleString()}</td>
                            <td className="py-3 px-3 border-b border-gray-100">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                                  <div className="h-2 rounded-full bg-dg-green-500" style={{ width: `${pct(done, total)}%` }} />
                                </div>
                                <span className="text-xs tabular-nums text-gray-700 whitespace-nowrap">{done} / {total}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Linked centres</h2>
              {linkedCentres.length === 0 ? (
                <p className="text-sm text-gray-500">No centres linked yet.</p>
              ) : (
                <ol className="flex flex-wrap gap-2">
                  {linkedCentres.map(c => (
                    <li key={c.id}>
                      <Link
                        to={`/centers/${c.id}`}
                        className="inline-block rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-dg-blue-700 hover:bg-white hover:border-dg-blue-300"
                      >
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default GreenpreneurProgressPage;
