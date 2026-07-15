import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

export interface SectionHeaderProps {
  title: string;
  action?: string;
  onAction?: () => void;
  eyebrow?: string;
  aside?: ReactNode;
}

export function SectionHeader({ title, action, onAction, eyebrow, aside }: SectionHeaderProps) {
  return (
    <div className="mb-ds-2 flex min-w-0 items-center justify-between gap-ds-2">
      <div className="min-w-0">
        {eyebrow ? <span className="mb-ds-0.5 block text-caption font-bold text-ink-700">{eyebrow}</span> : null}
        <h2 className="text-heading-2 text-ink-900">{title}</h2>
      </div>
      <div className="flex shrink-0 items-center gap-ds-1">
        {aside}
        {action ? (
          <button type="button" onClick={onAction} className="inline-flex min-h-control-lg desktop:min-h-control-sm items-center gap-ds-0.5 rounded-control px-ds-1.5 text-caption font-bold text-ink-700 hover:bg-ink-100 hover:underline focus-visible:outline-none focus-visible:shadow-focus">
            {action}<ChevronRight className="h-4 w-4" strokeWidth={1.8} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
