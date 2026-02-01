import { useState, useMemo } from 'react'
import { AlertTriangle, TrendingUp, TrendingDown, Minus, Search, Filter } from 'lucide-react'
import { useRiskData, RiskWithPlans } from '../hooks/useRiskData'
import { RiskMatrix } from '../components/RiskMatrix'
import { RiskTable } from '../components/RiskTable'
import styles from './RiskRegister.module.css'

export function RiskRegister() {
  const { risks, summary, matrix, loading, error } = useRiskData()

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [ratingFilter, setRatingFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [matrixFilter, setMatrixFilter] = useState<{ likelihood: number; impact: number } | null>(null)

  // Sort state
  const [sortColumn, setSortColumn] = useState<string>('risk_score')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Get unique categories for filter dropdown
  const categories = useMemo(() => {
    const cats = new Set<string>()
    risks.forEach(r => cats.add(r.category))
    return Array.from(cats).sort()
  }, [risks])

  // Filter and sort risks
  const filteredRisks = useMemo(() => {
    let result = [...risks]

    // Apply category filter
    if (categoryFilter) {
      result = result.filter(r => r.category === categoryFilter)
    }

    // Apply rating filter
    if (ratingFilter) {
      result = result.filter(r => r.rating === ratingFilter)
    }

    // Apply status filter
    if (statusFilter) {
      result = result.filter(r => r.status === statusFilter)
    }

    // Apply matrix filter
    if (matrixFilter && matrixFilter.likelihood > 0 && matrixFilter.impact > 0) {
      result = result.filter(r =>
        r.likelihood === matrixFilter.likelihood && r.impact === matrixFilter.impact
      )
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(r =>
        r.title.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        r.risk_id.toLowerCase().includes(query)
      )
    }

    // Apply sorting
    result.sort((a, b) => {
      const aVal = a[sortColumn as keyof RiskWithPlans]
      const bVal = b[sortColumn as keyof RiskWithPlans]

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      }

      const aStr = String(aVal || '')
      const bStr = String(bVal || '')
      return sortDirection === 'asc'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr)
    })

    return result
  }, [risks, categoryFilter, ratingFilter, statusFilter, matrixFilter, searchQuery, sortColumn, sortDirection])

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  const handleMatrixCellClick = (likelihood: number, impact: number) => {
    if (likelihood === 0 && impact === 0) {
      // Clear filter
      setMatrixFilter(null)
    } else if (matrixFilter?.likelihood === likelihood && matrixFilter?.impact === impact) {
      // Toggle off if same cell
      setMatrixFilter(null)
    } else {
      setMatrixFilter({ likelihood, impact })
    }
  }

  const clearAllFilters = () => {
    setCategoryFilter('')
    setRatingFilter('')
    setStatusFilter('')
    setSearchQuery('')
    setMatrixFilter(null)
  }

  const hasActiveFilters = categoryFilter || ratingFilter || statusFilter || searchQuery || matrixFilter

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.spinner} />
        <p>Loading risk data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.errorState}>
        <AlertTriangle size={48} />
        <h3>Error Loading Risks</h3>
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Risk Register</h1>

      {/* Summary Cards */}
      <div className={styles.summaryCards}>
        <div className={styles.summaryCard}>
          <div className={styles.cardValue}>{summary.total}</div>
          <div className={styles.cardLabel}>Total Risks</div>
        </div>
        <div className={`${styles.summaryCard} ${styles.cardExtreme}`}>
          <div className={styles.cardValue}>{summary.byRating.extreme}</div>
          <div className={styles.cardLabel}>Extreme</div>
        </div>
        <div className={`${styles.summaryCard} ${styles.cardHigh}`}>
          <div className={styles.cardValue}>{summary.byRating.high}</div>
          <div className={styles.cardLabel}>High</div>
        </div>
        <div className={`${styles.summaryCard} ${styles.cardMedium}`}>
          <div className={styles.cardValue}>{summary.byRating.medium}</div>
          <div className={styles.cardLabel}>Medium</div>
        </div>
        <div className={`${styles.summaryCard} ${styles.cardLow}`}>
          <div className={styles.cardValue}>{summary.byRating.low}</div>
          <div className={styles.cardLabel}>Low</div>
        </div>
      </div>

      {/* Matrix and Status Section */}
      <div className={styles.analysisSection}>
        <div className={styles.matrixWrapper}>
          <RiskMatrix
            cells={matrix.cells}
            risksAt={matrix.risksAt}
            selectedCell={matrixFilter}
            onCellClick={handleMatrixCellClick}
          />
        </div>

        <div className={styles.statusCharts}>
          {/* Status Breakdown */}
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Status Breakdown</h3>
            <div className={styles.statusBars}>
              <div className={styles.statusBar}>
                <div className={styles.statusLabel}>
                  <span className={`${styles.statusDot} ${styles.dotEscalated}`} />
                  Escalated
                </div>
                <div className={styles.barContainer}>
                  <div
                    className={`${styles.bar} ${styles.barEscalated}`}
                    style={{ width: `${(summary.byStatus.escalated / summary.total) * 100}%` }}
                  />
                </div>
                <span className={styles.statusCount}>{summary.byStatus.escalated}</span>
              </div>
              <div className={styles.statusBar}>
                <div className={styles.statusLabel}>
                  <span className={`${styles.statusDot} ${styles.dotOpen}`} />
                  Open
                </div>
                <div className={styles.barContainer}>
                  <div
                    className={`${styles.bar} ${styles.barOpen}`}
                    style={{ width: `${(summary.byStatus.open / summary.total) * 100}%` }}
                  />
                </div>
                <span className={styles.statusCount}>{summary.byStatus.open}</span>
              </div>
              <div className={styles.statusBar}>
                <div className={styles.statusLabel}>
                  <span className={`${styles.statusDot} ${styles.dotMitigating}`} />
                  Mitigating
                </div>
                <div className={styles.barContainer}>
                  <div
                    className={`${styles.bar} ${styles.barMitigating}`}
                    style={{ width: `${(summary.byStatus.mitigating / summary.total) * 100}%` }}
                  />
                </div>
                <span className={styles.statusCount}>{summary.byStatus.mitigating}</span>
              </div>
            </div>
          </div>

          {/* Trend Direction */}
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Trend Direction</h3>
            <div className={styles.trendItems}>
              <div className={styles.trendItem}>
                <TrendingUp className={styles.trendIconIncreasing} size={20} />
                <span className={styles.trendLabel}>Increasing</span>
                <span className={styles.trendCount}>{summary.byDirection.increasing}</span>
              </div>
              <div className={styles.trendItem}>
                <Minus className={styles.trendIconStable} size={20} />
                <span className={styles.trendLabel}>Stable</span>
                <span className={styles.trendCount}>{summary.byDirection.stable}</span>
              </div>
              <div className={styles.trendItem}>
                <TrendingDown className={styles.trendIconDecreasing} size={20} />
                <span className={styles.trendLabel}>Decreasing</span>
                <span className={styles.trendCount}>{summary.byDirection.decreasing}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.filterIcon}>
          <Filter size={16} />
          <span>Filters</span>
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="">All Ratings</option>
          <option value="Extreme">Extreme</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="">All Statuses</option>
          <option value="Escalated">Escalated</option>
          <option value="Open">Open</option>
          <option value="Mitigating">Mitigating</option>
          <option value="Closed">Closed</option>
        </select>

        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search risks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {hasActiveFilters && (
          <button onClick={clearAllFilters} className={styles.clearBtn}>
            Clear All
          </button>
        )}

        <div className={styles.resultCount}>
          Showing {filteredRisks.length} of {risks.length} risks
        </div>
      </div>

      {/* Risk Table */}
      <RiskTable
        risks={filteredRisks}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={handleSort}
      />
    </div>
  )
}
