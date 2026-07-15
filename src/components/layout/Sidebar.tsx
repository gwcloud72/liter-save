import { MoreHorizontal } from 'lucide-react';
import type { NavItem } from '../common/types';

interface SidebarProps {
  navItems: NavItem[];
  tab: string;
  onTabChange: (tab: string) => void;
}

function SidebarNavigationButton({ item, active, onTabChange }: { item: NavItem; active: boolean; onTabChange: (tab: string) => void }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      onClick={() => onTabChange(item.id)}
      className={`flex min-h-control-md w-full items-center gap-ds-2 rounded-control px-ds-2 py-ds-1 text-left text-sm transition focus:outline-none focus:ring-4 focus:ring-primary-100 ${active ? 'bg-primary-50 font-bold text-primary-700' : 'text-ink-700 hover:bg-ink-100'}`}
    >
      <Icon size={20} strokeWidth={1.8} className={active ? 'text-primary-600' : 'text-ink-500'} aria-hidden="true" />
      <span className="truncate whitespace-nowrap">{item.label}</span>
    </button>
  );
}

export function Sidebar({ navItems, tab, onTabChange }: SidebarProps) {
  const primaryNavigationItems = navItems.length > 5 ? navItems.slice(0, 4) : navItems;
  const moreItems = navItems.length > 5 ? navItems.slice(4, 6) : [];
  const isSecondaryNavigationActive = moreItems.some((navigationItem) => navigationItem.id === tab);

  return (
    <aside className="sticky top-topbar hidden h-screen-shell w-sidebar shrink-0 overflow-y-auto border-r border-ink-200 bg-white py-ds-2 desktop:block">
      <nav className="space-y-ds-0.5 px-ds-1" aria-label="주요 메뉴">
        {primaryNavigationItems.map((navigationItem) => <SidebarNavigationButton key={navigationItem.id} item={navigationItem} active={tab === navigationItem.id} onTabChange={onTabChange} />)}
        {moreItems.length ? (
          <details className="group" open={isSecondaryNavigationActive}>
            <summary className={`flex min-h-control-md cursor-pointer list-none items-center gap-ds-2 rounded-control px-ds-2 py-ds-1 text-sm font-bold marker:hidden focus:outline-none focus:ring-4 focus:ring-primary-100 ${isSecondaryNavigationActive ? 'bg-primary-50 text-primary-700' : 'text-ink-700 hover:bg-ink-100'}`}>
              <MoreHorizontal size={20} strokeWidth={1.8} aria-hidden="true" />
              <span className="truncate whitespace-nowrap">더보기</span>
            </summary>
            <div className="mt-ds-0.5 space-y-ds-0.5 pl-ds-2">
              {moreItems.map((navigationItem) => <SidebarNavigationButton key={navigationItem.id} item={navigationItem} active={tab === navigationItem.id} onTabChange={onTabChange} />)}
            </div>
          </details>
        ) : null}
      </nav>
    </aside>
  );
}
