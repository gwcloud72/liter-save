import { useEffect, useMemo, useState } from 'react';
import Header from './litersave/Header.jsx';
import SearchToolbar from './litersave/SearchToolbar.jsx';
import Insight from './litersave/Insight.jsx';
import StationTable from './litersave/StationTable.jsx';
import TrendCard from './litersave/TrendCard.jsx';
import RegionCard from './litersave/RegionCard.jsx';
import ReportCard from './litersave/ReportCard.jsx';
import { useFavorites } from '../hooks/useFavorites.js';
import { readHashState, writeHashState } from '../hooks/useHashFilters.js';
import { getStationKey } from '../lib/data.js';
import { DEFAULT_FILTERS, average, buildData, filterStations, hasActiveFilters } from '../lib/dashboardData.js';
import { readJson } from '../lib/http.js';

const PRICE_URL = `${import.meta.env.BASE_URL}data/oil-prices.json`;
const HISTORY_URL = `${import.meta.env.BASE_URL}data/oil-history.json`;
const REPORT_URL = `${import.meta.env.BASE_URL}data/oil-ai-report.json`;

export default function Dashboard() {
  const initial = useMemo(readHashState, []);
  const [tab, setTab] = useState(initial.tab);
  const [filters, setFilters] = useState(initial.filters);
  const [pricePayload, setPricePayload] = useState(null);
  const [historyPayload, setHistoryPayload] = useState(null);
  const [reportPayload, setReportPayload] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      readJson(PRICE_URL, null),
      readJson(HISTORY_URL, null),
      readJson(REPORT_URL, null),
    ]).then(([prices, history, report]) => {
      if (!alive) return;
      setPricePayload(prices);
      setHistoryPayload(history);
      setReportPayload(report);
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const update = () => {
      const next = readHashState();
      setTab(next.tab);
      setFilters(next.filters);
    };
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);

  useEffect(() => { writeHashState(tab, filters); }, [tab, filters]);

  const data = useMemo(() => buildData(pricePayload, historyPayload, reportPayload), [pricePayload, historyPayload, reportPayload]);
  const activeDataset = data.datasets.find((dataset) => dataset.regionCode === filters.regionCode && dataset.fuelCode === filters.fuelCode)
    || data.datasets.find((dataset) => dataset.fuelCode === filters.fuelCode)
    || data.datasets[0];
  const activeStations = activeDataset?.stations || data.allStations;
  const averagePrice = average(activeStations.map((station) => station.price));
  const filteredStations = useMemo(() => filterStations(activeStations, filters, averagePrice), [activeStations, filters, averagePrice]);
  const favorites = useFavorites([]);
  const favoriteStations = filteredStations.filter((station) => favorites.has(getStationKey(station)));
  const visibleStations = tab === 'favorites' ? favoriteStations : filteredStations;
  const regionName = activeDataset?.regionName || data.regions[0]?.name || '서울특별시';
  const fuelName = activeDataset?.fuelName || data.fuels[0]?.name || '휘발유';
  const lowest = visibleStations[0] || filteredStations[0] || activeStations[0];
  const reset = () => setFilters(DEFAULT_FILTERS);
  const goToHome = () => {
    setTab('home');
    setFilters(DEFAULT_FILTERS);
  };
  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const canReset = useMemo(() => hasActiveFilters(filters), [filters]);
  const toolbar = <SearchToolbar filters={filters} setFilter={setFilter} reset={reset} regions={data.regions} fuels={data.fuels} resultCount={visibleStations.length} canReset={canReset} dataSourceLabel={data.isLive ? '실데이터' : '수집 대기'} />;

  const renderContent = () => {
    if (tab === 'regions') {
      return (
        <div className="grid gap-4 lg:grid-cols-[1.45fr_0.55fr]">
          <RegionCard rows={data.regionRows} variant="wide" onReset={reset} />
          <div className="min-w-0 space-y-4 lg:self-start">
            <TrendCard onReset={reset} values={data.trendValues} labels={data.trendLabels} regionName="전국" fuelName={fuelName} compact />
            <ReportCard onReset={reset} lines={data.reportLines.slice(0, 2)} compact />
          </div>
        </div>
      );
    }

    if (tab === 'fuel') {
      return (
        <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="min-w-0 space-y-4">
            <TrendCard onReset={reset} values={data.trendValues} labels={data.trendLabels} regionName={regionName} fuelName={fuelName} />
            <RegionCard onReset={reset} rows={data.regionRows.slice(0, 4)} compact />
          </div>
          <StationTable stations={visibleStations} averagePrice={averagePrice} favorites={favorites} title={`${fuelName} 시세 기준 주유소`} reset={reset} canReset={canReset} />
        </div>
      );
    }

    if (tab === 'report') {
      return (
        <div className="grid gap-4">
          <ReportCard onReset={reset} lines={data.reportLines} variant="document" title="가격 리포트" />
          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <TrendCard onReset={reset} values={data.trendValues} labels={data.trendLabels} regionName={regionName} fuelName={fuelName} />
            <RegionCard onReset={reset} rows={data.regionRows.slice(0, 6)} compact />
          </div>
        </div>
      );
    }

    if (tab === 'favorites') {
      return (
        <div className="grid gap-4 lg:grid-cols-[1fr_0.72fr]">
          <StationTable stations={favoriteStations} averagePrice={averagePrice} favorites={favorites} title="관심 주유소" reset={reset} canReset={canReset} emptyMessage="저장한 관심 주유소가 없습니다." emptyAction={goToHome} emptyActionLabel="최저가 주유소 찾기" />
          <div className="min-w-0 space-y-4 lg:self-start">
            <TrendCard onReset={reset} values={data.trendValues} labels={data.trendLabels} regionName={regionName} fuelName={fuelName} compact />
            <ReportCard onReset={reset} lines={data.reportLines.slice(0, 3)} compact />
          </div>
        </div>
      );
    }

    return (
      <>
        <Insight regionName={regionName} fuelName={fuelName} averagePrice={averagePrice} lowest={lowest} count={activeStations.length} />
        <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
          <TrendCard onReset={reset} values={data.trendValues} labels={data.trendLabels} regionName={regionName} fuelName={fuelName} featured />
          <ReportCard onReset={reset} lines={data.reportLines.slice(0, 3)} title="AI 유가 리포트" eyebrow="AI 리포트" />
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.18fr_0.82fr]">
          <StationTable stations={visibleStations} averagePrice={averagePrice} favorites={favorites} title={`${regionName} ${fuelName} 가격 비교`} reset={reset} canReset={canReset} />
          <RegionCard onReset={reset} rows={data.regionRows.slice(0, 5)} compact />
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-4 text-slate-950 md:px-0 md:py-8">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-slate-950 focus:px-4 focus:py-2 focus:text-white">본문 바로가기</a>
      <div className="mx-auto max-w-[1120px] overflow-hidden rounded-[24px] bg-white shadow-2xl shadow-slate-900/10 ring-1 ring-slate-200 md:rounded-[26px]">
        <Header tab={tab} setTab={setTab} updatedAt={data.updatedAt} />
        <main id="main-content" className="space-y-3 px-4 pt-4 pb-[140px] md:space-y-4 md:p-6">
          {toolbar}
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
