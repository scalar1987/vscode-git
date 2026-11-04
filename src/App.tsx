import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout'
import { Dashboard, PlaceholderPage, CenterDetailPage, CentersOverviewPage } from './pages'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="centers" element={<CentersOverviewPage />} />
        <Route path="centers/:id" element={<CenterDetailPage />} />
        <Route path="settings" element={<PlaceholderPage title="Settings" description="Configure your dashboard preferences" icon="⚙️" />} />
        {/* All other features are now integrated into the Dashboard */}
      </Route>
    </Routes>
  )
}

export default App