import { useState } from 'react'
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle, Clock, Target } from 'lucide-react'
import { RiskWithPlans } from '../hooks/useRiskData'
import styles from './RiskTable.module.css'

interface RiskTableProps {
  risks: RiskWithPlans[]
  sortColumn: string
  sortDirection: 'asc' | 'desc'
  onSort: (column: string) => void
}

export function RiskTable({ risks, sortColumn, sortDirection, onSort }: RiskTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleRow = (riskId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(riskId)) {
      newExpanded.delete(riskId)
    } else {
      newExpanded.add(riskId)
    }
    setExpandedRows(newExpanded)
  }

  const getSortIndicator = (column: string) => {
    if (sortColumn !== column) return null
    return sortDirection === 'asc' ? ' ↑' : ' ↓'
  }

  const getDirectionArrow = (direction: string) => {
    switch (direction) {
      case 'Increasing': return <span className={styles.directionIncreasing}>↗</span>
      case 'Decreasing': return <span className={styles.directionDecreasing}>↘</span>
      default: return <span className={styles.directionStable}>→</span>
    }
  }

  const getRatingClass = (rating: string) => {
    switch (rating) {
      case 'Extreme': return styles.ratingExtreme
      case 'High': return styles.ratingHigh
      case 'Medium': return styles.ratingMedium
      default: return styles.ratingLow
    }
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Escalated': return styles.statusEscalated
      case 'Open': return styles.statusOpen
      case 'Mitigating': return styles.statusMitigating
      default: return styles.statusClosed
    }
  }

  const getActionStatusClass = (status: string) => {
    switch (status) {
      case 'In progress': return styles.actionInProgress
      case 'Completed': return styles.actionCompleted
      default: return styles.actionPlanned
    }
  }

  if (risks.length === 0) {
    return (
      <div className={styles.emptyState}>
        <AlertTriangle size={48} className={styles.emptyIcon} />
        <p>No risks match the current filters</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.expandCol}></th>
            <th onClick={() => onSort('risk_id')} className={styles.sortable}>
              ID{getSortIndicator('risk_id')}
            </th>
            <th onClick={() => onSort('title')} className={styles.sortable}>
              Title{getSortIndicator('title')}
            </th>
            <th onClick={() => onSort('category')} className={styles.sortable}>
              Category{getSortIndicator('category')}
            </th>
            <th onClick={() => onSort('likelihood')} className={styles.sortable}>
              L{getSortIndicator('likelihood')}
            </th>
            <th onClick={() => onSort('impact')} className={styles.sortable}>
              I{getSortIndicator('impact')}
            </th>
            <th onClick={() => onSort('risk_score')} className={styles.sortable}>
              Score{getSortIndicator('risk_score')}
            </th>
            <th onClick={() => onSort('rating')} className={styles.sortable}>
              Rating{getSortIndicator('rating')}
            </th>
            <th onClick={() => onSort('status')} className={styles.sortable}>
              Status{getSortIndicator('status')}
            </th>
            <th onClick={() => onSort('direction')} className={styles.sortable}>
              Trend{getSortIndicator('direction')}
            </th>
          </tr>
        </thead>
        <tbody>
          {risks.map(risk => {
            const isExpanded = expandedRows.has(risk.risk_id)
            return (
              <>
                <tr
                  key={risk.risk_id}
                  className={`${styles.dataRow} ${isExpanded ? styles.expanded : ''}`}
                  onClick={() => toggleRow(risk.risk_id)}
                >
                  <td className={styles.expandCol}>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </td>
                  <td className={styles.idCell}>{risk.risk_id}</td>
                  <td className={styles.titleCell}>{risk.title}</td>
                  <td className={styles.categoryCell}>{risk.category}</td>
                  <td className={styles.numCell}>{risk.likelihood}</td>
                  <td className={styles.numCell}>{risk.impact}</td>
                  <td className={styles.numCell}>{risk.risk_score}</td>
                  <td>
                    <span className={`${styles.ratingBadge} ${getRatingClass(risk.rating)}`}>
                      {risk.rating}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${getStatusClass(risk.status)}`}>
                      {risk.status}
                    </span>
                  </td>
                  <td className={styles.trendCell}>{getDirectionArrow(risk.direction)}</td>
                </tr>
                {isExpanded && (
                  <tr key={`${risk.risk_id}-details`} className={styles.detailsRow}>
                    <td colSpan={10}>
                      <div className={styles.detailsContent}>
                        {/* Description */}
                        <div className={styles.section}>
                          <h4 className={styles.sectionTitle}>Description</h4>
                          <p className={styles.description}>{risk.description}</p>
                        </div>

                        {/* Mitigation Plan */}
                        {risk.mitigation_plan && (
                          <div className={styles.section}>
                            <h4 className={styles.sectionTitle}>
                              <Target size={16} />
                              Mitigation Plan
                            </h4>
                            <div className={styles.actionsGrid}>
                              {risk.mitigation_plan.actions.map(action => (
                                <div key={action.action_id} className={styles.actionCard}>
                                  <div className={styles.actionHeader}>
                                    <span className={styles.actionId}>{action.action_id}</span>
                                    <span className={`${styles.actionStatus} ${getActionStatusClass(action.status)}`}>
                                      {action.status}
                                    </span>
                                  </div>
                                  <p className={styles.actionDesc}>{action.description}</p>
                                  <div className={styles.actionDeadline}>
                                    <Clock size={12} />
                                    <span>Due: {action.deadline}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className={styles.residualRisk}>
                              <span>Residual Risk: </span>
                              <span className={`${styles.ratingBadge} ${getRatingClass(risk.mitigation_plan.residual_rating)}`}>
                                L={risk.mitigation_plan.residual_likelihood}, I={risk.mitigation_plan.residual_impact},
                                Score={risk.mitigation_plan.residual_score} ({risk.mitigation_plan.residual_rating})
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Contingency Plan */}
                        {risk.contingency_plan && (
                          <div className={styles.section}>
                            <h4 className={styles.sectionTitle}>
                              <AlertTriangle size={16} />
                              Contingency Plan
                            </h4>
                            <div className={styles.contingencyContent}>
                              <div className={styles.contingencyItem}>
                                <strong>Trigger:</strong> {risk.contingency_plan.trigger_condition}
                              </div>
                              <div className={styles.contingencyItem}>
                                <strong>Steps:</strong>
                                <ul className={styles.stepsList}>
                                  {risk.contingency_plan.steps.map((step, idx) => (
                                    <li key={idx}>{step}</li>
                                  ))}
                                </ul>
                              </div>
                              <div className={styles.contingencyItem}>
                                <strong>Communication:</strong> {risk.contingency_plan.communication_protocol}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Linked Activities */}
                        {risk.linked_activities && risk.linked_activities.length > 0 && (
                          <div className={styles.section}>
                            <h4 className={styles.sectionTitle}>
                              <CheckCircle size={16} />
                              Linked Activities ({risk.linked_activities.length})
                            </h4>
                            <div className={styles.activitiesGrid}>
                              {risk.linked_activities.map((activity, idx) => (
                                <div key={idx} className={styles.activityCard}>
                                  <div className={styles.activityIndicator}>{activity.indicator}</div>
                                  <div className={styles.activityName}>{activity.activity}</div>
                                  <div className={styles.activityChallenge}>
                                    <strong>Challenge:</strong> {activity.challenge}
                                  </div>
                                  <div className={styles.activityCounterplan}>
                                    <strong>Counterplan:</strong> {activity.counterplan}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
