import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CalendarDays, Download, ExternalLink, Fuel, Gauge, MapPin, Newspaper, Plus, Route, Star, WalletCards } from 'lucide-react';
import { HorizontalBarChart } from '../../components/charts/HorizontalBarChart';
import { AxisLineChart, Button, Card, DataTable, EmptyState, FilterChips, MiniTrend, PriceBadge, SearchField, SectionHeader, StatsStrip } from '../../components/common/ui';
import { KakaoMapPanel, SavingsCalculator, StationCard, StationRankTable } from '../../components/feature/liter';
import type { LiterData } from '../../data/normalize';
import { changeDirection, formatSignedWon, getFuelHistory } from '../../data/normalize';
import type { UserCoordinates } from '../../context/LocationContext';
import { fetchNearbyStations } from '../../services/nearbyStations';
import { kakaoRouteHref } from '../../utils/kakao';
import { formatDistanceKm, sortStationsByUserDistance } from '../../utils/stationDistance';

interface PageProps { data: LiterData; onTabChange: (tab: string) => void; onAction: (text: string) => void; favoriteStationIds?: string[]; onFavoriteToggle?: (id: string) => void; selectedFuel?: string; onFuelChange?: (fuel: string) => void; selectedRegion?: string; regionOptions?: readonly string[]; onRegionChange?: (region: string) => void; onUseLocation?: () => void; locating?: boolean; isMyLocation?: boolean; userCoordinates?: UserCoordinates | null; }
function Shell({ title, children }: { title: string; children: ReactNode; data: LiterData; onAction: (text: string) => void; compact?: boolean }) { return <div className="v6-page mx-auto max-w-content space-y-ds-3"><SectionHeader title={title} />{children}</div>; }

type FuelRecord = LiterData['records'][number];

function RecordMetric({ icon: Icon, label, value, sub }: { icon: typeof Fuel; label: string; value: ReactNode; sub: string }) {
  return <Card padding="normal" className="v6-card-hover"><div className="flex items-start justify-between gap-ds-2"><div><p className="text-caption text-ink-500">{label}</p><strong className="mt-ds-1 block text-2xl font-bold text-ink-900 tabular">{value}</strong><p className="mt-ds-0.5 text-xs text-ink-500">{sub}</p></div><span className="rounded-lg bg-primary-50 p-2 text-primary-600"><Icon size={18} /></span></div></Card>;
}
function PriceText({ value, unit = '원', className = '' }: { value: number; unit?: string; className?: string }) { return <span className={`inline-flex items-baseline tabular ${className}`}><span>{value.toLocaleString()}</span><span className="v6-unit">{unit}</span></span>; }

function uniqueStations(stations: LiterData['stations']) {
  return Array.from(new Map(stations.map((station) => [station.id, station])).values());
}


function RegionFuelControl({ data, selectedFuel, onFuelChange, selectedRegion, regionOptions = [], onRegionChange, onUseLocation, locating = false, isMyLocation = false }: { data: LiterData; selectedFuel: string; onFuelChange?: (fuel: string) => void; selectedRegion: string; regionOptions?: readonly string[]; onRegionChange?: (region: string) => void; onUseLocation?: () => void; locating?: boolean; isMyLocation?: boolean }) {
  const regions = regionOptions.length ? regionOptions : Array.from(new Set(data.regionRows.map((row) => row.region))).filter(Boolean);
  return <Card padding="normal" interactive={false}>
    <SectionHeader title="지역·유종 선택" />
    <div className="space-y-ds-2">
      <FilterChips items={data.fuelOptions} active={selectedFuel} onChange={(fuel) => onFuelChange?.(fuel)} ariaLabel="유종 선택" />
      <div className="grid gap-ds-2 lg:grid-cols-[minmax(0,1fr)_auto]">
        <label className="block text-caption font-bold text-ink-500">지역 선택<select aria-label="지역 선택" value={selectedRegion} onChange={(event) => onRegionChange?.(event.target.value)} className="mt-ds-0.5 h-11 w-full rounded-md border border-ink-200 bg-white px-3 text-sm text-ink-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100">{regions.map((region) => <option key={region} value={region}>{region}</option>)}</select></label>
        <Button variant={isMyLocation ? 'primary' : 'secondary'} onClick={onUseLocation} loading={locating} className="self-end"><MapPin size={16} />내 위치 기준</Button>
      </div>
    </div>
  </Card>;
}

