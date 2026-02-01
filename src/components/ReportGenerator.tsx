import { useState } from 'react'
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, WidthType, AlignmentType } from 'docx'
import { saveAs } from 'file-saver'
import styles from './ReportGenerator.module.css'

interface Indicator {
  id: string
  parent_id: string
  parent_desc: string
  label: string
  baseline: string
  targets: {
    2024: number | string
    2025: number | string
    2026: number | string
    2027: number | string
    total: number | string
  }
}

interface PerformanceActual {
  date: string
  source: string
  values: Record<string, number>
}

interface NarrativeEntry {
  date: string
  source: string
  stories: Record<string, { status?: string; narrative: string }>
}

interface Activity {
  id: string
  name: string
  output: string
  status: string
  progress: number
  notes: string
}

interface ReportData {
  month: string
  year: number
  projectProgress: { elapsed: number; total: number; percentage: number }
  outcomes: { id: string; name: string; baseline: number; target: number; actual: number; status: string }[]
  outputs: { id: string; name: string; progress: number; status: string }[]
  narratives: { id: string; status: string; narrative: string }[]
  activities: { id: string; name: string; status: string; progress: number; notes: string }[]
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const OUTPUT_CONFIG = [
  { id: '1.1', parentId: 'Output 1.1', name: 'DigiGreen Centers Infrastructure' },
  { id: '1.2', parentId: 'Output 1.2', name: 'Basic ICT Skills Training' },
  { id: '1.3', parentId: 'Output 1.3', name: 'Higher-level ICT Training' },
  { id: '2.1', parentId: 'Output 2.1', name: 'Incubation Program Development' },
  { id: '2.2', parentId: 'Output 2.2', name: 'Incubation Program Implementation' },
  { id: '3.1', parentId: 'Output 3.1', name: 'Conducive Environment' },
  { id: '3.2', parentId: 'Output 3.2', name: 'Government Capacity Building' },
]

const OUTCOME_CONFIG = [
  { id: '1', name: 'Youth with ICT Skills', indicatorIds: ['1.2.6.2', '1.3.4.1'] },
  { id: '2', name: 'Technology Start-ups Created', indicatorIds: ['2.2.2.1'] },
  { id: '2.1', name: 'Green Jobs Created', indicatorIds: ['2.1'] },
  { id: '3', name: 'Mobilized Investment (USD)', indicatorIds: ['3.1.2'] },
]

const parseNumber = (value: string | number): number => {
  if (typeof value === 'number') return value
  const cleaned = value.replace(/[$,%]/g, '').replace(/,/g, '')
  return parseFloat(cleaned) || 0
}

const getStatus = (percentage: number): string => {
  if (percentage >= 80) return 'On Track'
  if (percentage >= 50) return 'Moderate'
  if (percentage > 0) return 'Behind'
  return 'Not Started'
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'On Track':
    case 'Completed':
    case 'Exceeded':
      return styles.statusGreen
    case 'Moderate':
      return styles.statusBlue
    case 'Behind':
    case 'Delayed':
      return styles.statusOrange
    case 'Critical':
      return styles.statusRed
    default:
      return styles.statusGray
  }
}

