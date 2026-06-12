import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

export interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: string;
  onAction?: () => void;
  eyebrow?: string;
  aside?: ReactNode;
}

export function SectionHeader({ title, description, action, onAction, eyebrow, aside }: SectionHeaderProps) {
  return (
    <div className="mb-ds-2 flex items-start justify-between gap-ds-3">
      <div className="min-w-0">
        {eyebrow ? <p className="mb-ds-0.5 text-caption font-semibold text-primary-600">{eyebrow}</p> : null}
        <h2 className="text-heading-2 text-ink-900">{title}</h2>
        {description ? <p className="mt-ds-0.5 text-caption text-ink-500">{description}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-ds-1">
        {aside}
        {action ? (
          <button type="button" onClick={onAction} className="inline-flex items-center gap-ds-0.5 rounded-sm px-ds-1 py-ds-0.5 text-caption font-semibold text-primary-500 hover:bg-primary-50 hover:underline focus-visible:outline-none focus-visible:shadow-focus">
            {action}<ChevronRight className="h-4 w-4" strokeWidth={1.8} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
