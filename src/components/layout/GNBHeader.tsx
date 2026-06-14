import { RefreshCw, ScrollText } from 'lucide-react';
import type { NavItem } from '../common/types';

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
  return <header className="sticky top-0 z-40 flex h-topbar items-center border-b border-ink-200 bg-white px-ds-3"><div className="mr-ds-3 flex shrink-0 items-center gap-ds-1"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-ink-900 text-white"><ScrollText size={18} strokeWidth={1.8} /></span><strong className="text-lg font-bold text-ink-900">{appName}</strong></div><nav className="flex h-full flex-1 items-center gap-ds-1 overflow-hidden" aria-label="상단 메뉴">{navItems.map((item) => { const active = tab === item.id; return <button type="button" key={item.id} aria-current={active ? 'page' : undefined} onClick={() => onTabChange(item.id)} className={`flex h-full shrink-0 items-center border-b-3 px-ds-2 text-sm transition focus:outline-none focus:ring-4 focus:ring-primary-100 ${active ? 'gnb-tab-active text-primary-600' : 'text-ink-700 hover:text-primary-600'}`}>{item.label}</button>; })}</nav><div className="hidden items-center gap-ds-1 text-caption text-ink-500 xl:flex" aria-live="polite"><span className="live-dot h-2 w-2 rounded-full bg-live" />{source} · {liveText}</div><button type="button" onClick={onRefresh} className={`ml-2 flex h-9 items-center gap-ds-1 rounded-md border border-ink-200 px-ds-2 text-caption font-bold text-ink-700 hover:border-primary-500 hover:text-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100 ${refreshing ? 'refresh-spin' : ''}`}><RefreshCw size={16} strokeWidth={1.8} />새로 고침</button></header>;
}
