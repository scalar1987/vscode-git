import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  Rocket,
  Briefcase,
  DollarSign,
  BookOpen,
  ChevronRight,
  X,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Filter,
} from 'lucide-react';

// Types
interface Indicator {
  id: string;
  parent_id: string;
  parent_desc: string;
  label: string;
  baseline: string;
  targets: {
    2024: number | string;
    2025: number | string;
    2026: number | string;
    2027: number | string;
    total: number | string;
  };
  means_of_verification: string;
  source_of_data: string;
  frequency_of_data_collection: string;
}

interface PerformanceActual {
  date: string;
  source: string;
  values: Record<string, number>;
}

type TargetStatus = 'On Track' | 'Off Track' | 'Delayed' | 'Not Started';

interface OutcomeIndicator {
  id: string;
  name: string;
  icon: React.ReactNode;
  baseline: number;
  target: number;
  actual: number;
  unit: string;
  status: TargetStatus;
  color: string;
  component: 1 | 2 | 3;
  // Full indicator details for modal
  label: string;
  yearlyTargets: {
    2024: number;
    2025: number;
    2026: number;
    2027: number;
  };
  meansOfVerification: string;
  sourceOfData: string;
  frequency: string;
}


// Outcome Indicators Config with icons - 6 Key Indicators
const OUTCOME_INDICATORS_CONFIG = [
  {
    id: '1.1.4',
    name: 'DigiGreen Centers',
    icon: <Building2 className="w-6 h-6" />,
    unit: 'count',
    color: 'dg-green',
    component: 1,
  },
  {
    id: '1',
    name: 'Youth with ICT Skills',
    icon: <GraduationCap className="w-6 h-6" />,
    unit: 'count',
    color: 'dg-blue',
    component: 1,
  },
  {
    id: '2',
    name: 'Technology Start-ups',
    icon: <Rocket className="w-6 h-6" />,
    unit: 'count',
    color: 'purple',
    component: 2,
  },
  {
    id: '2.1',
    name: 'Green Jobs Created',
    icon: <Briefcase className="w-6 h-6" />,
    unit: 'count',
    color: 'dg-amber',
    component: 2,
  },
  {
    id: '3',
    name: 'Mobilized Investment',
    icon: <DollarSign className="w-6 h-6" />,
    unit: 'USD',
    color: 'emerald',
    component: 3,
  },
  {
    id: '3.1',
    name: 'Green Publications',
    icon: <BookOpen className="w-6 h-6" />,
    unit: 'count',
    color: 'rose',
    component: 3,
  },
];

// Component names for filter dropdown
const COMPONENT_NAMES: Record<number, string> = {
  1: 'Component 1: Digital Infrastructure',
  2: 'Component 2: Green Enterprise',
  3: 'Component 3: Policy & Investment',
};


// Utility functions
const parseNumber = (value: string | number): number => {
  if (typeof value === 'number') return value;
  const cleaned = value.replace(/[$,%]/g, '').replace(/,/g, '');
  return parseFloat(cleaned) || 0;
};

const calculateStatus = (actual: number, target: number): TargetStatus => {
  if (target === 0 || actual === 0) return 'Not Started';
  const percentComplete = (actual / target) * 100;
  const expectedPercent = 45; // Expected as of Dec 2025 (~45% through project)

  // On Track: within 80-110% of expected progress
  if (percentComplete >= expectedPercent * 0.8 && percentComplete <= expectedPercent * 1.1) return 'On Track';
  // Off Track: significantly behind (less than 50% of expected)
  if (percentComplete < expectedPercent * 0.5) return 'Off Track';
  // Delayed: behind but not severely (50-80% of expected)
  if (percentComplete < expectedPercent * 0.8) return 'Delayed';
  // On Track for anything above expected
  return 'On Track';
};

const formatNumber = (value: number, unit: string): string => {
  if (unit === 'USD') {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  }
  return value.toLocaleString();
};

