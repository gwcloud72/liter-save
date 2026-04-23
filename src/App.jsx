import { useCallback, useEffect, useMemo, useState } from 'react';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import FinderCard from './components/FinderCard.jsx';
import StationList from './components/StationList.jsx';
import NoticeCard from './components/NoticeCard.jsx';
import { getPriceStats, sortStationsByPrice, uniqueOptions } from './utils/oilData.js';

const DATA_URL = `${import.meta.env.BASE_URL}data/oil-prices.json`;
const PAGE_SIZE = 10;

export default function App() {
  const [payload, setPayload] = useState(null);
  const [selectedFuel, setSelectedFuel] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const datasets = payload?.datasets ?? [];
  const fuelOptions = useMemo(() => uniqueOptions(datasets, 'fuelCode', 'fuelName'), [datasets]);
  const regionOptions = useMemo(() => uniqueOptions(datasets, 'regionCode', 'regionName'), [datasets]);
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
    if (!selectedFuel && fuelOptions.length > 0) {
      setSelectedFuel(fuelOptions[0].code);
    }
  }, [fuelOptions, selectedFuel]);

  useEffect(() => {
    if (!selectedRegion && regionOptions.length > 0) {
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
      <Header />
      <main id="top" className="page-shell">
        <Hero lowestStation={lowest} dataMode={payload?.mode} />
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
