import { forwardRef, type HTMLAttributes } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'elevated' | 'bordered';
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', hover = false, padding = 'md', children, ...props }, ref) => {
    const baseStyles = 'rounded-xl transition-all duration-300';

    const variants = {
      default: 'bg-white shadow-card',
      glass: `
        bg-white/70 backdrop-blur-md border border-white/20
        shadow-glass
      `,
      elevated: 'bg-white shadow-card-hover',
      bordered: 'bg-white border border-gray-200',
    };

    const hoverStyles = hover
      ? 'hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer'
      : '';

    const paddings = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    return (
      <div
        ref={ref}
        className={cn(baseStyles, variants[variant], hoverStyles, paddings[padding], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Animated Card with Framer Motion
export interface AnimatedCardProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  variant?: 'default' | 'glass' | 'elevated' | 'bordered';
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  delay?: number;
}

const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ className, variant = 'default', hover = false, padding = 'md', delay = 0, children, ...props }, ref) => {
    const baseStyles = 'rounded-xl transition-shadow duration-300';

    const variants = {
      default: 'bg-white shadow-card',
      glass: 'bg-white/70 backdrop-blur-md border border-white/20 shadow-glass',
      elevated: 'bg-white shadow-card-hover',
      bordered: 'bg-white border border-gray-200',
    };

    const paddings = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    return (
      <motion.div
        ref={ref}
        className={cn(baseStyles, variants[variant], paddings[padding], className)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.4,
          delay,
          ease: [0.25, 0.1, 0.25, 1],
        }}
        whileHover={hover ? { y: -4, boxShadow: '0 12px 24px rgba(0, 0, 0, 0.15)' } : undefined}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

AnimatedCard.displayName = 'AnimatedCard';

// Glass Card variant
const GlassCard = forwardRef<HTMLDivElement, Omit<CardProps, 'variant'>>(
  ({ className, ...props }, ref) => (
    <Card ref={ref} variant="glass" className={className} {...props} />
  )
);

GlassCard.displayName = 'GlassCard';

// Card subcomponents
const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 pb-4', className)}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-lg font-semibold text-gray-900', className)}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-gray-500', className)}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center pt-4', className)}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

export {
  Card,
  AnimatedCard,
  GlassCard,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
};