export function ReportGenerator() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const generateReport = async () => {
    setLoading(true)
    try {
      const [indicators, actualsData, narrativesData, activitiesData] = await Promise.all([
        fetch('/logframe_structured.json').then(r => r.json()) as Promise<Indicator[]>,
        fetch('/performance_actuals.json').then(r => r.json()) as Promise<PerformanceActual[]>,
        fetch('/narratives.json').then(r => r.json()) as Promise<NarrativeEntry[]>,
        fetch('/activities.json').then(r => r.json()) as Promise<{ activities: Activity[] }>
      ])

      const actuals = actualsData[0]
      const latestNarratives = narrativesData[0]

      // Calculate project progress (May 2024 - Dec 2027 = 43 months)
      const projectStart = new Date(2024, 4, 1) // May 2024
      // Project end: Dec 2027 (43 months total)
      const reportDate = new Date(selectedYear, selectedMonth, 1)
      const totalMonths = 43
      const elapsedMonths = Math.max(0, Math.min(totalMonths,
        (reportDate.getFullYear() - projectStart.getFullYear()) * 12 +
        (reportDate.getMonth() - projectStart.getMonth()) + 1
      ))

      // Calculate outcomes
      const outcomes = OUTCOME_CONFIG.map(outcome => {
        let totalTarget = 0
        let totalActual = 0
        outcome.indicatorIds.forEach(indId => {
          const ind = indicators.find(i => i.id === indId)
          if (ind) {
            totalTarget += parseNumber(ind.targets.total)
            totalActual += actuals.values[indId] || 0
          }
        })
        const progress = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0
        return {
          id: outcome.id,
          name: outcome.name,
          baseline: 0,
          target: totalTarget,
          actual: totalActual,
          status: getStatus(progress)
        }
      })

      // Calculate outputs
      const outputs = OUTPUT_CONFIG.map(config => {
        const outputIndicators = indicators.filter(ind => ind.parent_id === config.parentId)
        if (outputIndicators.length === 0) {
          return { id: config.id, name: config.name, progress: 0, status: 'Not Started' }
        }
        const validIndicators = outputIndicators.filter(ind => parseNumber(ind.targets.total) > 0)
        if (validIndicators.length === 0) {
          return { id: config.id, name: config.name, progress: 0, status: 'Not Started' }
        }
        const totalProgress = validIndicators.reduce((sum, ind) => {
          const target = parseNumber(ind.targets.total)
          const actual = actuals.values[ind.id] || 0
          return sum + Math.min(100, (actual / target) * 100)
        }, 0)
        const avgProgress = Math.round(totalProgress / validIndicators.length)
        return { id: config.id, name: config.name, progress: avgProgress, status: getStatus(avgProgress) }
      })

      // Get key narratives
      const keyNarrativeIds = ['1', '1.1.4', '1.2.6.2', '2', '2.1', '2.2.2.1', '3', 'OVERALL']
      const narratives = keyNarrativeIds
        .filter(id => latestNarratives.stories[id])
        .map(id => ({
          id,
          status: latestNarratives.stories[id].status || 'Unknown',
          narrative: latestNarratives.stories[id].narrative
        }))

      // Get recent activities (delayed or completed)
      const activities = activitiesData.activities
        .filter(a => a.status === 'Delayed' || a.status === 'Completed' || a.status === 'Critical')
        .slice(0, 10)
        .map(a => ({
          id: a.id,
          name: a.name,
          status: a.status,
          progress: a.progress,
          notes: a.notes
        }))

      setReportData({
        month: MONTHS[selectedMonth],
        year: selectedYear,
        projectProgress: {
          elapsed: elapsedMonths,
          total: totalMonths,
          percentage: Math.round((elapsedMonths / totalMonths) * 100)
        },
        outcomes,
        outputs,
        narratives,
        activities
      })
      setShowPreview(true)
    } catch (err) {
      console.error('Error generating report:', err)
      alert('Failed to generate report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const downloadWord = async () => {
    if (!reportData) return

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Title
          new Paragraph({
            text: 'GENIE DigiGreen Youth Project',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: `Monthly Status Report - ${reportData.month} ${reportData.year}`,
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: '' }),

          // Executive Summary
          new Paragraph({
            text: 'Executive Summary',
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Project Timeline: ', bold: true }),
              new TextRun(`${reportData.projectProgress.elapsed} of ${reportData.projectProgress.total} months elapsed (${reportData.projectProgress.percentage}%)`),
            ],
          }),
          new Paragraph({ text: '' }),

          // Outcome Indicators
          new Paragraph({
            text: 'Outcome Indicators',
            heading: HeadingLevel.HEADING_2,
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: 'Outcome', style: 'Strong' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'Target', style: 'Strong' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'Actual', style: 'Strong' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'Status', style: 'Strong' })] }),
                ],
              }),
              ...reportData.outcomes.map(o => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph(o.name)] }),
                  new TableCell({ children: [new Paragraph(o.target.toLocaleString())] }),
                  new TableCell({ children: [new Paragraph(o.actual.toLocaleString())] }),
                  new TableCell({ children: [new Paragraph(o.status)] }),
                ],
              })),
            ],
          }),
          new Paragraph({ text: '' }),

          // Output Progress
          new Paragraph({
            text: 'Output Progress',
            heading: HeadingLevel.HEADING_2,
          }),
          ...reportData.outputs.map(o => new Paragraph({
            children: [
              new TextRun({ text: `Output ${o.id}: `, bold: true }),
              new TextRun(`${o.name} - ${o.progress}% (${o.status})`),
            ],
          })),
          new Paragraph({ text: '' }),

          // Key Narratives
          new Paragraph({
            text: 'Key Narratives',
            heading: HeadingLevel.HEADING_2,
          }),
          ...reportData.narratives.map(n => new Paragraph({
            children: [
              new TextRun({ text: `[${n.id}] ${n.status}: `, bold: true }),
              new TextRun(n.narrative),
            ],
            spacing: { after: 200 },
          })),
          new Paragraph({ text: '' }),

          // Activity Highlights
          new Paragraph({
            text: 'Activity Highlights',
            heading: HeadingLevel.HEADING_2,
          }),
          ...reportData.activities.map(a => new Paragraph({
            children: [
              new TextRun({ text: `${a.id} - ${a.name}: `, bold: true }),
              new TextRun(`${a.status} (${a.progress}%) - ${a.notes}`),
            ],
            spacing: { after: 100 },
          })),
        ],
      }],
    })

    const blob = await Packer.toBlob(doc)
    saveAs(blob, `DigiGreen_Status_Report_${reportData.month}_${reportData.year}.docx`)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Generate Monthly Status Report</h2>
        <p className={styles.subtitle}>
          Create a report based on current dashboard data
        </p>
      </div>

      <div className={styles.controls}>
        <div className={styles.selectGroup}>
          <label className={styles.label}>Report Month:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className={styles.select}
          >
            {MONTHS.map((month, idx) => (
              <option key={month} value={idx}>{month}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className={styles.select}
          >
            {[2024, 2025, 2026, 2027].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <button
          onClick={generateReport}
          disabled={loading}
          className={styles.generateBtn}
        >
          {loading ? 'Generating...' : 'Generate Preview'}
        </button>
      </div>

      {showPreview && reportData && (
        <div className={styles.preview}>
          <div className={styles.previewHeader}>
            <h3>GENIE DigiGreen Youth Project</h3>
            <p>Monthly Status Report - {reportData.month} {reportData.year}</p>
          </div>

          <div className={styles.section}>
            <h4>Executive Summary</h4>
            <div className={styles.progressBar}>
              <div className={styles.progressLabel}>
                Project Timeline: {reportData.projectProgress.elapsed}/{reportData.projectProgress.total} months ({reportData.projectProgress.percentage}%)
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${reportData.projectProgress.percentage}%` }}
                />
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h4>Outcome Indicators</h4>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Outcome</th>
                  <th>Target</th>
                  <th>Actual</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reportData.outcomes.map(o => (
                  <tr key={o.id}>
                    <td>{o.name}</td>
                    <td>{o.target.toLocaleString()}</td>
                    <td>{o.actual.toLocaleString()}</td>
                    <td><span className={`${styles.status} ${getStatusColor(o.status)}`}>{o.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.section}>
            <h4>Output Progress</h4>
            <div className={styles.outputGrid}>
              {reportData.outputs.map(o => (
                <div key={o.id} className={styles.outputCard}>
                  <div className={styles.outputHeader}>
                    <span className={styles.outputId}>Output {o.id}</span>
                    <span className={`${styles.status} ${getStatusColor(o.status)}`}>{o.status}</span>
                  </div>
                  <div className={styles.outputName}>{o.name}</div>
                  <div className={styles.outputProgress}>
                    <div className={styles.progressTrack}>
                      <div
                        className={styles.progressFill}
                        style={{ width: `${o.progress}%` }}
                      />
                    </div>
                    <span>{o.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <h4>Key Narratives</h4>
            <div className={styles.narrativeList}>
              {reportData.narratives.map(n => (
                <div key={n.id} className={styles.narrativeItem}>
                  <div className={styles.narrativeHeader}>
                    <span className={styles.narrativeId}>[{n.id}]</span>
                    <span className={`${styles.status} ${getStatusColor(n.status)}`}>{n.status}</span>
                  </div>
                  <p className={styles.narrativeText}>{n.narrative}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <h4>Activity Highlights</h4>
            <div className={styles.activityList}>
              {reportData.activities.map(a => (
                <div key={a.id} className={styles.activityItem}>
                  <div className={styles.activityHeader}>
                    <span className={styles.activityId}>{a.id}</span>
                    <span className={styles.activityName}>{a.name}</span>
                    <span className={`${styles.status} ${getStatusColor(a.status)}`}>{a.status}</span>
                  </div>
                  <div className={styles.activityDetails}>
                    <span>Progress: {a.progress}%</span>
                    {a.notes && <span className={styles.activityNotes}>{a.notes}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.downloadSection}>
            <button onClick={downloadWord} className={styles.downloadBtn}>
              Download Word Document
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
