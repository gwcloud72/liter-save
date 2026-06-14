import { Fuel, Leaf, RefreshCw, ScrollText } from 'lucide-react';

interface TopBarProps {
  appName: string;
  source: string;
  onRefresh: () => void;
  refreshing: boolean;
  liveText: string;
}

function LogoIcon({ appName }: { appName: string }) {
  if (appName.includes('리터')) return <Fuel size={18} strokeWidth={1.8} />;
  if (appName.includes('상장')) return <ScrollText size={18} strokeWidth={1.8} />;
  return <Leaf size={18} strokeWidth={1.8} />;
}

function logoShape(appName: string): string {
  if (appName.includes('상장')) return 'rounded-md bg-ink-900';
  return 'rounded-full bg-primary-600';
}

export function TopBar({ appName, source, onRefresh, refreshing, liveText }: TopBarProps) {
  return <header className="sticky top-0 z-40 flex h-topbar items-center justify-between border-b border-ink-200 bg-white px-ds-3"><div className="flex w-sidebar items-center gap-ds-1"><span className={`flex h-8 w-8 items-center justify-center text-white ${logoShape(appName)}`}><LogoIcon appName={appName} /></span><strong className="text-lg font-bold tracking-tight text-ink-900">{appName}</strong></div><div className="hidden items-center gap-ds-1 text-caption text-ink-500 md:flex" aria-live="polite"><span className="live-dot h-2 w-2 rounded-full bg-live" />{source} · {liveText}</div><div className="flex items-center gap-ds-1"><button type="button" onClick={onRefresh} className={`flex h-9 items-center gap-ds-1 rounded-md border border-ink-200 px-ds-2 text-caption font-bold text-ink-700 hover:border-primary-500 hover:text-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100 ${refreshing ? 'refresh-spin' : ''}`}><RefreshCw size={16} strokeWidth={1.8} />새로 고침</button></div></header>;
}
