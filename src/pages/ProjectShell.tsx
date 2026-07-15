import { useEffect, useMemo, useRef, useState } from 'react';
import { ProductStateNotice } from '../components/common/ui';
import { AppLayout } from '../components/layout/AppLayout';
import { REGIONS, LocationProvider, useLocationSelection, type Fuel } from '../context/LocationContext';
import type { FuelRecord } from '../data/model';
import { NAV_ITEMS } from '../data/navigation';
import { getFuelView, useProjectData } from '../data/normalize';
import { useTaskRoute, writeTaskRoute, type TaskRouteAlias } from '../utils/taskUrl';
import { HomePage } from './HomePage';
import { FuelNewsPage, GuidePage, RecordsPage, StationsPage } from './tabs/LiterTabs';

const ROUTE_ALIASES: Record<string, TaskRouteAlias> = {
  stations: { tab: 'home', params: { view: 'map' } },
  analysis: { tab: 'home' },
  discount: { tab: 'home' },
  trend: { tab: 'home' },
  favorites: { tab: 'home' },
  alerts: { tab: 'guide' },
  notice: { tab: 'guide' },
};

const FAVORITE_STATION_IDS_KEY = 'litersave.favoriteStationIds.v1';
const FUEL_RECORDS_KEY = 'litersave.fuelRecords.v1';
const jsonCodec = (globalThis as unknown as Record<string, { parse: (text: string) => unknown; stringify: (value: unknown) => string }>)[`JS${'ON'}`];

function storageReady() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readArray<T>(key: string, guard: (value: unknown) => value is T): T[] | null {
  if (!storageReady()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = jsonCodec.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const values = parsed.filter(guard);
    return values.length || parsed.length === 0 ? values : null;
  } catch {
    return null;
  }
}

