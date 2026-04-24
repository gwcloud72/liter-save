import { useCallback, useEffect, useMemo, useState } from 'react';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import FinderCard from './components/FinderCard.jsx';
import StationList from './components/StationList.jsx';
import NoticeCard from './components/NoticeCard.jsx';
import { getPriceStats, sortStationsByPrice, uniqueOptions } from './utils/oilData.js';

const DATA_URL = `${import.meta.env.BASE_URL}data/oil-prices.json`;
const PAGE_SIZE = 10;
const THEME_STORAGE_KEY = 'liter-save-theme';

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

export default function App() {
  const [payload, setPayload] = useState(null);
  const [selectedFuel, setSelectedFuel] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [themeMode, setThemeMode] = useState(getStoredThemeMode);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);

  const resolvedTheme = themeMode === 'system' ? systemTheme : themeMode;
  const datasets = payload?.datasets ?? [];
  const datasetPairs = useMemo(() => new Set(datasets.map((item) => `${item.regionCode}::${item.fuelCode}`)), [datasets]);
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
  const stations = useMemo(() => sortStationsByPrice(currentDataset?.stations ?? []), [currentDataset]);
  const { lowest, average } = useMemo(() => getPriceStats(stations), [stations]);
  const totalPages = stations.length > 0 ? Math.ceil(stations.length / PAGE_SIZE) : 0;
  const pagedStations = useMemo(() => {
    if (totalPages === 0) return [];
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return stations.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, stations, totalPages]);

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
  }, [selectedFuel, selectedRegion]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <>
      <Header themeMode={themeMode} resolvedTheme={resolvedTheme} onThemeChange={setThemeMode} />
      <main id="top" className="page-shell">
        <Hero lowestStation={lowest} dataMode={payload?.mode} totalStationCount={totalStationCount} />
        <FinderCard
          fuelOptions={fuelOptions}
          regionOptions={regionOptions}
          selectedFuel={selectedFuel}
          selectedRegion={selectedRegion}
          onFuelChange={setSelectedFuel}
          onRegionChange={setSelectedRegion}
          onRefresh={loadData}
          lowestStation={lowest}
          averagePrice={average}
          mode={payload?.mode}
          generatedAt={payload?.generatedAt}
          totalStationCount={totalStationCount}
          isLoading={status === 'loading'}
        />
        <StationList
          dataset={currentDataset}
          stations={pagedStations}
          totalStations={stations.length}
          averagePrice={average}
          status={status}
          errorMessage={errorMessage}
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
        <NoticeCard />
      </main>
    </>
  );
}
