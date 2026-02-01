# Design: Visual Polish - Awwwards Quality

> **Feature**: visual-polish-awwwards
> **Created**: 2026-02-01
> **Status**: Design
> **Phase**: Design
> **Plan Reference**: `docs/01-plan/features/visual-polish-awwwards.plan.md`

---

## 1. Current State Assessment

### 1.1 Foundation Already Built (Significant Progress!)

| Component | Status | Notes |
|-----------|--------|-------|
| **Tailwind Config** | ✅ Complete | DigiGreen palette, animations, gradients |
| **Card.tsx** | ✅ Complete | Glass, animated, hover variants |
| **Button.tsx** | ✅ Exists | May need variant expansion |
| **Badge.tsx** | ✅ Exists | May need status colors |
| **Progress.tsx** | ✅ Exists | May need animated version |
| **Skeleton.tsx** | ✅ Exists | Loading state ready |
| **AnimatedCounter.tsx** | ✅ Exists | Number animations ready |
| **Framer Motion** | ✅ Installed | v12.x |
| **Recharts** | ✅ Installed | v3.x |
| **react-countup** | ✅ Installed | v6.x |
| **@headlessui/react** | ✅ Installed | v2.x |

### 1.2 Remaining Work

| Component/Feature | Priority | Status |
|-------------------|----------|--------|
| Page Transitions | High | To Do |
| Hero Section (Dashboard) | High | To Do |
| KPI Cards Redesign | High | To Do |
| Chart Animations | Medium | To Do |
| Dark Mode | Low | To Do |
| Settings Page Content | Medium | To Do |

---

## 2. Design System Specifications

### 2.1 Color Tokens (Already in tailwind.config.js)

```
Primary Scale: dg-green-50 → dg-green-900
Accent Scale:  dg-amber-50 → dg-amber-900
Info Scale:    dg-blue-50 → dg-blue-900

Semantic Usage:
├── Success: dg-green-500/600
├── Warning: dg-amber-500/600
├── Info: dg-blue-500/600
├── Error: red-500/600 (Tailwind default)
├── Background: gray-50/white
└── Text: gray-900/800/600/500
```

### 2.2 Typography Scale

```
Display (Plus Jakarta Sans):
├── Hero Title:    text-4xl md:text-5xl font-bold
├── Page Title:    text-2xl md:text-3xl font-bold
├── Section Title: text-xl font-semibold
└── Card Title:    text-lg font-semibold

Body (Inter):
├── Body Large:  text-base
├── Body Normal: text-sm
├── Body Small:  text-xs
└── Caption:     text-2xs (custom: 10px)

Mono (JetBrains Mono):
└── Code/Data:   font-mono text-sm
```

### 2.3 Spacing System

```
Base Unit: 4px (Tailwind default)

Layout Spacing:
├── Page Padding:     p-6 md:p-8
├── Section Gap:      space-y-6 md:space-y-8
├── Card Gap:         gap-4 md:gap-6
└── Component Gap:    gap-2 md:gap-3

Card Internal:
├── Large Card:  p-6 md:p-8
├── Medium Card: p-4 md:p-6
└── Compact:     p-3 md:p-4
```

### 2.4 Animation Tokens (Already in tailwind.config.js)

```
Durations:
├── Micro:  150ms (hover, focus)
├── Small:  200ms (tooltips)
├── Medium: 300ms (cards, modals)
├── Large:  400-500ms (page transitions)
└── Slow:   600ms+ (background effects)

Easings:
├── ease-out:    Enter animations
├── ease-in:     Exit animations
├── ease-in-out: Movement
└── bounce-in:   Playful elements (custom)

Keyframes Available:
├── fadeIn, fadeInUp, fadeInDown
├── slideInRight, slideInLeft
├── scaleIn
├── shimmer (loading)
├── float (decorative)
└── glow (emphasis)
```

---

## 3. Component Specifications

### 3.1 Hero Section (NEW - Dashboard)

