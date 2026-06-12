import type { ElementType, HTMLAttributes, ReactNode } from 'react';

export type CardTone = 'default' | 'muted' | 'accent' | 'danger' | 'warning';
export type CardPadding = 'none' | 'compact' | 'normal' | 'spacious';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  as?: ElementType;
  tone?: CardTone;
  padding?: CardPadding;
  interactive?: boolean;
  selected?: boolean;
  loading?: boolean;
}

const toneClasses: Record<CardTone, string> = {
  default: 'border-ink-200 bg-white',
  muted: 'border-ink-200 bg-ink-50',
  accent: 'border-primary-400 bg-primary-50',
  danger: 'border-up bg-up-bg',
  warning: 'border-warn-border bg-warn-bg',
};

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  compact: 'p-ds-2',
  normal: 'p-ds-3',
  spacious: 'p-ds-4',
};

export function Card({
  children,
  as: Component = 'section',
  tone = 'default',
  padding = 'none',
  interactive = true,
  selected = false,
  loading = false,
  className = '',
  ...props
}: CardProps) {
  return (
    <Component
      aria-busy={loading || undefined}
      data-selected={selected || undefined}
      className={[
        'rounded-lg border shadow-card transition-fast duration-fast ease-product',
        'focus-within:shadow-focus',
        toneClasses[tone],
        paddingClasses[padding],
        interactive ? 'hover:border-primary-400 hover:shadow-card-hover' : '',
        selected ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500' : '',
        loading ? 'pointer-events-none opacity-70' : '',
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {loading ? <div className="mb-ds-2 h-ds-2 w-2/5 rounded-md ds-skeleton" /> : null}
      {children}
    </Component>
  );
}
