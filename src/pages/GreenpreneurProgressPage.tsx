import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { loadCenters } from '../lib/centersData';
import {
  GP_ITEMS,
  PITCH_CATEGORIES,
  TRACK_LABEL,
  loadGreenpreneurProgramme,
  registeredTotal,
  type GpCohort,
  type GpData,
  type GpTrack,
} from '../lib/greenpreneurProgramme';

// Programme-wide Greenpreneur progress: one tab per programme (6-week training / 3-week Investment Readiness)
export function GreenpreneurProgressPage() {
  const [data, setData] = useState<GpData>({ cohorts: [], progress: [], centreIds: [], pitch: [] });
  const [centres, setCentres] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [track, setTrack] = useState<GpTrack>('training');
  const [cohortId, setCohortId] = useState<string>('');
  const [showPitch, setShowPitch] = useState(false);

  useEffect(() => {
    Promise.all([loadGreenpreneurProgramme(), loadCenters()])
      .then(([d, list]) => {
        setData(d);
        setCentres(list as Array<{ id: string; name: string }>);
      })
      .finally(() => setLoading(false));
  }, []);

  const trackCohorts = useMemo(() => data.cohorts.filter(c => c.track === track), [data.cohorts, track]);
  const cohort: GpCohort | undefined = trackCohorts.find(c => c.id === cohortId) ?? trackCohorts[0];
  const items = GP_ITEMS[track];

  // Saved checklist values for the selected cohort, keyed by item number
  const rowByItem = useMemo(() => {
    const map: Record<number, (typeof data.progress)[number]> = {};
    if (cohort) data.progress.filter(p => p.cohort_id === cohort.id).forEach(p => (map[p.item_no] = p));
    return map;
  }, [data.progress, cohort]);

  const doneCount = items.filter((_, i) => rowByItem[i]?.completed).length;

  // Latest completed, next up and outstanding (same logic as the Advanced progress page)
  const progressView = useMemo(() => {
    const all = items.map((label, i) => ({ label, i, done: !!rowByItem[i]?.completed, at: rowByItem[i]?.completed_at ?? null }));
    const byTime = all
      .filter(x => x.done)
      .sort((a, b) => (a.at ?? '').localeCompare(b.at ?? '') || a.i - b.i);
    const recent = byTime.slice(-5).reverse();
    const latestIdx = byTime.length ? byTime[byTime.length - 1].i : -1;
    const next = all.slice(latestIdx + 1).filter(x => !x.done).slice(0, 5);
    const outstanding = all.slice(0, Math.max(latestIdx, 0)).filter(x => !x.done);
    return { recent, next, outstanding };
  }, [items, rowByItem]);

  // Chart: cumulative completed items (actual) against an even pace across the checklist (planned)
  const chart = useMemo(() => {
    let actual = 0;
    return items.map((_, i) => {
      if (rowByItem[i]?.completed) actual++;
      return { step: i + 1, planned: i + 1, actual };
    });
  }, [items, rowByItem]);

  // Programme-wide figures
  const allProgress = data.progress;
  // Sessions split by type, using the checklist item name of each saved session count
  const sessionSplit = useMemo(() => {
    const out = { networking: 0, coaching: 0, mentoring: 0 };
    data.progress.forEach(p => {
      const cohort = data.cohorts.find(c => c.id === p.cohort_id);
      if (!cohort || p.sessions == null) return;
      const label = GP_ITEMS[cohort.track][p.item_no] ?? '';
      if (/^Networking/.test(label)) out.networking += p.sessions;
      else if (/coaching/i.test(label)) out.coaching += p.sessions;
      else if (/mentoring/i.test(label)) out.mentoring += p.sessions;
    });
    return out;
  }, [data.progress, data.cohorts]);
  const totalMentors = allProgress.reduce((s, p) => s + (p.mentors ?? 0), 0);
  const irpEnrolled = data.cohorts.filter(c => c.track === 'irp').reduce((s, c) => s + (c.enrolled || 0), 0);
  const linkedCentres = centres.filter(c => data.centreIds.includes(c.id));
  const pct = (d: number, t: number) => (t > 0 ? Math.round((d / t) * 100) : 0);

  // Pitch competition: results grouped by edition (newest first), rows in category and placing order
  const pitchEditions = useMemo(() => {
    const years = [...new Set(data.pitch.map(r => r.edition))].sort((a, b) => b - a);
    return years.map(year => {
      const rows = data.pitch
        .filter(r => r.edition === year)
        .sort((a, b) => PITCH_CATEGORIES.indexOf(a.category) - PITCH_CATEGORIES.indexOf(b.category) || a.rank_no - b.rank_no);
      return { year, rows, total: rows.reduce((s, r) => s + r.prize_usd, 0) };
    });
  }, [data.pitch]);
  const pitchTotal = data.pitch.reduce((s, r) => s + r.prize_usd, 0);

  const tabCls = (active: boolean) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-gray-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAFAF7' }}>
      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 pt-10 pb-8 space-y-6">
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
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs uppercase tracking-wide text-gray-500">Registered (training)</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900 tabular-nums">{registeredTotal(data.cohorts).toLocaleString()}</p>
                <p className="mt-1 text-xs text-gray-500">counts toward indicator 2.2.2.1</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs uppercase tracking-wide text-gray-500">Investment Readiness</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900 tabular-nums">{irpEnrolled.toLocaleString()}</p>
                <p className="mt-1 text-xs text-gray-500">enrolled</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs uppercase tracking-wide text-gray-500">Sessions held</p>
                <div className="mt-2 space-y-1 text-sm text-gray-700">
                  <div className="flex justify-between gap-3">
                    <span>Networking</span>
                    <span className="font-semibold text-gray-900 tabular-nums">{sessionSplit.networking.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Group coaching</span>
                    <span className="font-semibold text-gray-900 tabular-nums">{sessionSplit.coaching.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Mentoring</span>
                    <span className="font-semibold text-gray-900 tabular-nums">{sessionSplit.mentoring.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs uppercase tracking-wide text-gray-500">Mentors</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900 tabular-nums">{totalMentors.toLocaleString()}</p>
                <p className="mt-1 text-xs text-gray-500">in mentoring sessions</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs uppercase tracking-wide text-gray-500">Centres linked</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900 tabular-nums">{linkedCentres.length}</p>
                <p className="mt-1 text-xs text-gray-500">hosting the programme</p>
              </div>
            </div>

            {/* Programme tabs */}
            <div className="flex flex-wrap gap-2">
              {(['training', 'irp'] as GpTrack[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setShowPitch(false);
                    setTrack(t);
                    setCohortId('');
                  }}
                  className={tabCls(!showPitch && track === t)}
                >
                  {TRACK_LABEL[t]}
                </button>
              ))}
              <button type="button" onClick={() => setShowPitch(true)} className={tabCls(showPitch)}>
                Pitch competition
              </button>
            </div>

            {showPitch ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border border-gray-100 border-l-4 border-l-dg-green-600 shadow-sm p-5">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Total prize awarded</p>
                    <p className="mt-2 text-3xl font-semibold text-gray-900 tabular-nums">${pitchTotal.toLocaleString()}</p>
                    <p className="mt-1 text-xs text-gray-500">USD across all editions</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 border-l-4 border-l-dg-blue-600 shadow-sm p-5">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Laureates</p>
                    <p className="mt-2 text-3xl font-semibold text-gray-900 tabular-nums">{data.pitch.length}</p>
                    <p className="mt-1 text-xs text-gray-500">winning enterprises</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 border-l-4 border-l-dg-blue-600 shadow-sm p-5">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Editions</p>
                    <p className="mt-2 text-3xl font-semibold text-gray-900 tabular-nums">{pitchEditions.length}</p>
                    <p className="mt-1 text-xs text-gray-500">Pitch Competition (Demo Day)</p>
                  </div>
                </div>

                {pitchEditions.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                    <p className="text-sm text-gray-500">No pitch competition results yet.</p>
                  </div>
                ) : (
                  pitchEditions.map(ed => (
                    <div key={ed.year} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
                        <h2 className="text-base font-semibold text-gray-900">{ed.year} edition</h2>
                        <span className="text-sm text-gray-600 tabular-nums">Total ${ed.total.toLocaleString()}</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[560px] text-sm">
                          <thead>
                            <tr className="text-xs text-gray-500 border-b border-gray-200">
                              <th className="py-2 px-3 text-left font-medium">Category</th>
                              <th className="py-2 px-3 text-right font-medium">Placing</th>
                              <th className="py-2 px-3 text-left font-medium">Laureate</th>
                              <th className="py-2 px-3 text-right font-medium">Prize (USD)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ed.rows.map(r => (
                              <tr key={r.id} className="hover:bg-gray-50">
                                <td className="py-2.5 px-3 text-gray-700 border-b border-gray-100">{r.category}</td>
                                <td className="py-2.5 px-3 text-right tabular-nums text-gray-700 border-b border-gray-100">{r.rank_no}</td>
                                <td className="py-2.5 px-3 font-medium text-gray-900 border-b border-gray-100">{r.laureate}</td>
                                <td className="py-2.5 px-3 text-right tabular-nums text-gray-900 border-b border-gray-100">{r.prize_usd.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : trackCohorts.length === 0 || !cohort ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <p className="text-sm text-gray-500">No {TRACK_LABEL[track]} cohorts yet.</p>
              </div>
            ) : (
              <>
                {/* Cohort selector + progress */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-wrap items-center gap-3">
                  <label className="text-sm text-gray-700">
                    Cohort
                    <select
                      value={cohort.id}
                      onChange={e => setCohortId(e.target.value)}
                      className="ml-2 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white"
                      style={{ minWidth: 260 }}
                    >
                      {trackCohorts.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.start_date ?? 'no start date'})
                        </option>
                      ))}
                    </select>
                  </label>
                  <span className="text-sm text-gray-700">Registered {cohort.enrolled.toLocaleString()}</span>
                  <span className="ml-auto text-sm text-gray-600 tabular-nums">
                    {doneCount} / {items.length} done ({pct(doneCount, items.length)}%)
                  </span>
                </div>

                {/* Graph */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                  <div className="mb-4">
                    <h2 className="text-base font-semibold text-gray-900">Planned vs actual</h2>
                    <p className="text-xs text-gray-500">Cumulative checklist items completed, in checklist order</p>
                  </div>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chart} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="step" tickLine={false} axisLine={{ stroke: '#e5e7eb' }} tick={{ fontSize: 12, fill: '#6b7280' }} />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                        <Tooltip
                          contentStyle={{ borderRadius: 8, borderColor: '#e5e7eb', fontSize: 12 }}
                          labelFormatter={v => items[Number(v) - 1] ?? ''}
                        />
                        <Legend verticalAlign="top" align="right" iconType="plainline" wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} />
                        <Line type="monotone" dataKey="planned" name="Planned" stroke="#9ca3af" strokeDasharray="6 4" dot={false} strokeWidth={2} />
                        <Line type="monotone" dataKey="actual" name="Actual" stroke="#15803d" strokeWidth={3} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Latest completed, next up and outstanding (same layout as the Advanced progress page) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Latest completed</h3>
                    {progressView.recent.length === 0 ? (
                      <p className="text-sm text-gray-500">Nothing completed yet.</p>
                    ) : (
                      <ul className="space-y-4">
                        {progressView.recent.map(x => (
                          <li key={x.i} className="flex items-start gap-3">
                            <Check className="mt-0.5 w-4 h-4 shrink-0 text-dg-green-600" />
                            <p className="text-sm text-gray-900">{x.label}</p>
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
                        {progressView.next.map(x => (
                          <li key={x.i} className="flex items-start gap-3">
                            <span className="mt-1.5 w-2 h-2 shrink-0 rounded-full bg-gray-300" />
                            <p className="text-sm text-gray-900">{x.label}</p>
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
                      {progressView.outstanding.map(x => (
                        <li key={x.i} className="flex items-start gap-3">
                          <span className="mt-1.5 w-2 h-2 shrink-0 rounded-full bg-amber-500" />
                          <p className="text-sm text-gray-900">{x.label}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}

            {/* Linked centres */}
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
