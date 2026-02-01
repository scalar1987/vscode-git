import { useState } from 'react'
import { useBudgetData } from '../hooks/useBudgetData'
import styles from './BudgetTracking.module.css'

export function BudgetTracking() {
  const budget = useBudgetData()
  const [expandedOutput, setExpandedOutput] = useState<string | null>(null)

  if (budget.loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading budget data...</div>
      </div>
    )
  }

  if (budget.error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Error loading budget: {budget.error}</div>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getStatusColor = (spent: number, planned: number) => {
    const pct = planned > 0 ? (spent / planned) * 100 : 0
    if (pct > 100) return 'red'
    if (pct > 80) return 'orange'
    return 'green'
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Budget Tracking</h1>
        <p className={styles.subtitle}>KOICA-GGGI Project Financial Overview</p>
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryCards}>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Total Budget</div>
          <div className={styles.cardValue}>{formatCurrency(budget.totalBudget)}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Spent to Date</div>
          <div className={styles.cardValue}>{formatCurrency(budget.totalSpent)}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Remaining</div>
          <div className={styles.cardValue}>{formatCurrency(budget.remaining)}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Burn Rate</div>
          <div className={styles.cardValue}>{budget.burnRate.toFixed(1)}%</div>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className={styles.overallProgress}>
        <div className={styles.progressHeader}>
          <span>Overall Budget Utilization</span>
          <span>{formatCurrency(budget.totalSpent)} / {formatCurrency(budget.totalBudget)}</span>
        </div>
        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{ width: `${Math.min(budget.burnRate, 100)}%` }}
          />
        </div>
      </div>

      {/* Output Breakdown */}
      <div className={styles.outputSection}>
        <h2 className={styles.sectionTitle}>Budget by Output</h2>

        {budget.outputs.map(output => {
          const pct = output.totalPlanned > 0
            ? (output.totalSpent / output.totalPlanned) * 100
            : 0
          const isExpanded = expandedOutput === output.output_id
          const statusColor = getStatusColor(output.totalSpent, output.totalPlanned)

          return (
            <div key={output.output_id} className={styles.outputCard}>
              <div
                className={styles.outputHeader}
                onClick={() => setExpandedOutput(isExpanded ? null : output.output_id)}
              >
                <div className={styles.outputInfo}>
                  <span className={styles.outputId}>Output {output.output_id}</span>
                  <span className={styles.outputBudget}>
                    {formatCurrency(output.totalSpent)} / {formatCurrency(output.totalPlanned)}
                  </span>
                </div>
                <div className={styles.outputProgress}>
                  <div className={styles.miniProgressTrack}>
                    <div
                      className={`${styles.miniProgressFill} ${styles[statusColor]}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <span className={`${styles.outputPct} ${styles[statusColor]}`}>
                    {pct.toFixed(1)}%
                  </span>
                  <span className={styles.expandIcon}>{isExpanded ? '−' : '+'}</span>
                </div>
              </div>

              {isExpanded && (
                <div className={styles.activityList}>
                  <table className={styles.activityTable}>
                    <thead>
                      <tr>
                        <th>Activity</th>
                        <th>Planned</th>
                        <th>Spent</th>
                        <th>Progress</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {output.activities.map(act => {
                        const actPct = act.planned > 0 ? (act.spent / act.planned) * 100 : 0
                        const actStatus = getStatusColor(act.spent, act.planned)
                        return (
                          <tr key={act.id}>
                            <td><strong>{act.id}</strong></td>
                            <td>{formatCurrency(act.planned)}</td>
                            <td>{formatCurrency(act.spent)}</td>
                            <td>
                              <div className={styles.cellProgress}>
                                <div className={styles.cellProgressTrack}>
                                  <div
                                    className={`${styles.cellProgressFill} ${styles[actStatus]}`}
                                    style={{ width: `${Math.min(actPct, 100)}%` }}
                                  />
                                </div>
                                <span>{actPct.toFixed(0)}%</span>
                              </div>
                            </td>
                            <td>
                              <span className={`${styles.statusBadge} ${styles[actStatus]}`}>
                                {actPct > 100 ? 'Over Budget' : actPct > 80 ? 'Near Limit' : 'On Budget'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Alerts Section */}
      <div className={styles.alertsSection}>
        <h2 className={styles.sectionTitle}>Budget Alerts</h2>
        <div className={styles.alertsList}>
          {budget.outputs.flatMap(output =>
            output.activities
              .filter(act => act.spent > act.planned)
              .map(act => (
                <div key={act.id} className={`${styles.alert} ${styles.alertRed}`}>
                  <span className={styles.alertIcon}>!</span>
                  <span>
                    Activity <strong>{act.id}</strong> is over budget:
                    {formatCurrency(act.spent)} spent vs {formatCurrency(act.planned)} planned
                  </span>
                </div>
              ))
          )}
          {budget.outputs.flatMap(output =>
            output.activities
              .filter(act => act.spent > act.planned * 0.8 && act.spent <= act.planned)
              .map(act => (
                <div key={act.id} className={`${styles.alert} ${styles.alertOrange}`}>
                  <span className={styles.alertIcon}>i</span>
                  <span>
                    Activity <strong>{act.id}</strong> approaching budget limit:
                    {((act.spent / act.planned) * 100).toFixed(0)}% utilized
                  </span>
                </div>
              ))
          )}
          {budget.outputs.every(o => o.activities.every(a => a.spent <= a.planned * 0.8)) && (
            <div className={`${styles.alert} ${styles.alertGreen}`}>
              <span className={styles.alertIcon}>✓</span>
              <span>All activities are within budget limits</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
