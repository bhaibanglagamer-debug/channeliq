import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    label?: string;
  };
  accent?: 'purple' | 'blue' | 'green' | 'orange';
}

const accentMap = {
  purple: { icon: 'bg-violet-600/20 text-violet-400', glow: 'rgba(124,58,237,0.15)' },
  blue:   { icon: 'bg-indigo-600/20 text-indigo-400', glow: 'rgba(79,70,229,0.15)' },
  green:  { icon: 'bg-emerald-600/20 text-emerald-400', glow: 'rgba(16,185,129,0.15)' },
  orange: { icon: 'bg-orange-600/20 text-orange-400', glow: 'rgba(234,88,12,0.15)' },
};

export function StatCard({ title, value, subtitle, icon, trend, accent = 'purple' }: StatCardProps) {
  const isPositiveTrend = trend && trend.value >= 0;
  const colors = accentMap[accent];

  return (
    <div
      className="relative rounded-2xl p-5 card-accent transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: `0 4px 24px rgba(0,0,0,0.3), inset 0 0 40px ${colors.glow}`,
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
        {icon && (
          <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', colors.icon)}>
            {icon}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-white mb-1 tracking-tight">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
      {trend && (
        <div className={cn(
          'flex items-center gap-1 mt-3 text-xs font-semibold',
          isPositiveTrend ? 'text-emerald-400' : 'text-red-400'
        )}>
          <span>{isPositiveTrend ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
          {trend.label && <span className="text-gray-600 font-normal">{trend.label}</span>}
        </div>
      )}
    </div>
  );
}
