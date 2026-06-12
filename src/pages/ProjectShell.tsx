import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { EmptyState } from '../components/common/ui';
import { NAV_ITEMS } from '../data/navigation';
import { useProjectData } from '../data/normalize';
import { HomePage } from './HomePage';
import { StationsPage, AnalysisPage, TrendPage, RecordsPage, FavoritesPage, FuelNewsPage, AlertsPage, GuidePage, NoticePage } from './tabs/LiterTabs';

const VALID_TABS = NAV_ITEMS.map((item) => item.id);

function readHashTab(): string {
  if (typeof window === 'undefined') return 'home';
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw) return 'home';
  const params = new URLSearchParams(raw.includes('=') ? raw : `tab=${raw}`);
  const next = params.get('tab') ?? 'home';
  return VALID_TABS.includes(next) ? next : 'home';
}

export function ProjectShell() {
  const [tab, setTab] = useState<string>(() => readHashTab());
  const [reloadKey, setReloadKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [liveText, setLiveText] = useState('최신 정보 표시 중');
  const data = useProjectData(reloadKey);

  useEffect(() => {
    const syncHash = () => setTab(readHashTab());
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  const updateTab = (next: string) => {
    if (!VALID_TABS.includes(next)) return;
    const params = new URLSearchParams();
    params.set('tab', next);
    window.history.replaceState(null, '', `#${params.toString()}`);
    setTab(next);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setReloadKey((value) => value + 1);
    setLiveText('방금 갱신됨');
    window.setTimeout(() => setRefreshing(false), 520);
  };

  const dataReady = data.sourceLoaded && data.stations.length > 0;

  const Panel = useMemo(() => ({ home: HomePage, stations: StationsPage, analysis: AnalysisPage, trend: TrendPage, records: RecordsPage, favorites: FavoritesPage, 'fuel-news': FuelNewsPage, alerts: AlertsPage, guide: GuidePage, notice: NoticePage })[tab] ?? HomePage, [tab]);

  return (
    <AppLayout kind="sidebar" appName="리터세이브" source="OPINET 업데이트" tab={tab} navItems={NAV_ITEMS} onTabChange={updateTab} onRefresh={handleRefresh} refreshing={refreshing} liveText={liveText}>
      {dataReady ? <Panel data={data} onTabChange={updateTab} onAction={setLiveText} /> : <div className="mx-auto max-w-shell"><EmptyState title="주유소 가격 데이터" description="최신 가격 정보 확인 후 최저가와 지도 정보가 표시됩니다." actionLabel="새로 고침" onAction={handleRefresh} /></div>}
    </AppLayout>
  );
}
