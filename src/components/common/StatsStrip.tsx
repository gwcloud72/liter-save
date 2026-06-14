import type { MetricItem } from './types';

export interface StatsStripProps {
  stats: MetricItem[];
  compact?: boolean;
  columns?: 2 | 3 | 4;
}

export function StatsStrip({ stats, compact = false, columns = 4 }: StatsStripProps) {
  const grid = columns === 2 ? 'xl:grid-cols-2' : columns === 3 ? 'xl:grid-cols-3' : 'xl:grid-cols-4';
  return (
    <div className={`grid grid-cols-1 overflow-hidden rounded-lg border border-ink-200 bg-white shadow-card sm:grid-cols-2 ${grid}`}>
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className={`relative ${compact ? 'min-h-stat-compact p-ds-2' : 'min-h-stat p-ds-3'} ${index < stats.length - 1 ? 'xl:border-r xl:border-ink-200' : ''}`}>
            <p className="text-caption font-bold text-ink-500">{stat.label}</p>
            <strong className="mt-ds-1 block text-price-lg text-ink-900 tabular">{stat.value}</strong>
            <span className="mt-ds-0.5 block truncate text-caption text-ink-500">{stat.sub}</span>
            {Icon ? <Icon className="absolute right-ds-2 top-ds-2 h-5 w-5 text-ink-400" strokeWidth={1.8} /> : null}
          </div>
        );
      })}
    </div>
  );
}
