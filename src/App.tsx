import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout'
import { Dashboard, PlaceholderPage } from './pages'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route
          path="summary"
          element={
            <PlaceholderPage
              title="Executive Summary"
              description="High-level overview of project status, key achievements, and critical issues requiring attention."
              icon="📋"
            />
          }
        />
        <Route
          path="digital-infrastructure"
          element={
            <PlaceholderPage
              title="Digital Infrastructure"
              description="Track the establishment of digital centers, connectivity improvements, and technology access initiatives."
              icon="🌐"
            />
          }
        />
        <Route
          path="digital-green-skills"
          element={
            <PlaceholderPage
              title="Digital and Green Skills Training"
              description="Track youth training programs in digital literacy, sustainable agriculture, renewable energy, and environmental management."
              icon="🎓"
            />
          }
        />
        <Route
          path="green-entrepreneurship"
          element={
            <PlaceholderPage
              title="Green Entrepreneurship"
              description="Monitor green business incubation, mentorship programs, and access to financing for youth-led enterprises."
              icon="💼"
            />
          }
        />
        <Route
          path="ecosystem-building"
          element={
            <PlaceholderPage
              title="Ecosystem Building"
              description="Monitor ecosystem development, stakeholder engagement, partnerships, and institutional capacity building activities."
              icon="🌱"
            />
          }
        />
        <Route
          path="indicators"
          element={
            <PlaceholderPage
              title="KPI Indicators"
              description="Detailed view of all Key Performance Indicators with trend analysis and variance reporting."
              icon="📈"
            />
          }
        />
        <Route
          path="targets"
          element={
            <PlaceholderPage
              title="Targets & Milestones"
              description="Track progress against project targets and milestone achievements across all components."
              icon="🎯"
            />
          }
        />
        <Route
          path="activities"
          element={
            <PlaceholderPage
              title="Activity Tracker"
              description="Monitor ongoing and planned activities, task completion status, and deliverable tracking."
              icon="✅"
            />
          }
        />
        <Route
          path="reports"
          element={
            <PlaceholderPage
              title="Reports"
              description="Generate and access quarterly reports, donor reports, and custom M&E documentation."
              icon="📑"
            />
          }
        />
        <Route
          path="budget"
          element={
            <PlaceholderPage
              title="Budget Tracking"
              description="Monitor budget allocation, expenditure tracking, and financial variance analysis."
              icon="💰"
            />
          }
        />
        <Route
          path="risk"
          element={
            <PlaceholderPage
              title="Risk Register"
              description="Identify, assess, and track project risks with mitigation strategies and status updates."
              icon="⚠️"
            />
          }
        />
        <Route
          path="settings"
          element={
            <PlaceholderPage
              title="Settings"
              description="Configure dashboard preferences, user management, and system settings."
              icon="⚙️"
            />
          }
        />
      </Route>
    </Routes>
  )
}

export default App
