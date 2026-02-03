import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Circle,
  Filter,
  X,
  Calendar,
  User,
  FileText,
  ChevronRight,
  Zap,
} from 'lucide-react';

// Types
type ActivityStatus = 'Completed' | 'On Track' | 'Delayed' | 'Off Track' | 'Not Started';

interface Activity {
  id: string;
  component: string;
  output: string;
  outputName: string;
  name: string;
  description: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  progress: number;
  status: string; // Raw status from JSON
  responsible: string;
  notes: string;
  linkedIndicators: string[];
  linkedCenters: string[];
}

interface ActivitiesData {
  projectStart: string;
  projectEnd: string;
  activities: Activity[];
}

// Status configuration
const STATUS_CONFIG: Record<ActivityStatus, { color: string; bgColor: string; icon: typeof CheckCircle2 }> = {
  'Completed': { color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircle2 },
  'On Track': { color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Zap },
  'Delayed': { color: 'text-amber-600', bgColor: 'bg-amber-100', icon: Clock },
  'Off Track': { color: 'text-red-600', bgColor: 'bg-red-100', icon: XCircle },
  'Not Started': { color: 'text-gray-500', bgColor: 'bg-gray-100', icon: Circle },
};

const STATUS_COLORS: Record<ActivityStatus, string> = {
  'Completed': '#10B981',
  'On Track': '#3B82F6',
  'Delayed': '#F59E0B',
  'Off Track': '#EF4444',
  'Not Started': '#9CA3AF',
};

// Map raw status to normalized status
const normalizeStatus = (rawStatus: string): ActivityStatus => {
  switch (rawStatus) {
    case 'Completed':
      return 'Completed';
    case 'On Track':
    case 'Exceeded': // Treat exceeded as on track
      return 'On Track';
    case 'Delayed':
      return 'Delayed';
    case 'Critical':
      return 'Off Track';
    case 'Not Started':
    default:
      return 'Not Started';
  }
};

// Utility functions
const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return 'Not started';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};


// Generate year markers for the timeline
const generateYearMarkers = (start: string, end: string): { year: number; position: number }[] => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

  const markers: { year: number; position: number }[] = [];
  let currentYear = startDate.getFullYear();

  while (currentYear <= endDate.getFullYear()) {
    const yearStart = new Date(currentYear, 0, 1);
    const daysFromStart = (yearStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const position = Math.max(0, (daysFromStart / totalDays) * 100);

    if (position <= 100) {
      markers.push({ year: currentYear, position });
    }
    currentYear++;
  }

  return markers;
};

// Calculate bar position and width
const calculateBarPosition = (
  plannedStart: string,
  plannedEnd: string,
  projectStart: string,
  projectEnd: string
): { left: number; width: number } => {
  const projStart = new Date(projectStart).getTime();
  const projEnd = new Date(projectEnd).getTime();
  const totalDuration = projEnd - projStart;

  const actStart = new Date(plannedStart).getTime();
  const actEnd = new Date(plannedEnd).getTime();

  const left = ((actStart - projStart) / totalDuration) * 100;
  const width = ((actEnd - actStart) / totalDuration) * 100;

  return {
    left: Math.max(0, Math.min(100, left)),
    width: Math.max(2, Math.min(100 - left, width)),
  };
};

