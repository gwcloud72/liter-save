import { useEffect, useState, type ReactNode, type SyntheticEvent } from 'react';
import { ChevronDown } from 'lucide-react';

export interface MobileDisclosureProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  contentClassName?: string;
}

function mobileViewportMatches(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(max-width: 1023px)').matches;
}

export function MobileDisclosure({
  title,
  children,
  defaultOpen = false,
  className = '',
  contentClassName = '',
}: MobileDisclosureProps) {
  const [isMobileViewport, setIsMobileViewport] = useState(mobileViewportMatches);
  const [isMobileOpen, setIsMobileOpen] = useState(defaultOpen);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(max-width: 1023px)');
    const updateViewport = () => setIsMobileViewport(query.matches);
    updateViewport();
    query.addEventListener?.('change', updateViewport);
    return () => query.removeEventListener?.('change', updateViewport);
  }, []);

  const handleToggle = (event: SyntheticEvent<HTMLDetailsElement>) => {
    if (isMobileViewport) setIsMobileOpen(event.currentTarget.open);
  };

  return (
    <details
      open={isMobileViewport ? isMobileOpen : true}
      onToggle={handleToggle}
      data-mobile-disclosure="true"
      className={['min-w-0', className].filter(Boolean).join(' ')}
    >
      <summary className="group flex min-h-control-lg cursor-pointer list-none items-center justify-between gap-ds-2 rounded-card border border-ink-200 bg-white px-ds-2 py-ds-1.5 text-[14px] font-bold text-ink-800 shadow-card focus-visible:outline-none focus-visible:shadow-focus tablet:hidden">
        <span>{title}</span>
        <ChevronDown className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className={['pt-ds-2 tablet:pt-0', contentClassName].filter(Boolean).join(' ')}>
        {children}
      </div>
    </details>
  );
}
