'use client';

import { STATUS } from '@/lib/chartPalette';
import Sparkline from './Sparkline';

interface StatTileProps {
  label: string;
  value: string | number;
  /** Signed delta vs a named period, e.g. "+4 vs last week". Color follows direction. */
  delta?: { value: string; direction: 'up' | 'down' | 'flat'; goodDirection?: 'up' | 'down' };
  trend?: number[];
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}

export default function StatTile({ label, value, delta, trend, icon: Icon, className }: StatTileProps) {
  const deltaColor =
    !delta || delta.direction === 'flat'
      ? undefined
      : delta.direction === (delta.goodDirection ?? 'up')
        ? STATUS.good
        : STATUS.critical;

  return (
    <div className={`rounded-lg border border-line-hairline bg-surface-card p-5 ${className ?? ''}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 text-ink-muted">
          {Icon && <Icon className="w-4 h-4" />}
          <span className="text-xs uppercase tracking-wide font-medium">{label}</span>
        </div>
        {trend && trend.length >= 2 && <Sparkline data={trend} />}
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-semibold text-ink-primary tabular-nums">{value}</p>
        {delta && (
          <span className="text-xs font-medium tabular-nums" style={{ color: deltaColor }}>
            {delta.value}
          </span>
        )}
      </div>
    </div>
  );
}
