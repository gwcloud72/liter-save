import { useMemo, type ReactNode } from 'react';
import { Crosshair, ExternalLink, List, Map, Navigation, Star } from 'lucide-react';
import { AxisLineChart, Button, Card, MobileDisclosure, PriceAmount, ServiceStateNotice } from '../components/common/ui';
import { KakaoMapPanel } from '../components/feature/liter';
import { AdaptiveTaskLayout } from '../components/task/AdaptiveTaskLayout';
import type { UserCoordinates } from '../context/LocationContext';
import type { Station } from '../data/model';
import type { LiterData } from '../data/normalize';
import { changeDirection, getFuelHistory } from '../data/normalize';
import { kakaoRouteHref } from '../utils/kakao';
import { formatDistanceKm, sortStationsByUserDistance } from '../utils/stationDistance';
import { useTaskRoute, writeTaskRoute } from '../utils/taskUrl';

interface PageProps {
  data: LiterData;
  onTabChange: (tab: string) => void;
  onAction: (text: string) => void;
  favoriteStationIds?: string[];
  onFavoriteToggle?: (stationId: string) => void;
  selectedFuel?: string;
  onFuelChange?: (fuel: string) => void;
  selectedRegion?: string;
  regionOptions?: readonly string[];
  onRegionChange?: (region: string) => void;
  onUseLocation?: () => void;
  locating?: boolean;
  isMyLocation?: boolean;
  locationLabel?: string | null;
  userCoordinates?: UserCoordinates | null;
  locationDenied?: boolean;
  dataExpired?: boolean;
  onRefresh?: () => void;
}

type RankingMode = 'total' | 'price' | 'distance';
type ViewMode = 'list' | 'map';

const ROUTE_ALIASES = {
  stations: { tab: 'home', params: { view: 'map' } },
  analysis: { tab: 'home' },
  discount: { tab: 'home' },
  trend: { tab: 'home' },
  favorites: { tab: 'home' },
  alerts: { tab: 'guide' },
  notice: { tab: 'guide' },
};

function numericParam(value: string | null, allowed: number[], fallback: number) {
  const number = Number(value);
  return allowed.includes(number) ? number : fallback;
}

function rankingMode(value: string | null): RankingMode {
  return value === 'price' || value === 'distance' ? value : 'total';
}

function viewMode(value: string | null): ViewMode {
  return value === 'map' ? 'map' : 'list';
}

function travelCost(station: Station, averagePrice: number) {
  const distance = station.distance > 0 ? station.distance : 0;
  return Math.round((distance * 2 * averagePrice) / 12);
}

function totalCost(station: Station, liters: number, averagePrice: number) {
  return Math.round(station.price * liters + travelCost(station, averagePrice));
}

function sortStations(stations: Station[], mode: RankingMode, liters: number, averagePrice: number) {
  return [...stations].sort((left, right) => {
    if (mode === 'price') return left.price - right.price || left.distance - right.distance;
    if (mode === 'distance') return left.distance - right.distance || left.price - right.price;
    return totalCost(left, liters, averagePrice) - totalCost(right, liters, averagePrice);
  });
}

function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <label className="grid min-w-0 gap-ds-0.5 text-[12px] font-bold text-ink-600">
      <span>{label}</span>
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 min-w-0 rounded-control border border-ink-200 bg-white px-ds-2 text-[14px] font-bold text-ink-900 focus-visible:outline-none focus-visible:shadow-focus">
        {children}
      </select>
    </label>
  );
}

function ToolbarSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <label className="task-toolbar-field">
      <span>{label}</span>
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>{children}</select>
    </label>
  );
}

function ChoiceGroup<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: Array<{ value: T; label: string }>; onChange: (value: T) => void }) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-ds-0.5 text-[12px] font-bold text-ink-600">{label}</legend>
      <div className="grid grid-cols-3 gap-ds-1">
        {options.map((option) => (
          <button key={String(option.value)} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)} className={`min-h-11 rounded-control border px-ds-1 text-[13px] font-bold transition ${value === option.value ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-200 bg-white text-ink-700 hover:border-ink-400'}`}>
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}


function locationButtonText(locating: boolean, isMyLocation: boolean, locationLabel: string | null | undefined, region: string) {
  if (locating) return '위치 확인 중';
  if (!isMyLocation) return '현재 위치 사용';
  return `현재 위치 · ${locationLabel ?? region}`;
}

