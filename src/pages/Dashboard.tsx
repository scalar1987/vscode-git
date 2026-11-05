import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, GraduationCap, Briefcase, Leaf, DollarSign, MapPin, Target, Clock, Wallet, AlertTriangle, FileText, type LucideIcon } from 'lucide-react';
import { useGENIEData, type KPICard as KPICardData } from '../hooks/useGENIEData';
import { useOutputProgress } from '../hooks/useOutputProgress';
import { TrainingFlowSection } from '../components/dashboard/TrainingFlowSection';
import { useKPIData } from '../hooks/useKPIData';
import { IndicatorCard } from '../components/dashboard/IndicatorCards';
import type { CenterStatus } from '../types/center';
import { loadCenters } from '../lib/centersData';
import {
  HeroSection,
  KPICard,
  KPIGrid,
  ComponentProgress,
  BudgetOverview,
  CentersMapSection,
  TargetsSummarySection,
  ActivitySection,
  BudgetSection,
  RiskSection,
  SmartUploaderSection,
  ReportGeneratorSection
} from '../components/dashboard';

// Center data type (full type for map)
interface Center {
  id: string;
  name: string;
  type: 'University' | 'School' | 'Mairie';
  coordinates: [number, number];
  region: string;
  status: CenterStatus;
  phase: string;
  students: number | string;
  computers: number;
  target_basic_ict: number;
  ongoing_programs: string[];
  linkedActivities: string[];
  note: string;
  greenpreneur?: Record<string, any>;
}

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

// Budget data
const BUDGET = {
  total: 8250000,
  spent: 2836220,
};

// Flag to show only Centers Network section
const SHOW_ONLY_CENTERS = true;

export function Dashboard() {
  const [gpView, setGpView] = useState<'cumulative' | 'yearly'>('cumulative');
  const { kpiData: gpKpi } = useKPIData();
  const { summary, loading: dataLoading } = useGENIEData();
  const { componentProgress, loading: progressLoading } = useOutputProgress();
  const { progress, currentMonth } = calculateProjectProgress();
  const [centers, setCenters] = useState<Center[]>([]);
  const [centersLoading, setCentersLoading] = useState(true);

  // Fetch centers data
  useEffect(() => {
    loadCenters()
      .then((data: Center[]) => {
        setCenters(data);
        setCentersLoading(false);
      })
      .catch(() => {
        setCentersLoading(false);
      });
  }, []);

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
      {!SHOW_ONLY_CENTERS && (
        <>
          {/* Overview Section */}
          <section id="overview">
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
      </section>

      {/* Performance Section */}
      <section id="performance" className="px-4 md:px-6 lg:px-8 pb-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Target className="w-5 h-5 text-gray-500" />
            Performance Overview
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ComponentProgress
              data={componentProgress}
              loading={progressLoading}
            />
            <BudgetOverview
              totalBudget={BUDGET.total}
              spent={BUDGET.spent}
            />
          </div>
        </div>
      </section>
        </>
      )}

      <section id="centers" className="px-4 md:px-6 lg:px-8 pb-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2 tracking-tight">
              <MapPin className="w-5 h-5 text-gray-500" />
              35 GENIE Centers Network
            </h2>
            <Link
              to="/centers"
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors"
            >
              View all centres table
            </Link>
          </div>

          <CentersMapSection centers={centers} loading={centersLoading} />
        </div>
      </section>
      {/* Centers Section */}
      <section id="training" className="px-4 md:px-6 lg:px-8 pt-6 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2 tracking-tight">
              <GraduationCap className="w-5 h-5 text-gray-500" />
              GENIE Capacity Building Program
            </h2>
            <Link
              to="/advanced-programme"
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors"
            >
              Advanced programme progress
            </Link>
          </div>
          <TrainingFlowSection />
        </div>
      </section>

      {/* Greenpreneur Incubation Program */}
      <section id="greenpreneur" className="px-4 md:px-6 lg:px-8 pb-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2 tracking-tight">
              <Briefcase className="w-5 h-5 text-gray-500" />
              GENIE Greenpreneur Incubation Program
            </h2>
            <Link
              to="/greenpreneur-input"
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors"
            >
              Greenpreneur programme progress
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 -mt-4">
            <span className="text-sm text-gray-500">Actuals as of 2026-06-30</span>
            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 text-sm">
              {((['cumulative', 'yearly'] as const)).map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setGpView(v)}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    gpView === v ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {v === 'cumulative' ? 'Cumulative' : 'By year'}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 border-l-4 border-l-dg-green-600 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <IndicatorCard view={gpView}
                id="2.2.2.1"
                label="Greenpreneurs in incubation (2.2.2.1)"
                value={gpKpi?.greenpreneursParticipated.value ?? 0}
                target={gpKpi?.greenpreneursParticipated.target ?? 675}
              />
              <IndicatorCard view={gpView} id="2" label="Technology-based start-ups (2)" value={gpKpi?.startups.value ?? 0} target={gpKpi?.startups.target ?? 135} />
              <IndicatorCard view={gpView}
                id="2.1"
                label="Green jobs created (2.1)"
                value={gpKpi?.greenJobsCreated.value ?? 0}
                target={gpKpi?.greenJobsCreated.target ?? 122}
              />
              <IndicatorCard view={gpView}
                id="3"
                label="Seed capital mobilised (USD)"
                value={(gpKpi?.fundMobilized.value ?? 0) + (gpKpi?.fundMobilized.baseline ?? 0)}
                target={gpKpi?.fundMobilized.target ?? 1000000}
                baseline={gpKpi?.fundMobilized.baseline ?? 0}
                currency
              />
            </div>
          </div>

        </div>
      </section>

      {!SHOW_ONLY_CENTERS && (
        <>
          {/* Targets Section */}
          <section id="targets" className="px-4 md:px-6 lg:px-8 pb-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Target className="w-5 h-5 text-gray-500" />
            Key Targets & Milestones
          </h2>

          <TargetsSummarySection />
        </div>
      </section>

      {/* Activity Section */}
      <section id="activity" className="px-4 md:px-6 lg:px-8 pb-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-500" />
            Activity Tracker
          </h2>
          <ActivitySection />
        </div>
      </section>

      {/* Budget Section */}
      <section id="budget" className="px-4 md:px-6 lg:px-8 pb-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-gray-500" />
            Budget Tracking
          </h2>
          <BudgetSection />
        </div>
      </section>

      {/* Risk Section */}
      <section id="risks" className="px-4 md:px-6 lg:px-8 pb-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            Risk Register
          </h2>
          <RiskSection />
        </div>
      </section>

      {/* Data Tools Section */}
      <section id="tools" className="px-4 md:px-6 lg:px-8 pb-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-500" />
            Data Tools
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SmartUploaderSection />
            <ReportGeneratorSection />
          </div>
        </div>
      </section>
        </>
      )}
    </div>
  );
}
