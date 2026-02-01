import { cn } from '@/lib/utils';
import { type CSSProperties } from 'react';

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200',
        className
      )}
      style={style}
    />
  );
}

// Skeleton with shimmer effect
export function SkeletonShimmer({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-gray-200',
        className
      )}
      style={style}
    >
      <div
        className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent"
        style={{ backgroundSize: '200% 100%' }}
      />
    </div>
  );
}

// Pre-built skeleton components
export function SkeletonCard() {
  return (
    <div className="rounded-xl bg-white p-6 shadow-card">
      <div className="flex items-center gap-4">
        <SkeletonShimmer className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <SkeletonShimmer className="h-4 w-3/4" />
          <SkeletonShimmer className="h-3 w-1/2" />
        </div>
      </div>
      <SkeletonShimmer className="mt-4 h-2 w-full rounded-full" />
    </div>
  );
}

export function SkeletonKPICard() {
  return (
    <div className="rounded-xl bg-white p-5 shadow-card">
      <div className="flex items-start gap-3">
        <SkeletonShimmer className="h-10 w-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <SkeletonShimmer className="h-6 w-20" />
          <SkeletonShimmer className="h-3 w-32" />
        </div>
      </div>
      <SkeletonShimmer className="mt-4 h-1.5 w-full rounded-full" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 px-4 py-3">
        <SkeletonShimmer className="h-4 w-1/4" />
        <SkeletonShimmer className="h-4 w-1/4" />
        <SkeletonShimmer className="h-4 w-1/4" />
        <SkeletonShimmer className="h-4 w-1/4" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex gap-4 px-4 py-3 border-t border-gray-100"
        >
          <SkeletonShimmer className="h-4 w-1/4" />
          <SkeletonShimmer className="h-4 w-1/4" />
          <SkeletonShimmer className="h-4 w-1/4" />
          <SkeletonShimmer className="h-4 w-1/4" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="rounded-xl bg-white p-6 shadow-card">
      <SkeletonShimmer className="h-5 w-32 mb-4" />
      <div className="flex items-end gap-2 h-48">
        {[40, 65, 45, 80, 55, 70, 50].map((h, i) => (
          <SkeletonShimmer
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonList({ items = 4 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <SkeletonShimmer className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <SkeletonShimmer className="h-4 w-3/4" />
            <SkeletonShimmer className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
