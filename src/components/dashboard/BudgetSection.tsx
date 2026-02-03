import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  X,
  ChevronRight,
  PieChart,
  BarChart3,
} from 'lucide-react';
import { useBudgetData } from '../../hooks/useBudgetData';

// Types
type BudgetStatus = 'On Budget' | 'Near Limit' | 'Over Budget';

interface OutputSummary {
  output_id: string;
  planned: number;
  spent: number;
  percentage: number;
  status: BudgetStatus;
  activities: {
    id: string;
    planned: number;
    spent: number;
    status: BudgetStatus;
  }[];
}

// Status configuration
const STATUS_CONFIG: Record<BudgetStatus, { color: string; bgColor: string; borderColor: string }> = {
  'On Budget': { color: 'text-green-600', bgColor: 'bg-green-100', borderColor: 'border-green-200' },
  'Near Limit': { color: 'text-amber-600', bgColor: 'bg-amber-100', borderColor: 'border-amber-200' },
  'Over Budget': { color: 'text-red-600', bgColor: 'bg-red-100', borderColor: 'border-red-200' },
};

const STATUS_COLORS: Record<BudgetStatus, string> = {
  'On Budget': '#10B981',
  'Near Limit': '#F59E0B',
  'Over Budget': '#EF4444',
};

// Get budget status based on spent vs planned
const getBudgetStatus = (spent: number, planned: number): BudgetStatus => {
  if (planned === 0) return 'On Budget';
  const pct = (spent / planned) * 100;
  if (pct > 100) return 'Over Budget';
  if (pct > 80) return 'Near Limit';
  return 'On Budget';
};

// Format currency
const formatCurrency = (amount: number, compact = false): string => {
  if (compact && amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(2)}M`;
  }
  if (compact && amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Statistics Card Component
function StatCard({
  label,
  value,
  subValue,
  icon: Icon,
  color,
  bgColor,
  index,
}: {
  label: string;
  value: string;
  subValue?: string;
  icon: typeof DollarSign;
  color: string;
  bgColor: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`${bgColor} rounded-xl p-4 flex items-center gap-3`}
    >
      <div className={`w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className={`text-lg font-bold ${color}`}>{value}</p>
        <p className="text-xs text-gray-600">{label}</p>
        {subValue && <p className="text-[10px] text-gray-400">{subValue}</p>}
      </div>
    </motion.div>
  );
}

// Output Bar Component
function OutputBar({
  output,
  maxPlanned,
  onClick,
  index,
}: {
  output: OutputSummary;
  maxPlanned: number;
  onClick: () => void;
  index: number;
}) {
  const barWidth = (output.planned / maxPlanned) * 100;
  const spentWidth = (output.spent / output.planned) * 100;
  const statusColor = STATUS_COLORS[output.status];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={onClick}
      className="flex items-center gap-3 py-2 px-3 hover:bg-gray-50 rounded-lg cursor-pointer group transition-colors"
    >
      {/* Output Label */}
      <div className="w-16 flex-shrink-0">
        <span className="text-xs font-semibold text-gray-700">Output {output.output_id}</span>
      </div>

      {/* Bar Chart */}
      <div className="flex-1 relative h-8">
        {/* Planned bar (background) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-5 bg-gray-100 rounded"
          style={{ width: `${barWidth}%` }}
        />
        {/* Spent bar (foreground) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-5 rounded transition-all"
          style={{
            width: `${Math.min(spentWidth, 100) * (barWidth / 100)}%`,
            backgroundColor: statusColor,
          }}
        />
        {/* Planned boundary marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-0.5 h-7 bg-gray-400"
          style={{ left: `${barWidth}%` }}
        />
      </div>

      {/* Values */}
      <div className="w-28 text-right flex-shrink-0">
        <p className="text-xs font-semibold" style={{ color: statusColor }}>
          {formatCurrency(output.spent, true)}
        </p>
        <p className="text-[10px] text-gray-400">/ {formatCurrency(output.planned, true)}</p>
      </div>

      {/* Percentage */}
      <div className="w-14 text-right flex-shrink-0">
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_CONFIG[output.status].bgColor} ${STATUS_CONFIG[output.status].color}`}
        >
          {output.percentage.toFixed(0)}%
        </span>
      </div>

      {/* Chevron */}
      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-dg-green-500 transition-colors" />
    </motion.div>
  );
}

// Alert Component
function BudgetAlert({
  type,
  message,
  index,
}: {
  type: 'warning' | 'danger' | 'success';
  message: string;
  index: number;
}) {
  const config = {
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: AlertTriangle },
    danger: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: AlertTriangle },
    success: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: CheckCircle2 },
  };

  const AlertIcon = config[type].icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config[type].bg} border ${config[type].border}`}
    >
      <AlertIcon className={`w-4 h-4 flex-shrink-0 ${config[type].text}`} />
      <span className={`text-xs ${config[type].text}`}>{message}</span>
    </motion.div>
  );
}

