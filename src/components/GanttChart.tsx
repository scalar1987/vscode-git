import { Activity, ActivityStatus } from '../types/activity';
import styles from './GanttChart.module.css';

interface GanttChartProps {
  activities: Activity[];
  projectStart: string;
  projectEnd: string;
  onActivityClick: (activity: Activity) => void;
}

const STATUS_COLORS: Record<ActivityStatus, string> = {
  'Completed': '#10B981',
  'On Track': '#3B82F6',
  'Delayed': '#F59E0B',
  'Critical': '#EF4444',
  'Not Started': '#9CA3AF',
};

// Generate year markers for the timeline
function generateYearMarkers(start: string, end: string): { year: number; position: number }[] {
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
}

// Calculate bar position and width
function calculateBarPosition(
  plannedStart: string,
  plannedEnd: string,
  projectStart: string,
  projectEnd: string
): { left: number; width: number } {
  const projStart = new Date(projectStart).getTime();
  const projEnd = new Date(projectEnd).getTime();
  const totalDuration = projEnd - projStart;

  const actStart = new Date(plannedStart).getTime();
  const actEnd = new Date(plannedEnd).getTime();

  const left = ((actStart - projStart) / totalDuration) * 100;
  const width = ((actEnd - actStart) / totalDuration) * 100;

  return {
    left: Math.max(0, Math.min(100, left)),
    width: Math.max(1, Math.min(100 - left, width)),
  };
}

// Calculate today marker position
function getTodayPosition(projectStart: string, projectEnd: string): number {
  const projStart = new Date(projectStart).getTime();
  const projEnd = new Date(projectEnd).getTime();
  const today = new Date().getTime();

  const position = ((today - projStart) / (projEnd - projStart)) * 100;
  return Math.max(0, Math.min(100, position));
}

// Group activities by output
function groupByOutput(activities: Activity[]): Map<string, Activity[]> {
  const grouped = new Map<string, Activity[]>();

  activities.forEach(activity => {
    const key = activity.output;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(activity);
  });

  return grouped;
}

export function GanttChart({ activities, projectStart, projectEnd, onActivityClick }: GanttChartProps) {
  const yearMarkers = generateYearMarkers(projectStart, projectEnd);
  const todayPosition = getTodayPosition(projectStart, projectEnd);
  const groupedActivities = groupByOutput(activities);

  return (
    <div className={styles.ganttContainer}>
      {/* Timeline header with year markers */}
      <div className={styles.timelineHeader}>
        <div className={styles.labelColumn}>Activity</div>
        <div className={styles.timelineColumn}>
          {yearMarkers.map(marker => (
            <div
              key={marker.year}
              className={styles.yearMarker}
              style={{ left: `${marker.position}%` }}
            >
              {marker.year}
            </div>
          ))}
        </div>
      </div>

      {/* Activities grouped by output */}
      <div className={styles.ganttBody}>
        {Array.from(groupedActivities.entries()).map(([output, outputActivities]) => (
          <div key={output} className={styles.outputGroup}>
            {/* Output header */}
            <div className={styles.outputHeader}>
              <div className={styles.labelColumn}>
                <span className={styles.outputLabel}>{output}</span>
                <span className={styles.outputName}>{outputActivities[0]?.outputName}</span>
              </div>
              <div className={styles.timelineColumn}>
                {/* Year grid lines */}
                {yearMarkers.map(marker => (
                  <div
                    key={marker.year}
                    className={styles.gridLine}
                    style={{ left: `${marker.position}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Activities in this output */}
            {outputActivities.map(activity => {
              const barPos = calculateBarPosition(
                activity.plannedStart,
                activity.plannedEnd,
                projectStart,
                projectEnd
              );

              return (
                <div
                  key={activity.id}
                  className={styles.activityRow}
                  onClick={() => onActivityClick(activity)}
                >
                  <div className={styles.labelColumn}>
                    <span className={styles.activityId}>{activity.id}</span>
                    <span className={styles.activityName}>{activity.name}</span>
                  </div>
                  <div className={styles.timelineColumn}>
                    {/* Grid lines */}
                    {yearMarkers.map(marker => (
                      <div
                        key={marker.year}
                        className={styles.gridLine}
                        style={{ left: `${marker.position}%` }}
                      />
                    ))}

                    {/* Planned duration bar (outline) */}
                    <div
                      className={styles.plannedBar}
                      style={{
                        left: `${barPos.left}%`,
                        width: `${barPos.width}%`,
                      }}
                    />

                    {/* Actual progress bar (filled) */}
                    <div
                      className={styles.progressBar}
                      style={{
                        left: `${barPos.left}%`,
                        width: `${barPos.width * (activity.progress / 100)}%`,
                        backgroundColor: STATUS_COLORS[activity.status],
                      }}
                    />

                    {/* Progress label */}
                    <div
                      className={styles.progressLabel}
                      style={{
                        left: `${barPos.left + barPos.width + 1}%`,
                        color: STATUS_COLORS[activity.status],
                      }}
                    >
                      {activity.progress}%
                    </div>

                    {/* Today marker */}
                    <div
                      className={styles.todayMarker}
                      style={{ left: `${todayPosition}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ backgroundColor: color }} />
            <span>{status}</span>
          </div>
        ))}
        <div className={styles.legendItem}>
          <span className={styles.todayIndicator} />
          <span>Today</span>
        </div>
      </div>
    </div>
  );
}
