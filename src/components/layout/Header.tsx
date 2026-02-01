import styles from './Header.module.css'

interface HeaderProps {
  onMenuToggle: () => void
}

export function Header({ onMenuToggle }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button className={styles.menuButton} onClick={onMenuToggle} aria-label="Toggle menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className={styles.logo}>
          <img
            src="/gggi logo cote divoire.png"
            alt="GGGI Logo"
            className={styles.gggiLogo}
          />
          <div className={styles.logoText}>
            <span className={styles.logoTitle}>GENIE DigiGreen Youth Project</span>
            <span className={styles.logoSubtitle}>May 2024 - Dec 2027</span>
          </div>
        </div>
      </div>

      <div className={styles.center}>
        <span className={styles.dashboardLabel}>M&E Dashboard</span>
      </div>

      <div className={styles.right}>
        <div className={styles.progress}>
          <span className={styles.progressLabel}>Time Elapsed</span>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: '47%' }} />
          </div>
          <span className={styles.progressValue}>47%</span>
        </div>
        <div className={styles.month}>
          <span className={styles.monthLabel}>Month</span>
          <span className={styles.monthValue}>20/43</span>
        </div>
      </div>
    </header>
  )
}
