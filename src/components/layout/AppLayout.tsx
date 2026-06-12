import type { ReactNode } from 'react';
import type { LayoutKind, NavItem } from '../common/types';
import { SkipLink } from '../common/ui';
import { GNBHeader } from './GNBHeader';
import { MobileNav } from './MobileNav';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export interface AppLayoutProps {
  kind: LayoutKind;
  appName: string;
  source: string;
  tab: string;
  navItems: NavItem[];
  children: ReactNode;
  rightRail?: ReactNode;
  onTabChange: (tab: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
  liveText: string;
}

export function AppLayout({ kind, appName, source, tab, navItems, children, rightRail, onTabChange, onRefresh, refreshing, liveText }: AppLayoutProps) {
  if (kind === 'gnb') {
    return <><SkipLink /><GNBHeader appName={appName} source={source} tab={tab} navItems={navItems} onTabChange={onTabChange} onRefresh={onRefresh} refreshing={refreshing} liveText={liveText} /><main id="main-content" className="mx-auto grid max-w-content gap-ds-3 px-ds-3 py-ds-3 xl:grid-cols-main-right">{children}{rightRail}</main><MobileNav navItems={navItems} tab={tab} onTabChange={onTabChange} /></>;
  }
  return <><SkipLink /><TopBar appName={appName} source={source} onRefresh={onRefresh} refreshing={refreshing} liveText={liveText} /><div className="flex"><Sidebar navItems={navItems} tab={tab} onTabChange={onTabChange} /><main id="main-content" className="min-h-screen-shell flex-1 px-ds-2 py-ds-3 lg:px-ds-3">{children}</main></div><MobileNav navItems={navItems} tab={tab} onTabChange={onTabChange} /></>;
}