export function StationsPage({ data, onAction, favoriteStationIds = [], onFavoriteToggle, selectedFuel = data.fuelOptions[0] ?? '휘발유', onFuelChange, selectedRegion = '서울', regionOptions = [], onRegionChange, onUseLocation, locating = false, isMyLocation = false, userCoordinates = null }: PageProps) {
  const [q, setQ] = useState('');
  const [liveStations, setLiveStations] = useState<LiterData['stations']>([]);
  useEffect(() => {
    if (!isMyLocation || !userCoordinates) { setLiveStations([]); return; }
    const controller = new AbortController();
    fetchNearbyStations({ coordinates: userCoordinates, fuel: selectedFuel, region: selectedRegion, sort: 'distance', signal: controller.signal })
      .then((stations) => setLiveStations(stations))
      .catch(() => {
        if (!controller.signal.aborted) setLiveStations(sortStationsByUserDistance(data.stations, userCoordinates));
      });
    return () => controller.abort();
  }, [isMyLocation, userCoordinates?.lat, userCoordinates?.lng, selectedFuel, selectedRegion]);
  const [selectedId, setSelectedId] = useState(data.stations[0]?.id ?? '');
  const sourceStations = liveStations.length ? liveStations : data.stations;
  const list = sourceStations.filter((station) => station.name.includes(q) || station.brand.includes(q) || station.address.includes(q) || q === '');
  const selected = list.find((station) => station.id === selectedId) ?? list[0] ?? data.stations[0];
  const selectStation = (station: typeof data.stations[number], source: string) => {
    setSelectedId(station.id);
    onAction(`${station.name} ${source}`);
  };
  return <Shell title={`${isMyLocation ? '내 위치 가격지도' : '가격지도'} · ${selectedRegion} ${selectedFuel}`} data={data} onAction={onAction}>
    <div className="v6-block v6-delay-0"><RegionFuelControl data={data} selectedFuel={selectedFuel} onFuelChange={onFuelChange} selectedRegion={selectedRegion} regionOptions={regionOptions} onRegionChange={onRegionChange} onUseLocation={onUseLocation} locating={locating} isMyLocation={isMyLocation} /></div>
    <div className="v6-block v6-delay-1"><SearchField value={q} onChange={setQ} placeholder="주유소명·브랜드·주소 검색" /></div>
    <div className="v6-block v6-delay-2 grid gap-ds-3 xl:grid-cols-map-search">
      <Card padding="normal"><SectionHeader title={isMyLocation ? '내 위치 가까운 주유소' : `${selectedRegion} ${selectedFuel} 검색 결과`} action="거리순" onAction={() => onAction('거리순')} /><StationRankTable stations={list} onSelect={(station) => selectStation(station, '선택')} /></Card>
      <div className="space-y-ds-2">
        <KakaoMapPanel stations={list} onSelect={(station) => selectStation(station, '지도 선택')} tall />
        {selected ? <Card padding="normal" selected>
          <div className="flex flex-wrap items-start justify-between gap-ds-2">
            <div className="min-w-0"><p className="text-caption font-bold text-primary-600">선택 주유소</p><h3 className="mt-ds-0.5 truncate text-heading-2 text-ink-900">{selected.name}</h3><p className="mt-ds-0.5 text-sm text-ink-500">{selected.brand} · {formatDistanceKm(selected.distance)} · {selected.address}</p></div>
            <div className="text-right"><strong className="inline-flex items-baseline justify-end gap-0.5 text-price-lg text-primary-500 tabular"><PriceText value={selected.price} unit="원/L" /></strong><div className="mt-ds-1.5"><PriceBadge direction={changeDirection(selected.avgDiff)} text={formatSignedWon(selected.avgDiff)} /></div></div>
          </div>
          <div className="mt-ds-3 grid gap-ds-2 sm:grid-cols-4"><div className="rounded-md bg-primary-50 px-ds-2 py-ds-1.5"><p className="text-caption text-primary-600">50L 예상</p><strong className="text-lg font-bold text-primary-600 tabular"><PriceText value={selected.price * 50} /></strong></div><div className="rounded-md bg-down-bg px-ds-2 py-ds-1.5"><p className="text-caption text-down">평균 대비</p><strong className="text-lg font-bold text-down tabular"><PriceText value={Math.round(Math.max(0, 50 * (data.averagePrice - selected.price)))} /> 절약</strong></div><Button variant="secondary" onClick={() => onFavoriteToggle?.(selected.id)} className="h-ds-7"><Star size={15} fill={favoriteStationIds.includes(selected.id) ? 'currentColor' : 'none'} />{favoriteStationIds.includes(selected.id) ? '저장됨' : '저장'}</Button><a href={kakaoRouteHref(selected)} target="_blank" rel="noopener noreferrer" onClick={() => onAction(`${selected.name} 길찾기`)} className="inline-flex h-ds-7 items-center justify-center gap-2 rounded-md bg-primary-600 px-4 text-sm font-bold text-white hover:bg-primary-700"><ExternalLink size={15} />길찾기</a></div>
        </Card> : null}
      </div>
    </div>
  </Shell>;
}