function FilterPanel({ fuel, region, liters, mode, regions, fuelOptions, locating, isMyLocation, locationLabel, onFuelChange, onRegionChange, onLitersChange, onModeChange, onUseLocation }: {
  fuel: string;
  region: string;
  liters: number;
  mode: RankingMode;
  regions: readonly string[];
  fuelOptions: string[];
  locating: boolean;
  isMyLocation: boolean;
  locationLabel?: string | null;
  onFuelChange: (value: string) => void;
  onRegionChange: (value: string) => void;
  onLitersChange: (value: number) => void;
  onModeChange: (value: RankingMode) => void;
  onUseLocation: () => void;
}) {
  return (
    <Card padding="normal" className="space-y-ds-2">
      <div>
        <p className="text-[12px] font-bold text-primary-700">현재 조건</p>
        <h1 className="mt-ds-0.5 text-[22px] font-black leading-tight text-ink-900">들를 가치가 있는 주유소 찾기</h1>
        <p className="mt-ds-1 text-[13px] leading-relaxed text-ink-600">가격과 왕복 이동비를 같은 기준으로 비교합니다.</p>
      </div>
      <div className="grid grid-cols-2 gap-ds-1.5">
        <SelectField label="지역" value={region} onChange={onRegionChange}>{regions.map((item) => <option key={item} value={item}>{item}</option>)}</SelectField>
        <SelectField label="유종" value={fuel} onChange={onFuelChange}>{fuelOptions.map((item) => <option key={item} value={item}>{item}</option>)}</SelectField>
      </div>
      <ChoiceGroup label="주유량" value={liters} options={[40, 50, 60].map((value) => ({ value, label: `${value}L` }))} onChange={onLitersChange} />
      <ChoiceGroup label="정렬 기준" value={mode} options={[{ value: 'total', label: '총비용순' }, { value: 'price', label: '가격순' }, { value: 'distance', label: '거리순' }]} onChange={onModeChange} />
      <Button variant="secondary" onClick={onUseLocation} loading={locating} leftIcon={<Crosshair size={17} />} className="w-full">{locationButtonText(locating, isMyLocation, locationLabel, region)}</Button>
    </Card>
  );
}

function FilterToolbar({ fuel, region, liters, mode, regions, fuelOptions, locating, isMyLocation, locationLabel, stationCount, onFuelChange, onRegionChange, onLitersChange, onModeChange, onUseLocation }: {
  fuel: string;
  region: string;
  liters: number;
  mode: RankingMode;
  regions: readonly string[];
  fuelOptions: string[];
  locating: boolean;
  isMyLocation: boolean;
  locationLabel?: string | null;
  stationCount: number;
  onFuelChange: (value: string) => void;
  onRegionChange: (value: string) => void;
  onLitersChange: (value: number) => void;
  onModeChange: (value: RankingMode) => void;
  onUseLocation: () => void;
}) {
  return (
    <div className="task-toolbar">
      <div className="task-toolbar-heading">
        <p>주유소 비교</p>
        <h1>현재 조건의 최적 후보</h1>
        <small>{stationCount}곳의 가격·거리·예상 총비용을 비교합니다.</small>
      </div>
      <div className="task-toolbar-controls">
        <ToolbarSelect label="지역" value={region} onChange={onRegionChange}>{regions.map((item) => <option key={item} value={item}>{item}</option>)}</ToolbarSelect>
        <ToolbarSelect label="유종" value={fuel} onChange={onFuelChange}>{fuelOptions.map((item) => <option key={item} value={item}>{item}</option>)}</ToolbarSelect>
        <ToolbarSelect label="주유량" value={String(liters)} onChange={(value) => onLitersChange(Number(value))}>{[40, 50, 60].map((value) => <option key={value} value={value}>{value}L</option>)}</ToolbarSelect>
        <ToolbarSelect label="정렬" value={mode} onChange={(value) => onModeChange(value as RankingMode)}><option value="total">총비용순</option><option value="price">가격순</option><option value="distance">거리순</option></ToolbarSelect>
        <button type="button" onClick={onUseLocation} className="task-toolbar-action"><Crosshair size={16} />{locationButtonText(locating, isMyLocation, locationLabel, region)}</button>
      </div>
    </div>
  );
}