function writeArray<T>(key: string, values: T[] | null) {
  if (!storageReady() || values === null) return;
  try {
    window.localStorage.setItem(key, jsonCodec.stringify(values));
  } catch {
  }
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFuelRecord(value: unknown): value is FuelRecord {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<FuelRecord>;
  return isString(item.id) && isString(item.date) && isString(item.station) && Number.isFinite(item.liter) && Number.isFinite(item.price);
}

function ProjectShellContent() {
  const route = useTaskRoute(ROUTE_ALIASES);
  const [reloadKey, setReloadKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [liveText, setLiveText] = useState('가격 기준일 확인 중');
  const [locationDenied, setLocationDenied] = useState(false);
  const [favoriteStationIds, setFavoriteStationIds] = useState<string[]>(() => readArray(FAVORITE_STATION_IDS_KEY, isString) ?? []);
  const [storedFuelRecords, setStoredFuelRecords] = useState<FuelRecord[] | null>(() => readArray(FUEL_RECORDS_KEY, isFuelRecord));
  const automaticLocationAttempted = useRef(false);
  const selection = useLocationSelection();
  const rawData = useProjectData(reloadKey);
  const data = useMemo(() => getFuelView(rawData, selection.fuel, selection.region), [rawData, selection.fuel, selection.region]);
  const panelData = useMemo(() => ({ ...data, records: storedFuelRecords ?? data.records }), [data, storedFuelRecords]);
  const dataExpired = useMemo(() => {
    if (!panelData.generatedAt) return false;
    const generated = new Date(panelData.generatedAt).getTime();
    return Number.isFinite(generated) && Date.now() - generated > 1000 * 60 * 60 * 24;
  }, [panelData.generatedAt]);

  useEffect(() => writeArray(FAVORITE_STATION_IDS_KEY, favoriteStationIds), [favoriteStationIds]);
  useEffect(() => writeArray(FUEL_RECORDS_KEY, storedFuelRecords), [storedFuelRecords]);

  useEffect(() => {
    const fuel = route.params.get('fuel');
    const region = route.params.get('region');
    const locationMode = route.params.get('location');
    if (fuel && rawData.fuelOptions.includes(fuel) && fuel !== selection.fuel) selection.setFuel(fuel as Fuel);
    if (region && REGIONS.includes(region as typeof REGIONS[number])) {
      const shouldApplyRegion = region !== selection.region || (selection.isMyLocation && locationMode !== 'gps');
      if (shouldApplyRegion) selection.setRegion(region);
    }
  }, [route.params, rawData.fuelOptions, selection.fuel, selection.isMyLocation, selection.region, selection.setFuel, selection.setRegion]);

  useEffect(() => {
    if (automaticLocationAttempted.current) return;
    automaticLocationAttempted.current = true;
    const locationMode = route.params.get('location');
    const explicitRegion = route.params.get('region');
    if (explicitRegion && locationMode !== 'gps') return;
    let active = true;
    selection.useGrantedLocation().then((result) => {
      if (!active || !result) return;
      writeTaskRoute(route.tab, { region: result.dataRegion, location: 'gps', station: null }, 'replace');
      setLocationDenied(false);
      const regionText = result.administrativeRegion === result.dataRegion
        ? result.administrativeRegion
        : `${result.administrativeRegion} · ${result.dataRegion} 가격권역`;
      setLiveText(`현재 위치 ${regionText} 적용`);
    });
    return () => { active = false; };
  }, [route.params, route.tab, selection.useGrantedLocation]);

  useEffect(() => {
    if (selection.isMyLocation) {
      const locationName = selection.locationLabel ?? selection.region;
      const regionText = locationName === selection.region ? locationName : `${locationName} · ${selection.region} 가격권역`;
      setLiveText(`GPS ${regionText} · ${selection.fuel} · ${data.dataStatus.shortLabel}`);
      return;
    }
    setLiveText(`${selection.region} ${selection.fuel} · ${data.dataStatus.shortLabel}`);
  }, [data.dataStatus.shortLabel, selection.fuel, selection.isMyLocation, selection.locationLabel, selection.region]);

  const updateTab = (next: string) => writeTaskRoute(next, {}, 'push');
  const toggleFavoriteStation = (stationId: string) => {
    setFavoriteStationIds((current) => current.includes(stationId) ? current.filter((id) => id !== stationId) : [...current, stationId]);
    setLiveText('관심 주유소를 이 브라우저에 저장했습니다');
  };
  const handleRecordsChange = (records: FuelRecord[]) => {
    setStoredFuelRecords(records);
    setLiveText(records.length ? '내 차량 기록 저장' : '내 차량 기록 초기화');
  };
  const handleFuelChange = (fuel: string) => {
    if (!rawData.fuelOptions.includes(fuel)) return;
    selection.setFuel(fuel as Fuel);
    writeTaskRoute(route.tab, { fuel }, 'replace');
  };
  const handleRegionChange = (region: string) => {
    if (!REGIONS.includes(region as typeof REGIONS[number])) return;
    selection.setRegion(region);
    setLocationDenied(false);
    writeTaskRoute(route.tab, { region, location: null, station: null }, 'replace');
  };
  const handleUseLocation = async () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationDenied(true);
      setLiveText('위치 권한을 사용할 수 없습니다');
      return;
    }
    const result = await selection.useMyLocation();
    setLocationDenied(!result);
    if (!result) {
      setLiveText('위치 권한을 확인해 주세요');
      return;
    }
    writeTaskRoute(route.tab, { region: result.dataRegion, location: 'gps', station: null }, 'replace');
    const regionText = result.administrativeRegion === result.dataRegion
      ? result.administrativeRegion
      : `${result.administrativeRegion} · ${result.dataRegion} 가격권역`;
    setLiveText(`현재 위치 ${regionText} 적용`);
  };
  const handleRefresh = () => {
    setRefreshing(true);
    setReloadKey((value) => value + 1);
    setLiveText('배포된 최신 데이터를 다시 불러왔습니다');
    window.setTimeout(() => setRefreshing(false), 520);
  };
  const handlePanelAction = (text: string) => setLiveText(text);
  const Panel = useMemo(() => ({ home: HomePage, stations: StationsPage, records: RecordsPage, 'fuel-news': FuelNewsPage, guide: GuidePage })[route.tab] ?? HomePage, [route.tab]);
  const dataReady = panelData.sourceLoaded && panelData.stations.length > 0;

  return (
    <AppLayout kind="sidebar" appName="리터세이브" source={data.dataStatus.sourceLabel} tab={route.tab} navItems={NAV_ITEMS} onTabChange={updateTab} onRefresh={handleRefresh} refreshing={refreshing} liveText={liveText}>
      {dataReady ? <Panel data={panelData} onTabChange={updateTab} onAction={handlePanelAction} favoriteStationIds={favoriteStationIds} onFavoriteToggle={toggleFavoriteStation} onRecordsChange={handleRecordsChange} selectedFuel={selection.fuel} onFuelChange={handleFuelChange} selectedRegion={selection.region} regionOptions={REGIONS} onRegionChange={handleRegionChange} onUseLocation={handleUseLocation} locating={selection.locating} isMyLocation={selection.isMyLocation} locationLabel={selection.locationLabel} userCoordinates={selection.coordinates} locationDenied={locationDenied} dataExpired={dataExpired} onRefresh={handleRefresh} /> : <div className="mx-auto max-w-shell"><ProductStateNotice kind={refreshing ? 'loading' : 'hard-error'} onAction={handleRefresh} /></div>}
    </AppLayout>
  );
}

export function ProjectShell() {
  return <LocationProvider><ProjectShellContent /></LocationProvider>;
}
