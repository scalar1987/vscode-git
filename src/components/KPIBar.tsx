import { useKPIData } from '../hooks/useKPIData';
import styles from './KPIBar.module.css';

interface KPIItemProps {
  icon: string;
  label: string;
  value: number;
  target: number;
  unit?: string;
  isCurrency?: boolean;
}

function KPIItem({ icon, label, value, target, unit, isCurrency }: KPIItemProps) {
  const progress = target > 0 ? Math.min((value / target) * 100, 100) : 0;

  const formatValue = (val: number) => {
    if (isCurrency) {
      if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
      if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
      return `$${val.toLocaleString()}`;
    }
    return val.toLocaleString();
  };

  const formatTarget = (val: number) => {
    if (isCurrency) {
      if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
      if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
      return `$${val.toLocaleString()}`;
    }
    return val.toLocaleString();
  };

  return (
    <div className={styles.kpiItem}>
      <div className={styles.kpiIcon}>{icon}</div>
      <div className={styles.kpiContent}>
        <div className={styles.kpiValues}>
          <span className={styles.kpiValue}>{formatValue(value)}</span>
          <span className={styles.kpiSeparator}>/</span>
          <span className={styles.kpiTarget}>{formatTarget(target)}</span>
          {unit && <span className={styles.kpiUnit}>{unit}</span>}
        </div>
        <span className={styles.kpiLabel}>{label}</span>
        <div className={styles.kpiProgressBg}>
          <div
            className={styles.kpiProgressFill}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function KPIBar() {
  const { kpiData, loading } = useKPIData();

  if (loading) {
    return (
      <div className={styles.kpiBar}>
        <div className={styles.kpiContainer}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className={styles.kpiItemSkeleton}>
              <div className={styles.skeletonIcon} />
              <div className={styles.skeletonContent}>
                <div className={styles.skeletonValue} />
                <div className={styles.skeletonLabel} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!kpiData) return null;

  return (
    <div className={styles.kpiBar}>
      <div className={styles.kpiContainer}>
        <KPIItem
          icon="🏢"
          label="GENIE Centers Operational"
          value={kpiData.centersOperational.value}
          target={kpiData.centersOperational.target}
        />
        <KPIItem
          icon="🎓"
          label="Youth & Adults with ICT/Green Skills"
          value={kpiData.youthWithSkills.value}
          target={kpiData.youthWithSkills.target}
        />
        <KPIItem
          icon="💼"
          label="Greenpreneurs Incubated"
          value={kpiData.greenpreneursIncubated.value}
          target={kpiData.greenpreneursIncubated.target}
        />
        <KPIItem
          icon="🌱"
          label="Green Jobs Created"
          value={kpiData.greenJobsCreated.value}
          target={kpiData.greenJobsCreated.target}
        />
        <KPIItem
          icon="💰"
          label="Fund Mobilized"
          value={kpiData.fundMobilized.value + kpiData.fundMobilized.baseline}
          target={kpiData.fundMobilized.target + kpiData.fundMobilized.baseline}
          isCurrency={true}
        />
      </div>
    </div>
  );
}

export default KPIBar;
