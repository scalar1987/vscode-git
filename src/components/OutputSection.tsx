import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { OutputGroup, TargetStatus } from '../types/target';
import styles from './OutputSection.module.css';

interface OutputSectionProps {
  output: OutputGroup;
}

const STATUS_COLORS: Record<TargetStatus, string> = {
  'On Track': '#3B82F6',
  'Behind': '#F59E0B',
  'Ahead': '#10B981',
  'Not Started': '#9CA3AF',
};

const getStatusClass = (status: TargetStatus): string => {
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

const calculateOverallProgress = (output: OutputGroup): number => {
  if (output.indicators.length === 0) return 0;

  // Count only indicators with valid targets
  const validIndicators = output.indicators.filter((ind) => ind.target > 0);
  if (validIndicators.length === 0) return 0;

  // Cap each indicator's progress at 100% before averaging
  const totalProgress = validIndicators.reduce((sum, ind) => {
    const indicatorProgress = (ind.actual / ind.target) * 100;
    return sum + Math.min(100, indicatorProgress); // Cap at 100%
  }, 0);

  return totalProgress / validIndicators.length;
};

const calculateOverallStatus = (output: OutputGroup): TargetStatus => {
  if (output.indicators.length === 0) return 'Not Started';

  const statuses = output.indicators.map((i) => i.status);
  if (statuses.every((s) => s === 'Not Started')) return 'Not Started';
  if (statuses.some((s) => s === 'Ahead')) return 'Ahead';
  if (statuses.some((s) => s === 'Behind')) return 'Behind';
  return 'On Track';
};

export function OutputSection({ output }: OutputSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const overallProgress = calculateOverallProgress(output);
  const overallStatus = calculateOverallStatus(output);

  return (
    <div className={styles.section}>
      <div className={styles.header} onClick={() => setIsOpen(!isOpen)}>
        <div className={styles.headerLeft}>
          <span className={styles.outputId}>{output.id}</span>
          <div className={styles.titleGroup}>
            <h3 className={styles.outputName}>{output.name}</h3>
            <p className={styles.outputDesc}>{output.description}</p>
          </div>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.progressContainer}>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{
                  width: `${Math.min(100, overallProgress)}%`,
                  backgroundColor: STATUS_COLORS[overallStatus],
                }}
              />
            </div>
            <span className={styles.progressText}>
              {Math.round(overallProgress)}%
            </span>
          </div>

          <span className={`${styles.statusBadge} ${getStatusClass(overallStatus)}`}>
            {overallStatus}
          </span>

          <ChevronDown
            size={20}
            className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
          />
        </div>
      </div>

      <div className={`${styles.content} ${isOpen ? styles.contentOpen : ''}`}>
        <div className={styles.indicatorList}>
          {output.indicators.map((indicator) => {
            const progress =
              indicator.target > 0
                ? (indicator.actual / indicator.target) * 100
                : 0;

            return (
              <div key={indicator.id} className={styles.indicatorRow}>
                <span className={styles.indicatorId}>{indicator.id}</span>
                <span className={styles.indicatorLabel}>{indicator.label}</span>
                <div className={styles.indicatorProgress}>
                  <div className={styles.indicatorBar}>
                    <div
                      className={styles.indicatorFill}
                      style={{
                        width: `${Math.min(100, progress)}%`,
                        backgroundColor: STATUS_COLORS[indicator.status],
                      }}
                    />
                  </div>
                  <span className={styles.indicatorValue}>
                    {indicator.actual.toLocaleString()} / {indicator.target.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
