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
          <span className={styles.logoIcon}>🌱</span>
          <div className={styles.logoText}>
            <span className={styles.logoTitle}>DigiGreen Youth GENIE</span>
            <span className={styles.logoSubtitle}>M&E Dashboard</span>
          </div>
        </div>
      </div>

      <div className={styles.center}>
        <div className={styles.projectInfo}>
          <span className={styles.projectBadge}>KOICA Project</span>
          <span className={styles.projectPeriod}>May 2024 - Dec 2027</span>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.progress}>
          <span className={styles.progressLabel}>Overall Progress</span>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: '42%' }} />
          </div>
          <span className={styles.progressValue}>42%</span>
        </div>
        <div className={styles.month}>
          <span className={styles.monthLabel}>Month</span>
          <span className={styles.monthValue}>20/43</span>
        </div>
      </div>
    </header>
  )
}
