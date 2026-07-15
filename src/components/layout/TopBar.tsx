import { Fuel, Leaf, RefreshCw, ScrollText } from 'lucide-react';
import { PageContainer } from './PagePrimitives';

interface TopBarProps {
  appName: string;
  source: string;
  onRefresh: () => void;
  refreshing: boolean;
  liveText: string;
}

function BrandIcon({ appName }: { appName: string }) {
  if (appName.includes('리터')) return <Fuel size={18} strokeWidth={1.8} />;
  if (appName.includes('상장')) return <ScrollText size={18} strokeWidth={1.8} />;
  return <Leaf size={18} strokeWidth={1.8} />;
}

function brandMarkClass(appName: string): string {
  return appName.includes('상장') ? 'rounded-control bg-ink-900' : 'rounded-pill bg-ink-900';
}

function RefreshButton({ onRefresh, refreshing, compact = false }: { onRefresh: () => void; refreshing: boolean; compact?: boolean }) {
  return (
    <button type="button" onClick={onRefresh} className={`flex h-control-md min-w-control-lg shrink-0 items-center justify-center gap-ds-1 rounded-control border border-ink-200 bg-white px-ds-1.5 text-caption font-bold text-ink-700 hover:border-ink-400 hover:text-ink-900 focus:outline-none focus:ring-4 focus:ring-primary-100 ${refreshing ? 'refresh-spin' : ''}`}>
      <RefreshCw size={16} strokeWidth={1.8} />
      <span>{compact ? '갱신' : '다시 불러오기'}</span>
    </button>
  );
}

export function TopBar({ appName, source, onRefresh, refreshing, liveText }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 h-topbar border-b border-ink-200 bg-white">
      <PageContainer className="flex h-full items-center justify-between gap-ds-1 desktop:hidden">
        <div className="flex min-w-0 flex-1 items-center gap-ds-1">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center text-white ${brandMarkClass(appName)}`}><BrandIcon appName={appName} /></span>
          <strong className="truncate text-base font-bold tracking-tight text-ink-900 compact:text-lg">{appName}</strong>
        </div>
        <RefreshButton onRefresh={onRefresh} refreshing={refreshing} compact />
      </PageContainer>
      <div className="hidden h-full min-w-0 desktop:flex">
        <div className="flex w-sidebar shrink-0 items-center gap-ds-1.5 border-r border-ink-200 px-ds-2.5">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center text-white ${brandMarkClass(appName)}`}><BrandIcon appName={appName} /></span>
          <strong className="truncate text-[16px] font-black tracking-tight text-ink-900">{appName}</strong>
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-between gap-ds-3 px-page-desktop">
          <div className="flex min-w-0 items-center gap-ds-2 text-[13px] text-ink-600" aria-live="polite">
            <span className="live-dot h-2 w-2 shrink-0 rounded-pill bg-live" />
            <span className="truncate"><b className="text-ink-800">{source}</b> · {liveText}</span>
          </div>
          <RefreshButton onRefresh={onRefresh} refreshing={refreshing} />
        </div>
      </div>
    </header>
  );
}
