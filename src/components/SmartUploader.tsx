import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './SmartUploader.module.css'
import { ReportGenerator } from './ReportGenerator'

// --- Types ---
interface IndicatorUpdate {
  id: string
  value: number
  narrative: string
}

interface ActivityUpdate {
  id: string
  status: string
  progress: number
  notes: string
}

interface BudgetUpdate {
  activity_id: string
  amount: number
  year: number
  category: string
  description: string
}

interface PreviewData {
  date: string
  source: string
  indicator_updates: IndicatorUpdate[]
  activity_updates: ActivityUpdate[]
  budget_updates: BudgetUpdate[]
}

interface CommitReport {
  indicators: { id: string; value: number; label: string }[]
  activities: { id: string; status: string; progress: number }[]
  budgets: { activity_id: string; amount: number; description: string }[]
  filesModified: string[]
  correctionsLearned: number
}

export function SmartUploader() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)

  // We keep TWO copies of the data:
  // 1. preview: The version you are editing on screen
  // 2. originalData: The version the AI originally gave us (to detect changes)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [originalData, setOriginalData] = useState<PreviewData | null>(null)

  const [loading, setLoading] = useState(false)
  const [emptyExtraction, setEmptyExtraction] = useState(false)
  const [commitReport, setCommitReport] = useState<CommitReport | null>(null)

  // 1. Analyze Report
  const handleAnalyze = async () => {
    if (!file) return
    setLoading(true)
    setEmptyExtraction(false)
    setCommitReport(null)
    setPreview(null)
    setOriginalData(null)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("http://127.0.0.1:8000/analyze-report", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) throw new Error("Analysis failed")

      const data: PreviewData = await res.json()

      // Ensure arrays exist
      if (!data.budget_updates) data.budget_updates = []

      // Check if extraction found anything
      const hasIndicators = data.indicator_updates && data.indicator_updates.length > 0
      const hasActivities = data.activity_updates && data.activity_updates.length > 0
      const hasBudgets = data.budget_updates && data.budget_updates.length > 0

      if (!hasIndicators && !hasActivities && !hasBudgets) {
        setEmptyExtraction(true)
        return
      }

      // Save to both states
      setPreview(data)
      setOriginalData(JSON.parse(JSON.stringify(data))) // Deep copy for comparison
    } catch (err: any) {
      alert("Error reading file: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  // 2. The Smart Save Process
  const handleCommit = async () => {
    if (!preview || !originalData) return

    try {
      setLoading(true)
      let correctionsCount = 0

      // STEP A: Check for corrections (Self-Learning)
      // We loop through indicators to see if you changed anything
      const learningPromises = preview.indicator_updates.map(async (curr, idx) => {
        const orig = originalData.indicator_updates[idx]

        // If value changed, tell the AI to learn
        if (curr.value !== orig.value) {
          correctionsCount++
          console.log(`Sending correction for ${curr.id}: ${orig.value} -> ${curr.value}`)

          await fetch("http://127.0.0.1:8000/learn-mistake", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              original_text: `Report: ${preview.source}, Indicator ID: ${curr.id}`,
              ai_prediction: orig.value,
              user_correction: curr.value,
              comments: `User corrected value from ${orig.value} to ${curr.value}. narrative: ${curr.narrative}`
            })
          })
        }
      })

      // Wait for learning to finish (but don't block if it fails)
      await Promise.allSettled(learningPromises)

      // STEP B: Commit the actual data
      const res = await fetch("http://127.0.0.1:8000/commit-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preview),
      })

      if (!res.ok) throw new Error("Save failed")

      // STEP C: Build the commit report for user feedback
      const filesModified: string[] = []
      if (preview.indicator_updates.length > 0) {
        filesModified.push("performance_actuals.json", "narratives.json")
      }
      if (preview.activity_updates.length > 0) {
        filesModified.push("activities.json")
      }
      if (preview.budget_updates && preview.budget_updates.length > 0) {
        filesModified.push("budget_spent.json")
      }

      const report: CommitReport = {
        indicators: preview.indicator_updates.map(ind => ({
          id: ind.id,
          value: ind.value,
          label: ind.narrative.substring(0, 50) + (ind.narrative.length > 50 ? "..." : "")
        })),
        activities: preview.activity_updates.map(act => ({
          id: act.id,
          status: act.status,
          progress: act.progress
        })),
        budgets: (preview.budget_updates || []).map(bud => ({
          activity_id: bud.activity_id,
          amount: bud.amount,
          description: bud.description
        })),
        filesModified,
        correctionsLearned: correctionsCount
      }

      setCommitReport(report)
      setPreview(null)
      setOriginalData(null)
      setFile(null)

    } catch (err: any) {
      alert("Error saving data: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Helper: Update State
  const updateItem = (
    listName: 'indicator_updates' | 'activity_updates' | 'budget_updates',
    index: number,
    field: string,
    value: any
  ) => {
    if (!preview) return
    const newList = [...(preview[listName] || [])] as any[]
    newList[index] = { ...newList[index], [field]: value }
    setPreview({ ...preview, [listName]: newList } as PreviewData)
  }

  // Helper: Remove budget item
  const removeBudgetItem = (index: number) => {
    if (!preview) return
    const newList = [...(preview.budget_updates || [])]
    newList.splice(index, 1)
    setPreview({ ...preview, budget_updates: newList })
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Smart Report Ingestion</h2>
        <p className={styles.subtitle}>
          Upload Monthly Reports. The AI will learn from any corrections you make.
        </p>
      </div>

      <div className={styles.uploadSection}>
        <div className={styles.uploadControls}>
          <input 
            type="file" 
            accept=".pdf,.docx,.xlsx,.xls, .json"
            onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
            className={styles.fileInput}
          />
          <button 
            onClick={handleAnalyze} 
            disabled={!file || loading}
            className={styles.analyzeButton}
          >
            {loading ? "Analyzing..." : "Analyze Report"}
          </button>
        </div>
      </div>

      {/* Empty Extraction Message */}
      {emptyExtraction && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📄</div>
          <h3>No M&E Data Found</h3>
          <p>
            The AI could not extract any indicator values or activity updates from this document.
          </p>
          <p className={styles.emptyHint}>
            This tool works best with monthly status reports containing specific KPI values
            (e.g., "12 DigiGreen centers operational") or activity progress updates.
          </p>
          <button
            onClick={() => {
              setEmptyExtraction(false)
              setFile(null)
            }}
            className={styles.tryAgainBtn}
          >
            Try Another File
          </button>
        </div>
      )}

      {/* Post-Commit Impact Report */}
      {commitReport && (
        <div className={styles.commitReport}>
          <div className={styles.commitHeader}>
            <span className={styles.commitIcon}>✅</span>
            <h3>Data Successfully Committed</h3>
          </div>

          {commitReport.indicators.length > 0 && (
            <div className={styles.commitSection}>
              <h4>📊 Indicators Updated ({commitReport.indicators.length})</h4>
              <ul>
                {commitReport.indicators.map((ind, idx) => (
                  <li key={idx}>
                    <strong>{ind.id}</strong>: {ind.value} — {ind.label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {commitReport.activities.length > 0 && (
            <div className={styles.commitSection}>
              <h4>🚀 Activities Updated ({commitReport.activities.length})</h4>
              <ul>
                {commitReport.activities.map((act, idx) => (
                  <li key={idx}>
                    <strong>{act.id}</strong>: {act.status} ({act.progress}%)
                  </li>
                ))}
              </ul>
            </div>
          )}

          {commitReport.budgets && commitReport.budgets.length > 0 && (
            <div className={styles.commitSection}>
              <h4>💰 Budget Expenditures Recorded ({commitReport.budgets.length})</h4>
              <ul>
                {commitReport.budgets.map((bud, idx) => (
                  <li key={idx}>
                    <strong>{bud.activity_id}</strong>: ${bud.amount.toLocaleString()} — {bud.description}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className={styles.commitSection}>
            <h4>📁 Files Modified</h4>
            <ul>
              {commitReport.filesModified.map((file, idx) => (
                <li key={idx}>{file}</li>
              ))}
            </ul>
          </div>

          <div className={styles.commitSection}>
            <h4>📈 Dashboard Impact</h4>
            <ul>
              {commitReport.indicators.length > 0 && (
                <li>Dashboard KPI cards will show updated values</li>
              )}
              {commitReport.indicators.length > 0 && (
                <li>Targets & Milestones progress bars updated</li>
              )}
              {commitReport.budgets && commitReport.budgets.length > 0 && (
                <li>Budget Tracking page will reflect new expenditures</li>
              )}
            </ul>
          </div>

          {commitReport.correctionsLearned > 0 && (
            <div className={styles.commitSection}>
              <h4>🧠 AI Learning</h4>
              <p>{commitReport.correctionsLearned} correction(s) saved to the rulebook for future accuracy.</p>
            </div>
          )}

          <div className={styles.commitActions}>
            <button onClick={() => navigate("/")} className={styles.viewDashboardBtn}>
              View Dashboard
            </button>
            <button
              onClick={() => {
                setCommitReport(null)
                setFile(null)
              }}
              className={styles.uploadAnotherBtn}
            >
              Upload Another Report
            </button>
          </div>
        </div>
      )}

      {preview && (
        <div className={styles.previewSection}>
          <div className={styles.metaRow}>
            <div><strong>Source:</strong> {preview.source}</div>
            <div>
              <strong>Date:</strong>
              <input 
                type="date" 
                value={preview.date}
                onChange={(e) => setPreview({...preview, date: e.target.value})}
                style={{ marginLeft: 8 }}
              />
            </div>
          </div>

          {/* Indicators Table */}
          {preview.indicator_updates.length > 0 && (
            <>
              <h3 className={styles.sectionTitle}>📊 Indicator Updates</h3>
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{width: '100px'}}>ID</th>
                      <th style={{width: '120px'}}>Value</th>
                      <th>Narrative</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.indicator_updates.map((item, idx) => {
                      // Visual cue: Highlight rows that changed from original AI guess
                      const isModified = originalData && item.value !== originalData.indicator_updates[idx].value
                      
                      return (
                        <tr key={idx} style={isModified ? { backgroundColor: '#fff3e0' } : {}}>
                          <td><strong>{item.id}</strong></td>
                          <td>
                            <input 
                              type="number" 
                              value={item.value} 
                              onChange={(e) => updateItem('indicator_updates', idx, 'value', Number(e.target.value))}
                              className={styles.input}
                            />
                          </td>
                          <td>
                            <textarea 
                              value={item.narrative} 
                              onChange={(e) => updateItem('indicator_updates', idx, 'narrative', e.target.value)}
                              className={styles.textarea}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Activities Table */}
          {preview.activity_updates.length > 0 && (
            <>
              <h3 className={styles.sectionTitle}>🚀 Activity Updates</h3>
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{width: '100px'}}>ID</th>
                      <th style={{width: '140px'}}>Status</th>
                      <th style={{width: '80px'}}>%</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.activity_updates.map((item, idx) => (
                      <tr key={idx}>
                        <td><strong>{item.id}</strong></td>
                        <td>
                          <select 
                            value={item.status}
                            onChange={(e) => updateItem('activity_updates', idx, 'status', e.target.value)}
                            className={styles.select}
                          >
                            <option>On Track</option>
                            <option>Delayed</option>
                            <option>Completed</option>
                            <option>Critical</option>
                          </select>
                        </td>
                        <td>
                          <input 
                            type="number" 
                            value={item.progress} 
                            onChange={(e) => updateItem('activity_updates', idx, 'progress', Number(e.target.value))}
                            className={styles.input}
                          />
                        </td>
                        <td>
                          <input 
                            type="text" 
                            value={item.notes} 
                            onChange={(e) => updateItem('activity_updates', idx, 'notes', e.target.value)}
                            className={styles.input}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Budget Updates Table */}
          {preview.budget_updates && preview.budget_updates.length > 0 && (
            <>
              <h3 className={styles.sectionTitle}>💰 Budget Updates</h3>
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{width: '100px'}}>Activity</th>
                      <th style={{width: '120px'}}>Amount ($)</th>
                      <th style={{width: '80px'}}>Year</th>
                      <th style={{width: '120px'}}>Category</th>
                      <th>Description</th>
                      <th style={{width: '60px'}}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.budget_updates.map((item, idx) => (
                      <tr key={idx}>
                        <td><strong>{item.activity_id}</strong></td>
                        <td>
                          <input
                            type="number"
                            value={item.amount}
                            onChange={(e) => updateItem('budget_updates', idx, 'amount', Number(e.target.value))}
                            className={styles.input}
                          />
                        </td>
                        <td>
                          <select
                            value={item.year}
                            onChange={(e) => updateItem('budget_updates', idx, 'year', Number(e.target.value))}
                            className={styles.select}
                          >
                            <option value={2024}>2024</option>
                            <option value={2025}>2025</option>
                            <option value={2026}>2026</option>
                            <option value={2027}>2027</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            value={item.category}
                            onChange={(e) => updateItem('budget_updates', idx, 'category', e.target.value)}
                            className={styles.input}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateItem('budget_updates', idx, 'description', e.target.value)}
                            className={styles.input}
                          />
                        </td>
                        <td>
                          <button
                            onClick={() => removeBudgetItem(idx)}
                            className={styles.removeBtn}
                            title="Remove"
                          >
                            X
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Pre-Commit Summary */}
          <div className={styles.preCommitSummary}>
            <h4>Summary of Changes</h4>
            <ul>
              {preview.indicator_updates.length > 0 && (
                <li>📊 {preview.indicator_updates.length} indicator(s) will be updated</li>
              )}
              {preview.activity_updates.length > 0 && (
                <li>🚀 {preview.activity_updates.length} activity/activities will be updated</li>
              )}
              {preview.budget_updates && preview.budget_updates.length > 0 && (
                <li>💰 {preview.budget_updates.length} budget expenditure(s) will be recorded</li>
              )}
              <li>
                📁 Files affected:{" "}
                {[
                  preview.indicator_updates.length > 0 && "performance_actuals.json",
                  preview.indicator_updates.length > 0 && "narratives.json",
                  preview.activity_updates.length > 0 && "activities.json",
                  preview.budget_updates && preview.budget_updates.length > 0 && "budget_spent.json"
                ]
                  .filter(Boolean)
                  .join(", ")}
              </li>
            </ul>
          </div>

          <div className={styles.actions}>
            <button onClick={() => setPreview(null)} className={styles.cancelBtn}>
              Cancel
            </button>
            <button
              onClick={handleCommit}
              className={styles.saveBtn}
              disabled={loading}
            >
              {loading ? "Saving & Learning..." : "Confirm & Save Updates"}
            </button>
          </div>
        </div>
      )}

      <ReportGenerator />
    </div>
  )
}