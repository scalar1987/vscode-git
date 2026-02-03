import { useState, useEffect, useMemo } from 'react';
import { Indicator, PerformanceActual, TargetStatus } from '../types/target';

interface OutputProgress {
  id: string;
  name: string;
  progress: number; // 0-100, capped
  status: TargetStatus;
}

interface ComponentProgress {
  label: string;
  percentage: number;
  color: string;
  outputs: string[]; // Output IDs included
}

interface UseOutputProgressResult {
  outputProgress: Record<string, OutputProgress>;
  componentProgress: ComponentProgress[];
  loading: boolean;
  error: string | null;
}

// Output configuration
const OUTPUT_CONFIG: { id: string; parentId: string; name: string }[] = [
  { id: '1.1', parentId: 'Output 1.1', name: 'DigiGreen Centers Infrastructure' },
  { id: '1.2', parentId: 'Output 1.2', name: 'Basic ICT Skills Training' },
  { id: '1.3', parentId: 'Output 1.3', name: 'Higher-level ICT Training' },
  { id: '2.1', parentId: 'Output 2.1', name: 'Incubation Program Development' },
  { id: '2.2', parentId: 'Output 2.2', name: 'Incubation Program Implementation' },
  { id: '3.1', parentId: 'Output 3.1', name: 'Conducive Environment' },
  { id: '3.2', parentId: 'Output 3.2', name: 'Government Capacity Building' },
];

// Component to Output mapping
const COMPONENT_MAPPING = [
  {
    label: 'Digital Infrastructure',
    outputs: ['1.1'], // Only Output 1.1
  },
  {
    label: 'Digital and Green Skills Training',
    outputs: ['1.2', '1.3'], // Output 1.2 + 1.3
  },
  {
    label: 'Green Entrepreneurship',
    outputs: ['2.1', '2.2'], // Output 2.1 + 2.2
  },
  {
    label: 'Ecosystem Building',
    outputs: ['3.1', '3.2'], // Output 3.1 + 3.2
  },
];

const parseNumber = (value: string | number): number => {
  if (typeof value === 'number') return value;
  const cleaned = value.replace(/[$,%]/g, '').replace(/,/g, '');
  return parseFloat(cleaned) || 0;
};

const getStatusColor = (percentage: number): string => {
  if (percentage >= 80) return '#10B981'; // Green - On Track/Ahead
  if (percentage >= 50) return '#3B82F6'; // Blue - Moderate
  if (percentage >= 30) return '#F59E0B'; // Orange - Behind
  return '#EF4444'; // Red - Critical
};

const getStatus = (percentage: number): TargetStatus => {
  if (percentage >= 80) return 'Ahead';
  if (percentage >= 50) return 'On Track';
  if (percentage > 0) return 'Behind';
  return 'Not Started';
};

export function useOutputProgress(): UseOutputProgressResult {
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [actuals, setActuals] = useState<PerformanceActual | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/logframe_structured.json').then((res) => res.json()),
      fetch('/performance_actuals.json').then((res) => res.json()),
    ])
      .then(([indicatorsData, actualsData]) => {
        setIndicators(indicatorsData);
        setActuals(actualsData[0]);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load progress data');
        setLoading(false);
      });
  }, []);

  // Calculate progress for each output
  const outputProgress = useMemo((): Record<string, OutputProgress> => {
    if (!indicators.length || !actuals) return {};

    const result: Record<string, OutputProgress> = {};

    OUTPUT_CONFIG.forEach((config) => {
      // Find all indicators belonging to this output
      const outputIndicators = indicators.filter(
        (ind) => ind.parent_id === config.parentId
      );

      if (outputIndicators.length === 0) {
        result[config.id] = {
          id: config.id,
          name: config.name,
          progress: 0,
          status: 'Not Started',
        };
        return;
      }

      // Filter to only indicators with valid targets
      const validIndicators = outputIndicators.filter((ind) => {
        const target = parseNumber(ind.targets.total);
        return target > 0;
      });

      if (validIndicators.length === 0) {
        result[config.id] = {
          id: config.id,
          name: config.name,
          progress: 0,
          status: 'Not Started',
        };
        return;
      }

      // Calculate progress: cap each indicator at 100%, then average
      const totalProgress = validIndicators.reduce((sum, ind) => {
        const target = parseNumber(ind.targets.total);
        const actual = actuals.values[ind.id] || 0;
        const indicatorProgress = (actual / target) * 100;
        return sum + Math.min(100, indicatorProgress); // Cap at 100%
      }, 0);

      const avgProgress = totalProgress / validIndicators.length;

      result[config.id] = {
        id: config.id,
        name: config.name,
        progress: Math.round(avgProgress),
        status: getStatus(avgProgress),
      };
    });

    return result;
  }, [indicators, actuals]);

  // Calculate component-level progress by averaging outputs
  const componentProgress = useMemo((): ComponentProgress[] => {
    if (Object.keys(outputProgress).length === 0) {
      // Return default values while loading
      return COMPONENT_MAPPING.map((comp) => ({
        label: comp.label,
        percentage: 0,
        color: '#9CA3AF',
        outputs: comp.outputs,
      }));
    }

    return COMPONENT_MAPPING.map((comp) => {
      const outputPercentages = comp.outputs
        .map((outputId) => outputProgress[outputId]?.progress || 0);

      const avgPercentage =
        outputPercentages.reduce((a, b) => a + b, 0) / outputPercentages.length;

      const roundedPercentage = Math.round(avgPercentage);

      return {
        label: comp.label,
        percentage: roundedPercentage,
        color: getStatusColor(roundedPercentage),
        outputs: comp.outputs,
      };
    });
  }, [outputProgress]);

  return {
    outputProgress,
    componentProgress,
    loading,
    error,
  };
}
