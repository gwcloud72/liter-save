import type { MetricItem } from './types';
import { MetricCard } from './MetricCard';

type PlainStatItem = { label: string; value: string; sub?: string; icon?: MetricItem['icon'] };

export interface StatsStripProps {
  stats?: MetricItem[];
  items?: PlainStatItem[];
  compact?: boolean;
  columns?: 2 | 3 | 4 | number;
}

function metricValueToneClass(label: string): string {
  if (label.includes('상승')) return 'text-up';
  if (label.includes('하락')) return 'text-down';
  return 'text-ink-900';
}

export function StatsStrip({ stats, items, compact = false, columns = 4 }: StatsStripProps) {
  const metricRows = stats ?? items ?? [];
  const desktopGridClass = columns === 2 ? 'desktop:grid-cols-2' : columns === 3 ? 'desktop:grid-cols-3' : 'desktop:grid-cols-4';
  return (
    <div role="list" className={`grid grid-cols-1 gap-px overflow-hidden rounded-card border border-ink-200 bg-ink-200 shadow-card tablet:grid-cols-2 ${desktopGridClass}`}>
      {metricRows.map((metric, index) => (
        <MetricCard
          key={metric.label}
          label={metric.label}
          value={metric.value}
          subtitle={metric.sub}
          icon={metric.icon}
          compact={compact}
          mobileKeyMetric={index < 3}
          className={index >= 3 ? 'hidden tablet:block' : ''}
          valueClassName={metricValueToneClass(metric.label)}
        />
      ))}
    </div>
  );
}