export function AnalysisPage({ data, onAction, selectedFuel = data.fuelOptions[0] ?? '휘발유', onFuelChange, selectedRegion = '서울', regionOptions = [], onRegionChange, onUseLocation, locating = false }: PageProps) {
  const brandRows = data.brandBars.slice(0, 6);
  const widthClass = ['w-full', 'w-11/12', 'w-10/12', 'w-9/12', 'w-8/12', 'w-7/12'];
  const latestOil = data.globalOil.latest;
  return <Shell title={`가격 분석 · ${selectedRegion} ${selectedFuel}`} data={data} onAction={onAction}>
    <RegionFuelControl data={data} selectedFuel={selectedFuel} onFuelChange={onFuelChange} selectedRegion={selectedRegion} regionOptions={regionOptions} onRegionChange={onRegionChange} onUseLocation={onUseLocation} locating={locating} />
    <div className="v6-block v6-delay-1 grid items-start gap-ds-2 xl:grid-cols-main-420">
      <Card padding="normal">
        <SectionHeader title={`${selectedRegion} ${selectedFuel} 브랜드별 가격 차이`} action="가격지도" onAction={() => onAction('가격지도')} />
        <div className="mt-ds-3 space-y-3">
          {brandRows.map((bar, index) => <div key={bar.name} className="grid grid-cols-station-row items-center gap-ds-2">
            <span className="truncate text-sm font-bold text-ink-700">{bar.name}</span>
            <div className="h-2.5 overflow-hidden rounded-full bg-ink-100"><div className={`${widthClass[index] ?? 'w-7/12'} h-full rounded-full bg-primary-600`} /></div>
            <span className="text-right text-sm font-bold text-ink-900 tabular">{bar.value}원</span>
          </div>)}
        </div>
      </Card>
      <Card padding="normal">
        <SectionHeader title="유가 이슈" action="가격 추이" onAction={() => onAction('가격 추이')} />
        {data.aiReport ? <div className="space-y-3"><span className="inline-flex rounded-full bg-primary-50 px-2 py-1 text-xs font-bold text-primary-600">{data.aiReport.sourceLabel}</span><h3 className="text-base font-bold text-ink-900">{data.aiReport.headline}</h3></div> : null}
      </Card>
    </div>
    <div className="grid items-start gap-ds-2 xl:grid-cols-main-420">
      <Card padding="normal">
        <SectionHeader title="국제 동향" />
        <div className="grid gap-ds-2 md:grid-cols-2">
          <div className="rounded-md bg-ink-50 p-ds-2"><p className="text-caption text-ink-500">Brent 최근값</p><strong className="mt-ds-1 block text-2xl font-bold text-ink-900 tabular">{latestOil?.brent?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? '확인중'}</strong><p className="mt-ds-0.5 text-xs text-ink-500">{latestOil?.date ?? '기준일 확인중'}</p></div>
          <div className="rounded-md bg-ink-50 p-ds-2"><p className="text-caption text-ink-500">WTI 최근값</p><strong className="mt-ds-1 block text-2xl font-bold text-ink-900 tabular">{latestOil?.wti?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? '확인중'}</strong><p className="mt-ds-0.5 text-xs text-ink-500">USD/bbl</p></div>
        </div>
      </Card>
      <DataTable caption={`${selectedRegion} ${selectedFuel} 지역 평균 비교`} columns={[{ key: 'region', label: '지역' }, { key: 'fuel', label: '유종' }, { key: 'avg', label: '평균가', align: 'right' }, { key: 'low', label: '최저가', align: 'right' }, { key: 'stationCount', label: '주유소', align: 'right' }]} rows={data.regionRows.slice(0, 10).map((row) => ({ id: row.id, cells: { region: <b>{row.region}</b>, fuel: row.fuel, avg: <PriceText value={row.avg} />, low: <PriceText value={row.low} />, stationCount: <span className="tabular">{row.stationCount.toLocaleString()}곳</span> } }))} />
    </div>
  </Shell>;
}

