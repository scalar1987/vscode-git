import { useMemo, useState, useEffect } from 'react'
import styles from './Header.module.css'

// Project timeline: May 2024 - December 2027 (43 months)
const PROJECT_START = new Date('2024-05-01');
const PROJECT_END = new Date('2027-12-31');
const TOTAL_MONTHS = 43;

function calculateProjectProgress(): { progress: number; currentMonth: number } {
  const now = new Date();
  const totalDuration = PROJECT_END.getTime() - PROJECT_START.getTime();
  const elapsed = now.getTime() - PROJECT_START.getTime();
  const progress = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);

  const monthsElapsed = Math.floor(elapsed / (1000 * 60 * 60 * 24 * 30.44));
  const currentMonth = Math.min(Math.max(monthsElapsed + 1, 1), TOTAL_MONTHS);

  return { progress: Math.round(progress), currentMonth };
}

// Section navigation items
const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'performance', label: 'Performance' },
  { id: 'centers', label: 'Centers' },
  { id: 'targets', label: 'Targets' },
  { id: 'activity', label: 'Activity' },
];

export function Header() {
  const { progress, currentMonth } = useMemo(() => calculateProjectProgress(), []);
  const [activeSection, setActiveSection] = useState('overview');

  // Smooth scroll to section
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const headerHeight = 64; // var(--header-height)
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: elementPosition - headerHeight - 16,
        behavior: 'smooth'
      });
    }
  };

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const headerHeight = 80;

      for (const section of [...SECTIONS].reverse()) {
        const element = document.getElementById(section.id);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= headerHeight + 100) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <div className={styles.logo}>
          <img
            src="/gggi logo cote divoire.png"
            alt="GGGI Logo"
            className={styles.gggiLogo}
          />
          <div className={styles.logoText}>
            <span className={styles.logoTitle}>GENIE DigiGreen Youth</span>
            <span className={styles.logoSubtitle}>M&E Dashboard</span>
          </div>
        </div>
      </div>

      <nav className={styles.nav}>
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            className={`${styles.navPill} ${activeSection === section.id ? styles.navPillActive : ''}`}
            onClick={() => scrollToSection(section.id)}
          >
            {section.label}
          </button>
        ))}
      </nav>

      <div className={styles.right}>
        <div className={styles.progress}>
          <div className={styles.progressRing}>
            <svg viewBox="0 0 36 36" className={styles.progressSvg}>
              <path
                className={styles.progressBg}
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={styles.progressFill}
                strokeDasharray={`${progress}, 100`}
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className={styles.progressText}>{progress}%</span>
          </div>
        </div>
        <div className={styles.month}>
          <span className={styles.monthLabel}>MONTH</span>
          <span className={styles.monthValue}>{currentMonth}<span className={styles.monthTotal}>/{TOTAL_MONTHS}</span></span>
        </div>
      </div>
    </header>
  )
}
