import { useState, useEffect } from 'react';

/**
 * Custom hook to fetch and merge GENIE M&E Dashboard data
 * Combines: logframe (targets), actuals (values), narratives (status/story)
 */
export const useGENIEData = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [logframe, actuals, narratives] = await Promise.all([
          fetch('/logframe_structured.json').then(r => r.json()),
          fetch('/performance_actuals.json').then(r => r.json()),
          fetch('/narratives.json').then(r => r.json())
        ]);

        // Extract values from the data arrays
        const actualValues = actuals[0].values;
        const stories = narratives[0].stories;

        // Build 4 KPI cards from key indicators (ordered as requested)
        const cards = [
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
        setError(err);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { summary, loading, error };
};

export default useGENIEData;
