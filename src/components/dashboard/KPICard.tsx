import { type LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { AnimatedCard } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface KPICardProps {
  icon: LucideIcon;
  value: number;
  target: number;
  label: string;
  suffix?: string;
  trend?: { value: number; direction: 'up' | 'down' | 'neutral' };
  color?: 'green' | 'amber' | 'blue' | 'red';
  delay?: number;
}

const colorClasses = {
  green: {
    bg: 'bg-dg-green-100',
    icon: 'text-dg-green-600',
    progress: 'from-dg-green-500 to-dg-green-400',
  },
  amber: {
    bg: 'bg-dg-amber-100',
    icon: 'text-dg-amber-600',
    progress: 'from-dg-amber-500 to-dg-amber-400',
  },
  blue: {
    bg: 'bg-dg-blue-100',
    icon: 'text-dg-blue-600',
    progress: 'from-dg-blue-500 to-dg-blue-400',
  },
  red: {
    bg: 'bg-red-100',
    icon: 'text-red-600',
    progress: 'from-red-500 to-red-400',
  },
};

export function KPICard({
  icon: Icon,
  value,
  target,
  label,
  suffix = '',
  trend,
  color = 'green',
  delay = 0,
}: KPICardProps) {
  const percentage = target > 0 ? Math.min((value / target) * 100, 100) : 0;
  const colors = colorClasses[color];

  const TrendIcon = trend?.direction === 'up'
    ? TrendingUp
    : trend?.direction === 'down'
    ? TrendingDown
    : Minus;

  return (
    <AnimatedCard
      variant="glass"
      hover
      padding="md"
      delay={delay}
      className="min-w-[160px] md:min-w-[180px]"
    >
      {/* Header Row */}
      <div className="flex items-start justify-between mb-4">
        <div className={cn('p-3 rounded-xl', colors.bg)}>
          <Icon className={cn('w-5 h-5 md:w-6 md:h-6', colors.icon)} />
        </div>
        {trend && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
            trend.direction === 'up' && 'bg-dg-green-100 text-dg-green-700',
            trend.direction === 'down' && 'bg-red-100 text-red-700',
            trend.direction === 'neutral' && 'bg-gray-100 text-gray-600'
          )}>
            <TrendIcon className="w-3 h-3" />
            {trend.value}%
          </div>
        )}
      </div>

      {/* Value */}
      <div className="mb-1">
        <div className="flex items-baseline gap-1 flex-wrap">
          <AnimatedCounter
            value={value}
            className="text-2xl md:text-3xl font-bold text-gray-900"
            duration={1.5}
            delay={delay + 0.2}
          />
          {target > 0 && (
            <span className="text-gray-400 text-base md:text-lg">
              {suffix} / {target.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Label */}
      <p className="text-sm text-gray-500 mb-3 truncate">{label}</p>

      {/* Progress Bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full bg-gradient-to-r', colors.progress)}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, delay: delay + 0.4, ease: 'easeOut' }}
        />
      </div>
      <p className="text-xs text-gray-400 mt-1 text-right">
        {percentage.toFixed(1)}%
      </p>
    </AnimatedCard>
  );
}

// Grid wrapper for multiple KPI cards
interface KPIGridProps {
  children: React.ReactNode;
  className?: string;
}

export function KPIGrid({ children, className }: KPIGridProps) {
  return (
    <div className={cn(
      'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4',
      className
    )}>
      {children}
    </div>
  );
}
