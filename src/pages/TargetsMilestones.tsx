import { useState, useEffect, useMemo } from 'react';
import {
  Indicator,
  PerformanceActual,
  OutcomeIndicator,
  OutputGroup,
  IndicatorProgress,
  TargetStatus,
} from '../types/target';
import { OutcomeCard } from '../components/OutcomeCard';
import { OutputSection } from '../components/OutputSection';
import styles from './TargetsMilestones.module.css';

// Key outcome indicator IDs and their metadata
const OUTCOME_INDICATORS_CONFIG = [
  {
    id: '1',
    name: 'Youth with ICT Skills',
    icon: '🎓',
    unit: 'count',
  },
  {
    id: '2',
    name: 'Technology Start-ups',
    icon: '🚀',
    unit: 'count',
  },
  {
    id: '2.1',
    name: 'Green Jobs Created',
    icon: '💼',
    unit: 'count',
  },
  {
    id: '3',
    name: 'Mobilized Investment',
    icon: '💰',
    unit: 'USD',
  },
  {
    id: '3.1',
    name: 'Green Publications',
    icon: '📚',
    unit: 'count',
  },
];

// Output groupings by component
const OUTPUT_CONFIG: { id: string; name: string; description: string; component: number }[] = [
  {
    id: 'Output 1.1',
    name: 'DigiGreen Centers Infrastructure',
    description: 'Establish and operationalize 35 DigiGreen centers',
    component: 1,
  },
  {
    id: 'Output 1.2',
    name: 'Basic ICT Skills Training',
    description: 'Basic ICT and green practices for schools and universities',
    component: 1,
  },
  {
    id: 'Output 1.3',
    name: 'Higher-level ICT Training',
    description: 'Advanced ICT and green business training for universities',
    component: 1,
  },
  {
    id: 'Output 2.1',
    name: 'Incubation Program Development',
    description: 'Design and develop Greenpreneur incubation program',
    component: 2,
  },
  {
    id: 'Output 2.2',
    name: 'Incubation Program Implementation',
    description: 'Implement Greenpreneur incubation with mentorship',
    component: 2,
  },
  {
    id: 'Output 3.1',
    name: 'Conducive Environment',
    description: 'Create sustainable environment for Greenpreneur program',
    component: 3,
  },
  {
    id: 'Output 3.2',
    name: 'Government Capacity Building',
    description: 'Enhance Ivorian government capacity in digital green markets',
    component: 3,
  },
];

const COMPONENT_NAMES: Record<number, string> = {
  1: 'Component 1: Digital Skills & Infrastructure',
  2: 'Component 2: Greenpreneur Program',
  3: 'Component 3: Ecosystem Building',
};

const calculateStatus = (actual: number, target: number): TargetStatus => {
  if (target === 0 || actual === 0) return 'Not Started';

  const percentComplete = (actual / target) * 100;
  // Expected progress as of Dec 2025: ~45% of total
  const expectedPercent = 45;

  if (percentComplete >= expectedPercent * 1.1) return 'Ahead';
  if (percentComplete >= expectedPercent * 0.8) return 'On Track';
  return 'Behind';
};

const parseNumber = (value: string | number): number => {
  if (typeof value === 'number') return value;
  // Remove commas, dollar signs, percentages
  const cleaned = value.replace(/[$,%]/g, '').replace(/,/g, '');
  return parseFloat(cleaned) || 0;
};

