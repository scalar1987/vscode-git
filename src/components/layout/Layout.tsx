import { Outlet, Link } from 'react-router-dom'
import styles from './Layout.module.css'
import { AuthButton } from './AuthButton'

export function Layout() {
  return (
    <div className={styles.layout}>
      {/* Top bar: logo | centred title | sign-in state (visible on every page) */}
      <div className="border-b border-gray-200" style={{ backgroundColor: '#FAFAF7' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 h-20 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="flex items-center min-w-0">
            <Link to="/" aria-label="Home">
              <img src="/gggi logo cote divoire.png" alt="GGGI" className="h-14 md:h-16 w-auto" />
            </Link>
          </div>
          <Link to="/" className="text-center">
            <span className="block text-2xl md:text-3xl font-bold text-gray-900 whitespace-nowrap">GENIE Centers Dashboard</span>
          </Link>
          <div className="flex justify-end">
            <AuthButton />
          </div>
        </div>
      </div>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
