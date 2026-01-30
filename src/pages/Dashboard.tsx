import styles from './Dashboard.module.css'

export function Dashboard() {
  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>Dashboard Overview</h1>
        <p className={styles.subtitle}>
          DigiGreen Youth GENIE Project - Real-time M&E Monitoring
        </p>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>🎓</div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>2,450</span>
            <span className={styles.statLabel}>Youth Trained</span>
          </div>
          <div className={styles.statProgress}>
            <div className={styles.statProgressBar} style={{ width: '49%' }} />
          </div>
          <span className={styles.statTarget}>Target: 5,000</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>💼</div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>185</span>
            <span className={styles.statLabel}>Businesses Supported</span>
          </div>
          <div className={styles.statProgress}>
            <div className={styles.statProgressBar} style={{ width: '37%' }} />
          </div>
          <span className={styles.statTarget}>Target: 500</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>🌐</div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>12</span>
            <span className={styles.statLabel}>Digital Centers</span>
          </div>
          <div className={styles.statProgress}>
            <div className={styles.statProgressBar} style={{ width: '60%' }} />
          </div>
          <span className={styles.statTarget}>Target: 20</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>📜</div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>3</span>
            <span className={styles.statLabel}>Policies Drafted</span>
          </div>
          <div className={styles.statProgress}>
            <div className={styles.statProgressBar} style={{ width: '30%' }} />
          </div>
          <span className={styles.statTarget}>Target: 10</span>
        </div>
      </div>

      <div className={styles.gridRow}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Component Progress</h2>
          <div className={styles.componentList}>
            {[
              { label: 'Digital Infrastructure', percentage: 63, color: '#f59e0b' },
              { label: 'Digital and Green Skills Training', percentage: 40, color: '#ef4444' },
              { label: 'Green Entrepreneurship', percentage: 49, color: '#f59e0b' },
              { label: 'Ecosystem Building', percentage: 27, color: '#f59e0b' },
            ].map((component) => (
              <div key={component.label} className={styles.componentItem}>
                <div className={styles.componentHeader}>
                  <span className={styles.componentName}>{component.label}</span>
                  <span className={styles.componentPercent}>{component.percentage}%</span>
                </div>
                <div className={styles.componentBar}>
                  <div
                    className={styles.componentFill}
                    style={{ width: `${component.percentage}%`, background: component.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Budget Utilization</h2>
          <div className={styles.budgetChart}>
            <div className={styles.budgetCircle}>
              <svg viewBox="0 0 36 36" className={styles.budgetSvg}>
                <path
                  className={styles.budgetBg}
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={styles.budgetFill}
                  strokeDasharray="35, 100"
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className={styles.budgetText}>
                <span className={styles.budgetPercent}>35%</span>
                <span className={styles.budgetLabel}>Utilized</span>
              </div>
            </div>
            <div className={styles.budgetDetails}>
              <div className={styles.budgetItem}>
                <span className={styles.budgetItemLabel}>Total Budget</span>
                <span className={styles.budgetItemValue}>$8,250,000</span>
              </div>
              <div className={styles.budgetItem}>
                <span className={styles.budgetItemLabel}>Spent to Date</span>
                <span className={styles.budgetItemValue}>$2,887,500</span>
              </div>
              <div className={styles.budgetItem}>
                <span className={styles.budgetItemLabel}>Remaining</span>
                <span className={styles.budgetItemValue}>$5,362,500</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Recent Activities</h2>
        <div className={styles.activityList}>
          {[
            { date: '2024-05-15', activity: 'Green Skills Training Workshop - Abidjan', status: 'completed' },
            { date: '2024-05-12', activity: 'Youth Entrepreneurship Bootcamp', status: 'completed' },
            { date: '2024-05-20', activity: 'Digital Center Opening - San Pedro', status: 'upcoming' },
            { date: '2024-05-25', activity: 'Policy Stakeholder Meeting', status: 'upcoming' },
            { date: '2024-06-01', activity: 'Quarterly M&E Review', status: 'upcoming' },
          ].map((item, index) => (
            <div key={index} className={styles.activityItem}>
              <span className={styles.activityDate}>{item.date}</span>
              <span className={styles.activityText}>{item.activity}</span>
              <span className={`${styles.activityStatus} ${styles[item.status]}`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