export function TrendPage({ data, onAction, selectedFuel = data.fuelOptions[0] ?? '휘발유', onFuelChange, selectedRegion = '서울', regionOptions = [], onRegionChange, onUseLocation, locating = false }: PageProps) {
  const initialRange = (() => {
    if (typeof window === 'undefined') return 7;
    const params = new URLSearchParams(window.location.hash.includes('=') ? window.location.hash.replace(/^#/, '') : '');
    const next = Number.parseInt(params.get('range') ?? '7', 10);
    return [7, 30, 90].includes(next) ? next : 7;
  })();
  const [range, setRange] = useState(initialRange);
  const history = useMemo(() => getFuelHistory(data, selectedFuel, selectedRegion, range), [data, selectedFuel, selectedRegion, range]);
  const values = history.map((point) => point.averagePrice);
  const labels = history.map((point) => point.date);
  const first = values[0] ?? 0;
  const latest = values.length ? values[values.length - 1] : first;
  const direction = changeDirection(latest - first);
  return <Shell title={`가격 추이 · ${selectedRegion} ${selectedFuel}`} data={data} onAction={onAction}>
    <RegionFuelControl data={data} selectedFuel={selectedFuel} onFuelChange={onFuelChange} selectedRegion={selectedRegion} regionOptions={regionOptions} onRegionChange={onRegionChange} onUseLocation={onUseLocation} locating={locating} />
    <Card padding="normal" interactive={false} className="v6-block v6-delay-1">
      <div className="flex flex-wrap items-start justify-between gap-ds-2">
        <SectionHeader title={`${selectedRegion} ${selectedFuel} 기간별 가격 흐름`} />
        <FilterChips items={['7일', '30일', '90일']} active={`${range}일`} onChange={(label) => setRange(Number.parseInt(label, 10))} ariaLabel="가격 추이 기간 선택" />
      </div>
      <AxisLineChart values={values} labels={labels} direction={direction} unit="원" height={260} />
      <div className="mt-ds-2 flex flex-wrap gap-ds-1 text-caption text-ink-500"><span className="rounded-full bg-ink-50 px-2 py-1">관측점 {history.length}개</span><span className="rounded-full bg-ink-50 px-2 py-1">현재 <PriceText value={latest} unit="원/L" /></span><PriceBadge direction={direction} text={formatSignedWon(latest - first)} /></div>
    </Card>
    <div className="grid items-start gap-ds-2 xl:grid-cols-main-420">
      <Card padding="normal"><SectionHeader title={`${selectedRegion} ${selectedFuel} 지역 평균 축`} /><HorizontalBarChart data={data.regionRows.slice(0, 17).map((row) => ({ name: row.region, value: row.avg, tone: 'primary' }))} height={360} unit="원" axisLabel="지역 평균가" /></Card>
      <DataTable caption={`${selectedRegion} ${selectedFuel} 최근 관측 12개`} columns={[{ key: 'date', label: '일자' }, { key: 'avg', label: '평균가', align: 'right' }, { key: 'low', label: '최저가', align: 'right' }, { key: 'count', label: '관측 주유소', align: 'right' }]} rows={history.slice(-12).map((point, index) => ({ id: `history-${index}`, cells: { date: point.date, avg: <PriceText value={point.averagePrice} />, low: point.lowestPrice ? <PriceText value={point.lowestPrice} /> : '확인중', count: <span className="tabular">{point.stationCount.toLocaleString()}곳</span> } }))} />
    </div>
  </Shell>;
}

export function RecordsPage({ data, onAction, selectedFuel = data.fuelOptions[0] ?? '휘발유', selectedRegion = data.region ?? '서울' }: PageProps) {
  const [rows, setRows] = useState<FuelRecord[]>(data.records);
  const [liter, setLiter] = useState(50);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), station: data.stations[0]?.name ?? '', liter: '50', price: String(data.stations[0]?.price ?? data.averagePrice) });
  const summary = useMemo(() => {
    const totalLiter = rows.reduce((sum, row) => sum + row.liter, 0);
    const totalAmount = rows.reduce((sum, row) => sum + row.liter * row.price, 0);
    const avgPrice = totalLiter > 0 ? Math.round(totalAmount / totalLiter) : 0;
    const saving = rows.reduce((sum, row) => sum + Math.max(0, data.averagePrice - row.price) * row.liter, 0);
    return { totalLiter, totalAmount, avgPrice, saving: Math.round(saving) };
  }, [rows, data.averagePrice]);
  const addRecord = () => {
    const nextLiter = Number.parseFloat(form.liter);
    const nextPrice = Number.parseInt(form.price, 10);
    if (!form.station || !Number.isFinite(nextLiter) || !Number.isFinite(nextPrice) || nextLiter <= 0 || nextPrice <= 0) { onAction('입력값 확인'); return; }
    const next: FuelRecord = { id: `record-${rows.length + 1}`, date: form.date, station: form.station, liter: nextLiter, price: nextPrice };
    setRows((current) => [next, ...current].slice(0, 12));
    setLiter(Math.round(nextLiter));
    onAction('내 차량 추가');
  };
  const exportCsv = () => {
    const header = 'date,station,liter,price,total';
    const lines = rows.map((row) => [row.date, row.station, row.liter, row.price, row.liter * row.price].join(','));
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'litersave-records.csv';
    link.click();
    URL.revokeObjectURL(url);
    onAction('CSV 내보내기');
  };
  const best = data.stations[0];
  const recent = rows[0];
  const averageUnitPrice = summary.avgPrice || data.averagePrice;
  const projectedSaving = Math.round(Math.max(0, data.averagePrice - (best?.price ?? data.averagePrice)) * 50);
  const monthlyKm = Math.round(Math.max(summary.totalLiter, liter) * 12.4);
  return <Shell title={`내 차량 · ${selectedRegion} ${selectedFuel}`} data={data} onAction={onAction}>
    <div className="grid gap-ds-3 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card padding="normal" className="v6-card-hover">
        <SectionHeader title="내 차량 기준" aside={<span className="text-caption text-ink-500">{selectedRegion} {selectedFuel}</span>} />
        <div className="grid gap-ds-2 md:grid-cols-2">
          <div className="rounded-md bg-primary-50 px-ds-2 py-ds-1.5"><p className="text-caption text-primary-600">월 주행거리</p><strong className="mt-ds-0.5 block text-2xl font-bold text-primary-600 tabular">{monthlyKm.toLocaleString()}km</strong></div>
          <div className="rounded-md bg-ink-50 px-ds-2 py-ds-1.5"><p className="text-caption text-ink-500">평균 단가</p><strong className="mt-ds-0.5 block text-2xl font-bold text-ink-900 tabular"><PriceText value={averageUnitPrice} unit="원/L" /></strong></div>
          <div className="rounded-md bg-down-bg px-ds-2 py-ds-1.5"><p className="text-caption text-down">50L 절약</p><strong className="mt-ds-0.5 block text-2xl font-bold text-down tabular"><PriceText value={projectedSaving} /></strong></div>
          <div className="rounded-md bg-ink-900 px-ds-2 py-ds-1.5 text-white"><p className="text-caption text-white/60">{recent ? '최근 주유소' : '기준 주유량'}</p><strong className="mt-ds-0.5 block truncate text-[20px] font-bold text-white">{recent ? recent.station : `${liter}L`}</strong><span className="mt-ds-0.5 block text-caption text-white/60">{recent ? `${recent.date} · ${recent.liter}L` : '절약 계산 기준'}</span></div>
        </div>
      </Card>
      {best ? <Card padding="normal" className="v6-card-hover">
        <SectionHeader title="추천 주유소" action="가격지도" onAction={() => onAction('가격지도')} />
        <div className="flex items-start justify-between gap-ds-2"><div className="min-w-0"><h3 className="truncate text-body-1 font-bold text-ink-900">{best.name}</h3><p className="mt-ds-0.5 truncate text-caption text-ink-500">{best.brand} · {formatDistanceKm(best.distance)}</p></div><strong className="inline-flex items-baseline text-[20px] font-bold text-primary-500 tabular"><PriceText value={best.price} unit="원/L" /></strong></div>
        <div className="mt-ds-2 grid grid-cols-2 gap-ds-1.5"><div className="rounded-md bg-primary-50 px-ds-2 py-ds-1"><p className="text-caption text-primary-600">50L 예상</p><strong className="text-lg font-bold text-primary-600 tabular"><PriceText value={best.price * 50} /></strong></div><div className="rounded-md bg-down-bg px-ds-2 py-ds-1"><p className="text-caption text-down">예상 절약</p><strong className="text-lg font-bold text-down tabular"><PriceText value={projectedSaving} /></strong></div></div>
        <a href={kakaoRouteHref(best)} target="_blank" rel="noopener noreferrer" onClick={() => onAction(`${best.name} 길찾기`)} className="mt-ds-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-ink-200 text-sm font-bold text-primary-600 hover:border-primary-500 hover:bg-primary-50"><ExternalLink size={15} />길찾기</a>
      </Card> : null}
    </div>
    <div className="grid gap-ds-3 xl:grid-cols-main-380">
      <div className="space-y-ds-2">
        <div className="flex flex-wrap items-center justify-between gap-ds-2"><h3 className="text-base font-bold text-ink-900">최근 내 차량</h3>{rows.length > 0 ? <Button variant="secondary" onClick={exportCsv}><Download size={16} />CSV 내보내기</Button> : null}</div>
        {rows.length > 0 ? <DataTable caption="최근 내 차량" columns={[{ key: 'date', label: '일자' }, { key: 'station', label: '주유소' }, { key: 'liter', label: '주유량', align: 'right' }, { key: 'price', label: '단가', align: 'right' }, { key: 'sum', label: '결제액', align: 'right' }]} rows={rows.map((r) => ({ id: r.id, cells: { date: <span className="inline-flex items-center gap-1.5 text-ink-600"><CalendarDays size={14} />{r.date}</span>, station: <b className="text-ink-900">{r.station}</b>, liter: <span className="tabular">{r.liter}L</span>, price: <PriceText value={r.price} />, sum: <b className="tabular"><PriceText value={r.liter * r.price} /></b> } }))} /> : <Card padding="normal"><div className="flex items-center justify-between gap-ds-2"><span><p className="text-caption text-ink-500">기록 추가 대기</p><strong className="mt-ds-0.5 block text-body-1 text-ink-900">일자 · 주유소 · 주유량</strong></span><WalletCards size={24} className="text-ink-300" /></div></Card>}
      </div>
      <div className="space-y-ds-2">
        <Card padding="normal">
          <SectionHeader title="기록 추가" action="최저가 적용" onAction={() => setForm((current) => ({ ...current, station: best?.name ?? current.station, price: String(best?.price ?? current.price) }))} />
          <div className="space-y-3">
            <label className="block text-caption font-bold text-ink-500">일자<input aria-label="주유 일자" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} className="mt-ds-0.5 h-11 w-full rounded-md border border-ink-200 px-3 text-sm text-ink-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100" /></label>
            <label className="block text-caption font-bold text-ink-500">주유소<select aria-label="주유소 선택" value={form.station} onChange={(event) => setForm((current) => ({ ...current, station: event.target.value }))} className="mt-ds-0.5 h-11 w-full rounded-md border border-ink-200 px-3 text-sm text-ink-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100">{data.stations.slice(0, 8).map((station) => <option key={station.id} value={station.name}>{station.name}</option>)}</select></label>
            <div className="grid grid-cols-2 gap-ds-2">
              <label className="block text-caption font-bold text-ink-500">주유량<input aria-label="주유량" inputMode="decimal" value={form.liter} onChange={(event) => setForm((current) => ({ ...current, liter: event.target.value }))} className="mt-ds-0.5 h-11 w-full rounded-md border border-ink-200 px-3 text-sm text-ink-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100" /></label>
              <label className="block text-caption font-bold text-ink-500">단가<input aria-label="주유 단가" inputMode="numeric" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} className="mt-ds-0.5 h-11 w-full rounded-md border border-ink-200 px-3 text-sm text-ink-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100" /></label>
            </div>
            <Button onClick={addRecord} className="w-full"><Plus size={16} />기록 추가</Button>
          </div>
        </Card>
        <SavingsCalculator selectedLiter={liter} onChange={setLiter} savingPerLiter={Math.max(0, data.averagePrice - (best?.price ?? data.averagePrice))} />
      </div>
    </div>
  </Shell>;
}

