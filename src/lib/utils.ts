import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines class names with Tailwind CSS conflict resolution
 * Usage: cn('px-4 py-2', condition && 'bg-green-500', 'hover:bg-green-600')
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, compact = false): string {
  if (compact) {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculate percentage
 */
export function calcPercent(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(Math.round((value / total) * 100), 100);
}

/**
 * Get status color based on percentage
 */
export function getStatusColor(percent: number): string {
  if (percent >= 80) return 'text-dg-green-600';
  if (percent >= 50) return 'text-dg-amber-600';
  return 'text-red-500';
}

/**
 * Get status background color
 */
export function getStatusBg(percent: number): string {
  if (percent >= 80) return 'bg-dg-green-500';
  if (percent >= 50) return 'bg-dg-amber-500';
  return 'bg-red-500';
}

/**
 * Delay utility for staggered animations
 */
export function staggerDelay(index: number, baseDelay = 0.1): number {
  return index * baseDelay;
}
