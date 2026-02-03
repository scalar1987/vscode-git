import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  ChevronRight,
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
} from 'lucide-react';
import { useRiskData, type RiskWithPlans, getRiskColor } from '../../hooks/useRiskData';

// Types
type RiskRating = 'Extreme' | 'High' | 'Medium' | 'Low';
type RiskStatus = 'Escalated' | 'Open' | 'Mitigating' | 'Closed';
type RiskDirection = 'Increasing' | 'Stable' | 'Decreasing';

// Rating configuration
const RATING_CONFIG: Record<RiskRating, { color: string; bgColor: string; icon: typeof AlertTriangle }> = {
  'Extreme': { color: 'text-red-600', bgColor: 'bg-red-100', icon: ShieldAlert },
  'High': { color: 'text-orange-600', bgColor: 'bg-orange-100', icon: AlertTriangle },
  'Medium': { color: 'text-amber-600', bgColor: 'bg-amber-100', icon: Shield },
  'Low': { color: 'text-green-600', bgColor: 'bg-green-100', icon: ShieldCheck },
};

const STATUS_CONFIG: Record<RiskStatus, { color: string; bgColor: string; icon: typeof AlertCircle }> = {
  'Escalated': { color: 'text-red-600', bgColor: 'bg-red-100', icon: AlertCircle },
  'Open': { color: 'text-amber-600', bgColor: 'bg-amber-100', icon: Clock },
  'Mitigating': { color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Activity },
  'Closed': { color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircle2 },
};

const DIRECTION_CONFIG: Record<RiskDirection, { color: string; icon: typeof TrendingUp }> = {
  'Increasing': { color: 'text-red-500', icon: TrendingUp },
  'Stable': { color: 'text-gray-500', icon: Minus },
  'Decreasing': { color: 'text-green-500', icon: TrendingDown },
};

// Statistics Card Component
function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bgColor,
  index,
}: {
  label: string;
  value: number;
  icon: typeof AlertTriangle;
  color: string;
  bgColor: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`${bgColor} rounded-xl p-3 flex items-center gap-3`}
    >
      <div className={`w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className={`text-xl font-bold ${color}`}>{value}</p>
        <p className="text-xs text-gray-600">{label}</p>
      </div>
    </motion.div>
  );
}

// Mini Risk Matrix Component
function MiniRiskMatrix({
  cells,
  onCellClick,
  selectedCell,
}: {
  cells: number[][];
  onCellClick?: (likelihood: number, impact: number) => void;
  selectedCell?: { likelihood: number; impact: number } | null;
}) {
  return (
    <div className="grid grid-cols-5 gap-0.5 w-full aspect-square max-w-[180px]">
      {cells.map((row, rowIndex) =>
        row.map((count, colIndex) => {
          const likelihood = 5 - rowIndex;
          const impact = colIndex + 1;
          const color = getRiskColor(likelihood, impact);
          const isSelected = selectedCell?.likelihood === likelihood && selectedCell?.impact === impact;

          return (
            <motion.div
              key={`${rowIndex}-${colIndex}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: (rowIndex * 5 + colIndex) * 0.01 }}
              onClick={() => onCellClick?.(likelihood, impact)}
              className={`relative flex items-center justify-center rounded-sm cursor-pointer transition-all ${
                isSelected ? 'ring-2 ring-dg-green-500 ring-offset-1' : 'hover:ring-2 hover:ring-gray-400'
              }`}
              style={{ backgroundColor: isSelected ? color : `${color}40` }}
            >
              {count > 0 && (
                <span
                  className={`text-[10px] font-bold ${isSelected ? 'text-white' : ''}`}
                  style={{ color: isSelected ? '#fff' : color }}
                >
                  {count}
                </span>
              )}
            </motion.div>
          );
        })
      )}
    </div>
  );
}

