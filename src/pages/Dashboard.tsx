import { Building2, GraduationCap, Briefcase, Leaf, DollarSign, type LucideIcon } from 'lucide-react';
import { useGENIEData, type KPICard as KPICardData } from '../hooks/useGENIEData';
import { useOutputProgress } from '../hooks/useOutputProgress';
import {
  HeroSection,
  KPICard,
  KPIGrid,
  ComponentProgress,
  BudgetOverview,
  ActivityTimeline
} from '../components/dashboard';

// Project timeline: May 2024 - December 2027 (43 months)
const PROJECT_START = new Date('2024-05-01');
const PROJECT_END = new Date('2027-12-31');
const TOTAL_MONTHS = 43;

function calculateProjectProgress(): { progress: number; currentMonth: number } {
  const now = new Date();
  const totalDuration = PROJECT_END.getTime() - PROJECT_START.getTime();
  const elapsed = now.getTime() - PROJECT_START.getTime();
  const progress = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);

  // Calculate current month (1-indexed)
  const monthsElapsed = Math.floor(elapsed / (1000 * 60 * 60 * 24 * 30.44));
  const currentMonth = Math.min(Math.max(monthsElapsed + 1, 1), TOTAL_MONTHS);

  return { progress: Math.round(progress), currentMonth };
}

// KPI icon mapping
const KPI_ICONS = {
  centers: Building2,
  students: GraduationCap,
  entrepreneurs: Briefcase,
  jobs: Leaf,
  funding: DollarSign,
};

// Recent activities data
const RECENT_ACTIVITIES = [
  { date: 'Dec 15, 2025', activity: 'Impact Lab Green Curriculum Finalized', status: 'Completed' as const },
  { date: 'Dec 10, 2025', activity: 'Bondoukou Center Launch Event', status: 'Completed' as const },
  { date: 'Nov 28, 2025', activity: 'Phase II Renovation Sub-Order Signed', status: 'Completed' as const },
  { date: 'Nov 05, 2025', activity: 'Cohort 1 Greenpreneur Graduation', status: 'Completed' as const },
  { date: 'Jan 20, 2026', activity: 'LPIA Treichville Pilot Data Collection', status: 'Upcoming' as const },
  { date: 'Feb 2026', activity: 'Pitch Competition & Seed Capital Disbursement', status: 'Upcoming' as const },
];

// Budget data
const BUDGET = {
  total: 8250000,
  spent: 2836220,
};

export function Dashboard() {
  const { summary, loading: dataLoading } = useGENIEData();
  const { componentProgress, loading: progressLoading } = useOutputProgress();
  const { progress, currentMonth } = calculateProjectProgress();

  // Map KPI data from useGENIEData to our KPICard format
  const kpiData = (summary?.cards as KPICardData[] | undefined)?.map((card: KPICardData, index: number) => ({
    icon: KPI_ICONS[card.unit as keyof typeof KPI_ICONS] || Building2,
    value: card.value,
    target: card.target,
    label: card.title,
    color: (index === 0 ? 'green' : index === 1 ? 'blue' : index === 2 ? 'amber' : 'green') as 'green' | 'blue' | 'amber' | 'red',
    delay: index * 0.1,
  })) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <HeroSection
        projectProgress={progress}
        currentMonth={currentMonth}
        totalMonths={TOTAL_MONTHS}
        title="Empowering Cote d'Ivoire's Youth"
        subtitle="Through Digital Skills & Green Innovation"
      />

      {/* KPI Cards - Overlapping the hero */}
      <div className="relative z-20 px-4 md:px-6 lg:px-8 -mt-12 md:-mt-16 mb-8">
        <div className="max-w-7xl mx-auto">
          {dataLoading ? (
            <KPIGrid>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white/70 backdrop-blur-md rounded-xl p-6 animate-pulse">
                  <div className="flex justify-between mb-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                    <div className="w-16 h-6 bg-gray-200 rounded-full" />
                  </div>
                  <div className="h-8 bg-gray-200 rounded w-24 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-32 mb-3" />
                  <div className="h-2 bg-gray-200 rounded" />
                </div>
              ))}
            </KPIGrid>
          ) : (
            <KPIGrid>
              {kpiData.map((kpi: { icon: LucideIcon; value: number; target: number; label: string; color: 'green' | 'blue' | 'amber' | 'red'; delay: number }, index: number) => (
                <KPICard
                  key={index}
                  icon={kpi.icon}
                  value={kpi.value}
                  target={kpi.target}
                  label={kpi.label}
                  color={kpi.color}
                  delay={kpi.delay}
                />
              ))}
            </KPIGrid>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="px-4 md:px-6 lg:px-8 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Component Progress */}
            <ComponentProgress
              data={componentProgress}
              loading={progressLoading}
            />

            {/* Budget Overview */}
            <BudgetOverview
              totalBudget={BUDGET.total}
              spent={BUDGET.spent}
            />
          </div>

          {/* Activity Timeline */}
          <ActivityTimeline
            activities={RECENT_ACTIVITIES}
            maxItems={6}
          />
        </div>
      </div>
    </div>
  );
}
