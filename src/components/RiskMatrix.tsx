import { Risk, getRiskColor } from '../hooks/useRiskData'
import styles from './RiskMatrix.module.css'

interface RiskMatrixProps {
  cells: number[][]
  risksAt: Map<string, Risk[]>
  selectedCell: { likelihood: number; impact: number } | null
  onCellClick: (likelihood: number, impact: number) => void
}

export function RiskMatrix({ cells, risksAt, selectedCell, onCellClick }: RiskMatrixProps) {
  const impactLabels = ['1', '2', '3', '4', '5']
  const likelihoodLabels = ['5', '4', '3', '2', '1']

  return (
    <div className={styles.container}>
      <div className={styles.title}>Risk Matrix</div>
      <div className={styles.matrixWrapper}>
        <div className={styles.yAxisLabel}>Likelihood</div>
        <div className={styles.matrixContent}>
          <div className={styles.matrix}>
            {/* Y-axis labels */}
            <div className={styles.yLabels}>
              {likelihoodLabels.map(label => (
                <div key={label} className={styles.yLabel}>{label}</div>
              ))}
            </div>

            {/* Grid */}
            <div className={styles.grid}>
              {cells.map((row, rowIndex) => (
                <div key={rowIndex} className={styles.row}>
                  {row.map((count, colIndex) => {
                    const likelihood = 5 - rowIndex
                    const impact = colIndex + 1
                    const isSelected = selectedCell?.likelihood === likelihood && selectedCell?.impact === impact
                    const key = `${likelihood}-${impact}`
                    const risksInCell = risksAt.get(key) || []
                    const cellColor = getRiskColor(likelihood, impact)

                    return (
                      <div
                        key={colIndex}
                        className={`${styles.cell} ${isSelected ? styles.selected : ''}`}
                        style={{
                          backgroundColor: count > 0 ? cellColor : '#f9fafb',
                          opacity: count > 0 ? 0.3 + (count * 0.2) : 1
                        }}
                        onClick={() => onCellClick(likelihood, impact)}
                        title={risksInCell.length > 0
                          ? risksInCell.map(r => r.title).join('\n')
                          : `L=${likelihood}, I=${impact}`
                        }
                      >
                        {count > 0 && <span className={styles.count}>{count}</span>}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* X-axis labels */}
          <div className={styles.xLabels}>
            <div className={styles.xLabelSpacer} />
            {impactLabels.map(label => (
              <div key={label} className={styles.xLabel}>{label}</div>
            ))}
          </div>
          <div className={styles.xAxisLabel}>Impact</div>
        </div>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <div className={styles.legendColor} style={{ backgroundColor: '#dc2626' }} />
          <span>Extreme (15-25)</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendColor} style={{ backgroundColor: '#f97316' }} />
          <span>High (10-14)</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendColor} style={{ backgroundColor: '#eab308' }} />
          <span>Medium (5-9)</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendColor} style={{ backgroundColor: '#22c55e' }} />
          <span>Low (1-4)</span>
        </div>
      </div>

      {selectedCell && (
        <button
          className={styles.clearFilter}
          onClick={() => onCellClick(0, 0)}
        >
          Clear Filter
        </button>
      )}
    </div>
  )
}
