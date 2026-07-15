import type { ReactNode } from 'react';
import type { LayoutKind, NavItem } from '../common/types';
import { DataDisclaimer } from '../common/DataDisclaimer';
import { SkipLink } from '../common/ui';
import { GNBHeader } from './GNBHeader';
import { MobileNav } from './MobileNav';
import { PageContainer, PageStack } from './PagePrimitives';
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
    return (
      <>
        <SkipLink />
        <GNBHeader appName={appName} source={source} tab={tab} navItems={navItems} onTabChange={onTabChange} onRefresh={onRefresh} refreshing={refreshing} liveText={liveText} />
        <PageContainer
          as="main"
          id="main-content"
          className={`grid gap-card-mobile py-section-mobile tablet:gap-card-tablet tablet:py-section-tablet desktop:gap-card-desktop desktop:py-section-desktop ${rightRail ? 'wide:grid-cols-main-right' : ''}`}
        >
          <PageStack className="min-w-0 pb-mobile-content-safe desktop:pb-ds-8">
            {children}
            <DataDisclaimer />
          </PageStack>
          {rightRail ? <aside className="min-w-0">{rightRail}</aside> : null}
        </PageContainer>
        <MobileNav navItems={navItems} tab={tab} onTabChange={onTabChange} />
      </>
    );
  }

  return (
    <>
      <SkipLink />
      <TopBar appName={appName} source={source} onRefresh={onRefresh} refreshing={refreshing} liveText={liveText} />
      <div className="desktop:flex">
        <Sidebar navItems={navItems} tab={tab} onTabChange={onTabChange} />
        <main id="main-content" className="min-w-0 flex-1 bg-ink-50 desktop:min-h-screen-shell">
          <PageContainer className="py-section-mobile tablet:py-section-tablet desktop:py-section-desktop">
            <PageStack className="pb-mobile-content-safe desktop:pb-ds-8">
              {children}
              <DataDisclaimer />
            </PageStack>
          </PageContainer>
        </main>
      </div>
      <MobileNav navItems={navItems} tab={tab} onTabChange={onTabChange} />
    </>
  );
}
