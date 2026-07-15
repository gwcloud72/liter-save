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

const cardToneClasses: Record<CardTone, string> = {
  default: 'border-ink-200 bg-white',
  muted: 'border-ink-200 bg-ink-50',
  accent: 'border-primary-100 bg-primary-50',
  danger: 'border-up bg-up-bg',
  warning: 'border-warn-border bg-warn-bg',
};

const cardPaddingClasses: Record<CardPadding, string> = {
  none: '',
  compact: 'p-ds-1.5 tablet:p-ds-2',
  normal: 'p-card-pad-compact tablet:p-card-pad-medium desktop:p-card-pad-expanded',
  spacious: 'p-ds-3 desktop:p-ds-4',
};

export function Card({
  children,
  as: Component = 'section',
  tone = 'default',
  padding = 'none',
  interactive = false,
  selected = false,
  loading = false,
  className = '',
  ...props
}: CardProps) {
  return (
    <Component
      {...props}
      aria-busy={loading || undefined}
      data-ui-card="true"
      data-card-tone={tone}
      data-card-padding={padding}
      data-selected={selected || undefined}
      className={[
        'min-w-0 rounded-card border shadow-card transition-fast duration-fast ease-product',
        'focus-within:shadow-focus',
        cardToneClasses[tone],
        cardPaddingClasses[padding],
        interactive ? 'hover:border-ink-400 hover:shadow-card-hover' : '',
        selected ? 'border-primary-400 bg-white ring-1 ring-primary-100' : '',
        loading ? 'pointer-events-none opacity-70' : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      {loading ? <div className="mb-ds-2 h-ds-2 w-2/5 rounded-control ds-skeleton" /> : null}
      {children}
    </Component>
  );
}
