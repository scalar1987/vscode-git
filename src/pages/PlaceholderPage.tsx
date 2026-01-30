import styles from './PlaceholderPage.module.css'

interface PlaceholderPageProps {
  title: string
  description: string
  icon: string
}

export function PlaceholderPage({ title, description, icon }: PlaceholderPageProps) {
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <span className={styles.icon}>{icon}</span>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>
        <div className={styles.badge}>Coming Soon</div>
      </div>
    </div>
  )
}