function StationAnswer({ station, liters, averagePrice, favorite, onFavoriteToggle }: { station: Station; liters: number; averagePrice: number; favorite: boolean; onFavoriteToggle: () => void }) {
  const fuelCost = Math.round(station.price * liters);
  const routeCost = travelCost(station, averagePrice);
  const combined = fuelCost + routeCost;
  return (
    <Card data-first-answer="true" data-task-answer="true" padding="normal" className="border-primary-200">
      <div className="flex items-start justify-between gap-ds-2">
        <div className="min-w-0">
          <p className="text-[12px] font-bold text-primary-700">현재 조건 1순위</p>
          <h2 className="mt-ds-0.5 break-words text-[21px] font-black leading-tight text-ink-900">{station.name}</h2>
          <p className="mt-ds-1 break-words text-[13px] leading-relaxed text-ink-600">{station.brand} · {formatDistanceKm(station.distance)} · {station.address}</p>
        </div>
        <button type="button" aria-label={`${station.name} 관심 저장`} aria-pressed={favorite} onClick={onFavoriteToggle} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-control border ${favorite ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-200 bg-white text-ink-600'}`}><Star size={19} fill={favorite ? 'currentColor' : 'none'} /></button>
      </div>
      <div className="mt-ds-2 flex flex-wrap items-end justify-between gap-ds-2 rounded-card bg-ink-50 p-ds-2">
        <div><span className="block text-[12px] font-bold text-ink-600">리터당 가격</span><PriceAmount value={station.price} unit="원/L" size="lg" /></div>
        <div className="text-right"><span className="block text-[12px] font-bold text-ink-600">예상 총비용</span><PriceAmount value={combined} unit="원" size="md" /></div>
      </div>
      <a data-primary-action="true" data-task-primary-action="true" href={kakaoRouteHref(station)} target="_blank" rel="noopener noreferrer" className="mt-ds-2 inline-flex min-h-11 w-full items-center justify-center gap-ds-1.5 rounded-control bg-primary-600 px-ds-3 text-[15px] font-bold text-white hover:bg-primary-700 focus-visible:outline-none focus-visible:shadow-focus"><Navigation size={18} />이 주유소로 길찾기<ExternalLink size={15} /></a>
      <dl className="mt-ds-2 grid grid-cols-3 gap-ds-1 text-center">
        <div className="rounded-control border border-ink-200 bg-white p-ds-1.5"><dt className="text-[11px] font-bold text-ink-500">주유액</dt><dd className="mt-ds-0.5 text-[13px] font-black text-ink-900">{fuelCost.toLocaleString()}원</dd></div>
        <div className="rounded-control border border-ink-200 bg-white p-ds-1.5"><dt className="text-[11px] font-bold text-ink-500">왕복거리</dt><dd className="mt-ds-0.5 text-[13px] font-black text-ink-900">{station.distance > 0 ? `${(station.distance * 2).toFixed(1)}km` : '미제공'}</dd></div>
        <div className="rounded-control border border-ink-200 bg-white p-ds-1.5"><dt className="text-[11px] font-bold text-ink-500">이동비</dt><dd className="mt-ds-0.5 text-[13px] font-black text-ink-900">{routeCost.toLocaleString()}원</dd></div>
      </dl>
    </Card>
  );
}

function StationList({ stations, selectedId, liters, averagePrice, onSelect, maxItems = 3, catalog = false }: { stations: Station[]; selectedId: string; liters: number; averagePrice: number; onSelect: (station: Station) => void; maxItems?: number; catalog?: boolean }) {
  const visibleStations = stations.slice(0, maxItems);
  return (
    <Card padding="normal">
      <div className="flex items-center justify-between gap-ds-2">
        <div><p className="text-[12px] font-bold text-primary-700">{catalog ? '후보 주유소' : '비교할 3곳'}</p><h2 className="mt-ds-0.5 text-[18px] font-black text-ink-900">{catalog ? `${stations.length}곳 비교` : '같은 조건의 후보'}</h2></div>
        <List size={19} className="text-ink-500" />
      </div>
      <div tabIndex={catalog ? 0 : undefined} aria-label={catalog ? '주유소 후보 목록' : undefined} className={`mt-ds-2 ${catalog ? 'task-workspace-list-scroll divide-y divide-ink-100' : 'space-y-ds-1.5'}`}>
        {visibleStations.map((station, index) => (
          <button key={station.id} type="button" onClick={() => onSelect(station)} aria-pressed={station.id === selectedId} className={`grid min-h-14 w-full grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-ds-1.5 text-left ${catalog ? 'px-ds-0.5 py-ds-1.5 hover:bg-ink-50' : 'rounded-control border p-ds-1.5'} ${station.id === selectedId ? 'bg-primary-50' : catalog ? 'bg-transparent' : 'border-ink-200 bg-white'} ${!catalog && station.id === selectedId ? 'border-primary-400' : ''}`}>
            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-black ${station.id === selectedId ? 'bg-primary-600 text-white' : 'bg-ink-900 text-white'}`}>{index + 1}</span>
            <span className="min-w-0"><b className="block break-words text-[14px] leading-snug text-ink-900">{station.name}</b><small className="mt-ds-0.5 block text-[12px] text-ink-600">{formatDistanceKm(station.distance)} · {station.price.toLocaleString()}원/L</small></span>
            <span className="text-right"><small className="block text-[11px] font-bold text-ink-500">총비용</small><b className="text-[13px] text-ink-900">{totalCost(station, liters, averagePrice).toLocaleString()}원</b></span>
          </button>
        ))}
      </div>
    </Card>
  );
}

function PriceTrend({ data, station }: { data: LiterData; station: Station }) {
  const history = getFuelHistory(data, data.selectedFuel, data.region, 7);
  const values = history.length ? history.map((point) => point.averagePrice) : station.trend;
  const direction = changeDirection(values[values.length - 1] - values[0]);
  return (
    <Card padding="normal">
      <p className="text-[12px] font-bold text-primary-700">최근 7일</p>
      <h2 className="mt-ds-0.5 text-[18px] font-black text-ink-900">{data.region} {data.selectedFuel} 가격 흐름</h2>
      <p className="mt-ds-1 text-[13px] leading-relaxed text-ink-600">선택 주유소의 당일 가격과 지역 평균 흐름을 함께 확인합니다.</p>
      <div className="mt-ds-2" data-chart-instance="axis-line"><AxisLineChart values={values} labels={history.map((point) => point.date.slice(5))} direction={direction} unit="원" /></div>
    </Card>
  );
}

export function HomePage({ data, onTabChange, favoriteStationIds = [], onFavoriteToggle, selectedFuel = data.selectedFuel, onFuelChange, selectedRegion = data.region, regionOptions = [], onRegionChange, onUseLocation, locating = false, isMyLocation = false, locationLabel = null, userCoordinates = null, locationDenied = false, dataExpired = false, onRefresh }: PageProps) {
  const route = useTaskRoute(ROUTE_ALIASES);
  const liters = numericParam(route.params.get('fill'), [40, 50, 60], 50);
  const mode = rankingMode(route.params.get('sort'));
  const view = viewMode(route.params.get('view'));
  const distanceAdjusted = useMemo(() => userCoordinates ? sortStationsByUserDistance(data.stations, userCoordinates) : data.stations, [data.stations, userCoordinates]);
  const ranked = useMemo(() => sortStations(distanceAdjusted, mode, liters, data.averagePrice), [distanceAdjusted, mode, liters, data.averagePrice]);
  const selected = ranked.find((station) => station.id === route.params.get('station')) ?? ranked[0];

  if (!selected) return <ServiceStateNotice kind="empty-nearby" onAction={onRefresh} />;

  const selectStation = (station: Station) => writeTaskRoute('home', { station: station.id }, 'replace');
  const changeFuel = (value: string) => { onFuelChange?.(value); writeTaskRoute('home', { fuel: value }, 'replace'); };
  const changeRegion = (value: string) => { onRegionChange?.(value); writeTaskRoute('home', { region: value }, 'replace'); };
  const changeLiters = (value: number) => writeTaskRoute('home', { fill: String(value) }, 'replace');
  const changeMode = (value: RankingMode) => writeTaskRoute('home', { sort: value }, 'replace');
  const useLocation = () => onUseLocation?.();
  const filterPanel = <FilterPanel fuel={selectedFuel} region={selectedRegion} liters={liters} mode={mode} regions={regionOptions} fuelOptions={data.fuelOptions} locating={locating} isMyLocation={isMyLocation} locationLabel={locationLabel} onFuelChange={changeFuel} onRegionChange={changeRegion} onLitersChange={changeLiters} onModeChange={changeMode} onUseLocation={useLocation} />;
  const toolbar = <FilterToolbar fuel={selectedFuel} region={selectedRegion} liters={liters} mode={mode} regions={regionOptions} fuelOptions={data.fuelOptions} locating={locating} isMyLocation={isMyLocation} locationLabel={locationLabel} stationCount={ranked.length} onFuelChange={changeFuel} onRegionChange={changeRegion} onLitersChange={changeLiters} onModeChange={changeMode} onUseLocation={useLocation} />;
  const answer = <StationAnswer station={selected} liters={liters} averagePrice={data.averagePrice} favorite={favoriteStationIds.includes(selected.id)} onFavoriteToggle={() => onFavoriteToggle?.(selected.id)} />;
  const mobileComparisons = <StationList stations={ranked} selectedId={selected.id} liters={liters} averagePrice={data.averagePrice} onSelect={selectStation} />;
  const desktopList = <StationList stations={ranked} selectedId={selected.id} liters={liters} averagePrice={data.averagePrice} onSelect={selectStation} maxItems={ranked.length} catalog />;
  const mobileMap = <KakaoMapPanel stations={ranked.slice(0, 12)} onSelect={selectStation} userCoordinates={userCoordinates} />;
  const desktopMap = <KakaoMapPanel stations={ranked.slice(0, 12)} onSelect={selectStation} userCoordinates={userCoordinates} tall showSummary={false} />;
  const trend = <PriceTrend data={data} station={selected} />;
  const basis = <Card padding="compact"><p className="text-[12px] font-bold text-primary-700">계산 기준</p><h2 className="mt-ds-0.5 text-[18px] font-black text-ink-900">비교 전제</h2><dl className="mt-ds-1.5 space-y-ds-1 text-[13px]"><div className="flex justify-between gap-ds-2"><dt className="text-ink-600">주유량</dt><dd className="font-bold text-ink-900">{liters}L</dd></div><div className="flex justify-between gap-ds-2"><dt className="text-ink-600">연비</dt><dd className="font-bold text-ink-900">12km/L</dd></div><div className="flex justify-between gap-ds-2"><dt className="text-ink-600">이동거리</dt><dd className="font-bold text-ink-900">왕복 기준</dd></div></dl></Card>;
  const notices = locationDenied || dataExpired ? <div className="space-y-ds-1.5">{locationDenied ? <ServiceStateNotice kind="location-denied" /> : null}{dataExpired ? <ServiceStateNotice kind="data-expired" onAction={onRefresh} /> : null}</div> : null;

  const mobile = (
    <div className="space-y-ds-2">
      {filterPanel}
      {answer}
      {notices}
      <div className="grid grid-cols-2 gap-ds-1">
        <button type="button" aria-pressed={view === 'list'} onClick={() => writeTaskRoute('home', { view: 'list' }, 'replace')} className={`min-h-11 rounded-control border text-[14px] font-bold ${view === 'list' ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-200 bg-white text-ink-700'}`}><List size={17} className="mr-ds-1 inline" />목록</button>
        <button type="button" aria-pressed={view === 'map'} onClick={() => writeTaskRoute('home', { view: 'map' }, 'replace')} className={`min-h-11 rounded-control border text-[14px] font-bold ${view === 'map' ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-200 bg-white text-ink-700'}`}><Map size={17} className="mr-ds-1 inline" />지도</button>
      </div>
      {view === 'map' ? mobileMap : mobileComparisons}
      <MobileDisclosure title="계산 기준과 가격 추이">{trend}</MobileDisclosure>
      <Button variant="secondary" onClick={() => onTabChange('records')} className="w-full">내 차량 기록 보기</Button>
    </div>
  );

  return (
    <AdaptiveTaskLayout
      toolbar={toolbar}
      list={<>{desktopList}{notices}</>}
      detail={<>{answer}{desktopMap}</>}
      supporting={<>{trend}{basis}</>}
      mobile={mobile}
      collectionCount={ranked.length}
      supportingSectionCount={2}
      mode="decision"
      detailPriority
    />
  );
}
