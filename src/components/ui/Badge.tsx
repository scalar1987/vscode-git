import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  pulse?: boolean;
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', dot = false, pulse = false, children, ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center font-medium rounded-full
      transition-all duration-200
    `;

    const variants = {
      default: 'bg-gray-100 text-gray-700',
      success: 'bg-dg-green-100 text-dg-green-700',
      warning: 'bg-dg-amber-100 text-dg-amber-700',
      danger: 'bg-red-100 text-red-700',
      info: 'bg-dg-blue-100 text-dg-blue-700',
      outline: 'border border-gray-300 text-gray-600 bg-transparent',
    };

    const dotColors = {
      default: 'bg-gray-500',
      success: 'bg-dg-green-500',
      warning: 'bg-dg-amber-500',
      danger: 'bg-red-500',
      info: 'bg-dg-blue-500',
      outline: 'bg-gray-500',
    };

    const sizes = {
      sm: 'px-2 py-0.5 text-xs gap-1',
      md: 'px-2.5 py-1 text-xs gap-1.5',
      lg: 'px-3 py-1.5 text-sm gap-2',
    };

    const dotSizes = {
      sm: 'w-1.5 h-1.5',
      md: 'w-2 h-2',
      lg: 'w-2.5 h-2.5',
    };

    return (
      <span
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              'rounded-full',
              dotColors[variant],
              dotSizes[size],
              pulse && 'animate-pulse'
            )}
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

// Status Badge with predefined statuses
export interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: 'completed' | 'on-track' | 'delayed' | 'critical' | 'not-started' | 'upcoming';
}

const statusMap = {
  'completed': { variant: 'success' as const, label: 'Completed' },
  'on-track': { variant: 'success' as const, label: 'On Track' },
  'delayed': { variant: 'warning' as const, label: 'Delayed' },
  'critical': { variant: 'danger' as const, label: 'Critical' },
  'not-started': { variant: 'default' as const, label: 'Not Started' },
  'upcoming': { variant: 'info' as const, label: 'Upcoming' },
};

const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, children, ...props }, ref) => {
    const { variant, label } = statusMap[status];
    return (
      <Badge ref={ref} variant={variant} dot {...props}>
        {children || label}
      </Badge>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';

export { Badge, StatusBadge };
