import { useMemo, useState } from 'react';
import { MoreHorizontal, X } from 'lucide-react';
import type { NavItem } from '../common/types';

interface MobileNavProps {
  navItems: NavItem[];
  tab: string;
  onTabChange: (tab: string) => void;
}

export function MobileNav({ navItems, tab, onTabChange }: MobileNavProps) {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const primaryNavigationItems = useMemo(() => (navItems.length > 5 ? navItems.slice(0, 4) : navItems.slice(0, 5)), [navItems]);
  const secondaryNavigationItems = useMemo(() => (navItems.length > 5 ? navItems.slice(4, 6) : []), [navItems]);
  const isSecondaryNavigationActive = secondaryNavigationItems.some((navigationItem) => navigationItem.id === tab);
  const selectNavigationTab = (nextTab: string) => {
    setIsMoreMenuOpen(false);
    onTabChange(nextTab);
  };

  return (
    <>
      {isMoreMenuOpen ? (
        <div className="fixed inset-x-0 bottom-mobile-nav-safe z-40 px-page-mobile tablet:px-page-tablet desktop:hidden" role="dialog" aria-modal="true" aria-label="더보기 메뉴">
          <div className="rounded-card-lg border border-ink-200 bg-white p-ds-2 shadow-popover">
            <div className="mb-ds-1 flex items-center justify-between">
              <strong className="text-sm text-ink-900">더보기</strong>
              <button type="button" onClick={() => setIsMoreMenuOpen(false)} className="flex h-control-sm w-control-sm items-center justify-center rounded-pill text-ink-600 hover:bg-ink-100 focus:outline-none focus:ring-4 focus:ring-primary-100" aria-label="더보기 닫기">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-ds-1.5">
              {secondaryNavigationItems.map((navigationItem) => {
                const Icon = navigationItem.icon;
                const isActive = tab === navigationItem.id;
                return (
                  <button
                    type="button"
                    key={navigationItem.id}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => selectNavigationTab(navigationItem.id)}
                    className={`flex min-h-control-lg items-center gap-ds-1.5 rounded-card border px-ds-2 text-left text-sm font-bold focus:outline-none focus:ring-4 focus:ring-primary-100 ${isActive ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-ink-200 bg-white text-ink-700 hover:bg-ink-50 hover:text-ink-900'}`}
                  >
                    <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} aria-hidden="true" />
                    <span className="min-w-0 truncate whitespace-nowrap">{navigationItem.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
      <nav aria-label="모바일 하단 탭" data-mobile-bottom-navigation="true" className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-white pb-safe-area-bottom desktop:hidden">
        <div className="grid min-h-mobile-nav grid-cols-5 gap-ds-0.5 px-ds-1 py-ds-1">
          {primaryNavigationItems.map((navigationItem) => {
            const Icon = navigationItem.icon;
            const isActive = tab === navigationItem.id;
            return (
              <button
                type="button"
                key={navigationItem.id}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => selectNavigationTab(navigationItem.id)}
                className={`flex min-h-control-lg min-w-0 flex-col items-center justify-center gap-ds-0.5 rounded-control px-ds-0.5 text-micro font-bold leading-tight focus:outline-none focus:ring-4 focus:ring-primary-100 ${isActive ? 'bg-primary-50 text-primary-700' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'}`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.2 : 1.9} aria-hidden="true" />
                <span className="max-w-full truncate whitespace-nowrap">{navigationItem.label}</span>
              </button>
            );
          })}
          {secondaryNavigationItems.length ? (
            <button
              type="button"
              aria-expanded={isMoreMenuOpen}
              aria-current={isSecondaryNavigationActive ? 'page' : undefined}
              onClick={() => setIsMoreMenuOpen((currentValue) => !currentValue)}
              className={`flex min-h-control-lg min-w-0 flex-col items-center justify-center gap-ds-0.5 rounded-control px-ds-0.5 text-micro font-bold leading-tight focus:outline-none focus:ring-4 focus:ring-primary-100 ${isSecondaryNavigationActive || isMoreMenuOpen ? 'bg-primary-50 text-primary-700' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'}`}
            >
              <MoreHorizontal size={18} aria-hidden="true" />
              <span className="whitespace-nowrap">더보기</span>
            </button>
          ) : null}
        </div>
      </nav>
    </>
  );
}