// Circular Progress Component
function CircularProgress({
  progress,
  size = 80,
  strokeWidth = 6,
  color,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  const colorMap: Record<string, string> = {
    'dg-green': '#16a34a',
    'dg-blue': '#2563eb',
    'dg-amber': '#d97706',
    'purple': '#9333ea',
    'emerald': '#059669',
    'rose': '#e11d48',
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-100"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colorMap[color] || color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-gray-900">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: TargetStatus }) {
  const config = {
    'On Track': { icon: CheckCircle2, bg: 'bg-green-100', text: 'text-green-700' },
    'Off Track': { icon: AlertCircle, bg: 'bg-red-100', text: 'text-red-700' },
    'Delayed': { icon: Clock, bg: 'bg-amber-100', text: 'text-amber-700' },
    'Not Started': { icon: Clock, bg: 'bg-gray-100', text: 'text-gray-600' },
  };

  const { icon: Icon, bg, text } = config[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  );
}

// Outcome Card Component
function OutcomeCard({
  indicator,
  index,
  onClick,
}: {
  indicator: OutcomeIndicator;
  index: number;
  onClick: () => void;
}) {
  const progress = indicator.target > 0 ? (indicator.actual / indicator.target) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={onClick}
      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-${indicator.color}-100 flex items-center justify-center text-${indicator.color}-600`}>
          {indicator.icon}
        </div>
        <StatusBadge status={indicator.status} />
      </div>

      <h3 className="font-semibold text-gray-900 mb-3 group-hover:text-dg-green-600 transition-colors">
        {indicator.name}
      </h3>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-gray-900">
              {formatNumber(indicator.actual, indicator.unit)}
            </span>
            <span className="text-gray-400">/</span>
            <span className="text-sm text-gray-500">
              {formatNumber(indicator.target, indicator.unit)}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Baseline: {formatNumber(indicator.baseline, indicator.unit)}
          </p>
        </div>
        <CircularProgress progress={Math.min(progress, 100)} color={indicator.color} size={64} strokeWidth={5} />
      </div>

      <div className="mt-4 flex items-center justify-end text-sm text-gray-400 group-hover:text-dg-green-600 transition-colors">
        View details <ChevronRight className="w-4 h-4 ml-1" />
      </div>
    </motion.div>
  );
}


// Detail Modal with Full Indicator Breakdown
function IndicatorDetailModal({
  indicator,
  onClose,
}: {
  indicator: OutcomeIndicator | null;
  onClose: () => void;
}) {
  if (!indicator) return null;

  const progress = indicator.target > 0 ? (indicator.actual / indicator.target) * 100 : 0;

  // Color mapping for gradients
  const colorGradients: Record<string, { from: string; to: string; bg: string; text: string }> = {
    'dg-green': { from: 'from-green-100', to: 'to-green-50', bg: 'bg-green-100', text: 'text-green-600' },
    'dg-blue': { from: 'from-blue-100', to: 'to-blue-50', bg: 'bg-blue-100', text: 'text-blue-600' },
    'dg-amber': { from: 'from-amber-100', to: 'to-amber-50', bg: 'bg-amber-100', text: 'text-amber-600' },
    'purple': { from: 'from-purple-100', to: 'to-purple-50', bg: 'bg-purple-100', text: 'text-purple-600' },
    'emerald': { from: 'from-emerald-100', to: 'to-emerald-50', bg: 'bg-emerald-100', text: 'text-emerald-600' },
    'rose': { from: 'from-rose-100', to: 'to-rose-50', bg: 'bg-rose-100', text: 'text-rose-600' },
  };

  const colors = colorGradients[indicator.color] || colorGradients['dg-green'];

  // Calculate cumulative progress for timeline
  const yearlyData = [
    { year: 2024, target: indicator.yearlyTargets[2024], cumulative: indicator.yearlyTargets[2024] },
    { year: 2025, target: indicator.yearlyTargets[2025], cumulative: indicator.yearlyTargets[2024] + indicator.yearlyTargets[2025] },
    { year: 2026, target: indicator.yearlyTargets[2026], cumulative: indicator.yearlyTargets[2024] + indicator.yearlyTargets[2025] + indicator.yearlyTargets[2026] },
    { year: 2027, target: indicator.yearlyTargets[2027], cumulative: indicator.target },
  ];

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
          <div className={`p-6 bg-gradient-to-br ${colors.from} ${colors.to} flex-shrink-0`}>
            <div className="flex items-start justify-between">
              <div className={`w-14 h-14 rounded-2xl bg-white shadow-lg flex items-center justify-center ${colors.text}`}>
                {indicator.icon}
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mt-4">{indicator.name}</h2>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{indicator.label}</p>
            <div className="mt-3">
              <StatusBadge status={indicator.status} />
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="p-6 overflow-y-auto flex-grow">
            {/* Progress Circle & Summary Stats */}
            <div className="flex items-start gap-6 mb-6">
              <CircularProgress progress={Math.min(progress, 100)} color={indicator.color} size={100} strokeWidth={8} />

              <div className="flex-1 grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Baseline</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatNumber(indicator.baseline, indicator.unit)}
                  </p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-xl border border-green-100">
                  <p className="text-xs text-gray-500 mb-1">Actual</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatNumber(indicator.actual, indicator.unit)}
                  </p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Target</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatNumber(indicator.target, indicator.unit)}
                  </p>
                </div>
              </div>
            </div>

            {/* Year-by-Year Target Breakdown */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Year-by-Year Targets
              </h3>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="grid grid-cols-4 gap-2">
                  {yearlyData.map((year, idx) => {
                    const yearProgress = indicator.target > 0 ? (year.cumulative / indicator.target) * 100 : 0;
                    const isCurrentOrPast = year.year <= 2025;
                    return (
                      <motion.div
                        key={year.year}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`text-center p-3 rounded-lg ${isCurrentOrPast ? 'bg-white shadow-sm' : 'bg-gray-100/50'}`}
                      >
                        <p className={`text-xs font-medium ${isCurrentOrPast ? 'text-gray-700' : 'text-gray-400'}`}>
                          {year.year}
                        </p>
                        <p className={`text-lg font-bold ${isCurrentOrPast ? colors.text : 'text-gray-400'}`}>
                          {formatNumber(year.target, indicator.unit)}
                        </p>
                        <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${yearProgress}%` }}
                            transition={{ duration: 0.5, delay: 0.3 + idx * 0.1 }}
                            className={`h-full rounded-full ${isCurrentOrPast ? 'bg-green-500' : 'bg-gray-300'}`}
                          />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {Math.round(yearProgress)}% of total
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Overall Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-gray-700">Overall Progress</h3>
                <span className={`text-sm font-bold ${colors.text}`}>{Math.round(progress)}%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progress, 100)}%` }}
                  transition={{ duration: 0.8 }}
                  className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full"
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0%</span>
                <span className="text-amber-500 font-medium">Expected: 45%</span>
                <span>100%</span>
              </div>
            </div>

            {/* M&E Details Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Monitoring & Evaluation Details
              </h3>

              <div className="space-y-3">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
                    Means of Verification
                  </p>
                  <p className="text-sm text-gray-700">{indicator.meansOfVerification}</p>
                </div>

                <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                  <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1">
                    Source of Data
                  </p>
                  <p className="text-sm text-gray-700">{indicator.sourceOfData}</p>
                </div>

                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">
                    Frequency of Data Collection
                  </p>
                  <p className="text-sm text-gray-700">{indicator.frequency}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Main Component
export function TargetsSummarySection() {
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [actuals, setActuals] = useState<PerformanceActual | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIndicator, setSelectedIndicator] = useState<OutcomeIndicator | null>(null);
  const [componentFilter, setComponentFilter] = useState<1 | 2 | 3 | 'all'>('all');

  // Fetch data
  useEffect(() => {
    Promise.all([
      fetch('/logframe_structured.json').then((res) => res.json()),
      fetch('/performance_actuals.json').then((res) => res.json()),
    ])
      .then(([indicatorsData, actualsData]) => {
        setIndicators(indicatorsData);
        setActuals(actualsData[0]);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading data:', err);
        setLoading(false);
      });
  }, []);

  // Build outcome indicators with full details
  const outcomeIndicators = useMemo((): OutcomeIndicator[] => {
    if (!indicators.length || !actuals) return [];

    return OUTCOME_INDICATORS_CONFIG.map((config) => {
      const indicator = indicators.find((i) => i.id === config.id);
      if (!indicator) {
        return {
          id: config.id,
          name: config.name,
          icon: config.icon,
          baseline: 0,
          target: 0,
          actual: 0,
          unit: config.unit,
          status: 'Not Started' as TargetStatus,
          color: config.color,
          component: config.component as 1 | 2 | 3,
          label: config.name,
          yearlyTargets: { 2024: 0, 2025: 0, 2026: 0, 2027: 0 },
          meansOfVerification: 'N/A',
          sourceOfData: 'N/A',
          frequency: 'N/A',
        };
      }

      const target = parseNumber(indicator.targets.total);
      const actual = actuals.values[config.id] || 0;
      const baseline = parseNumber(indicator.baseline);

      return {
        id: config.id,
        name: config.name,
        icon: config.icon,
        baseline,
        target,
        actual,
        unit: config.unit,
        status: calculateStatus(actual, target),
        color: config.color,
        component: config.component as 1 | 2 | 3,
        // Full details from logframe
        label: indicator.label,
        yearlyTargets: {
          2024: parseNumber(indicator.targets[2024]),
          2025: parseNumber(indicator.targets[2025]),
          2026: parseNumber(indicator.targets[2026]),
          2027: parseNumber(indicator.targets[2027]),
        },
        meansOfVerification: indicator.means_of_verification || 'N/A',
        sourceOfData: indicator.source_of_data || 'N/A',
        frequency: indicator.frequency_of_data_collection || 'N/A',
      };
    });
  }, [indicators, actuals]);

  // Filter indicators by component
  const filteredIndicators = useMemo(() => {
    if (componentFilter === 'all') return outcomeIndicators;
    return outcomeIndicators.filter(ind => ind.component === componentFilter);
  }, [outcomeIndicators, componentFilter]);

  // Calculate overall progress from outcome indicators
  const overallProgress = useMemo(() => {
    if (!outcomeIndicators.length) return 0;
    const totalProgress = outcomeIndicators.reduce((sum, ind) => {
      if (ind.target > 0) {
        return sum + (ind.actual / ind.target) * 100;
      }
      return sum;
    }, 0);
    return Math.round(totalProgress / outcomeIndicators.length);
  }, [outcomeIndicators]);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Outcome cards skeleton - 6 indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 animate-pulse shadow-sm">
              <div className="flex justify-between mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                <div className="w-16 h-5 bg-gray-200 rounded-full" />
              </div>
              <div className="h-5 bg-gray-200 rounded w-32 mb-3" />
              <div className="flex justify-between">
                <div className="h-8 bg-gray-200 rounded w-24" />
                <div className="w-16 h-16 bg-gray-200 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Header with Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">
            {componentFilter === 'all' ? '6 Key Outcome Indicators' : `${filteredIndicators.length} Indicators`}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Click any card for full details</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Component Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={componentFilter}
              onChange={(e) => setComponentFilter(e.target.value === 'all' ? 'all' : Number(e.target.value) as 1 | 2 | 3)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-dg-green-500"
            >
              <option value="all">All Components</option>
              <option value="1">{COMPONENT_NAMES[1]}</option>
              <option value="2">{COMPONENT_NAMES[2]}</option>
              <option value="3">{COMPONENT_NAMES[3]}</option>
            </select>
          </div>
          {/* Overall Progress */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Overall Progress:</span>
            <span className="text-sm font-bold text-dg-green-600">
              {overallProgress}%
            </span>
          </div>
        </div>
      </div>

      {/* Filtered Result Count */}
      {componentFilter !== 'all' && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">
            Showing <span className="font-semibold text-gray-700">{filteredIndicators.length}</span> of {outcomeIndicators.length} indicators
          </span>
          <button
            onClick={() => setComponentFilter('all')}
            className="text-dg-green-600 hover:text-dg-green-700 font-medium"
          >
            Show All
          </button>
        </div>
      )}

      {/* Outcome Indicator Cards - responsive grid */}
      <div className={`grid gap-4 ${
        filteredIndicators.length <= 3
          ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
      }`}>
        {filteredIndicators.map((indicator, index) => (
          <OutcomeCard
            key={indicator.id}
            indicator={indicator}
            index={index}
            onClick={() => setSelectedIndicator(indicator)}
          />
        ))}
      </div>

      {/* Detail Modal */}
      <IndicatorDetailModal
        indicator={selectedIndicator}
        onClose={() => setSelectedIndicator(null)}
      />
    </div>
  );
}
