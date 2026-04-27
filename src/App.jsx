import { useCallback, useEffect, useMemo, useState } from 'react';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import FinderCard from './components/FinderCard.jsx';
import HistorySection from './components/HistorySection.jsx';
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
const HISTORY_URL = `${import.meta.env.BASE_URL}data/oil-history.json`;
const PAGE_SIZE = 10;
const THEME_STORAGE_KEY = 'liter-save-theme';
const FAVORITES_STORAGE_KEY = 'liter-save-favorites';
const EMPTY_HISTORY_PAYLOAD = {
  mode: 'history',
  generatedAt: null,
  retentionDays: 90,
  notice: '차트 데이터가 아직 없습니다.',
  snapshots: [],
};
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

function getStoredFavoriteIds() {
  if (typeof window === 'undefined') return [];

  try {
    const stored = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function getSystemTheme() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialUrlState() {
  if (typeof window === 'undefined') {
    return {
      fuel: '',
      region: '',
      sort: 'price',
      page: 1,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const sort = params.get('sort');
  const page = Number(params.get('page'));

  return {
    fuel: params.get('fuel') || '',
    region: params.get('region') || '',
    sort: ['price', 'nearby', 'value'].includes(sort) ? sort : 'price',
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
  };
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

function resolveSelection(datasets, selectedFuel, selectedRegion) {
  if (!Array.isArray(datasets) || datasets.length === 0) return null;

  const exact = datasets.find((item) => item.fuelCode === selectedFuel && item.regionCode === selectedRegion);
  if (exact) return exact;

  if (selectedFuel) {
    const byFuel = datasets.find((item) => item.fuelCode === selectedFuel);
    if (byFuel) return byFuel;
  }

  if (selectedRegion) {
    const byRegion = datasets.find((item) => item.regionCode === selectedRegion);
    if (byRegion) return byRegion;
  }

  return datasets[0] ?? null;
}

async function copyTextToClipboard(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  if (typeof document === 'undefined') {
    throw new Error('복사 기능을 사용할 수 없습니다.');
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export default function App() {
  const initialUrlState = useMemo(() => getInitialUrlState(), []);
  const [payload, setPayload] = useState(null);
  const [historyPayload, setHistoryPayload] = useState(EMPTY_HISTORY_PAYLOAD);
  const [selectedFuel, setSelectedFuel] = useState(initialUrlState.fuel);
  const [selectedRegion, setSelectedRegion] = useState(initialUrlState.region);
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(initialUrlState.page);
  const [themeMode, setThemeMode] = useState(getStoredThemeMode);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const [sortMode, setSortMode] = useState(initialUrlState.sort);
  const [favoriteIds, setFavoriteIds] = useState(getStoredFavoriteIds);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [userLocation, setUserLocation] = useState({
    status: 'idle',
    latitude: null,
    longitude: null,
    error: '',
  });

  const resolvedTheme = themeMode === 'system' ? systemTheme : themeMode;
  const datasets = payload?.datasets ?? [];
  const datasetPairs = useMemo(() => new Set(datasets.map((item) => `${item.regionCode}::${item.fuelCode}`)), [datasets]);
  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
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
  const favoriteStationsInCurrentView = useMemo(
    () => sortedStations.filter((station) => favoriteIdSet.has(station.id)),
    [favoriteIdSet, sortedStations],
  );
  const visibleStations = useMemo(
    () => (favoritesOnly ? favoriteStationsInCurrentView : sortedStations),
    [favoriteStationsInCurrentView, favoritesOnly, sortedStations],
  );
  const nearestStation = useMemo(() => getNearestStation(enrichedStations), [enrichedStations]);
  const bestValueStation = useMemo(() => getBestValueStation(enrichedStations), [enrichedStations]);
  const totalPages = visibleStations.length > 0 ? Math.ceil(visibleStations.length / PAGE_SIZE) : 0;
  const pagedStations = useMemo(() => {
    if (totalPages === 0) return [];
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return visibleStations.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, totalPages, visibleStations]);

  const loadData = useCallback(async () => {
    setStatus('loading');
    setErrorMessage('');
    try {
      const [dataResponse, historyResponse] = await Promise.all([
        fetch(`${DATA_URL}?t=${Date.now()}`),
        fetch(`${HISTORY_URL}?t=${Date.now()}`).catch(() => null),
      ]);

      if (!dataResponse.ok) throw new Error(`${dataResponse.status} ${dataResponse.statusText}`);
      const nextPayload = await dataResponse.json();
      setPayload(nextPayload);

      if (historyResponse && historyResponse.ok) {
        try {
          const nextHistoryPayload = await historyResponse.json();
          setHistoryPayload(nextHistoryPayload?.snapshots ? nextHistoryPayload : EMPTY_HISTORY_PAYLOAD);
        } catch {
          setHistoryPayload(EMPTY_HISTORY_PAYLOAD);
        }
      } else {
        setHistoryPayload(EMPTY_HISTORY_PAYLOAD);
      }

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

  const handleToggleFavorite = useCallback((station) => {
    if (!station?.id) return;

    setFavoriteIds((previous) => {
      const nextSet = new Set(previous);
      if (nextSet.has(station.id)) {
        nextSet.delete(station.id);
      } else {
        nextSet.add(station.id);
      }
      return Array.from(nextSet);
    });
  }, []);

  const handleCopyShareLink = useCallback(async () => {
    if (typeof window === 'undefined') return;

    try {
      await copyTextToClipboard(window.location.href);
      setShareMessage('현재 화면 링크를 복사했습니다.');
    } catch (error) {
      console.error(error);
      setShareMessage('링크를 복사하지 못했습니다. 주소창의 링크를 직접 복사해주세요.');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!shareMessage) return undefined;
    const timer = window.setTimeout(() => setShareMessage(''), 2400);
    return () => window.clearTimeout(timer);
  }, [shareMessage]);

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
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    if (datasets.length === 0) return;

    const currentPairKey = `${selectedRegion}::${selectedFuel}`;
    const hasCurrentPair = datasetPairs.has(currentPairKey);

    if (!selectedFuel || !selectedRegion || !hasCurrentPair) {
      const nextSelection = resolveSelection(datasets, selectedFuel, selectedRegion);
      if (nextSelection) {
        setSelectedFuel(nextSelection.fuelCode);
        setSelectedRegion(nextSelection.regionCode);
      }
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
  }, [selectedFuel, selectedRegion, effectiveSortMode, favoritesOnly]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);

    if (selectedFuel) params.set('fuel', selectedFuel);
    else params.delete('fuel');

    if (selectedRegion) params.set('region', selectedRegion);
    else params.delete('region');

    if (effectiveSortMode && effectiveSortMode !== 'price') params.set('sort', effectiveSortMode);
    else params.delete('sort');

    if (currentPage > 1) params.set('page', String(currentPage));
    else params.delete('page');

    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash || ''}`;
    window.history.replaceState({}, '', nextUrl);
  }, [currentPage, effectiveSortMode, selectedFuel, selectedRegion]);

  return (
    <>
      <Header
        themeMode={themeMode}
        resolvedTheme={resolvedTheme}
        onThemeChange={setThemeMode}
        favoriteCount={favoriteIds.length}
      />
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
          onCopyShareLink={handleCopyShareLink}
          shareMessage={shareMessage}
          favoritesOnly={favoritesOnly}
          onToggleFavoritesOnly={() => setFavoritesOnly((previous) => !previous)}
          favoriteCount={favoriteStationsInCurrentView.length}
        />
        <HistorySection
          historyPayload={historyPayload}
          dataset={currentDataset}
        />
        <StationList
          dataset={currentDataset}
          stations={pagedStations}
          totalStations={visibleStations.length}
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
          favoritesOnly={favoritesOnly}
          favoriteCount={favoriteStationsInCurrentView.length}
          favoriteIds={favoriteIdSet}
          onToggleFavorite={handleToggleFavorite}
        />
        <NoticeCard />
      </main>
    </>
  );
}
