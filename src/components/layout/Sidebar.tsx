import { NavLink } from 'react-router-dom'
import styles from './Sidebar.module.css'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const navItems = [
  {
    section: 'Overview',
    items: [
      { path: '/', label: 'Dashboard', icon: '📊' },
      { path: '/summary', label: 'DigiGreen Centers', icon: '🗺️' },
    ]
  },
  {
    section: 'Monitoring',
    items: [
      { path: '/targets', label: 'Targets & Milestones', icon: '🎯' },
      { path: '/activities', label: 'Activity Tracker', icon: '✅' },
    ]
  },
  {
    section: 'Reporting',
    items: [
      { path: '/reports', label: 'Reports', icon: '📑' },
      { path: '/budget', label: 'Budget Tracking', icon: '💰' },
      { path: '/risk', label: 'Risk Register', icon: '⚠️' },
    ]
  },
  {
    section: 'Settings',
    items: [
      { path: '/settings', label: 'Settings', icon: '⚙️' },
    ]
  }
]

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      <div
        className={`${styles.overlay} ${isOpen ? styles.overlayVisible : ''}`}
        onClick={onClose}
      />
      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        <nav className={styles.nav}>
          {navItems.map((section) => (
            <div key={section.section} className={styles.section}>
              <h3 className={styles.sectionTitle}>{section.section}</h3>
              <ul className={styles.sectionList}>
                {section.items.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                      }
                      onClick={onClose}
                    >
                      <span className={styles.navIcon}>{item.icon}</span>
                      <span className={styles.navLabel}>{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className={styles.footer}>
          <div className={styles.budgetInfo}>
            <span className={styles.budgetLabel}>Total Budget</span>
            <span className={styles.budgetValue}>$8.25M</span>
          </div>
          <div className={styles.locationInfo}>
            <span className={styles.locationIcon}>📍</span>
            <span className={styles.locationText}>Côte d'Ivoire</span>
          </div>
        </div>
      </aside>
    </>
  )
}
