import type { LucideIcon } from 'lucide-react';

export interface MetricCardProps {
  label: string;
  value: string;
  subtitle?: string;
  icon?: LucideIcon;
  compact?: boolean;
  valueClassName?: string;
  className?: string;
  mobileKeyMetric?: boolean;
}

export function MetricCard({
  label,
  value,
  subtitle,
  icon: Icon,
  compact = false,
  valueClassName = 'text-ink-900',
  className = '',
  mobileKeyMetric = false,
}: MetricCardProps) {
  return (
    <article
      role="listitem"
      data-mobile-key-metric={mobileKeyMetric ? 'true' : undefined}
      className={[
        'relative min-w-0 bg-white',
        compact ? 'min-h-stat-compact p-ds-2' : 'min-h-stat p-ds-2 tablet:p-ds-2.5 desktop:p-ds-3',
        className,
      ].filter(Boolean).join(' ')}
    >
      <p className="text-caption font-bold text-ink-500">{label}</p>
      <strong className={`mt-ds-1 block text-price-lg tabular ${valueClassName}`}>{value}</strong>
      {subtitle ? <span className="v6-two-line mt-ds-0.5 block text-caption text-ink-500">{subtitle}</span> : null}
      {Icon ? <Icon className="absolute right-ds-2 top-ds-2 h-5 w-5 text-ink-400" strokeWidth={1.8} aria-hidden="true" /> : null}
    </article>
  );
}