export function FavoritesPage({ data, onTabChange, onAction, favoriteStationIds = [], onFavoriteToggle, selectedFuel = data.fuelOptions[0] ?? '휘발유', selectedRegion = data.region ?? '서울' }: PageProps) {
  const favorites = uniqueStations(data.stations).filter((station) => favoriteStationIds.includes(station.id));
  return <Shell title={`저장 주유소 · ${selectedRegion} ${selectedFuel}`} data={data} onAction={onAction}>
    {favorites.length ? <div className="grid gap-ds-2 lg:grid-cols-2 xl:grid-cols-3">{favorites.map((station) => <StationCard key={station.id} station={station} favorite onToggle={() => onFavoriteToggle?.(station.id)} onRoute={() => onAction(`${station.name} 길찾기`)} />)}</div> : <EmptyState title="저장한 주유소가 없습니다" actionLabel="가격지도" onAction={() => onTabChange('stations')} icon={Star} />}
  </Shell>;
}


export function FuelNewsPage({ data, onAction, selectedFuel = data.fuelOptions[0] ?? '휘발유', selectedRegion = data.region ?? '서울' }: PageProps) {
  const [keyword, setKeyword] = useState('전체');
  const keywordCounts = new Map<string, number>();
  data.fuelNews.forEach((item) => keywordCounts.set(item.keyword, (keywordCounts.get(item.keyword) ?? 0) + 1));
  const keywords = ['전체', ...Array.from(keywordCounts.entries()).filter(([, count]) => count > 0).map(([item]) => item).slice(0, 6)];
  const rows = data.fuelNews.filter((item) => keyword === '전체' || item.keyword === keyword).slice(0, 10);
  return <Shell title={`유가 뉴스 · ${selectedRegion} ${selectedFuel}`} data={data} onAction={onAction} compact>
    <div className="flex flex-wrap gap-ds-1">{keywords.map((item) => <button type="button" key={item} onClick={() => setKeyword(item)} aria-pressed={keyword === item} className={`rounded-full border px-ds-2 py-ds-0.5 text-sm ${keyword === item ? 'border-primary-600 bg-primary-600 text-white' : 'border-ink-200 bg-white text-ink-700 hover:border-primary-500'}`}>{item}</button>)}</div>
    {rows.length ? <div className="grid gap-ds-2 xl:grid-cols-main-360">
      <div className="space-y-3">{rows.slice(0, 9).map((item) => {
        const href = item.link || item.originallink;
        return <article key={item.id} className="v6-card-hover rounded-md border border-ink-200 bg-white p-ds-2 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-ds-1 text-caption text-ink-500"><span className="rounded-full bg-primary-50 px-2 py-1 font-bold text-primary-600">{item.keyword}</span><span>{item.source} · {item.publishedAt}</span></div>
          <h3 className="mt-ds-2 text-base font-bold text-ink-900">{item.title}</h3>
          {href ? <a href={href} target="_blank" rel="noopener noreferrer" className="mt-ds-2 inline-flex items-center gap-1.5 text-sm font-bold text-primary-600 hover:underline"><ExternalLink size={15} />원문 보기</a> : null}
        </article>;
      })}</div>
      <Card padding="normal"><SectionHeader title={`${selectedRegion} ${selectedFuel} 관련 키워드`} action="절약계산" onAction={() => onAction('절약계산')} /><div className="space-y-2">{['휘발유','경유','LPG','국제유가','유류세'].map((item) => ({ item, count: data.fuelNews.filter((news) => news.keyword === item).length })).filter(({ count }) => count > 0).map(({ item, count }) => <div key={item} className="flex items-center justify-between rounded-md bg-ink-50 px-ds-2 py-ds-1"><span className="text-sm font-bold text-ink-900">{item}</span><span className="text-caption text-ink-500">{count}건</span></div>)}</div></Card>
    </div> : <EmptyState title="유가 뉴스 항목 확인 필요" icon={Newspaper} />}
  </Shell>;
}

