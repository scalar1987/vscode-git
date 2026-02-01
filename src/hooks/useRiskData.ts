import { useState, useEffect, useMemo } from 'react'

// Types
export interface Risk {
  risk_id: string
  title: string
  category: string
  description: string
  likelihood: number
  impact: number
  risk_score: number
  rating: 'Extreme' | 'High' | 'Medium' | 'Low'
  direction: 'Increasing' | 'Decreasing' | 'Stable'
  status: 'Escalated' | 'Open' | 'Mitigating' | 'Closed'
}

export interface MitigationAction {
  action_id: string
  description: string
  deadline: string
  status: 'In progress' | 'Planned' | 'Completed'
}

export interface MitigationPlan {
  actions: MitigationAction[]
  residual_likelihood: number
  residual_impact: number
  residual_score: number
  residual_rating: string
}

export interface ContingencyPlan {
  trigger_condition: string
  steps: string[]
  communication_protocol: string
}

export interface RiskWithPlans extends Risk {
  mitigation_plan?: MitigationPlan
  contingency_plan?: ContingencyPlan
  linked_activities?: ActivityRiskMapping[]
}

export interface ActivityRiskMapping {
  indicator: string
  activity: string
  challenge: string
  counterplan: string
  linked_risk_ids: string[]
}

export interface RiskSummary {
  total: number
  byRating: {
    extreme: number
    high: number
    medium: number
    low: number
  }
  byStatus: {
    escalated: number
    open: number
    mitigating: number
    closed: number
  }
  byDirection: {
    increasing: number
    stable: number
    decreasing: number
  }
}

export interface RiskMatrix {
  // 5x5 matrix: [row (likelihood 5->1)][col (impact 1->5)]
  cells: number[][]
  // Risks at each position for tooltip/filtering
  risksAt: Map<string, Risk[]>
}

interface UseRiskDataReturn {
  risks: RiskWithPlans[]
  summary: RiskSummary
  matrix: RiskMatrix
  activityMappings: ActivityRiskMapping[]
  loading: boolean
  error: string | null
}

export function useRiskData(): UseRiskDataReturn {
  const [risks, setRisks] = useState<Risk[]>([])
  const [mitigationPlans, setMitigationPlans] = useState<Map<string, { mitigation_plan: MitigationPlan; contingency_plan: ContingencyPlan }>>(new Map())
  const [activityMappings, setActivityMappings] = useState<ActivityRiskMapping[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadRiskData() {
      try {
        const [riskRes, mitigationRes, mappingRes] = await Promise.all([
          fetch('/risk_register.json'),
          fetch('/risk_mitigation.json'),
          fetch('/activities_risk_mapping.json')
        ])

        if (!riskRes.ok || !mitigationRes.ok || !mappingRes.ok) {
          throw new Error('Failed to load risk data')
        }

        const riskData = await riskRes.json()
        const mitigationData = await mitigationRes.json()
        const mappingData = await mappingRes.json()

        // Set risks
        setRisks(riskData.risks || [])

        // Build mitigation plan lookup
        const planMap = new Map<string, { mitigation_plan: MitigationPlan; contingency_plan: ContingencyPlan }>()
        for (const plan of mitigationData.plans || []) {
          planMap.set(plan.risk_id, {
            mitigation_plan: plan.mitigation_plan,
            contingency_plan: plan.contingency_plan
          })
        }
        setMitigationPlans(planMap)

        // Set activity mappings
        setActivityMappings(mappingData.activity_evidence || [])

        setLoading(false)
      } catch (err: any) {
        setError(err.message)
        setLoading(false)
      }
    }

    loadRiskData()
  }, [])

  // Build activity lookup by risk_id
  const activityByRisk = useMemo(() => {
    const map = new Map<string, ActivityRiskMapping[]>()
    activityMappings.forEach(mapping => {
      mapping.linked_risk_ids.forEach(riskId => {
        if (!map.has(riskId)) map.set(riskId, [])
        map.get(riskId)!.push(mapping)
      })
    })
    return map
  }, [activityMappings])

  // Merge risks with plans and activities
  const risksWithPlans = useMemo((): RiskWithPlans[] => {
    return risks.map(risk => {
      const plans = mitigationPlans.get(risk.risk_id)
      const activities = activityByRisk.get(risk.risk_id)
      return {
        ...risk,
        mitigation_plan: plans?.mitigation_plan,
        contingency_plan: plans?.contingency_plan,
        linked_activities: activities
      }
    })
  }, [risks, mitigationPlans, activityByRisk])

  // Compute summary statistics
  const summary = useMemo((): RiskSummary => {
    const byRating = { extreme: 0, high: 0, medium: 0, low: 0 }
    const byStatus = { escalated: 0, open: 0, mitigating: 0, closed: 0 }
    const byDirection = { increasing: 0, stable: 0, decreasing: 0 }

    risks.forEach(r => {
      // By rating
      switch (r.rating) {
        case 'Extreme': byRating.extreme++; break
        case 'High': byRating.high++; break
        case 'Medium': byRating.medium++; break
        case 'Low': byRating.low++; break
      }
      // By status
      switch (r.status) {
        case 'Escalated': byStatus.escalated++; break
        case 'Open': byStatus.open++; break
        case 'Mitigating': byStatus.mitigating++; break
        case 'Closed': byStatus.closed++; break
      }
      // By direction
      switch (r.direction) {
        case 'Increasing': byDirection.increasing++; break
        case 'Stable': byDirection.stable++; break
        case 'Decreasing': byDirection.decreasing++; break
      }
    })

    return {
      total: risks.length,
      byRating,
      byStatus,
      byDirection
    }
  }, [risks])

  // Build 5x5 risk matrix
  const matrix = useMemo((): RiskMatrix => {
    // Initialize 5x5 matrix with zeros
    const cells: number[][] = Array(5).fill(null).map(() => Array(5).fill(0))
    const risksAt = new Map<string, Risk[]>()

    risks.forEach(r => {
      // Row: 5 - likelihood (so likelihood 5 is row 0, likelihood 1 is row 4)
      // Col: impact - 1 (so impact 1 is col 0, impact 5 is col 4)
      const row = 5 - r.likelihood
      const col = r.impact - 1
      cells[row][col]++

      const key = `${r.likelihood}-${r.impact}`
      if (!risksAt.has(key)) risksAt.set(key, [])
      risksAt.get(key)!.push(r)
    })

    return { cells, risksAt }
  }, [risks])

  return {
    risks: risksWithPlans,
    summary,
    matrix,
    activityMappings,
    loading,
    error
  }
}

// Utility function to get cell color based on score
export function getRiskColor(likelihood: number, impact: number): string {
  const score = likelihood * impact
  if (score >= 15) return '#dc2626' // Extreme - red
  if (score >= 10) return '#f97316' // High - orange
  if (score >= 5) return '#eab308'  // Medium - yellow
  return '#22c55e'                   // Low - green
}

// Utility function to get rating from score
export function getRatingFromScore(score: number): 'Extreme' | 'High' | 'Medium' | 'Low' {
  if (score >= 15) return 'Extreme'
  if (score >= 10) return 'High'
  if (score >= 5) return 'Medium'
  return 'Low'
}
