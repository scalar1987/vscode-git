import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { flushSync } from 'react-dom';
import { Building2, GraduationCap, Briefcase, Leaf, DollarSign, MapPin, Target, Clock, Wallet, AlertTriangle, FileText, type LucideIcon } from 'lucide-react';
import { useGENIEData, type KPICard as KPICardData } from '../hooks/useGENIEData';
import { useOutputProgress } from '../hooks/useOutputProgress';
import { TrainingFlowSection, ViewToggle, type FlowRow, type View } from '../components/dashboard/TrainingFlowSection';
import { useKPIData } from '../hooks/useKPIData';
import type { CenterStatus } from '../types/center';
import { loadCenters } from '../lib/centersData';
import { ApprovalsCard } from '../components/dashboard/ApprovalsCard';
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

// One reporting date for every figure on the page
const ACTUALS_AS_OF = '2026-06-30';

export function Dashboard() {
  // ?program=capacity or ?program=greenpreneur opens that tab (used by the programme pages' back link)
  const [searchParams] = useSearchParams();
  const requestedProgram = searchParams.get('program');
  const [program, setProgram] = useState<'centres' | 'capacity' | 'greenpreneur'>(
    requestedProgram === 'capacity' || requestedProgram === 'greenpreneur' ? requestedProgram : 'centres',
  );
  // Shared Cumulative / By year switch for the two programme flows
  const [flowView, setFlowView] = useState<View>('cumulative');
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

  // Switch programme tab with a view transition where the browser supports it
  const switchProgram = (id: 'centres' | 'capacity' | 'greenpreneur') => {
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<unknown> } };
    if (!doc.startViewTransition || reduceMotion) {
      setProgram(id);
      return;
    }
    // If a transition is interrupted by another click, its promise rejects; that is harmless here
    doc.startViewTransition(() => flushSync(() => setProgram(id))).finished.catch(() => {});
  };

  // Hero parallax: the intro moves up and fades as the page scrolls (off for reduced-motion users)
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 400], [0, reduceMotion ? 0 : -80]);
  const heroOpacity = useTransform(scrollY, [0, 320], [1, reduceMotion ? 1 : 0]);

  // Greenpreneur indicators, shown with the same flow layout as Capacity Building
  const gpFlows: FlowRow[] = [
    {
      title: 'Incubation & start-ups',
      color: 'green',
      nodes: [
        { id: 'gp-incubated', label: 'Greenpreneurs in incubation', indicatorId: '2.2.2.1' },
        { id: 'gp-startups', label: 'Technology-based start-ups', indicatorId: '2', passRateOf: '2.2.2.1' },
      ],
    },
    {
      title: 'Jobs & capital',
      color: 'blue',
      nodes: [
        { id: 'gp-capital', label: 'Seed capital mobilised (USD)', indicatorId: '3', baseline: gpKpi?.fundMobilized.baseline ?? 0 },
        { id: 'gp-jobs', label: 'Green jobs created', indicatorId: '2.1' },
      ],
    },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAFAF7' }}>
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

      {/* Overall summary, then one programme at a time */}
      {/* Intro: large title on a soft gradient, fades away as the page scrolls */}
      <section className="relative overflow-hidden bg-gradient-to-br from-dg-green-50 via-white to-dg-blue-50 px-4 md:px-6 lg:px-8 pt-16 pb-20 md:pt-24 md:pb-28">
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="max-w-7xl mx-auto">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-xs uppercase tracking-[0.25em] text-dg-green-700"
          >
            GENIE · Global Green Growth Institute
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="mt-4 text-4xl md:text-6xl font-semibold leading-tight tracking-tight text-gray-900 max-w-4xl"
          >
            Empowering Côte d'Ivoire's Youth
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25 }}
            className="mt-5 text-lg md:text-xl text-gray-600 max-w-2xl"
          >
            Through digital skills and green innovation
          </motion.p>
        </motion.div>
      </section>

      <ApprovalsCard />

      {/* Programme tabs stay at the top of the screen while scrolling */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-200 px-4 md:px-6 lg:px-8 pt-2">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-end justify-between gap-3">
          <div role="tablist" className="flex flex-wrap gap-6 text-sm">
            {([
              ['centres', 'Centres network'],
              ['capacity', 'Capacity Building'],
              ['greenpreneur', 'Greenpreneur Incubation'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={program === id}
                onClick={() => switchProgram(id)}
                className={`-mb-px border-b-2 pb-3 pt-3 font-medium transition-colors ${
                  program === id ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="pb-3 mb-0.5 text-sm text-gray-500 whitespace-nowrap">
            All figures are actuals <span className="font-medium text-gray-700">as of {ACTUALS_AS_OF}</span>
          </p>
          </div>
        </div>
      </div>

      {program === 'centres' && (
      <motion.section
        id="centers"
        className="px-4 md:px-6 lg:px-8 pt-8 pb-8"
        initial={reduceMotion ? false : { opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2 tracking-tight">
              <MapPin className="w-6 h-6 text-gray-500" />
              35 GENIE Centres Network
            </h2>
            <Link
              to="/centers"
              className="px-4 py-2 rounded-lg bg-dg-green-600 hover:bg-dg-green-700 text-white text-sm font-medium transition-colors"
            >
              View all centres table
            </Link>
          </div>

          <CentersMapSection centers={centers} loading={centersLoading} />
        </div>
      </motion.section>
      )}
      {/* Centers Section */}
      {program === 'capacity' && (
      <motion.section
        id="training"
        className="px-4 md:px-6 lg:px-8 pt-8 pb-8"
        initial={reduceMotion ? false : { opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2 tracking-tight">
              <GraduationCap className="w-6 h-6 text-gray-500" />
              GENIE Capacity Building Program
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <ViewToggle value={flowView} onChange={setFlowView} />
              <Link
                to="/advanced-programme"
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors"
              >
                Advanced programme progress
              </Link>
            </div>
          </div>
          <TrainingFlowSection view={flowView} />
        </div>
      </motion.section>
      )}

      {/* Greenpreneur Incubation Program */}
      {program === 'greenpreneur' && (
      <motion.section
        id="greenpreneur"
        className="px-4 md:px-6 lg:px-8 pt-8 pb-8"
        initial={reduceMotion ? false : { opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2 tracking-tight">
              <Briefcase className="w-6 h-6 text-gray-500" />
              GENIE Greenpreneur Incubation Program
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <ViewToggle value={flowView} onChange={setFlowView} />
              <Link
                to="/greenpreneur-progress"
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors"
              >
                Greenpreneur programme progress
              </Link>
            </div>
          </div>
          <TrainingFlowSection flows={gpFlows} view={flowView} />

        </div>
      </motion.section>
      )}

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