```
┌────────────────────────────────────────────────────────────────┐
│ bg-gradient-hero (dark green → light green)                    │
│ min-h-[280px] md:min-h-[320px]                                 │
│ relative overflow-hidden                                        │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ CONTENT (z-10)                                              ││
│ │                                                             ││
│ │ text-white                                                  ││
│ │ ┌─────────────────────────────────────────────────────────┐││
│ │ │ Logo + "GENIE DigiGreen Youth Project"  (animate-fade-in)│││
│ │ └─────────────────────────────────────────────────────────┘││
│ │                                                             ││
│ │ ┌─────────────────────────────────────────────────────────┐││
│ │ │ "Empowering Côte d'Ivoire's Youth"     (text-4xl bold)  │││
│ │ │ "Through Digital Skills & Green Innovation" (text-lg)   │││
│ │ └─────────────────────────────────────────────────────────┘││
│ │                                                             ││
│ │ ┌─────────────────────────────────────────────────────────┐││
│ │ │ [Progress Ring]  47% Complete   Month 20 of 43          │││
│ │ │ (ProgressRing component + AnimatedCounter)              │││
│ │ └─────────────────────────────────────────────────────────┘││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ DECORATIVE ELEMENTS (z-0):                                      │
│ ├── Floating circles (animate-float, opacity-10)                │
│ ├── Grid pattern overlay (opacity-5)                            │
│ └── Gradient orbs (blur-3xl, animate-pulse-slow)                │
└────────────────────────────────────────────────────────────────┘
```

**File**: `src/components/dashboard/HeroSection.tsx`

**Props**:
```typescript
interface HeroSectionProps {
  projectProgress: number;      // 0-100
  currentMonth: number;         // 1-43
  totalMonths: number;          // 43
  title?: string;
  subtitle?: string;
}
```

### 3.2 KPI Card (Enhanced)

```
┌────────────────────────────────────────┐
│ AnimatedCard variant="glass" hover     │
│ w-full min-w-[180px]                   │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ Icon (Lucide)      Trend Arrow    │ │
│ │ 48x48 rounded-xl   ↑12% green     │ │
│ │ bg-dg-green-100    or ↓5% red     │ │
│ │ text-dg-green-600                 │ │
│ └────────────────────────────────────┘ │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ <AnimatedCounter                  │ │
│ │   value={112}                     │ │
│ │   suffix=" / 650"                 │ │
│ │   className="text-3xl font-bold"  │ │
│ │ />                                │ │
│ └────────────────────────────────────┘ │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ Label: "Youth Trained"            │ │
│ │ text-sm text-gray-500             │ │
│ └────────────────────────────────────┘ │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ <Progress                         │ │
│ │   value={17}                      │ │
│ │   variant="gradient"              │ │
│ │   showLabel                       │ │
│ │   animate                         │ │
│ │ />                                │ │
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```

**File**: `src/components/dashboard/KPICard.tsx`

**Props**:
```typescript
interface KPICardProps {
  icon: LucideIcon;
  value: number;
  target: number;
  label: string;
  suffix?: string;
  trend?: { value: number; direction: 'up' | 'down' | 'neutral' };
  color?: 'green' | 'amber' | 'blue' | 'red';
  delay?: number;  // Animation stagger
}
```

### 3.3 Page Transition Wrapper

```typescript
// src/components/layout/PageTransition.tsx

import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1]
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.3 }
  }
};

export function PageTransition({ children }) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

### 3.4 Animated Progress Bar (Enhanced)

```typescript
// Enhancement to existing Progress.tsx

interface ProgressProps {
  value: number;
  max?: number;
  variant?: 'default' | 'gradient' | 'striped';
  size?: 'sm' | 'md' | 'lg';
  color?: 'green' | 'amber' | 'blue' | 'red';
  showLabel?: boolean;
  animate?: boolean;
  labelPosition?: 'inside' | 'outside' | 'tooltip';
}

// Animation: width transitions from 0 to value over 800ms
// Uses Framer Motion for smooth interpolation
```

### 3.5 Animated Charts (Recharts)

**DonutChart.tsx**:
```typescript
interface DonutChartProps {
  data: Array<{ name: string; value: number; color: string }>;
  innerRadius?: number;  // default: 60
  outerRadius?: number;  // default: 80
  showLabels?: boolean;
  animate?: boolean;     // default: true
  centerLabel?: ReactNode;
}

