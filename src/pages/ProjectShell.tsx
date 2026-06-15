import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { EmptyState } from '../components/common/ui';
import { NAV_ITEMS } from '../data/navigation';
import { getFuelView, useProjectData } from '../data/normalize';
import { REGIONS, type Fuel } from '../context/LocationContext';
import { LocationProvider, useLocationSelection } from '../context/LocationContext';
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

function ProjectShellContent() {
  const [tab, setTab] = useState<string>(() => readHashTab());
  const [reloadKey, setReloadKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [liveText, setLiveText] = useState('10분 전 업데이트');
  const [favoriteStationIds, setFavoriteStationIds] = useState<string[]>([]);
  const selection = useLocationSelection();
  const selectedFuel = selection.fuel;
  const selectedRegion = selection.region;
  const locating = selection.locating;
  const userCoordinates = selection.coordinates;
  const rawData = useProjectData(reloadKey);
  const data = useMemo(() => getFuelView(rawData, selectedFuel, selectedRegion), [rawData, selectedFuel, selectedRegion]);

  useEffect(() => {
    setLiveText(selection.isMyLocation ? `${selectedRegion} 위치 기준 · 10분 전 업데이트` : `${selectedRegion} ${selectedFuel} · 10분 전 업데이트`);
  }, [selectedRegion, selectedFuel, selection.isMyLocation]);

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

  const toggleFavoriteStation = (id: string) => {
    setFavoriteStationIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    setLiveText('저장 주유소 반영');
  };

  const handleFuelChange = (fuel: string) => {
    if (!rawData.fuelOptions.includes(fuel)) return;
    selection.setFuel(fuel as Fuel);
  };

  const handleRegionChange = (region: string) => {
    if (!REGIONS.includes(region as typeof REGIONS[number])) return;
    selection.setRegion(region);
  };

  const handleUseLocation = async () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLiveText('위치 권한을 사용할 수 없습니다');
      return;
    }
    const ok = await selection.useMyLocation();
    setLiveText(ok ? '내 위치 기준 · 최근 저장 기준' : '위치 권한 확인 필요');
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setReloadKey((value) => value + 1);
    setLiveText('10분 전 업데이트');
    window.setTimeout(() => setRefreshing(false), 520);
  };

  const dataReady = data.sourceLoaded && data.stations.length > 0;
  const Panel = useMemo(() => ({ home: HomePage, stations: StationsPage, analysis: AnalysisPage, trend: TrendPage, records: RecordsPage, favorites: FavoritesPage, 'fuel-news': FuelNewsPage, alerts: AlertsPage, guide: GuidePage, notice: NoticePage })[tab] ?? HomePage, [tab]);

  return (
    <AppLayout kind="sidebar" appName="리터세이브" source="OPINET 업데이트" tab={tab} navItems={NAV_ITEMS} onTabChange={updateTab} onRefresh={handleRefresh} refreshing={refreshing} liveText={liveText}>
      {dataReady ? <Panel data={data} onTabChange={updateTab} onAction={setLiveText} favoriteStationIds={favoriteStationIds} onFavoriteToggle={toggleFavoriteStation} selectedFuel={selectedFuel} onFuelChange={handleFuelChange} selectedRegion={selectedRegion} regionOptions={REGIONS} onRegionChange={handleRegionChange} onUseLocation={handleUseLocation} locating={locating} isMyLocation={selection.isMyLocation} userCoordinates={userCoordinates} /> : <div className="mx-auto max-w-shell"><EmptyState title="주유소 가격 데이터" actionLabel="새로 고침" onAction={handleRefresh} /></div>}
    </AppLayout>
  );
}

export function ProjectShell() {
  return <LocationProvider><ProjectShellContent /></LocationProvider>;
}
