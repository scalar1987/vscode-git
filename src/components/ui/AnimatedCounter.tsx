import { useRef } from 'react';
import CountUp from 'react-countup';
import { useInView } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface AnimatedCounterProps {
  value: number;
  duration?: number;
  delay?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  separator?: string;
  className?: string;
  onComplete?: () => void;
  preserveValue?: boolean;
  formattingFn?: (value: number) => string;
}

export function AnimatedCounter({
  value,
  duration = 2,
  delay = 0,
  decimals = 0,
  prefix = '',
  suffix = '',
  separator = ',',
  className,
  onComplete,
  preserveValue = true,
  formattingFn,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {isInView ? (
        <CountUp
          start={0}
          end={value}
          duration={duration}
          delay={delay}
          decimals={decimals}
          prefix={prefix}
          suffix={suffix}
          separator={separator}
          preserveValue={preserveValue}
          onEnd={onComplete}
          formattingFn={formattingFn}
        />
      ) : (
        `${prefix}0${suffix}`
      )}
    </span>
  );
}

// Currency Counter
export interface CurrencyCounterProps extends Omit<AnimatedCounterProps, 'prefix' | 'formattingFn'> {
  compact?: boolean;
}

export function CurrencyCounter({ value, compact = false, ...props }: CurrencyCounterProps) {
  const formatCurrency = (val: number) => {
    if (compact) {
      if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
      if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
    }
    return `$${val.toLocaleString()}`;
  };

  if (compact) {
    return (
      <AnimatedCounter
        value={value}
        formattingFn={formatCurrency}
        {...props}
      />
    );
  }

  return (
    <AnimatedCounter
      value={value}
      prefix="$"
      {...props}
    />
  );
}

// Percentage Counter
export function PercentageCounter({ value, ...props }: Omit<AnimatedCounterProps, 'suffix'>) {
  return (
    <AnimatedCounter
      value={value}
      suffix="%"
      decimals={value % 1 !== 0 ? 1 : 0}
      {...props}
    />
  );
}

// Fraction display (e.g., "7 / 35")
export interface FractionDisplayProps {
  numerator: number;
  denominator: number;
  className?: string;
  numeratorClassName?: string;
  denominatorClassName?: string;
  animated?: boolean;
  duration?: number;
}

export function FractionDisplay({
  numerator,
  denominator,
  className,
  numeratorClassName,
  denominatorClassName,
  animated = true,
  duration = 2,
}: FractionDisplayProps) {
  return (
    <span className={cn('inline-flex items-baseline gap-1', className)}>
      {animated ? (
        <AnimatedCounter
          value={numerator}
          duration={duration}
          className={cn('font-bold', numeratorClassName)}
        />
      ) : (
        <span className={cn('font-bold', numeratorClassName)}>{numerator.toLocaleString()}</span>
      )}
      <span className="text-gray-400 mx-0.5">/</span>
      <span className={cn('text-gray-500', denominatorClassName)}>
        {denominator.toLocaleString()}
      </span>
    </span>
  );
}
