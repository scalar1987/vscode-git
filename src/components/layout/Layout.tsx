import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { PageTransition } from './PageTransition'
import styles from './Layout.module.css'

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen)
  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className={styles.layout}>
      <Header onMenuToggle={toggleSidebar} />
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <main className={`${styles.main} ${sidebarOpen ? styles.mainShifted : ''}`}>
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
    </div>
  )
}