// Output Detail Modal
function OutputDetailModal({
  output,
  onClose,
}: {
  output: OutputSummary | null;
  onClose: () => void;
}) {
  if (!output) return null;

  const statusColor = STATUS_COLORS[output.status];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1001] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-br from-gray-100 to-gray-50 flex-shrink-0">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono bg-dg-green-100 text-dg-green-700 px-2 py-1 rounded">
                  Output {output.output_id}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[output.status].bgColor} ${STATUS_CONFIG[output.status].color}`}
                >
                  {output.status}
                </span>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mt-4">Budget Breakdown</h2>
          </div>

          {/* Summary */}
          <div className="p-6 border-b border-gray-100">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">Planned</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(output.planned)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">Spent</p>
                <p className="text-lg font-bold" style={{ color: statusColor }}>
                  {formatCurrency(output.spent)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">Remaining</p>
                <p className={`text-lg font-bold ${output.spent > output.planned ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(output.planned - output.spent)}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-500">Utilization</span>
                <span className="text-sm font-bold" style={{ color: statusColor }}>
                  {output.percentage.toFixed(1)}%
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(output.percentage, 100)}%` }}
                  transition={{ duration: 0.8 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: statusColor }}
                />
              </div>
            </div>
          </div>

          {/* Activities Table */}
          <div className="p-6 overflow-y-auto flex-grow">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Activities ({output.activities.length})
            </h3>
            <div className="space-y-2">
              {output.activities.map((activity) => {
                const actPct = activity.planned > 0 ? (activity.spent / activity.planned) * 100 : 0;
                const actStatus = getBudgetStatus(activity.spent, activity.planned);
                const actColor = STATUS_COLORS[actStatus];

                return (
                  <div key={activity.id} className="flex items-center gap-3 py-2 px-3 bg-gray-50 rounded-lg">
                    <span className="text-xs font-mono text-gray-500 w-12">{activity.id}</span>
                    <div className="flex-1">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(actPct, 100)}%`,
                            backgroundColor: actColor,
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-right w-24">
                      <p className="text-xs font-semibold" style={{ color: actColor }}>
                        {formatCurrency(activity.spent, true)}
                      </p>
                      <p className="text-[10px] text-gray-400">/ {formatCurrency(activity.planned, true)}</p>
                    </div>
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${STATUS_CONFIG[actStatus].bgColor} ${STATUS_CONFIG[actStatus].color}`}
                    >
                      {actPct.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Main Component
export function BudgetSection() {
  const budget = useBudgetData();
  const [selectedOutput, setSelectedOutput] = useState<OutputSummary | null>(null);

  // Process outputs data
  const outputSummaries = useMemo((): OutputSummary[] => {
    if (!budget.outputs) return [];

    return budget.outputs.map((output) => {
      const percentage = output.totalPlanned > 0 ? (output.totalSpent / output.totalPlanned) * 100 : 0;
      const status = getBudgetStatus(output.totalSpent, output.totalPlanned);

      return {
        output_id: output.output_id,
        planned: output.totalPlanned,
        spent: output.totalSpent,
        percentage,
        status,
        activities: output.activities.map((act) => ({
          id: act.id,
          planned: act.planned,
          spent: act.spent,
          status: getBudgetStatus(act.spent, act.planned),
        })),
      };
    });
  }, [budget.outputs]);

  // Get max planned for bar scaling
  const maxPlanned = useMemo(() => {
    return Math.max(...outputSummaries.map((o) => o.planned), 1);
  }, [outputSummaries]);

  // Generate alerts
  const alerts = useMemo(() => {
    const alertList: { type: 'warning' | 'danger' | 'success'; message: string }[] = [];

    // Check for over-budget activities
    outputSummaries.forEach((output) => {
      output.activities.forEach((act) => {
        if (act.spent > act.planned) {
          alertList.push({
            type: 'danger',
            message: `Activity ${act.id} is over budget: ${formatCurrency(act.spent, true)} / ${formatCurrency(act.planned, true)}`,
          });
        }
      });
    });

    // Check for near-limit activities
    outputSummaries.forEach((output) => {
      output.activities.forEach((act) => {
        const pct = act.planned > 0 ? (act.spent / act.planned) * 100 : 0;
        if (pct > 80 && pct <= 100) {
          alertList.push({
            type: 'warning',
            message: `Activity ${act.id} approaching limit: ${pct.toFixed(0)}% utilized`,
          });
        }
      });
    });

    // If no issues, show success
    if (alertList.length === 0) {
      alertList.push({
        type: 'success',
        message: 'All activities are within budget limits',
      });
    }

    return alertList.slice(0, 5); // Limit to 5 alerts
  }, [outputSummaries]);

  if (budget.loading) {
    return (
      <div className="space-y-4">
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-100 rounded-xl p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-xl" />
                <div>
                  <div className="w-16 h-5 bg-gray-200 rounded mb-1" />
                  <div className="w-20 h-3 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Chart skeleton */}
        <div className="bg-white rounded-2xl p-4 animate-pulse">
          <div className="h-64 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (budget.error) {
    return (
      <div className="bg-red-50 text-red-700 rounded-xl p-4">
        Failed to load budget data: {budget.error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total Budget"
          value={formatCurrency(budget.totalBudget, true)}
          subValue="Project ceiling"
          icon={Wallet}
          color="text-gray-700"
          bgColor="bg-gray-100"
          index={0}
        />
        <StatCard
          label="Spent to Date"
          value={formatCurrency(budget.totalSpent, true)}
          subValue="Cumulative"
          icon={TrendingUp}
          color="text-blue-600"
          bgColor="bg-blue-100"
          index={1}
        />
        <StatCard
          label="Remaining"
          value={formatCurrency(budget.remaining, true)}
          subValue="Available"
          icon={TrendingDown}
          color="text-green-600"
          bgColor="bg-green-100"
          index={2}
        />
        <StatCard
          label="Burn Rate"
          value={`${budget.burnRate.toFixed(1)}%`}
          subValue="Utilization"
          icon={PieChart}
          color={budget.burnRate > 80 ? 'text-amber-600' : 'text-dg-green-600'}
          bgColor={budget.burnRate > 80 ? 'bg-amber-100' : 'bg-dg-green-100'}
          index={3}
        />
      </div>

      {/* Output Breakdown Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-dg-green-600" />
            <span className="text-sm font-semibold text-gray-700">Budget by Output</span>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              {outputSummaries.length} outputs
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-gray-200" />
            <span className="text-[10px] text-gray-500">Planned</span>
          </div>
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
              <span className="text-[10px] text-gray-500">{status}</span>
            </div>
          ))}
        </div>

        {/* Output Bars */}
        <div className="py-2">
          {outputSummaries.map((output, index) => (
            <OutputBar
              key={output.output_id}
              output={output}
              maxPlanned={maxPlanned}
              onClick={() => setSelectedOutput(output)}
              index={index}
            />
          ))}
        </div>

        {/* Overall Progress */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600">Overall Budget Utilization</span>
            <span className="text-sm font-bold text-gray-700">
              {formatCurrency(budget.totalSpent, true)} / {formatCurrency(budget.totalBudget, true)}
            </span>
          </div>
          <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(budget.burnRate, 100)}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={`h-full rounded-full ${
                budget.burnRate > 100 ? 'bg-red-500' : budget.burnRate > 80 ? 'bg-amber-500' : 'bg-dg-green-500'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Budget Alerts */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-semibold text-gray-700">Budget Alerts</span>
        </div>
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <BudgetAlert key={index} type={alert.type} message={alert.message} index={index} />
          ))}
        </div>
      </div>

      {/* Output Detail Modal */}
      <OutputDetailModal output={selectedOutput} onClose={() => setSelectedOutput(null)} />
    </div>
  );
}
