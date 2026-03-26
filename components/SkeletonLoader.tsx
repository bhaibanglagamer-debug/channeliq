import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonLoaderProps {
  className?: string;
  style?: React.CSSProperties;
}

export function SkeletonLoader({ className, style }: SkeletonLoaderProps) {
  return (
    <div
      className={cn('rounded-lg shimmer', className)}
      style={style}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div
      className="rounded-2xl p-5 card-accent"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <SkeletonLoader className="h-3 w-20" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <SkeletonLoader className="h-8 w-8 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>
      <SkeletonLoader className="h-7 w-28 mb-2" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <SkeletonLoader className="h-3 w-36" style={{ background: 'rgba(255,255,255,0.04)' }} />
    </div>
  );
}

export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div
      className="rounded-2xl border p-5 card-accent"
      style={{
        height,
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <SkeletonLoader className="h-4 w-36 mb-5" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <SkeletonLoader className="w-full" style={{ height: height - 80, background: 'rgba(255,255,255,0.04)' }} />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div className="p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <SkeletonLoader className="h-4 w-32" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>
      <div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-5 py-4 flex items-center gap-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <SkeletonLoader className="h-3 w-6 shrink-0" style={{ background: 'rgba(255,255,255,0.04)' }} />
            <SkeletonLoader className="h-3 flex-1" style={{ background: 'rgba(255,255,255,0.04)' }} />
            <SkeletonLoader className="h-3 w-16 shrink-0" style={{ background: 'rgba(255,255,255,0.04)' }} />
            <SkeletonLoader className="h-3 w-16 shrink-0" style={{ background: 'rgba(255,255,255,0.04)' }} />
            <SkeletonLoader className="h-5 w-14 rounded-full shrink-0" style={{ background: 'rgba(255,255,255,0.04)' }} />
          </div>
        ))}
      </div>
    </div>
  );
}
