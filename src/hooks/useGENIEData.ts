import { useState, useEffect } from 'react';

export interface KPICard {
  icon: string;
  title: string;
  value: number;
  target: number;
  unit: string;
  status: string;
}

export interface GENIESummary {
  last_updated: string;
  overall_narrative: string;
  cards: KPICard[];
}

interface UseGENIEDataResult {
  summary: GENIESummary | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Custom hook to fetch and merge GENIE M&E Dashboard data
 * Combines: logframe (targets), actuals (values), narratives (status/story)
 */
export const useGENIEData = (): UseGENIEDataResult => {
  const [summary, setSummary] = useState<GENIESummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [, actuals, narratives] = await Promise.all([
          fetch('/logframe_structured.json').then(r => r.json()),
          fetch('/performance_actuals.json').then(r => r.json()),
          fetch('/narratives.json').then(r => r.json())
        ]);

        // Extract values from the data arrays
        const actualValues = actuals[0].values as Record<string, number>;
        const stories = narratives[0].stories as Record<string, { narrative?: string }>;

        // Build 4 KPI cards from key indicators (ordered as requested)
        const cards: KPICard[] = [
          {
            icon: '🏢',
            title: 'DigiGreen Centers Operational',
            value: actualValues['1.1.4'] || 0,
            target: 35,
            unit: 'centers',
            status: 'Delayed'
          },
          {
            icon: '🎓',
            title: 'Students Trained',
            value: actualValues['1.2.6.2'] || 0,
            target: 26100,
            unit: 'students',
            status: 'Off Track'
          },
          {
            icon: '💼',
            title: 'Greenpreneurs Incubated',
            value: actualValues['2.2.2.1'] || 0,
            target: 675,
            unit: 'entrepreneurs',
            status: 'Delayed'
          },
          {
            icon: '🌱',
            title: 'Green Jobs Created',
            value: actualValues['2.1'] || 0,
            target: 122,
            unit: 'jobs',
            status: 'Delayed'
          }
        ];

        setSummary({
          last_updated: actuals[0].date,
          overall_narrative: stories.OVERALL?.narrative || 'No summary available.',
          cards
        });
        setLoading(false);
      } catch (err) {
        console.error('Error fetching GENIE data:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { summary, loading, error };
};

export default useGENIEData;
