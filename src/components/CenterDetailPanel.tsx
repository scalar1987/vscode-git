import { Center, CenterStatus } from '../types/center';
import styles from './CenterDetailPanel.module.css';

interface CenterDetailPanelProps {
  center: Center | null;
  onClose: () => void;
}

const STATUS_COLORS: Record<CenterStatus, string> = {
  'Operational': '#2E7D32',
  'Non-Operational': '#9CA3AF',
};

const TYPE_ICONS: Record<string, string> = {
  'University': '🎓',
  'School': '🏫',
  'Mairie': '🏛️',
};

export function CenterDetailPanel({ center, onClose }: CenterDetailPanelProps) {
  if (!center) return null;

  const statusColor = STATUS_COLORS[center.status];

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
          <span className={styles.typeIcon}>{TYPE_ICONS[center.type] || '📍'}</span>
          <h2 className={styles.centerName}>{center.name}</h2>
          <div className={styles.badges}>
            <span
              className={styles.statusBadge}
              style={{
                backgroundColor: `${statusColor}15`,
                color: statusColor
              }}
            >
              {center.status}
            </span>
            <span className={styles.phaseBadge}>
              {center.phase}
            </span>
          </div>
        </div>

        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Type</span>
          <span className={styles.infoValue}>{center.type}</span>
        </div>

        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Region</span>
          <span className={styles.infoValue}>{center.region}</span>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>👥</span>
            <span className={styles.statValue}>
              {typeof center.students === 'number'
                ? center.students.toLocaleString()
                : center.students}
            </span>
            <span className={styles.statLabel}>Students</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>💻</span>
            <span className={styles.statValue}>{center.computers}</span>
            <span className={styles.statLabel}>Computers</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>🎯</span>
            <span className={styles.statValue}>
              {center.target_basic_ict > 0
                ? center.target_basic_ict.toLocaleString()
                : 'N/A'}
            </span>
            <span className={styles.statLabel}>Target ICT</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>📚</span>
            <span className={styles.statValue}>{center.ongoing_programs.length}</span>
            <span className={styles.statLabel}>Programs</span>
          </div>
        </div>

        <div className={styles.programsSection}>
          <h3 className={styles.sectionTitle}>Ongoing Programs</h3>
          {center.ongoing_programs.length > 0 ? (
            <ul className={styles.programsList}>
              {center.ongoing_programs.map((program, index) => (
                <li key={index} className={styles.programItem}>
                  {program}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.noPrograms}>No programs assigned yet</p>
          )}
        </div>

        <div className={styles.noteSection}>
          <h3 className={styles.sectionTitle}>Notes</h3>
          <p className={styles.noteText}>{center.note}</p>
        </div>

        <div className={styles.coordinatesSection}>
          <span className={styles.coordinatesLabel}>Coordinates</span>
          <span className={styles.coordinatesValue}>
            {center.coordinates[0].toFixed(4)}, {center.coordinates[1].toFixed(4)}
          </span>
        </div>
      </div>
    </div>
  );
}
