import { ChevronDown, RefreshCw, ScrollText } from 'lucide-react';
import type { NavItem } from '../common/types';
import { PageContainer } from './PagePrimitives';

interface GNBHeaderProps {
  appName: string;
  source: string;
  tab: string;
  navItems: NavItem[];
  onTabChange: (tab: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
  liveText: string;
}

export function GNBHeader({ appName, source, tab, navItems, onTabChange, onRefresh, refreshing, liveText }: GNBHeaderProps) {
  const primaryNavigationItems = navItems.length > 5 ? navItems.slice(0, 4) : navItems;
  const moreItems = navItems.length > 5 ? navItems.slice(4, 6) : [];
  const isSecondaryNavigationActive = moreItems.some((navigationItem) => navigationItem.id === tab);

  return (
    <header className="sticky top-0 z-40 h-topbar border-b border-ink-200 bg-white">
      <PageContainer className="flex h-full items-center">
        <div className="mr-ds-2 flex shrink-0 items-center gap-ds-1 wide:mr-ds-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-control bg-ink-900 text-white"><ScrollText size={18} strokeWidth={1.8} /></span>
          <strong className="text-base font-bold text-ink-900 wide:text-lg">{appName}</strong>
        </div>
        <nav className="flex h-full min-w-0 flex-1 items-center overflow-hidden" aria-label="상단 메뉴">
          {primaryNavigationItems.map((navigationItem) => {
            const isActive = tab === navigationItem.id;
            return (
              <button
                type="button"
                key={navigationItem.id}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onTabChange(navigationItem.id)}
                className={`gnb-tab flex h-full shrink-0 items-center border-b-3 px-ds-1 text-caption font-bold transition focus:outline-none focus:ring-4 focus:ring-primary-100 wide:px-ds-1.5 wide:text-body-1 ${isActive ? 'gnb-tab-active text-ink-900' : 'text-ink-700 hover:text-ink-900'}`}
              >
                {navigationItem.label}
              </button>
            );
          })}
          {moreItems.length ? (
            <details className="relative h-full shrink-0" open={isSecondaryNavigationActive}>
              <summary className={`gnb-tab flex h-full cursor-pointer list-none items-center gap-ds-0.5 border-b-3 px-ds-1 text-caption font-bold transition marker:hidden focus:outline-none wide:px-ds-1.5 wide:text-body-1 ${isSecondaryNavigationActive ? 'gnb-tab-active text-ink-900' : 'text-ink-700 hover:text-ink-900'}`}>
                더보기<ChevronDown size={14} strokeWidth={1.8} aria-hidden="true" />
              </summary>
              <div className="absolute right-0 top-full z-50 min-w-28 rounded-control border border-ink-200 bg-white p-ds-0.5 shadow-popover">
                {moreItems.map((navigationItem) => {
                  const isActive = tab === navigationItem.id;
                  return (
                    <button
                      type="button"
                      key={navigationItem.id}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => onTabChange(navigationItem.id)}
                      className={`block min-h-control-lg desktop:min-h-control-sm w-full rounded-control px-ds-1.5 py-ds-1 text-left text-sm font-bold ${isActive ? 'bg-primary-50 text-primary-700' : 'text-ink-700 hover:bg-ink-50'}`}
                    >
                      {navigationItem.label}
                    </button>
                  );
                })}
              </div>
            </details>
          ) : null}
        </nav>
        <div className="hidden shrink-0 items-center gap-ds-1 text-caption text-ink-500 large:flex" aria-live="polite"><span className="live-dot h-2 w-2 rounded-pill bg-live" />{source} · {liveText}</div>
        <button type="button" onClick={onRefresh} className={`ml-ds-1 flex h-control-sm shrink-0 items-center gap-ds-1 rounded-control border border-ink-200 px-ds-1.5 text-caption font-bold text-ink-700 hover:border-ink-400 hover:text-ink-900 focus:outline-none focus:ring-4 focus:ring-primary-100 wide:ml-ds-2 wide:px-ds-2 ${refreshing ? 'refresh-spin' : ''}`}><RefreshCw size={16} strokeWidth={1.8} /><span className="hidden wide:inline">새로 고침</span></button>
      </PageContainer>
    </header>
  );
}
