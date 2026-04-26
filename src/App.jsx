import { useCallback, useEffect, useMemo, useState } from 'react';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import FinderCard from './components/FinderCard.jsx';
import StationList from './components/StationList.jsx';
import NoticeCard from './components/NoticeCard.jsx';
import {
  decorateStations,
  getBestValueStation,
  getNearestStation,
  getPriceStats,
  SORT_MODE_LABELS,
  sortStations,
  uniqueOptions,
} from './utils/oilData.js';

const DATA_URL = `${import.meta.env.BASE_URL}data/oil-prices.json`;
const PAGE_SIZE = 10;
const THEME_STORAGE_KEY = 'liter-save-theme';
const LOCATION_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 1000 * 60 * 5,
  timeout: 1000 * 12,
};

function getStoredThemeMode() {
  if (typeof window === 'undefined') return 'system';

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return ['system', 'light', 'dark'].includes(stored) ? stored : 'system';
}

function getSystemTheme() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getLocationErrorMessage(error) {
  if (!error) return '현재 위치를 확인할 수 없습니다.';

  switch (error.code) {
    case 1:
      return '현재 위치 권한이 꺼져 있습니다.';
    case 2:
      return '현재 위치를 다시 확인해주세요.';
    case 3:
      return '위치 확인 시간이 초과되었습니다.';
    default:
      return '현재 위치를 확인할 수 없습니다.';
  }
}