// Calculate today marker position
const getTodayPosition = (projectStart: string, projectEnd: string): number => {
  const projStart = new Date(projectStart).getTime();
  const projEnd = new Date(projectEnd).getTime();
  const today = new Date().getTime();

  const position = ((today - projStart) / (projEnd - projStart)) * 100;
  return Math.max(0, Math.min(100, position));
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
  icon: typeof CheckCircle2;
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

// Activity Row Component
function ActivityRow({
  activity,
  projectStart,
  projectEnd,
  yearMarkers,
  todayPosition,
  onClick,
  index,
}: {
  activity: Activity;
  projectStart: string;
  projectEnd: string;
  yearMarkers: { year: number; position: number }[];
  todayPosition: number;
  onClick: () => void;
  index: number;
}) {
  const normalizedStatus = normalizeStatus(activity.status);
  const statusConfig = STATUS_CONFIG[normalizedStatus];
  const barPos = calculateBarPosition(activity.plannedStart, activity.plannedEnd, projectStart, projectEnd);
  const progressWidth = barPos.width * (Math.min(activity.progress, 100) / 100);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02 }}
      onClick={onClick}
      className="flex items-center gap-2 py-2 px-3 hover:bg-gray-50 rounded-lg cursor-pointer group transition-colors"
    >
      {/* Activity Info */}
      <div className="w-[180px] flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
            {activity.id}
          </span>
          <span className={`w-2 h-2 rounded-full ${statusConfig.bgColor}`} style={{ backgroundColor: STATUS_COLORS[normalizedStatus] }} />
        </div>
        <p className="text-xs font-medium text-gray-700 truncate mt-1 group-hover:text-dg-green-600 transition-colors">
          {activity.name}
        </p>
      </div>

      {/* Gantt Bar */}
      <div className="flex-1 relative h-8 bg-gray-50 rounded overflow-hidden">
        {/* Year grid lines */}
        {yearMarkers.map((marker) => (
          <div
            key={marker.year}
            className="absolute top-0 bottom-0 w-px bg-gray-200"
            style={{ left: `${marker.position}%` }}
          />
        ))}

        {/* Planned bar (outline) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-4 border border-gray-300 rounded-sm bg-white/50"
          style={{
            left: `${barPos.left}%`,
            width: `${barPos.width}%`,
          }}
        />

        {/* Progress bar (filled) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-4 rounded-sm transition-all"
          style={{
            left: `${barPos.left}%`,
            width: `${progressWidth}%`,
            backgroundColor: STATUS_COLORS[normalizedStatus],
          }}
        />

        {/* Today marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
          style={{ left: `${todayPosition}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full" />
        </div>
      </div>

      {/* Progress */}
      <div className="w-12 text-right">
        <span className="text-xs font-semibold" style={{ color: STATUS_COLORS[normalizedStatus] }}>
          {activity.progress}%
        </span>
      </div>

      {/* Chevron */}
      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-dg-green-500 transition-colors" />
    </motion.div>
  );
}

