import { useState, useEffect, useMemo } from 'react';
import { Activity, ActivitiesData, ActivityStatus } from '../types/activity';
import { GanttChart } from '../components/GanttChart';
import { ActivityDetailPanel } from '../components/ActivityDetailPanel';
import styles from './ActivityTracker.module.css';

const STATUS_COLORS: Record<ActivityStatus, string> = {
  'Completed': '#10B981',
  'On Track': '#3B82F6',
  'Delayed': '#F59E0B',
  'Critical': '#EF4444',
  'Not Started': '#9CA3AF',
};

export function ActivityTracker() {
  const [data, setData] = useState<ActivitiesData | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/activities.json')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data: ActivitiesData) => {
        setData(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  // Get unique outputs for filter dropdown
  const outputs = useMemo(() => {
    if (!data) return [];
    const uniqueOutputs = [...new Set(data.activities.map(a => a.output))];
    return uniqueOutputs.sort();
  }, [data]);

  // Filter activities based on selected output
  const filteredActivities = useMemo(() => {
    if (!data) return [];
    if (filter === 'all') return data.activities;
    return data.activities.filter(a => a.output === filter);
  }, [data, filter]);

  // Calculate summary stats
  const stats = useMemo(() => {
    if (!data) return { total: 0, completed: 0, onTrack: 0, delayed: 0, critical: 0, notStarted: 0 };

    const activities = data.activities;
    return {
      total: activities.length,
      completed: activities.filter(a => a.status === 'Completed').length,
      onTrack: activities.filter(a => a.status === 'On Track').length,
      delayed: activities.filter(a => a.status === 'Delayed').length,
      critical: activities.filter(a => a.status === 'Critical').length,
      notStarted: activities.filter(a => a.status === 'Not Started').length,
    };
  }, [data]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <p>Loading activities...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.errorContainer}>
        <p>Failed to load activity data.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>Activity Tracker</h1>
          <p className={styles.subtitle}>
            Timeline view of {data.activities.length} project activities across all outputs
          </p>
        </div>

        <div className={styles.filterSection}>
          <label htmlFor="output-filter" className={styles.filterLabel}>
            Filter by Output:
          </label>
          <select
            id="output-filter"
            className={styles.filterSelect}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Outputs</option>
            {outputs.map(output => (
              <option key={output} value={output}>{output}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.total}</span>
          <span className={styles.statLabel}>Total Activities</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue} style={{ color: STATUS_COLORS['Completed'] }}>
            {stats.completed}
          </span>
          <span className={styles.statLabel}>Completed</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue} style={{ color: STATUS_COLORS['On Track'] }}>
            {stats.onTrack}
          </span>
          <span className={styles.statLabel}>On Track</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue} style={{ color: STATUS_COLORS['Delayed'] }}>
            {stats.delayed}
          </span>
          <span className={styles.statLabel}>Delayed</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue} style={{ color: STATUS_COLORS['Not Started'] }}>
            {stats.notStarted}
          </span>
          <span className={styles.statLabel}>Not Started</span>
        </div>
      </div>

      {/* Gantt Chart */}
      <GanttChart
        activities={filteredActivities}
        projectStart={data.projectStart}
        projectEnd={data.projectEnd}
        onActivityClick={setSelectedActivity}
      />

      {/* Detail Panel */}
      <ActivityDetailPanel
        activity={selectedActivity}
        onClose={() => setSelectedActivity(null)}
      />
    </div>
  );
}