// Animation: Pie segments animate from 0° to final angle
// Entry animation: 800ms ease-out
```

**BarChart.tsx**:
```typescript
interface BarChartProps {
  data: Array<{ name: string; value: number; target?: number }>;
  orientation?: 'horizontal' | 'vertical';
  showGrid?: boolean;
  animate?: boolean;
  barColor?: string;
  targetColor?: string;
}

// Animation: Bars grow from 0 to value
// Stagger: 50ms between bars
```

---

## 4. Page-by-Page Design Specs

### 4.1 Dashboard Page

```
Layout:
┌────────────────────────────────────────────────────────────────┐
│ <HeroSection />                                                 │
│ (Full width, gradient background)                               │
├────────────────────────────────────────────────────────────────┤
│ <KPICards />                                                    │
│ grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4           │
│ -mt-16 (overlap hero)                                          │
│ px-6                                                            │
├────────────────────────────────────────────────────────────────┤
│ <StatsRow />                                                    │
│ grid grid-cols-1 lg:grid-cols-2 gap-6                          │
│ ┌─────────────────────────┐ ┌─────────────────────────────────┐│
│ │ ComponentProgress       │ │ BudgetOverview (DonutChart)     ││
│ │ (Animated bar chart)    │ │                                 ││
│ └─────────────────────────┘ └─────────────────────────────────┘│
├────────────────────────────────────────────────────────────────┤
│ <ActivityTimeline />                                            │
│ Vertical timeline with animated nodes                           │
│ Show 5 most recent activities                                   │
└────────────────────────────────────────────────────────────────┘
```

### 4.2 Centers Map Page

```
Layout:
┌────────────────────────────────────────────────────────────────┐
│ Header: "Centers Network" + filter controls                     │
│ Animated fade-in                                                │
├────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────┐ ┌────────────────────────┐ │
│ │ <LeafletMap />                  │ │ <CenterDetailPanel />  │ │
│ │ 70% width                       │ │ 30% width              │ │
│ │                                 │ │ slide-in-right         │ │
│ │ Custom markers:                 │ │ on center select       │ │
│ │ ├── Operational: pulse green   │ │                        │ │
│ │ ├── Planned: gray static       │ │ Glass card style       │ │
│ │ └── Hover: scale + glow        │ │ Animated stats         │ │
│ └─────────────────────────────────┘ └────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘

