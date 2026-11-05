import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { ArrowRight, X } from 'lucide-react';

// Actuals from the June 2026 biannual report (public/biannual_2026_06.json).
interface IndicatorRow {
  id: string;
  target_total: number;
  actual_2024: number;
  actual_2025: number;
  actual_2026: number;
  cumulative: number;
}

interface BiannualFile {
  date: string;
  indicators: IndicatorRow[];
}

interface LogframeEntry {
  id: string;
  targets: Record<string, number>;
}

export interface FlowNode {
  id: string;
  label: string;
  indicatorId: string;
  // Stage this node's pass rate is measured against (the previous stage), if any
  passRateOf?: string;
  // Amount already raised before the logframe actuals start (added to the cumulative value)
  baseline?: number;
}

export interface FlowRow {
  title: string;
  color: 'green' | 'blue';
  nodes: FlowNode[];
}

export type View = 'cumulative' | 'yearly';

// Cumulative / By year switch, placed by the parent next to its section title
export function ViewToggle({ value, onChange }: { value: View; onChange: (v: View) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 text-sm">
      {(['cumulative', 'yearly'] as const).map(v => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`px-3 py-1 rounded-md transition-colors ${
            value === v ? 'bg-gray-500 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {v === 'cumulative' ? 'Cumulative' : 'By year'}
        </button>
      ))}
    </div>
  );
}

const FLOWS: FlowRow[] = [
  {
    title: 'Basic ICT & Green Practices',
    color: 'green',
    nodes: [
      { id: 'basic-tot', label: 'Trainers completed ToT', indicatorId: '1.2.5' },
      { id: 'basic-enrolled', label: 'Students enrolled', indicatorId: '1.2.6' },
      { id: 'basic-passed', label: 'Students passed', indicatorId: '1.2.7.1', passRateOf: '1.2.6' },
    ],
  },
  {
    title: 'Advanced ICT & Green Business',
    color: 'blue',
    nodes: [
      { id: 'adv-tot', label: 'Trainers completed ToT (DigiFemme)', indicatorId: '1.3.3' },
      { id: 'adv-enrolled', label: 'Students enrolled', indicatorId: '1.3.4.1' },
      { id: 'adv-passed', label: 'Students passed', indicatorId: '1.3.4.2', passRateOf: '1.3.4.1' },
    ],
  },
];

const COLOR = {
  green: { bar: 'bg-dg-green-500', text: 'text-dg-green-700', ring: 'border-dg-green-200', bg: 'bg-dg-green-50', accent: 'border-l-dg-green-600' },
  blue: { bar: 'bg-dg-blue-500', text: 'text-dg-blue-700', ring: 'border-dg-blue-200', bg: 'bg-dg-blue-50', accent: 'border-l-dg-blue-600' },
} as const;

const pct = (value: number, target: number) => (target > 0 ? Math.min(100, (value / target) * 100) : 0);

export function TrainingFlowSection({
  flows = FLOWS,
  view: viewProp,
}: {
  flows?: FlowRow[];
  view?: View; // controlled by the parent when given
} = {}) {
  const [indicators, setIndicators] = useState<Map<string, IndicatorRow> | null>(null);
  const [error, setError] = useState(false);
  const [viewState] = useState<View>('cumulative');
  const view = viewProp ?? viewState;
  const [selected, setSelected] = useState<string | null>(null);
  // Year-by-year targets per indicator, from the logframe
  const [targetsById, setTargetsById] = useState<Map<string, Record<string, number>>>(new Map());

  // Close the detail popup with Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/biannual_2026_06.json').then(r => r.json() as Promise<BiannualFile>),
      fetch('/logframe_structured.json').then(r => r.json() as Promise<LogframeEntry[]>),
    ])
      .then(([data, logframe]) => {
        setIndicators(new Map(data.indicators.map(i => [i.id, i])));
        setTargetsById(new Map(logframe.map(l => [l.id, l.targets])));
      })
      .catch(() => setError(true));
  }, []);

  if (error) {
    return <p className="text-sm text-gray-500">Could not load training flow data.</p>;
  }
  if (!indicators) {
    return <p className="text-sm text-gray-400">Loading...</p>;
  }

  const selectedNode = flows.flatMap(f => f.nodes).find(n => n.id === selected) ?? null;
  const selectedRow = selectedNode ? indicators.get(selectedNode.indicatorId) : undefined;

  return (
    <div className="space-y-5">
      {flows.map((flow, flowIdx) => {
        const c = COLOR[flow.color];
        return (
          <motion.div
            key={flow.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: flowIdx * 0.1 }}
            className={`rounded-xl border border-gray-200 border-l-4 ${c.accent} bg-white p-5 shadow-sm`}
          >
            <h3 className={`text-lg font-semibold mb-4 ${c.text}`}>{flow.title}</h3>
            <div className="flex flex-col md:flex-row md:items-stretch gap-3">
              {flow.nodes.map((node, idx) => {
                const row = indicators.get(node.indicatorId);
                const value = row ? (view === 'cumulative' ? row.cumulative + (node.baseline ?? 0) : row.actual_2026) : 0;
                const target =
                  view === 'cumulative'
                    ? (row?.target_total ?? 0)
                    : (targetsById.get(node.indicatorId)?.['2026'] ?? 0);
                const share = pct(value, target);
                const isSelected = selected === node.id;
                const prev = node.passRateOf ? indicators.get(node.passRateOf) : undefined;
                const passRate = prev
                  ? pct(
                      view === 'cumulative' ? (row?.cumulative ?? 0) : (row?.actual_2026 ?? 0),
                      view === 'cumulative' ? prev.cumulative : prev.actual_2026,
                    )
                  : null;

                return (
                  <div key={node.id} className="flex md:flex-1 items-center gap-3">
                    <motion.button
                      type="button"
                      onClick={() => setSelected(isSelected ? null : node.id)}
                      whileHover={{ y: -2 }}
                      className={`flex-1 text-left bg-white rounded-lg border p-4 transition-shadow hover:shadow-md ${
                        isSelected ? 'border-gray-900 shadow-md' : 'border-gray-200'
                      }`}
                    >
                      <div className="text-base text-gray-600">{node.indicatorId} · {node.label}</div>
                      {view === 'yearly' && (
                        <div className="mt-1 text-[11px] uppercase tracking-wide text-gray-400">2026 (H1)</div>
                      )}
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-gray-900 tabular-nums">
                          <CountUp end={value} duration={1} separator="," preserveValue />
                        </span>
                        <span className="text-lg text-gray-400">/ {target.toLocaleString()}</span>
                      </div>
                      <div className="mt-2 h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
                        <motion.div
                          className={`h-2.5 rounded-full ${c.bar}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${share}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                      </div>
                      <div className="mt-1 flex justify-between text-sm text-gray-500">
                        <span className="text-base font-medium text-gray-700">{share.toFixed(1)}%</span>
                        {view === 'yearly' && row && (
                          <span className="tabular-nums">
                            2024: {row.actual_2024} · 2025: {row.actual_2025}
                          </span>
                        )}
                      </div>
                    </motion.button>

                    {idx < flow.nodes.length - 1 && (
                      <div className="hidden md:flex flex-col items-center shrink-0 w-14">
                        <ArrowRight className="w-5 h-5 text-gray-400" />
                        {flow.nodes[idx + 1].passRateOf && passRate !== null && (
                          <span className={`mt-1 text-sm font-semibold ${c.text}`}>{passRate.toFixed(0)}%</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        );
      })}

      {selectedNode && selectedRow && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
        >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs text-gray-500">Logframe {selectedRow.id}</div>
              <h4 className="text-lg font-semibold text-gray-900">{selectedNode.label}</h4>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="p-1 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close details"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

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
                const t = targetsById.get(selectedRow.id)?.[year] ?? 0;
                const a =
                  year === '2024' ? selectedRow.actual_2024
                  : year === '2025' ? selectedRow.actual_2025
                  : year === '2026' ? selectedRow.actual_2026
                  : null;
                const label = year === '2026' ? '2026 (H1)' : year;
                return (
                  <tr key={year} className="border-b border-gray-100">
                    <td className="py-2 text-gray-700">{label}</td>
                    <td className="py-2 text-right text-gray-700">{t.toLocaleString()}</td>
                    <td className="py-2 text-right font-medium text-gray-900">{a === null ? '—' : a.toLocaleString()}</td>
                    <td className="py-2 text-right text-gray-500">{a === null ? '—' : `${pct(a, t).toFixed(1)}%`}</td>
                  </tr>
                );
              })}
              <tr className="font-semibold">
                <td className="py-2 text-gray-900">Total / Cumulative</td>
                <td className="py-2 text-right text-gray-900">{selectedRow.target_total.toLocaleString()}</td>
                <td className="py-2 text-right text-gray-900">{selectedRow.cumulative.toLocaleString()}</td>
                <td className="py-2 text-right text-gray-900">{pct(selectedRow.cumulative, selectedRow.target_total).toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-sm text-gray-500">
            {pct(selectedRow.cumulative, selectedRow.target_total).toFixed(1)}% of target reached.
            {selectedNode.passRateOf && indicators.get(selectedNode.passRateOf) && (
              <>
                {' '}Pass rate vs enrolled:{' '}
                {pct(
                  selectedRow.cumulative,
                  indicators.get(selectedNode.passRateOf)?.cumulative ?? 0,
                ).toFixed(1)}
                %.
              </>
            )}
          </p>
        </motion.div>
        </motion.div>
      )}
    </div>
  );
}

export default TrainingFlowSection;
