import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

// Actuals from the June 2026 biannual report and targets from the logframe, one card per indicator.
interface BiannualRow {
  id: string;
  label: string;
  target_total: number;
  actual_2024: number;
  actual_2025: number;
  actual_2026: number;
  cumulative: number;
}

interface LogframeRow {
  id: string;
  targets: Record<string, number>;
}

interface IndicatorData {
  rows: Map<string, BiannualRow>;
  targets: Map<string, Record<string, number>>;
}

let cache: Promise<IndicatorData> | null = null;

function loadIndicatorData(): Promise<IndicatorData> {
  if (!cache) {
    cache = Promise.all([
      fetch('/biannual_2026_06.json').then(r => r.json()),
      fetch('/logframe_structured.json').then(r => r.json()),
    ]).then(([b, lf]: [{ indicators: BiannualRow[] }, LogframeRow[]]) => ({
      rows: new Map(b.indicators.map(i => [i.id, i])),
      targets: new Map(lf.map(l => [l.id, l.targets])),
    }));
  }
  return cache;
}

const pct = (v: number, t: number) => (t > 0 ? Math.min(100, (v / t) * 100) : 0);
const fmt = (v: number, currency?: boolean) => (currency ? `$${v.toLocaleString()}` : v.toLocaleString());

export interface IndicatorCardProps {
  id: string;
  label: string;
  /** Headline value and target; default to the logframe actual (cumulative) and total target */
  value?: number;
  target?: number;
  currency?: boolean;
  /** Amount already raised before the logframe actuals start (added to actuals in the detail) */
  baseline?: number;
  color?: 'green' | 'blue';
  /** cumulative: logframe total · yearly: 2026 (H1) actual against the 2026 target */
  view?: 'cumulative' | 'yearly';
}

export function IndicatorCard({ id, label, value: valueProp, target: targetProp, currency, baseline = 0, color = 'green', view = 'cumulative' }: IndicatorCardProps) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<IndicatorData | null>(null);

  useEffect(() => {
    loadIndicatorData().then(setData).catch(() => setData(null));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const row = data?.rows.get(id);
  const targets = data?.targets.get(id) ?? {};
  const yearly = view === 'yearly' && !!row;
  const value = yearly ? row!.actual_2026 : (valueProp ?? (row ? row.cumulative + baseline : 0));
  const target = yearly ? (targets['2026'] ?? 0) : (targetProp ?? row?.target_total ?? 0);
  const shownLabel = yearly ? `${label} · 2026 (H1)` : label;
  const cumActual = row ? row.cumulative + baseline : 0;
  const bar = color === 'blue' ? 'bg-dg-blue-500' : 'bg-dg-green-500';
  const accent = color === 'blue' ? 'border-dg-blue-200 hover:border-dg-blue-400' : 'border-dg-green-200 hover:border-dg-green-400';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full text-left bg-white rounded-xl p-6 shadow-sm border ${accent} hover:shadow-md transition-shadow`}
      >
        <p className="text-sm text-gray-600 mb-2">{shownLabel}</p>
        <p className="text-3xl font-bold text-gray-900 tabular-nums">
          {fmt(value, currency)} <span className="text-lg font-normal text-gray-400">/ {fmt(target, currency)}</span>
        </p>
        <div className="mt-4 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
          <div className={`h-2 rounded-full ${bar}`} style={{ width: `${pct(value, target)}%` }} />
        </div>
        <p className="mt-1 text-xs text-gray-500">{pct(value, target).toFixed(1)}% · click for details</p>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-gray-500">Logframe {id}</div>
                <h4 className="text-lg font-semibold text-gray-900">{label}</h4>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!row ? (
              <p className="mt-4 text-sm text-gray-500">Loading...</p>
            ) : (
              <>
                <table className="mt-4 w-full text-sm tabular-nums">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                      <th className="py-2 font-medium">Year</th>
                      <th className="py-2 font-medium text-right">Target</th>
                      <th className="py-2 font-medium text-right">Actual</th>
                      <th className="py-2 font-medium text-right">Achieved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(['2024', '2025', '2026', '2027'] as const).map(year => {
                      const t = targets[year] ?? 0;
                      const a =
                        year === '2024' ? row.actual_2024
                        : year === '2025' ? row.actual_2025
                        : year === '2026' ? row.actual_2026
                        : null;
                      return (
                        <tr key={year} className="border-b border-gray-100">
                          <td className="py-2 text-gray-700">{year === '2026' ? '2026 (H1)' : year}</td>
                          <td className="py-2 text-right text-gray-700">{fmt(t, currency)}</td>
                          <td className="py-2 text-right font-medium text-gray-900">{a === null ? '—' : fmt(a, currency)}</td>
                          <td className="py-2 text-right text-gray-500">{a === null ? '—' : `${pct(a, t).toFixed(1)}%`}</td>
                        </tr>
                      );
                    })}
                    <tr className="font-semibold">
                      <td className="py-2 text-gray-900">Total / Cumulative</td>
                      <td className="py-2 text-right text-gray-900">{fmt(row.target_total, currency)}</td>
                      <td className="py-2 text-right text-gray-900">{fmt(cumActual, currency)}</td>
                      <td className="py-2 text-right text-gray-900">{pct(cumActual, row.target_total).toFixed(1)}%</td>
                    </tr>
                  </tbody>
                </table>
                <p className="mt-3 text-sm text-gray-500">
                  {pct(cumActual, row.target_total).toFixed(1)}% of target reached.
                  {baseline > 0 && <> Includes {fmt(baseline, currency)} raised before 2026.</>}
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}