Map Tile: CartoDB Positron (light, minimal)
```

### 4.3 Targets & Milestones Page

```
Layout:
┌────────────────────────────────────────────────────────────────┐
│ Page Header + View Toggle (Hierarchy / Flat)                    │
├────────────────────────────────────────────────────────────────┤
│ <OutcomeSection outcome="1" />                                  │
│ ├── Collapsible (Headless UI Disclosure)                        │
│ ├── Animated expand/collapse (300ms)                            │
│ │   ┌──────────────────────────────────────────────────────┐   │
│ │   │ <OutputCard output="1.1" />                          │   │
│ │   │ ├── Progress gauge (circular)                        │   │
│ │   │ ├── Indicator list (animated on expand)              │   │
│ │   │ └── Trend sparkline                                  │   │
│ │   └──────────────────────────────────────────────────────┘   │
│ └── More outputs...                                             │
├────────────────────────────────────────────────────────────────┤
│ <OutcomeSection outcome="2" />                                  │
├────────────────────────────────────────────────────────────────┤
│ <OutcomeSection outcome="3" />                                  │
└────────────────────────────────────────────────────────────────┘
```

### 4.4 Activity Tracker Page

```
Layout:
┌────────────────────────────────────────────────────────────────┐
│ Header + Filter Bar (Component, Status, Date Range)             │
│ Animated filter pills                                           │
├────────────────────────────────────────────────────────────────┤
│ <GanttChart />                                                  │
│ ├── Recharts-based horizontal bar chart                         │
│ ├── Animated bar growth on load                                 │
│ ├── Hover: show activity detail tooltip                         │
│ ├── Click: open detail panel                                    │
│ └── Color coding by status (on-track, delayed, completed)       │
├────────────────────────────────────────────────────────────────┤
│ <ActivityDetailPanel /> (slide-in)                              │
│ When activity selected                                          │
└────────────────────────────────────────────────────────────────┘
```

### 4.5 Budget Tracking Page

```
Layout:
┌────────────────────────────────────────────────────────────────┐
│ Header + Total Budget Display ($8,250,000)                      │
│ AnimatedCounter for total                                       │
├────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────┐ ┌─────────────────────────────────┐│
│ │ <BudgetDonut />         │ │ <BudgetBreakdown />             ││
│ │ By component            │ │ Waterfall chart                 ││
│ │ Animated segments       │ │ Allocated → Spent → Remaining   ││
│ └─────────────────────────┘ └─────────────────────────────────┘│
├────────────────────────────────────────────────────────────────┤
│ <BudgetTable />                                                 │
│ Sortable, animated row transitions                              │
│ Color-coded variance (green under, red over)                    │
└────────────────────────────────────────────────────────────────┘
```

### 4.6 Risk Register Page

```
Layout:
┌────────────────────────────────────────────────────────────────┐
│ Header + Summary Stats (Total, High, Medium, Low)               │
│ Badge counters with animation                                   │
├────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────┐ ┌─────────────────────────────────┐│
│ │ <RiskMatrix />          │ │ <RiskTable />                   ││
│ │ Interactive 5x5 grid    │ │ Sortable, filterable            ││
│ │ Hover: highlight cell   │ │ Expandable rows                 ││
│ │ Click: filter table     │ │ Status color gradients          ││
│ └─────────────────────────┘ └─────────────────────────────────┘│
└────────────────────────────────────────────────────────────────┘
```

### 4.7 Reports (SmartUploader) Page

```
Layout:
┌────────────────────────────────────────────────────────────────┐
│ Header: "Smart Report Uploader"                                 │
├────────────────────────────────────────────────────────────────┤
│ <UploadZone />                                                  │
│ ├── Drag-and-drop area                                          │
│ ├── Animated border on drag-over (dashed → solid, color change) │
│ ├── File icon animation (bounce on drop)                        │
│ └── Supported formats badge                                     │
├────────────────────────────────────────────────────────────────┤
│ <ProcessingSteps />                                             │
│ ├── Step 1: Upload (checkmark animated)                         │
│ ├── Step 2: AI Processing (spinner → checkmark)                 │
│ ├── Step 3: Review (highlight current)                          │
│ └── Step 4: Commit (final)                                      │
├────────────────────────────────────────────────────────────────┤
│ <ExtractionPreview />                                           │
│ Animated card reveal of extracted data                          │
│ Editable fields with inline validation                          │
└────────────────────────────────────────────────────────────────┘
```

### 4.8 Settings Page (NEW CONTENT)

```
Layout:
┌────────────────────────────────────────────────────────────────┐
│ Header: "Settings"                                              │
├────────────────────────────────────────────────────────────────┤
│ <Card> Appearance                                               │
│ ├── Theme Toggle: Light / Dark / System                         │
│ ├── Color Scheme: Default Green / Blue / Custom                 │
│ └── Animation: Enable / Reduce Motion                           │
├────────────────────────────────────────────────────────────────┤
│ <Card> Dashboard Preferences                                    │
│ ├── Default View: Overview / Detailed                           │
│ ├── KPI Display: All / Custom Selection                         │
│ └── Auto-refresh: Off / 5min / 15min / 30min                    │
├────────────────────────────────────────────────────────────────┤
│ <Card> Data & Export                                            │
│ ├── Export Format: Excel / CSV / PDF                            │
│ ├── Date Format: DD/MM/YYYY / MM/DD/YYYY / YYYY-MM-DD           │
│ └── Number Format: 1,234.56 / 1.234,56                          │
├────────────────────────────────────────────────────────────────┤
│ <Card> About                                                    │
│ ├── Version: 1.0.0                                              │
│ ├── Project: GENIE DigiGreen Youth Employment                   │
│ ├── Partners: GGGI, KOICA                                       │
│ └── Contact: support@digigreen.ci                               │
└────────────────────────────────────────────────────────────────┘
```

---

## 5. Implementation Order

### Phase 1: Core Components (Priority: Critical)

```
Order:
1. HeroSection.tsx          → New component for dashboard
2. KPICard.tsx              → Enhanced version with animations
3. PageTransition.tsx       → Wrap all routes
4. Progress.tsx             → Add gradient + animate variants

