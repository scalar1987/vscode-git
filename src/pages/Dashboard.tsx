import React from 'react';
import styles from './Dashboard.module.css';
import { useGENIEData } from '../hooks/useGENIEData';
import { useOutputProgress } from '../hooks/useOutputProgress';

export function Dashboard() {
  const { summary, loading } = useGENIEData();
  const { componentProgress, loading: progressLoading } = useOutputProgress();

  // Helper to color-code the status badges
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return '#10B981'; // Green
      case 'On Track': return '#3B82F6'; // Blue
      case 'Delayed': return '#F59E0B'; // Yellow/Orange
      case 'Off Track': return '#EF4444'; // Red
      case 'Critical': return '#EF4444'; // Red
      default: return '#9CA3AF';
    }
  };

  return (
    <div className={styles.dashboard}>
      {/* KEY METRICS GRID (The 4 Cards) */}
      <div className={styles.statsGrid}>
        {loading ? (
          // Skeleton loading state
          [1, 2, 3, 4].map(i => <div key={i} className={styles.statCard}>Loading...</div>)
        ) : (
          summary?.cards.map((card, index) => (
            <div key={index} className={styles.statCard}>
              <div className={styles.statIcon}>{card.icon}</div>
              <div className={styles.statContent}>
                <span className={styles.statValue}>
                  {card.value.toLocaleString()} 
                  <span style={{ fontSize: '0.6em', color: '#9CA3AF', fontWeight: 'normal' }}>
                    / {card.target.toLocaleString()}
                  </span>
                </span>
                <span className={styles.statLabel}>{card.title} ({card.unit})</span>
                
                {/* Progress Bar */}
                <div style={{ width: '100%', height: '6px', backgroundColor: '#F3F4F6', borderRadius: '4px', marginTop: '12px', marginBottom: '8px' }}>
                  <div style={{ 
                    width: `${Math.min((card.value / card.target) * 100, 100)}%`, 
                    height: '100%', 
                    borderRadius: '4px',
                    backgroundColor: getStatusColor(card.status)
                  }} />
                </div>

                <span style={{ 
                  display: 'inline-block', 
                  fontSize: '11px', 
                  fontWeight: '600', 
                  color: getStatusColor(card.status),
                  textTransform: 'uppercase' 
                }}>
                  {card.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* COMPONENT PROGRESS & BUDGET UTILIZATION (Same Row) */}
      <div className={styles.statsGrid} style={{ gridTemplateColumns: '1fr 1fr' }}>

        {/* LEFT: Component Progress */}
        <div className={styles.statCard}>
          <h2 className={styles.cardTitle} style={{ fontSize: '18px', marginBottom: '16px', fontWeight: '600' }}>Component Progress</h2>
          <div className={styles.componentList}>
            {progressLoading ? (
              <div style={{ color: '#9CA3AF', padding: '20px', textAlign: 'center' }}>Loading progress...</div>
            ) : (
              componentProgress.map((component) => (
                <div key={component.label} className={styles.componentItem}>
                  <div className={styles.componentHeader}>
                    <span className={styles.componentName}>{component.label}</span>
                    <span className={styles.componentPercent}>{component.percentage}%</span>
                  </div>
                  <div className={styles.progressBarBg}>
                    <div
                      className={styles.progressBarFill}
                      style={{ width: `${component.percentage}%`, backgroundColor: component.color }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Budget Utilization */}
        <div className={styles.statCard}>
          <h2 className={styles.cardTitle} style={{ fontSize: '18px', marginBottom: '16px', fontWeight: '600' }}>Budget Utilization</h2>
          <div className={styles.budgetContainer}>
            <div className={styles.budgetChart}>
              <div className={styles.chartCircle} style={{
                background: `conic-gradient(#2E7D32 0% 34%, #E0E0E0 34% 100%)`,
                width: '100px', height: '100px', borderRadius: '50%', margin: '0 auto',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <div style={{ background: 'white', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '18px', fontWeight: 'bold' }}>34%</span>
                  <span style={{ fontSize: '10px', color: '#757575' }}>Spent</span>
                </div>
              </div>
            </div>

            <div className={styles.budgetDetails}>
              <div className={styles.budgetItem}>
                <span className={styles.budgetItemLabel}>Total Budget</span>
                <span className={styles.budgetItemValue}>$8,250,000</span>
              </div>
              <div className={styles.budgetItem}>
                <span className={styles.budgetItemLabel}>Cumulative Expenditure</span>
                <span className={styles.budgetItemValue} style={{ color: '#2E7D32' }}>$2,836,220</span>
              </div>
              <div className={styles.budgetItem}>
                <span className={styles.budgetItemLabel}>Remaining</span>
                <span className={styles.budgetItemValue}>$5,413,780</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RECENT ACTIVITY (Full Width Below) */}
      <div className={styles.statCard}>
        <h2 className={styles.cardTitle} style={{ fontSize: '18px', marginBottom: '16px', fontWeight: '600' }}>Recent Activity</h2>
        <div className={styles.activityList}>
          {[
            { date: 'Dec 15, 2025', activity: 'Impact Lab Green Curriculum Finalized', status: 'Completed' },
            { date: 'Dec 10, 2025', activity: 'Bondoukou Center Launch Event', status: 'Completed' },
            { date: 'Nov 28, 2025', activity: 'Phase II Renovation Sub-Order Signed', status: 'Completed' },
            { date: 'Nov 05, 2025', activity: 'Cohort 1 Greenpreneur Graduation', status: 'Completed' },
            { date: 'Jan 20, 2026', activity: 'LPIA Treichville Pilot Data Collection', status: 'Upcoming' },
            { date: 'Feb 2026', activity: 'Pitch Competition & Seed Capital Disbursement', status: 'Upcoming' },
          ].map((item, index) => (
            <div key={index} className={styles.activityItem}>
              <span className={styles.activityDate}>{item.date}</span>
              <span className={styles.activityText}>{item.activity}</span>
              <span className={styles.activityStatus} style={{
                backgroundColor: item.status === 'Completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                color: item.status === 'Completed' ? '#10B981' : '#3B82F6'
              }}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}