// Activity Detail Modal Component
function ActivityDetailModal({
  activity,
  onClose,
}: {
  activity: Activity | null;
  onClose: () => void;
}) {
  if (!activity) return null;

  const normalizedStatus = normalizeStatus(activity.status);
  const statusColor = STATUS_COLORS[normalizedStatus];
  const StatusIcon = STATUS_CONFIG[normalizedStatus].icon;

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
                  {activity.id}
                </span>
                <span
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                  style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
                >
                  <StatusIcon className="w-3 h-3" />
                  {normalizedStatus}
                </span>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mt-4">{activity.name}</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                {activity.output}
              </span>
              <span className="text-xs text-gray-500">{activity.outputName}</span>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-grow space-y-6">
            {/* Description */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Description
              </h3>
              <p className="text-sm text-gray-600">{activity.description}</p>
            </div>

            {/* Progress */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-gray-700">Progress</h3>
                <span className="text-lg font-bold" style={{ color: statusColor }}>
                  {activity.progress}%
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(activity.progress, 100)}%` }}
                  transition={{ duration: 0.8 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: statusColor }}
                />
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Timeline
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Planned Start</p>
                  <p className="text-sm font-semibold text-gray-900">{formatDate(activity.plannedStart)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Planned End</p>
                  <p className="text-sm font-semibold text-gray-900">{formatDate(activity.plannedEnd)}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Actual Start</p>
                  <p className="text-sm font-semibold text-blue-700">{formatDate(activity.actualStart)}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Actual End</p>
                  <p className="text-sm font-semibold text-blue-700">{formatDate(activity.actualEnd)}</p>
                </div>
              </div>
            </div>

            {/* Responsible */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <User className="w-4 h-4" />
                Responsible
              </h3>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                {activity.responsible}
              </p>
            </div>

            {/* Notes */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Notes & Status Updates
              </h3>
              <p className="text-sm text-gray-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                {activity.notes}
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Main Component
export function ActivitySection() {
  const [data, setData] = useState<ActivitiesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  // Fetch data
  useEffect(() => {
    fetch('/activities.json')
      .then((res) => res.json())
      .then((data: ActivitiesData) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading activities:', err);
        setLoading(false);
      });
  }, []);

  // Get unique outputs for filter
  const outputs = useMemo(() => {
    if (!data) return [];
    const uniqueOutputs = [...new Set(data.activities.map((a) => a.output))];
    return uniqueOutputs.sort();
  }, [data]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    if (!data) return [];
    if (filter === 'all') return data.activities;
    return data.activities.filter((a) => a.output === filter);
  }, [data, filter]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!data) return { total: 0, completed: 0, onTrack: 0, delayed: 0, offTrack: 0, notStarted: 0 };

    const activities = data.activities;
    return {
      total: activities.length,
      completed: activities.filter((a) => normalizeStatus(a.status) === 'Completed').length,
      onTrack: activities.filter((a) => normalizeStatus(a.status) === 'On Track').length,
      delayed: activities.filter((a) => normalizeStatus(a.status) === 'Delayed').length,
      offTrack: activities.filter((a) => normalizeStatus(a.status) === 'Off Track').length,
      notStarted: activities.filter((a) => normalizeStatus(a.status) === 'Not Started').length,
    };
  }, [data]);

  // Calculate year markers and today position
  const yearMarkers = useMemo(() => {
    if (!data) return [];
    return generateYearMarkers(data.projectStart, data.projectEnd);
  }, [data]);

  const todayPosition = useMemo(() => {
    if (!data) return 0;
    return getTodayPosition(data.projectStart, data.projectEnd);
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-gray-100 rounded-xl p-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-lg" />
                <div>
                  <div className="w-8 h-6 bg-gray-200 rounded mb-1" />
                  <div className="w-16 h-3 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Gantt skeleton */}
        <div className="bg-white rounded-2xl p-4 animate-pulse">
          <div className="h-64 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-red-50 text-red-700 rounded-xl p-4">
        Failed to load activity data.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="Total"
          value={stats.total}
          icon={FileText}
          color="text-gray-600"
          bgColor="bg-gray-100"
          index={0}
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          icon={CheckCircle2}
          color="text-green-600"
          bgColor="bg-green-100"
          index={1}
        />
        <StatCard
          label="On Track"
          value={stats.onTrack}
          icon={Zap}
          color="text-blue-600"
          bgColor="bg-blue-100"
          index={2}
        />
        <StatCard
          label="Delayed"
          value={stats.delayed}
          icon={Clock}
          color="text-amber-600"
          bgColor="bg-amber-100"
          index={3}
        />
        <StatCard
          label="Off Track"
          value={stats.offTrack}
          icon={XCircle}
          color="text-red-600"
          bgColor="bg-red-100"
          index={4}
        />
        <StatCard
          label="Not Started"
          value={stats.notStarted}
          icon={Circle}
          color="text-gray-500"
          bgColor="bg-gray-100"
          index={5}
        />
      </div>

      {/* Filter and Gantt Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header with Filter */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">Activity Timeline</span>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              {filteredActivities.length} activities
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-dg-green-500 focus:border-transparent"
            >
              <option value="all">All Outputs</option>
              {outputs.map((output) => (
                <option key={output} value={output}>
                  {output}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Timeline Header */}
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
          <div className="w-[180px] flex-shrink-0 text-xs font-medium text-gray-500">Activity</div>
          <div className="flex-1 relative h-6">
            {yearMarkers.map((marker) => (
              <span
                key={marker.year}
                className="absolute text-[10px] font-medium text-gray-400 -translate-x-1/2"
                style={{ left: `${marker.position}%` }}
              >
                {marker.year}
              </span>
            ))}
          </div>
          <div className="w-12 text-xs font-medium text-gray-500 text-right">Progress</div>
          <div className="w-4" />
        </div>

        {/* Activities List with Gantt Bars */}
        <div className="max-h-[500px] overflow-y-auto">
          {filteredActivities.map((activity, index) => (
            <ActivityRow
              key={activity.id}
              activity={activity}
              projectStart={data.projectStart}
              projectEnd={data.projectEnd}
              yearMarkers={yearMarkers}
              todayPosition={todayPosition}
              onClick={() => setSelectedActivity(activity)}
              index={index}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="p-3 border-t border-gray-100 bg-gray-50 flex items-center justify-center gap-4 flex-wrap">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs text-gray-500">{status}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-xs text-gray-500">Today</span>
          </div>
        </div>
      </div>

      {/* Activity Detail Modal */}
      <ActivityDetailModal
        activity={selectedActivity}
        onClose={() => setSelectedActivity(null)}
      />
    </div>
  );
}
