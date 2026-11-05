import { useState, useEffect } from 'react';
import { loadCenters } from '../lib/centersData';

interface KPIData {
  centersOperational: { value: number; target: number };
  youthWithSkills: { value: number; target: number };
  greenpreneursParticipated: { value: number; target: number };
  startups: { value: number; target: number };
  greenJobsCreated: { value: number; target: number };
  fundMobilized: { value: number; target: number; baseline: number };
  trainersCertified: { value: number; target: number };
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
          loadCenters()
        ]);

        // Use the latest reporting period (last entry in performance_actuals.json)
        const composites = performanceActuals[performanceActuals.length - 1].computed_composites;

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
          greenpreneursParticipated: {
            value: composites.greenpreneurs_participated.value,
            target: composites.greenpreneurs_participated.target
          },
          startups: {
            value: composites.outcome_2_startups.value,
            target: composites.outcome_2_startups.target
          },
          greenJobsCreated: {
            value: composites.outcome_2_green_jobs.value,
            target: Math.round(composites.outcome_2_green_jobs.target)
          },
          fundMobilized: {
            value: composites.outcome_3_funding.value,
            target: composites.outcome_3_funding.target,
            baseline: composites.outcome_3_funding.baseline
          },
          trainersCertified: {
            value: composites.trainers_certified.value,
            target: composites.trainers_certified.target
          }
        });
        setLoading(false);
      } catch (err) {
        setError(err as Error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { kpiData, loading, error };
};

export default useKPIData;
