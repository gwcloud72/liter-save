import type { ReactNode } from 'react';
import { Newspaper, type LucideIcon } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
  footer?: ReactNode;
}

export function EmptyState({ title, description, icon: Icon = Newspaper, actionLabel, onAction, compact = false, footer }: EmptyStateProps) {
  return (
    <div className={["rounded-lg border border-ink-200 bg-white shadow-card", compact ? 'p-ds-2' : 'p-ds-3'].join(' ')}>
      <div className="flex items-center gap-ds-2">
        <span className="flex h-ds-6 w-ds-6 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-400">
          <Icon className="h-6 w-6" strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <p className="text-heading-3 text-ink-900">{title}</p>
          <p className="mt-ds-0.5 text-body-2 text-ink-500">{description}</p>
        </div>
        {actionLabel && onAction ? <Button variant="secondary" size="sm" onClick={onAction} className="ml-auto shrink-0">{actionLabel}</Button> : null}
      </div>
      {footer ? <div className="mt-ds-3">{footer}</div> : null}
    </div>
  );
}