Files to Create/Modify:
├── src/components/dashboard/HeroSection.tsx (NEW)
├── src/components/dashboard/KPICard.tsx (NEW)
├── src/components/layout/PageTransition.tsx (NEW)
├── src/components/ui/Progress.tsx (ENHANCE)
└── src/App.tsx (wrap routes with PageTransition)
```

### Phase 2: Dashboard Page (Priority: High)

```
Order:
1. Integrate HeroSection
2. Replace KPIBar with new KPICards grid
3. Add ComponentProgress animated chart
4. Add BudgetOverview donut chart
5. Create ActivityTimeline component

Files to Modify:
├── src/pages/Dashboard.tsx (MAJOR REWRITE)
├── src/components/dashboard/ComponentProgress.tsx (NEW)
├── src/components/dashboard/BudgetOverview.tsx (NEW)
└── src/components/dashboard/ActivityTimeline.tsx (NEW)
```

### Phase 3: Secondary Pages (Priority: Medium)

```
Order:
1. Centers Map → Add marker animations, panel slide
2. Targets → Add collapsible sections
3. Activities → Enhance Gantt chart
4. Budget → Add animated charts
5. Risk → Enhance matrix interactions
6. Reports → Improve upload UX

Files to Modify:
├── src/pages/CentersMap.tsx
├── src/pages/TargetsMilestones.tsx
├── src/pages/ActivityTracker.tsx
├── src/pages/BudgetTracking.tsx
├── src/pages/RiskRegister.tsx
└── src/pages/Reports.tsx
```

### Phase 4: Settings & Polish (Priority: Low)

```
Order:
1. Build Settings page content
2. Add dark mode support (if time permits)
3. Performance optimization
4. Cross-browser testing
5. Lighthouse audit fixes

Files to Create/Modify:
├── src/pages/Settings.tsx (NEW CONTENT)
├── src/styles/dark-mode.css (OPTIONAL)
└── Various optimizations
```

---

## 6. Acceptance Criteria

### Visual Quality
- [ ] Hero section gradient renders correctly
- [ ] All KPI cards have glassmorphism effect
- [ ] Animations run at 60fps
- [ ] Page transitions are smooth (400ms)
- [ ] All numbers animate on load
- [ ] Charts have entry animations

### Responsiveness
- [ ] Mobile: 375px+ (single column)
- [ ] Tablet: 768px+ (2 columns)
- [ ] Desktop: 1024px+ (full layout)
- [ ] Large: 1440px+ (max-width container)

### Performance
- [ ] Lighthouse Performance: 90+
- [ ] Lighthouse Accessibility: 95+
- [ ] First Contentful Paint: <1.5s
- [ ] Time to Interactive: <3s
- [ ] No layout shifts (CLS <0.1)

### Browser Support
- [ ] Chrome 90+
- [ ] Firefox 90+
- [ ] Safari 14+
- [ ] Edge 90+

---

## 7. Dependencies Verification

**Already Installed** (package.json confirms):
```json
{
  "framer-motion": "^12.29.2",    ✅
  "recharts": "^3.7.0",           ✅
  "@headlessui/react": "^2.2.9",  ✅
  "clsx": "^2.1.1",               ✅
  "tailwind-merge": "^3.4.0",     ✅
  "react-countup": "^6.5.3",      ✅
  "lucide-react": "^0.563.0"      ✅
}
```

**No additional installs needed!**

---

## 8. Next Steps

After Design approval:

1. **Run** `/pdca do visual-polish-awwwards` for implementation guide
2. **Start** with Phase 1 (Core Components)
3. **Test** each component in isolation
4. **Integrate** into pages progressively
5. **Run** `/pdca analyze visual-polish-awwwards` after completion

---

**Command to proceed**: `/pdca do visual-polish-awwwards`