export function TargetsMilestones() {
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [actuals, setActuals] = useState<PerformanceActual | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [componentFilter, setComponentFilter] = useState<string>('all');

  useEffect(() => {
    Promise.all([
      fetch('/logframe_structured.json').then((res) => res.json()),
      fetch('/performance_actuals.json').then((res) => res.json()),
    ])
      .then(([indicatorsData, actualsData]) => {
        setIndicators(indicatorsData);
        setActuals(actualsData[0]); // Take the first (most recent) entry
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading data:', err);
        setError('Failed to load target data');
        setLoading(false);
      });
  }, []);

  // Build outcome indicators from data
  const outcomeIndicators = useMemo((): OutcomeIndicator[] => {
    if (!indicators.length || !actuals) return [];

    return OUTCOME_INDICATORS_CONFIG.map((config) => {
      const indicator = indicators.find((i) => i.id === config.id);
      if (!indicator) {
        return {
          id: config.id,
          name: config.name,
          icon: config.icon,
          baseline: 0,
          target: 0,
          actual: 0,
          unit: config.unit,
          status: 'Not Started' as TargetStatus,
        };
      }

      const target = parseNumber(indicator.targets.total);
      const actual = actuals.values[config.id] || 0;
      const baseline = parseNumber(indicator.baseline);

      return {
        id: config.id,
        name: config.name,
        icon: config.icon,
        baseline,
        target,
        actual,
        unit: config.unit,
        status: calculateStatus(actual, target),
      };
    });
  }, [indicators, actuals]);

  // Build output groups with their indicators
  const outputGroups = useMemo((): OutputGroup[] => {
    if (!indicators.length || !actuals) return [];

    return OUTPUT_CONFIG.map((config) => {
      // Find all indicators belonging to this output
      const outputIndicators = indicators.filter(
        (i) => i.parent_id === config.id
      );

      const indicatorProgress: IndicatorProgress[] = outputIndicators.map((ind) => {
        const target = parseNumber(ind.targets.total);
        const actual = actuals.values[ind.id] || 0;

        return {
          id: ind.id,
          label: ind.label,
          target,
          actual,
          unit: 'count',
          status: calculateStatus(actual, target),
        };
      });

      return {
        id: config.id,
        name: config.name,
        description: config.description,
        component: config.component,
        indicators: indicatorProgress,
      };
    });
  }, [indicators, actuals]);

  // Filter output groups by component
  const filteredOutputGroups = useMemo(() => {
    if (componentFilter === 'all') return outputGroups;
    const componentNum = parseInt(componentFilter, 10);
    return outputGroups.filter((g) => g.component === componentNum);
  }, [outputGroups, componentFilter]);

  // Group outputs by component for display
  const outputsByComponent = useMemo(() => {
    const grouped: Record<number, OutputGroup[]> = { 1: [], 2: [], 3: [] };
    filteredOutputGroups.forEach((output) => {
      grouped[output.component].push(output);
    });
    return grouped;
  }, [filteredOutputGroups]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <p>Loading targets...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>Targets & Milestones</h1>
          <p className={styles.subtitle}>
            Progress against project targets as of December 2025
          </p>
        </div>

        <div className={styles.filterSection}>
          <label htmlFor="component-filter" className={styles.filterLabel}>
            Filter by Component:
          </label>
          <select
            id="component-filter"
            className={styles.filterSelect}
            value={componentFilter}
            onChange={(e) => setComponentFilter(e.target.value)}
          >
            <option value="all">All Components</option>
            <option value="1">Component 1: Digital Skills</option>
            <option value="2">Component 2: Greenpreneur</option>
            <option value="3">Component 3: Ecosystem</option>
          </select>
        </div>
      </div>

      {/* Outcome Indicators */}
      <section className={styles.outcomeSection}>
        <h2 className={styles.sectionTitle}>
          <span className={styles.sectionIcon}>🎯</span>
          Key Outcome Indicators
        </h2>
        <div className={styles.outcomeGrid}>
          {outcomeIndicators.map((indicator) => (
            <OutcomeCard key={indicator.id} indicator={indicator} />
          ))}
        </div>
      </section>

      {/* Output-Level Progress */}
      <section className={styles.outputsSection}>
        <h2 className={styles.sectionTitle}>
          <span className={styles.sectionIcon}>📊</span>
          Output-Level Progress
        </h2>

        {Object.entries(outputsByComponent).map(([component, outputs]) => {
          if (outputs.length === 0) return null;
          const componentNum = parseInt(component, 10);

          return (
            <div key={component} className={styles.componentGroup}>
              <h3 className={styles.componentTitle}>
                {COMPONENT_NAMES[componentNum]}
              </h3>
              {outputs.map((output) => (
                <OutputSection key={output.id} output={output} />
              ))}
            </div>
          );
        })}
      </section>
    </div>
  );
}
