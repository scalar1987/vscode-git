import { forwardRef, type HTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'gradient';
  showLabel?: boolean;
  animated?: boolean;
}

const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({
    className,
    value,
    max = 100,
    size = 'md',
    variant = 'default',
    showLabel = false,
    animated = true,
    ...props
  }, ref) => {
    const percent = Math.min(Math.max((value / max) * 100, 0), 100);

    const sizes = {
      sm: 'h-1.5',
      md: 'h-2.5',
      lg: 'h-4',
    };

    const variants = {
      default: 'bg-dg-green-500',
      success: 'bg-dg-green-500',
      warning: 'bg-dg-amber-500',
      danger: 'bg-red-500',
      gradient: 'bg-gradient-to-r from-dg-green-400 to-dg-green-600',
    };

    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        {showLabel && (
          <div className="flex justify-between mb-1.5">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm font-medium text-gray-700">{Math.round(percent)}%</span>
          </div>
        )}
        <div className={cn('w-full bg-gray-200 rounded-full overflow-hidden', sizes[size])}>
          {animated ? (
            <motion.div
              className={cn('h-full rounded-full', variants[variant])}
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
            />
          ) : (
            <div
              className={cn('h-full rounded-full transition-all duration-500', variants[variant])}
              style={{ width: `${percent}%` }}
            />
          )}
        </div>
      </div>
    );
  }
);

Progress.displayName = 'Progress';

// Circular Progress Ring
export interface ProgressRingProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  showValue?: boolean;
  animated?: boolean;
  label?: string;
}

const ProgressRing = forwardRef<HTMLDivElement, ProgressRingProps>(
  ({
    className,
    value,
    max = 100,
    size = 120,
    strokeWidth = 8,
    variant = 'default',
    showValue = true,
    animated = true,
    label,
    ...props
  }, ref) => {
    const percent = Math.min(Math.max((value / max) * 100, 0), 100);
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percent / 100) * circumference;

    const colors = {
      default: 'stroke-dg-green-500',
      success: 'stroke-dg-green-500',
      warning: 'stroke-dg-amber-500',
      danger: 'stroke-red-500',
    };

    return (
      <div
        ref={ref}
        className={cn('relative inline-flex items-center justify-center', className)}
        style={{ width: size, height: size }}
        {...props}
      >
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
        >
          {/* Background circle */}
          <circle
            className="stroke-gray-200"
            strokeWidth={strokeWidth}
            fill="none"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          {/* Progress circle */}
          {animated ? (
            <motion.circle
              className={cn(colors[variant])}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              fill="none"
              r={radius}
              cx={size / 2}
              cy={size / 2}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
              style={{
                strokeDasharray: circumference,
              }}
            />
          ) : (
            <circle
              className={cn(colors[variant], 'transition-all duration-500')}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              fill="none"
              r={radius}
              cx={size / 2}
              cy={size / 2}
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: offset,
              }}
            />
          )}
        </svg>
        {showValue && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-gray-900">
              {Math.round(percent)}%
            </span>
            {label && (
              <span className="text-xs text-gray-500 mt-0.5">{label}</span>
            )}
          </div>
        )}
      </div>
    );
  }
);

ProgressRing.displayName = 'ProgressRing';

export { Progress, ProgressRing };