// Risk Row Component
function RiskRow({
  risk,
  onClick,
  index,
}: {
  risk: RiskWithPlans;
  onClick: () => void;
  index: number;
}) {
  const ratingConfig = RATING_CONFIG[risk.rating];
  const DirectionIcon = DIRECTION_CONFIG[risk.direction].icon;
  const directionColor = DIRECTION_CONFIG[risk.direction].color;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02 }}
      onClick={onClick}
      className="flex items-center gap-3 py-2.5 px-3 hover:bg-gray-50 rounded-lg cursor-pointer group transition-colors border-b border-gray-50 last:border-0"
    >
      {/* Risk ID & Rating */}
      <div className="w-24 flex-shrink-0">
        <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
          {risk.risk_id}
        </span>
        <div className="flex items-center gap-1 mt-1">
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${ratingConfig.bgColor} ${ratingConfig.color}`}
          >
            {risk.rating}
          </span>
        </div>
      </div>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-700 truncate group-hover:text-dg-green-600 transition-colors">
          {risk.title}
        </p>
        <p className="text-[10px] text-gray-400 truncate">{risk.category}</p>
      </div>

      {/* Score */}
      <div className="w-10 text-center flex-shrink-0">
        <span
          className="text-sm font-bold"
          style={{ color: getRiskColor(risk.likelihood, risk.impact) }}
        >
          {risk.risk_score}
        </span>
      </div>

      {/* Trend */}
      <div className="w-8 flex-shrink-0 flex justify-center">
        <DirectionIcon className={`w-4 h-4 ${directionColor}`} />
      </div>

      {/* Chevron */}
      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-dg-green-500 transition-colors" />
    </motion.div>
  );
}

// Risk Detail Modal Component
function RiskDetailModal({
  risk,
  onClose,
}: {
  risk: RiskWithPlans | null;
  onClose: () => void;
}) {
  if (!risk) return null;

  const ratingConfig = RATING_CONFIG[risk.rating];
  const statusConfig = STATUS_CONFIG[risk.status];
  const DirectionIcon = DIRECTION_CONFIG[risk.direction].icon;
  const directionColor = DIRECTION_CONFIG[risk.direction].color;
  const riskColor = getRiskColor(risk.likelihood, risk.impact);

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
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-mono bg-gray-200 text-gray-700 px-2 py-1 rounded">
                  {risk.risk_id}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${ratingConfig.bgColor} ${ratingConfig.color}`}>
                  {risk.rating}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                  {risk.status}
                </span>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mt-4">{risk.title}</h2>
            <p className="text-xs text-gray-500 mt-1">{risk.category}</p>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-grow space-y-5">
            {/* Description */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{risk.description}</p>
            </div>

            {/* Risk Assessment */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Risk Assessment</h3>
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500">Likelihood</p>
                  <p className="text-lg font-bold text-gray-900">{risk.likelihood}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500">Impact</p>
                  <p className="text-lg font-bold text-gray-900">{risk.impact}</p>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ backgroundColor: `${riskColor}20` }}>
                  <p className="text-xs text-gray-500">Score</p>
                  <p className="text-lg font-bold" style={{ color: riskColor }}>{risk.risk_score}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500">Trend</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <DirectionIcon className={`w-4 h-4 ${directionColor}`} />
                    <span className={`text-sm font-medium ${directionColor}`}>{risk.direction}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mitigation Plan */}
            {risk.mitigation_plan && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Mitigation Actions</h3>
                <div className="space-y-2">
                  {risk.mitigation_plan.actions.map((action, idx) => (
                    <div key={action.action_id || idx} className="flex items-start gap-2 bg-gray-50 rounded-lg p-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        action.status === 'Completed' ? 'bg-green-100 text-green-600' :
                        action.status === 'In progress' ? 'bg-blue-100 text-blue-600' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {action.status}
                      </span>
                      <p className="text-xs text-gray-600 flex-1">{action.description}</p>
                    </div>
                  ))}
                </div>
                {risk.mitigation_plan.residual_score && (
                  <div className="mt-3 p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-700">
                      <strong>Residual Risk:</strong> Score {risk.mitigation_plan.residual_score} ({risk.mitigation_plan.residual_rating})
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Contingency Plan */}
            {risk.contingency_plan && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Contingency Plan</h3>
                <div className="bg-amber-50 rounded-lg p-3">
                  <p className="text-xs text-amber-700 mb-2">
                    <strong>Trigger:</strong> {risk.contingency_plan.trigger_condition}
                  </p>
                  <ul className="text-xs text-amber-700 list-disc list-inside space-y-1">
                    {risk.contingency_plan.steps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Main Component
export function RiskSection() {
  const { risks, summary, matrix, loading, error } = useRiskData();
  const [selectedRisk, setSelectedRisk] = useState<RiskWithPlans | null>(null);
  const [ratingFilter, setRatingFilter] = useState<RiskRating | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<RiskStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [matrixFilter, setMatrixFilter] = useState<{ likelihood: number; impact: number } | null>(null);

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    risks.forEach(r => cats.add(r.category));
    return Array.from(cats).sort();
  }, [risks]);

  // Filter risks by all criteria
  const filteredRisks = useMemo(() => {
    let result = [...risks];

    // Apply rating filter
    if (ratingFilter !== 'all') {
      result = result.filter(r => r.rating === ratingFilter);
    }

    // Apply category filter
    if (categoryFilter) {
      result = result.filter(r => r.category === categoryFilter);
    }

    // Apply status filter
    if (statusFilter) {
      result = result.filter(r => r.status === statusFilter);
    }

    // Apply matrix filter
    if (matrixFilter) {
      result = result.filter(r =>
        r.likelihood === matrixFilter.likelihood && r.impact === matrixFilter.impact
      );
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.title.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        r.risk_id.toLowerCase().includes(query)
      );
    }

    return result;
  }, [risks, ratingFilter, categoryFilter, statusFilter, matrixFilter, searchQuery]);

  // Sort by score descending
  const sortedRisks = useMemo(() => {
    return [...filteredRisks].sort((a, b) => b.risk_score - a.risk_score);
  }, [filteredRisks]);

  // Check if any filters are active
  const hasActiveFilters = ratingFilter !== 'all' || categoryFilter || statusFilter || searchQuery || matrixFilter;

  // Clear all filters
  const clearAllFilters = () => {
    setRatingFilter('all');
    setCategoryFilter('');
    setStatusFilter('');
    setSearchQuery('');
    setMatrixFilter(null);
  };

  // Handle matrix cell click
  const handleMatrixCellClick = (likelihood: number, impact: number) => {
    if (matrixFilter?.likelihood === likelihood && matrixFilter?.impact === impact) {
      setMatrixFilter(null); // Toggle off
    } else {
      setMatrixFilter({ likelihood, impact });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-gray-100 rounded-xl p-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-lg" />
                <div>
                  <div className="w-8 h-5 bg-gray-200 rounded mb-1" />
                  <div className="w-14 h-3 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Content skeleton */}
        <div className="bg-white rounded-2xl p-4 animate-pulse">
          <div className="h-64 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 rounded-xl p-4">
        Failed to load risk data: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard
          label="Total Risks"
          value={summary.total}
          icon={Shield}
          color="text-gray-700"
          bgColor="bg-gray-100"
          index={0}
        />
        <StatCard
          label="Extreme"
          value={summary.byRating.extreme}
          icon={ShieldAlert}
          color="text-red-600"
          bgColor="bg-red-100"
          index={1}
        />
        <StatCard
          label="High"
          value={summary.byRating.high}
          icon={AlertTriangle}
          color="text-orange-600"
          bgColor="bg-orange-100"
          index={2}
        />
        <StatCard
          label="Medium"
          value={summary.byRating.medium}
          icon={Shield}
          color="text-amber-600"
          bgColor="bg-amber-100"
          index={3}
        />
        <StatCard
          label="Low"
          value={summary.byRating.low}
          icon={ShieldCheck}
          color="text-green-600"
          bgColor="bg-green-100"
          index={4}
        />
      </div>

      {/* Main Content: Matrix + Risk List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Risk Matrix & Status */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center justify-between">
            <span>Risk Matrix</span>
            {matrixFilter && (
              <button
                onClick={() => setMatrixFilter(null)}
                className="text-[10px] text-dg-green-600 hover:text-dg-green-700"
              >
                Clear
              </button>
            )}
          </h3>
          <div className="flex justify-center mb-4">
            <MiniRiskMatrix
              cells={matrix.cells}
              selectedCell={matrixFilter}
              onCellClick={handleMatrixCellClick}
            />
          </div>
          {matrixFilter && (
            <p className="text-[10px] text-center text-gray-500 -mt-2 mb-2">
              Filtering: L={matrixFilter.likelihood}, I={matrixFilter.impact}
            </p>
          )}

          {/* Status Breakdown */}
          <div className="border-t border-gray-100 pt-3 mt-3">
            <h4 className="text-xs font-medium text-gray-500 mb-2">Status</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs text-gray-600">Escalated</span>
                <span className="text-xs font-semibold text-gray-900 ml-auto">{summary.byStatus.escalated}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs text-gray-600">Open</span>
                <span className="text-xs font-semibold text-gray-900 ml-auto">{summary.byStatus.open}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs text-gray-600">Mitigating</span>
                <span className="text-xs font-semibold text-gray-900 ml-auto">{summary.byStatus.mitigating}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs text-gray-600">Closed</span>
                <span className="text-xs font-semibold text-gray-900 ml-auto">{summary.byStatus.closed}</span>
              </div>
            </div>
          </div>

          {/* Trend Direction */}
          <div className="border-t border-gray-100 pt-3 mt-3">
            <h4 className="text-xs font-medium text-gray-500 mb-2">Trend</h4>
            <div className="flex items-center justify-around">
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-red-500" />
                <span className="text-xs font-semibold text-gray-900">{summary.byDirection.increasing}</span>
              </div>
              <div className="flex items-center gap-1">
                <Minus className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-semibold text-gray-900">{summary.byDirection.stable}</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingDown className="w-4 h-4 text-green-500" />
                <span className="text-xs font-semibold text-gray-900">{summary.byDirection.decreasing}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Risk List */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold text-gray-700">Risk Register</span>
              </div>
              <span className="text-xs text-gray-500">
                Showing <span className="font-semibold text-gray-700">{sortedRisks.length}</span> of {risks.length} risks
              </span>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-gray-400" />

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-dg-green-500 max-w-[140px]"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Rating Filter */}
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value as RiskRating | 'all')}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-dg-green-500"
              >
                <option value="all">All Ratings</option>
                <option value="Extreme">Extreme</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as RiskStatus | '')}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-dg-green-500"
              >
                <option value="">All Statuses</option>
                <option value="Escalated">Escalated</option>
                <option value="Open">Open</option>
                <option value="Mitigating">Mitigating</option>
                <option value="Closed">Closed</option>
              </select>

              {/* Search Input */}
              <div className="relative flex-1 min-w-[120px] max-w-[200px]">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search risks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg pl-7 pr-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-dg-green-500"
                />
              </div>

              {/* Clear All Button */}
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* Column Headers */}
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-3 text-[10px] font-medium text-gray-500 uppercase tracking-wide">
            <div className="w-24 flex-shrink-0">ID / Rating</div>
            <div className="flex-1">Risk Title</div>
            <div className="w-10 text-center flex-shrink-0">Score</div>
            <div className="w-8 text-center flex-shrink-0">Trend</div>
            <div className="w-4" />
          </div>

          {/* Risk List */}
          <div className="max-h-[400px] overflow-y-auto">
            {sortedRisks.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No risks found</p>
              </div>
            ) : (
              sortedRisks.map((risk, index) => (
                <RiskRow
                  key={risk.risk_id}
                  risk={risk}
                  onClick={() => setSelectedRisk(risk)}
                  index={index}
                />
              ))
            )}
          </div>

          {/* Legend */}
          <div className="p-3 border-t border-gray-100 bg-gray-50 flex items-center justify-center gap-4 flex-wrap">
            {(['Extreme', 'High', 'Medium', 'Low'] as const).map((rating) => (
              <div key={rating} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: getRiskColor(rating === 'Extreme' ? 5 : rating === 'High' ? 4 : rating === 'Medium' ? 3 : 2, rating === 'Extreme' ? 5 : rating === 'High' ? 3 : rating === 'Medium' ? 2 : 1) }}
                />
                <span className="text-xs text-gray-500">{rating}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Risk Detail Modal */}
      <RiskDetailModal risk={selectedRisk} onClose={() => setSelectedRisk(null)} />
    </div>
  );
}
