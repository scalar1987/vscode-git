import { OutcomeIndicator } from '../types/target';
import { ProgressRing } from './ProgressRing';
import styles from './OutcomeCard.module.css';

interface OutcomeCardProps {
  indicator: OutcomeIndicator;
}

const formatNumber = (value: number, unit: string): string => {
  if (unit === 'USD') {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toLocaleString()}`;
  }
  if (value >= 1000) {
    return value.toLocaleString();
  }
  return value.toString();
};

const getStatusClass = (status: string): string => {
  switch (status) {
    case 'On Track':
      return styles.statusOnTrack;
    case 'Behind':
      return styles.statusBehind;
    case 'Ahead':
      return styles.statusAhead;
    default:
      return styles.statusNotStarted;
  }
};

export function OutcomeCard({ indicator }: OutcomeCardProps) {
  const progress = indicator.target > 0
    ? (indicator.actual / indicator.target) * 100
    : 0;

  return (
    <div className={styles.card}>
      <div className={styles.iconWrapper}>{indicator.icon}</div>
      <div className={styles.name}>{indicator.name}</div>

      <div className={styles.progressWrapper}>
        <ProgressRing
          progress={progress}
          status={indicator.status}
          size={100}
          strokeWidth={8}
        />
      </div>

      <div className={styles.stats}>
        <div className={styles.statsRow}>
          <span className={styles.statsLabel}>Actual</span>
          <span className={styles.statsValue}>
            {formatNumber(indicator.actual, indicator.unit)}
          </span>
        </div>
        <div className={styles.statsRow}>
          <span className={styles.statsLabel}>Target</span>
          <span className={styles.statsValue}>
            {formatNumber(indicator.target, indicator.unit)}
          </span>
        </div>
        <div className={styles.statsRow}>
          <span className={styles.statsLabel}>Baseline</span>
          <span className={styles.statsValue}>
            {formatNumber(indicator.baseline, indicator.unit)}
          </span>
        </div>
      </div>

      <span className={`${styles.statusBadge} ${getStatusClass(indicator.status)}`}>
        {indicator.status}
      </span>
    </div>
  );
}
