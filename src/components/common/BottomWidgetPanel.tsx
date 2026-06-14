import { ChevronRight } from 'lucide-react';
import type { BottomWidget } from './types';
import { Card } from './Card';

export interface BottomWidgetPanelProps {
  widgets: BottomWidget[];
  onAction: (label: string) => void;
  compact?: boolean;
}

export function BottomWidgetPanel({ widgets, onAction, compact = false }: BottomWidgetPanelProps) {
  return (
    <div className="grid grid-cols-1 gap-ds-2 xl:grid-cols-3">
      {widgets.map((widget) => (
        <Card key={widget.title} padding={compact ? 'compact' : 'normal'} interactive>
          <div className="mb-ds-2 flex items-center justify-between gap-ds-2">
            <h3 className="text-heading-3 text-ink-900">{widget.title}</h3>
            <button type="button" onClick={() => onAction(widget.action)} className="shrink-0 rounded-sm px-ds-1 py-ds-0.5 text-caption font-bold text-primary-500 hover:bg-primary-50 hover:underline focus-visible:outline-none focus-visible:shadow-focus">{widget.action}</button>
          </div>
          <ul className={compact ? 'space-y-ds-1' : 'space-y-ds-1'}>
            {widget.items.slice(0, compact ? 3 : 4).map((item) => (
              <li key={item}>
                <button type="button" onClick={() => onAction(item)} className="flex w-full items-center justify-between gap-ds-1 rounded-md bg-ink-50 px-ds-2 py-ds-1.5 text-left text-caption text-ink-700 transition-fast duration-fast hover:bg-primary-50 focus-visible:outline-none focus-visible:shadow-focus">
                  <span className="truncate">{item}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-400" strokeWidth={1.8} />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
