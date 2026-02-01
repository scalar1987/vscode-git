import { useState, useEffect } from 'react';

interface KPIData {
  centersOperational: { value: number; target: number };
  youthWithSkills: { value: number; target: number };
  greenpreneursIncubated: { value: number; target: number };
  greenJobsCreated: { value: number; target: number };
  fundMobilized: { value: number; target: number; baseline: number };
}

export const useKPIData = () => {
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [performanceActuals, centers] = await Promise.all([
          fetch('/performance_actuals.json').then(r => r.json()),
          fetch('/centers.json').then(r => r.json())
        ]);

        const composites = performanceActuals[0].computed_composites;

        // Count operational centers from centers.json for real-time accuracy
        const operationalCenters = centers.filter(
          (c: { status: string }) => c.status === 'Operational'
        ).length;

        setKpiData({
          centersOperational: {
            value: operationalCenters,
            target: composites.centers_operational.target
          },
          youthWithSkills: {
            value: composites.outcome_1_beneficiaries.value,
            target: composites.outcome_1_beneficiaries.target
          },
          greenpreneursIncubated: {
            value: composites.greenpreneurs_trained.value,
            target: composites.greenpreneurs_trained.target
          },
          greenJobsCreated: {
            value: composites.outcome_2_green_jobs.value,
            target: Math.round(composites.outcome_2_green_jobs.target)
          },
          fundMobilized: {
            value: composites.outcome_3_funding.value,
            target: composites.outcome_3_funding.target,
            baseline: composites.outcome_3_funding.baseline
          }
        });
        setLoading(false);
      } catch (err) {
        console.error('Error fetching KPI data:', err);
        setError(err as Error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { kpiData, loading, error };
};

export default useKPIData;
