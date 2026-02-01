import { Activity, ActivityStatus } from '../types/activity';
import styles from './ActivityDetailPanel.module.css';

interface ActivityDetailPanelProps {
  activity: Activity | null;
  onClose: () => void;
}

const STATUS_COLORS: Record<ActivityStatus, string> = {
  'Completed': '#10B981',
  'On Track': '#3B82F6',
  'Delayed': '#F59E0B',
  'Critical': '#EF4444',
  'Not Started': '#9CA3AF',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Not started';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function ActivityDetailPanel({ activity, onClose }: ActivityDetailPanelProps) {
  if (!activity) return null;

  const statusColor = STATUS_COLORS[activity.status];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close panel">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className={styles.header}>
          <span className={styles.activityId}>{activity.id}</span>
          <h2 className={styles.activityName}>{activity.name}</h2>
          <div className={styles.badges}>
            <span
              className={styles.statusBadge}
              style={{
                backgroundColor: `${statusColor}15`,
                color: statusColor,
              }}
            >
              {activity.status}
            </span>
            <span className={styles.outputBadge}>
              {activity.output}
            </span>
          </div>
        </div>

        <p className={styles.description}>{activity.description}</p>

        <div className={styles.progressSection}>
          <div className={styles.progressHeader}>
            <span className={styles.progressLabel}>Progress</span>
            <span className={styles.progressValue} style={{ color: statusColor }}>
              {activity.progress}%
            </span>
          </div>
          <div className={styles.progressBarContainer}>
            <div
              className={styles.progressBar}
              style={{
                width: `${activity.progress}%`,
                backgroundColor: statusColor,
              }}
            />
          </div>
        </div>

        <div className={styles.datesSection}>
          <h3 className={styles.sectionTitle}>Timeline</h3>
          <div className={styles.datesGrid}>
            <div className={styles.dateItem}>
              <span className={styles.dateLabel}>Planned Start</span>
              <span className={styles.dateValue}>{formatDate(activity.plannedStart)}</span>
            </div>
            <div className={styles.dateItem}>
              <span className={styles.dateLabel}>Planned End</span>
              <span className={styles.dateValue}>{formatDate(activity.plannedEnd)}</span>
            </div>
            <div className={styles.dateItem}>
              <span className={styles.dateLabel}>Actual Start</span>
              <span className={styles.dateValue}>{formatDate(activity.actualStart)}</span>
            </div>
            <div className={styles.dateItem}>
              <span className={styles.dateLabel}>Actual End</span>
              <span className={styles.dateValue}>{formatDate(activity.actualEnd)}</span>
            </div>
          </div>
        </div>

        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Output</span>
          <span className={styles.infoValue}>{activity.outputName}</span>
        </div>

        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Responsible</span>
          <span className={styles.infoValue}>{activity.responsible}</span>
        </div>

        <div className={styles.notesSection}>
          <h3 className={styles.sectionTitle}>Notes & Status</h3>
          <p className={styles.notesText}>{activity.notes}</p>
        </div>
      </div>
    </div>
  );
}