export function AlertsPage({ data, onTabChange, onAction, selectedFuel = data.fuelOptions[0] ?? '휘발유', selectedRegion = data.region ?? '서울' }: PageProps) { return <Shell title={`알림 설정 · ${selectedRegion} ${selectedFuel}`} data={data} onAction={onAction}><EmptyState title="설정한 알림이 없습니다" actionLabel="가격지도" onAction={() => onTabChange('stations')} icon={Newspaper} /></Shell>; }

export function GuidePage({ data, onAction, selectedFuel = data.fuelOptions[0] ?? '휘발유', selectedRegion = data.region ?? '서울' }: PageProps) { return <Shell title={`이용 가이드 · ${selectedRegion} ${selectedFuel}`} data={data} onAction={onAction} compact>
  <div className="grid gap-ds-2 lg:grid-cols-3">{['위치 확인', '가격 비교', '길찾기', '기록 확인'].map((label, index) => <Card key={label} className="p-ds-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-900 text-white tabular">{index + 1}</span><h3 className="mt-ds-2 font-bold">{label}</h3><Button variant="secondary" onClick={() => onAction(label)} className="mt-ds-2 w-full">확인</Button></Card>)}</div>
  <Card padding="normal"><SectionHeader title="빠른 이동" action="가격지도" onAction={() => onAction('가격지도')} /><div className="grid gap-ds-2 md:grid-cols-3"><Button variant="secondary" onClick={() => onAction('가격지도')}><MapPin size={16} />주유소</Button><Button variant="secondary" onClick={() => onAction('절약계산')}><Route size={16} />분석</Button><Button variant="secondary" onClick={() => onAction('내 차량')}><WalletCards size={16} />기록</Button></div></Card>
</Shell>; }

export function NoticePage({ data, onAction, selectedFuel = data.fuelOptions[0] ?? '휘발유', selectedRegion = data.region ?? '서울' }: PageProps) { return <Shell title={`공지사항 · ${selectedRegion} ${selectedFuel}`} data={data} onAction={onAction} compact>
  <EmptyState title="공지사항 항목 확인 필요" icon={Newspaper} />
</Shell>; }
