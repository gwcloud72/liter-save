import type { ReactNode } from 'react';

export interface MobileKeyMetricItem {
  label: string;
  value: ReactNode;
  supportingText?: string;
}

export interface MobileKeyMetricsProps {
  items: MobileKeyMetricItem[];
  ariaLabel?: string;
  className?: string;
}

export function MobileKeyMetrics({
  items,
  ariaLabel = '핵심 지표',
  className = '',
}: MobileKeyMetricsProps) {
  return (
    <dl
      aria-label={ariaLabel}
      className={[
        'grid grid-cols-3 gap-px overflow-hidden rounded-card border border-ink-200 bg-ink-200 shadow-card tablet:hidden',
        className,
      ].filter(Boolean).join(' ')}
    >
      {items.slice(0, 3).map((item) => (
        <div
          key={item.label}
          data-mobile-key-metric="true"
          className="min-w-0 bg-white px-ds-1.5 py-ds-2 text-center"
        >
          <dt className="truncate text-[11px] font-bold text-ink-500">{item.label}</dt>
          <dd className="mt-ds-0.5 truncate text-[16px] font-bold leading-tight text-ink-900 tabular">
            {item.value}
          </dd>
          {item.supportingText ? (
            <span className="mt-ds-0.5 block truncate text-[10px] text-ink-500">
              {item.supportingText}
            </span>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
