import type { NavItem } from '../common/types';

interface MobileNavProps {
  navItems: NavItem[];
  tab: string;
  onTabChange: (tab: string) => void;
}

export function MobileNav({ navItems, tab, onTabChange }: MobileNavProps) {
  return <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-ink-200 bg-white lg:hidden"><div className="flex overflow-x-auto px-ds-1 py-2">{navItems.slice(0, 6).map((item) => { const Icon = item.icon; const active = tab === item.id; return <button type="button" key={item.id} aria-current={active ? 'page' : undefined} onClick={() => onTabChange(item.id)} className={`flex min-w-nav-tap flex-col items-center gap-1 rounded-lg px-ds-1 py-ds-0.5 text-micro focus:outline-none focus:ring-4 focus:ring-primary-100 ${active ? 'bg-primary-100 text-primary-600' : 'text-ink-500'}`}><Icon size={18} strokeWidth={1.8} />{item.label}</button>; })}</div></div>;
}
