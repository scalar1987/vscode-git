import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout'
import { SmartUploader } from './components/SmartUploader'
import { Dashboard, PlaceholderPage, CentersMap, ActivityTracker, TargetsMilestones, BudgetTracking, RiskRegister } from './pages'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="summary" element={<CentersMap />} />
        <Route path="targets" element={<TargetsMilestones />} />
        <Route path="activities" element={<ActivityTracker />} />
        <Route path="reports" element={<SmartUploader />} />
        <Route path="budget" element={<BudgetTracking />} />
        <Route path="risk" element={<RiskRegister />} />
        <Route path="settings" element={<PlaceholderPage title="Settings" description="Configure your dashboard preferences" icon="⚙️" />} />
      </Route>
    </Routes>
  )
}

export default App