export default function App() {
  const [payload, setPayload] = useState(null);
  const [selectedFuel, setSelectedFuel] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [themeMode, setThemeMode] = useState(getStoredThemeMode);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const [sortMode, setSortMode] = useState('price');
  const [userLocation, setUserLocation] = useState({
    status: 'idle',
    latitude: null,
    longitude: null,
    error: '',
  });

  const resolvedTheme = themeMode === 'system' ? systemTheme : themeMode;
  const datasets = payload?.datasets ?? [];
  const datasetPairs = useMemo(() => new Set(datasets.map((item) => `${item.regionCode}::${item.fuelCode}`)), [datasets]);
  const hasLocation = Number.isFinite(userLocation.latitude) && Number.isFinite(userLocation.longitude);
  const fuelOptions = useMemo(() => {
    const baseOptions = selectedRegion
      ? datasets.filter((item) => item.regionCode === selectedRegion)
      : datasets;
    return uniqueOptions(baseOptions, 'fuelCode', 'fuelName');
  }, [datasets, selectedRegion]);
  const regionOptions = useMemo(() => {
    const baseOptions = selectedFuel
      ? datasets.filter((item) => item.fuelCode === selectedFuel)
      : datasets;
    return uniqueOptions(baseOptions, 'regionCode', 'regionName');
  }, [datasets, selectedFuel]);
  const totalStationCount = useMemo(
    () => datasets.reduce((sum, dataset) => sum + (dataset.stations?.length ?? 0), 0),
    [datasets],
  );
  const currentDataset = useMemo(
    () => datasets.find((item) => item.fuelCode === selectedFuel && item.regionCode === selectedRegion),
    [datasets, selectedFuel, selectedRegion],
  );
  const priceSortedStations = useMemo(
    () => sortStations(currentDataset?.stations ?? [], 'price'),
    [currentDataset],
  );
  const { lowest, average } = useMemo(() => getPriceStats(priceSortedStations), [priceSortedStations]);
  const enrichedStations = useMemo(
    () => decorateStations(
      priceSortedStations,
      average,
      hasLocation
        ? { latitude: userLocation.latitude, longitude: userLocation.longitude }
        : null,
    ),
    [average, hasLocation, priceSortedStations, userLocation.latitude, userLocation.longitude],
  );
  const effectiveSortMode = useMemo(() => {
    if ((sortMode === 'nearby' || sortMode === 'value') && !hasLocation) {
      return 'price';
    }
    return sortMode;
  }, [hasLocation, sortMode]);
  const sortedStations = useMemo(
    () => sortStations(enrichedStations, effectiveSortMode),
    [effectiveSortMode, enrichedStations],
  );
  const nearestStation = useMemo(() => getNearestStation(enrichedStations), [enrichedStations]);
  const bestValueStation = useMemo(() => getBestValueStation(enrichedStations), [enrichedStations]);
  const totalPages = sortedStations.length > 0 ? Math.ceil(sortedStations.length / PAGE_SIZE) : 0;
  const pagedStations = useMemo(() => {
    if (totalPages === 0) return [];
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return sortedStations.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, sortedStations, totalPages]);

  const loadData = useCallback(async () => {
    setStatus('loading');
    setErrorMessage('');
    try {
      const response = await fetch(`${DATA_URL}?t=${Date.now()}`);
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const nextPayload = await response.json();
      setPayload(nextPayload);
      setSelectedFuel('');
      setSelectedRegion('');
      setCurrentPage(1);
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('error');
      setErrorMessage('데이터연동대기');
    }
  }, []);

  const requestUserLocation = useCallback((nextSortMode = null) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setUserLocation({
        status: 'error',
        latitude: null,
        longitude: null,
        error: '현재 위치를 사용할 수 없는 환경입니다.',
      });
      if (nextSortMode) {
        setSortMode('price');
      }
      return;
    }

    setUserLocation((previous) => ({
      ...previous,
      status: 'loading',
      error: '',
    }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          status: 'ready',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: '',
        });

        if (nextSortMode) {
          setSortMode(nextSortMode);
        }
      },
      (error) => {
        setUserLocation({
          status: 'error',
          latitude: null,
          longitude: null,
          error: getLocationErrorMessage(error),
        });

        if (nextSortMode) {
          setSortMode('price');
        }
      },
      LOCATION_OPTIONS,
    );
  }, []);

  const handleSortChange = useCallback((nextSortMode) => {
    if (nextSortMode === 'price') {
      setSortMode('price');
      return;
    }

    if (hasLocation) {
      setSortMode(nextSortMode);
      return;
    }

    requestUserLocation(nextSortMode);
  }, [hasLocation, requestUserLocation]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event) => setSystemTheme(event.matches ? 'dark' : 'light');

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    if (datasets.length === 0) return;

    const currentPairKey = `${selectedRegion}::${selectedFuel}`;
    const hasCurrentPair = datasetPairs.has(currentPairKey);

    if (!hasCurrentPair) {
      const first = datasets[0];
      setSelectedFuel(first.fuelCode);
      setSelectedRegion(first.regionCode);
    }
  }, [datasetPairs, datasets, selectedFuel, selectedRegion]);

  useEffect(() => {
    if (selectedFuel && fuelOptions.length > 0 && !fuelOptions.some((fuel) => fuel.code === selectedFuel)) {
      setSelectedFuel(fuelOptions[0].code);
    }
  }, [fuelOptions, selectedFuel]);

  useEffect(() => {
    if (selectedRegion && regionOptions.length > 0 && !regionOptions.some((region) => region.code === selectedRegion)) {
      setSelectedRegion(regionOptions[0].code);
    }
  }, [regionOptions, selectedRegion]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedFuel, selectedRegion, effectiveSortMode]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <>
      <Header themeMode={themeMode} resolvedTheme={resolvedTheme} onThemeChange={setThemeMode} />
      <main id="top" className="page-shell">
        <Hero
          lowestStation={lowest}
          dataMode={payload?.mode}
          totalStationCount={totalStationCount}
          isLocationReady={hasLocation}
        />
        <FinderCard
          fuelOptions={fuelOptions}
          regionOptions={regionOptions}
          selectedFuel={selectedFuel}
          selectedRegion={selectedRegion}
          onFuelChange={setSelectedFuel}
          onRegionChange={setSelectedRegion}
          onRefresh={loadData}
          lowestStation={lowest}
          nearestStation={nearestStation}
          bestValueStation={bestValueStation}
          mode={payload?.mode}
          generatedAt={payload?.generatedAt}
          totalStationCount={totalStationCount}
          isLoading={status === 'loading'}
          sortMode={effectiveSortMode}
          onSortChange={handleSortChange}
          onUseLocation={requestUserLocation}
          isLocationReady={hasLocation}
          locationStatus={userLocation.status}
          locationError={userLocation.error}
        />
        <StationList
          dataset={currentDataset}
          stations={pagedStations}
          totalStations={sortedStations.length}
          averagePrice={average}
          status={status}
          errorMessage={errorMessage}
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
          sortLabel={SORT_MODE_LABELS[effectiveSortMode]}
          sortMode={effectiveSortMode}
          isLocationReady={hasLocation}
        />
        <NoticeCard />
      </main>
    </>
  );
}
