import { useState, useEffect } from 'react'

interface ActivityBudget {
  id: string
  planned: number
  spent: number
  years: {
    planned: number[]
    spent: number[]
  }
}

interface OutputBudget {
  output_id: string
  activities: ActivityBudget[]
  totalPlanned: number
  totalSpent: number
}

interface BudgetSummary {
  totalBudget: number
  totalSpent: number
  remaining: number
  burnRate: number
  outputs: OutputBudget[]
  loading: boolean
  error: string | null
}

export function useBudgetData(): BudgetSummary {
  const [data, setData] = useState<BudgetSummary>({
    totalBudget: 8250000,
    totalSpent: 0,
    remaining: 8250000,
    burnRate: 0,
    outputs: [],
    loading: true,
    error: null
  })

  useEffect(() => {
    async function loadBudgetData() {
      try {
        const [planRes, spentRes] = await Promise.all([
          fetch('/budget_plan.json'),
          fetch('/budget_spent.json')
        ])

        if (!planRes.ok || !spentRes.ok) {
          throw new Error('Failed to load budget data')
        }

        const plan = await planRes.json()
        const spent = await spentRes.json()

        // Build activity lookup from spent data
        const spentLookup: Record<string, any> = {}
        for (const output of spent.output_expenditure_data || []) {
          for (const act of output.activities || []) {
            spentLookup[act.id] = act
          }
        }

        // Build output budgets
        const outputs: OutputBudget[] = []
        for (const output of plan.outputs || []) {
          const activities: ActivityBudget[] = []
          let outputPlanned = 0
          let outputSpent = 0

          for (const act of output.activities || []) {
            const spentData = spentLookup[act.id] || {}
            const planned = act.total || 0
            const actSpent = spentData.total_spent || 0

            outputPlanned += planned
            outputSpent += actSpent

            activities.push({
              id: act.id,
              planned,
              spent: actSpent,
              years: {
                planned: act.years || [0, 0, 0, 0],
                spent: [
                  spentData.spent_2024 || 0,
                  spentData.spent_2025 || 0,
                  spentData.spent_2026 || 0,
                  spentData.spent_2027 || 0
                ]
              }
            })
          }

          outputs.push({
            output_id: output.output_id,
            activities,
            totalPlanned: outputPlanned,
            totalSpent: outputSpent
          })
        }

        const totalBudget = plan.project_metadata?.total_budget || 8250000
        const totalSpent = spent.expenditure_summary?.cumulative_spent_to_date || 0
        const remaining = totalBudget - totalSpent
        const burnRate = (totalSpent / totalBudget) * 100

        setData({
          totalBudget,
          totalSpent,
          remaining,
          burnRate,
          outputs,
          loading: false,
          error: null
        })
      } catch (err: any) {
        setData(prev => ({
          ...prev,
          loading: false,
          error: err.message
        }))
      }
    }

    loadBudgetData()
  }, [])

  return data
}
