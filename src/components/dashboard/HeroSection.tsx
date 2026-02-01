import { motion } from 'framer-motion';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';

interface HeroSectionProps {
  projectProgress: number;
  currentMonth: number;
  totalMonths: number;
  title?: string;
  subtitle?: string;
}

// Simple progress ring for hero (no status dependency)
function HeroProgressRing({
  progress,
  size = 80,
  strokeWidth = 6
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const offset = circumference - (clampedProgress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#81C784"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.5 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-white">
          {Math.round(clampedProgress)}%
        </span>
      </div>
    </div>
  );
}

export function HeroSection({
  projectProgress,
  currentMonth,
  totalMonths,
  title = "Empowering Cote d'Ivoire's Youth",
  subtitle = "Through Digital Skills & Green Innovation"
}: HeroSectionProps) {
  return (
    <section className="relative min-h-[280px] md:min-h-[320px] bg-gradient-hero overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-10 right-10 w-48 h-48 bg-white/5 rounded-full blur-3xl animate-pulse-slow" />
        <motion.div
          className="absolute top-1/2 left-1/4 w-4 h-4 bg-white/10 rounded-full"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/3 right-1/3 w-6 h-6 bg-white/10 rounded-full"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 py-12 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-white"
        >
          {/* Project Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm mb-6"
          >
            <span className="w-2 h-2 bg-dg-green-400 rounded-full animate-pulse" />
            GENIE DigiGreen Youth Project
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold font-display mb-3"
          >
            {title}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl"
          >
            {subtitle}
          </motion.p>

          {/* Progress Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-6"
          >
            <HeroProgressRing progress={projectProgress} size={80} strokeWidth={6} />
            <div>
              <div className="flex items-baseline gap-2">
                <AnimatedCounter
                  value={projectProgress}
                  suffix="%"
                  className="text-3xl font-bold"
                  duration={1.5}
                  delay={0.5}
                />
                <span className="text-white/60">Complete</span>
              </div>
              <p className="text-white/60 text-sm mt-1">
                Month <AnimatedCounter value={currentMonth} className="font-semibold text-white" duration={1} /> of {totalMonths}
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
