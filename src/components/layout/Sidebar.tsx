import type { NavItem } from '../common/types';

interface SidebarProps {
  navItems: NavItem[];
  tab: string;
  onTabChange: (tab: string) => void;
}

export function Sidebar({ navItems, tab, onTabChange }: SidebarProps) {
  return <aside className="sticky top-topbar hidden h-screen-shell w-sidebar shrink-0 border-r border-ink-200 bg-white pt-ds-1 lg:block"><nav className="space-y-ds-0.5 px-ds-1">{navItems.map((item) => { const Icon = item.icon; const active = tab === item.id; return <button type="button" key={item.id} aria-current={active ? 'page' : undefined} onClick={() => onTabChange(item.id)} className={`flex w-full items-center gap-ds-2 rounded-lg px-ds-2 py-ds-1 text-left text-sm transition focus:outline-none focus:ring-4 focus:ring-primary-100 ${active ? 'bg-primary-100 font-bold text-primary-600' : 'text-ink-700 hover:bg-ink-100'}`}><Icon size={20} strokeWidth={1.8} className={active ? 'text-primary-600' : 'text-ink-400'} />{item.label}</button>; })}</nav></aside>;
}
