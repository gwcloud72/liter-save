import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, MapPin, MapPinOff, Navigation, WalletCards } from 'lucide-react';
import { AxisLineChart, Button, Card, FilterChips, PriceBadge, SectionHeader } from '../components/common/ui';
import { KakaoMapPanel, StationRankTable } from '../components/feature/liter';
import type { LiterData } from '../data/normalize';
import { changeDirection, formatSignedWon, getFuelHistory } from '../data/normalize';
import type { UserCoordinates } from '../context/LocationContext';
import { fetchNearbyStations } from '../services/nearbyStations';

interface PageProps {
  data: LiterData;
  onTabChange: (tab: string) => void;
  onAction: (text: string) => void;
  selectedFuel?: string;
  onFuelChange?: (fuel: string) => void;
  selectedRegion?: string;
  regionOptions?: readonly string[];
  onRegionChange?: (region: string) => void;
  onUseLocation?: () => void;
  locating?: boolean;
  isMyLocation?: boolean;
  userCoordinates?: UserCoordinates | null;
}

type NearbyState = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);
  return reduced;
}

function useCountUp(target: number, duration = 800) {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(reduced ? target : 0);
  const animated = useRef(false);

  useEffect(() => {
    if (reduced || animated.current) {
      setValue(target);
      return;
    }
    animated.current = true;
    let frame = 0;
    const started = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, reduced]);

  return value;
}

function MoneyUnit({ children }: { children: string }) {
  return <span className="v6-unit">{children}</span>;
}

function PriceValue({ value, unit }: { value: number; unit: string }) {
  return <span className="inline-flex items-baseline tabular"><span>{value.toLocaleString()}</span><MoneyUnit>{unit}</MoneyUnit></span>;
}

function SavingTile({ label, value, sub, tone = 'default' }: { label: string; value: ReactNode; sub: string; tone?: 'default' | 'orange' | 'dark' | 'blue' }) {
  const cls = tone === 'dark' ? 'border-ink-900 bg-ink-900 text-white' : tone === 'orange' ? 'border-primary-100 bg-primary-50 text-primary-700' : tone === 'blue' ? 'border-down bg-down-bg text-down' : 'border-ink-200 bg-white text-ink-900';
  return <div className={`v6-card-hover rounded-lg border p-ds-3 shadow-card ${cls}`}><p className="text-[11px] text-current opacity-70">{label}</p><strong className="mt-ds-1 block text-[20px] leading-[1.1] text-current tabular">{value}</strong><span className="mt-ds-1 block truncate text-[13px] text-current opacity-70">{sub}</span></div>;
}

function StationSkeleton() {
  return <div className="space-y-ds-2" aria-label="주유소 로딩">
    {Array.from({ length: 5 }).map((_, index) => <div key={`station-skeleton-${index}`} className="rounded-lg border border-ink-200 bg-white p-ds-2 shadow-card"><div className="flex items-center gap-ds-2"><span className="h-ds-3 w-ds-3 rounded-full ds-skeleton" /><span className="h-ds-2 flex-1 rounded-md ds-skeleton" /><span className="h-ds-3 w-ds-8 rounded-md ds-skeleton" /></div></div>)}
  </div>;
}

function NearbyNotice({ type, onAction }: { type: 'empty' | 'error'; onAction?: () => void }) {
  const Icon = type === 'empty' ? MapPinOff : AlertCircle;
  const title = type === 'empty' ? '주변 주유소를 찾지 못했어요' : '가격을 불러오지 못했어요';
  const action = type === 'empty' ? '위치 다시 잡기' : '다시 시도';
  return <div className="rounded-lg border border-ink-200 bg-white p-ds-3 shadow-card">
    <div className="flex items-center gap-ds-2"><Icon className="h-ds-5 w-ds-5 text-ink-300" strokeWidth={1.7} /><div className="min-w-0 flex-1"><h3 className="text-[15px] leading-[1.3] text-ink-900">{title}</h3><p className="mt-ds-0.5 text-[13px] leading-[1.5] text-ink-500">10분 전 저장 기준</p></div><Button variant="secondary" size="sm" onClick={onAction}>{action}</Button></div>
  </div>;
}

export function HomePage({ data, onTabChange, selectedFuel = data.fuelOptions[0] ?? '휘발유', onFuelChange, selectedRegion = '서울', regionOptions = [], onRegionChange, onUseLocation, locating = false, isMyLocation = false, userCoordinates = null }: PageProps) {
  const [liveStations, setLiveStations] = useState<LiterData['stations']>([]);
  const [nearbyState, setNearbyState] = useState<NearbyState>('idle');
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (!isMyLocation || !userCoordinates) {
      setLiveStations([]);
      setNearbyState('idle');
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => setNearbyState('loading'), 0);
    fetchNearbyStations({ coordinates: userCoordinates, fuel: selectedFuel, region: selectedRegion, sort: 'distance', signal: controller.signal })
      .then((stations) => {
        window.setTimeout(() => {
          if (controller.signal.aborted) return;
          setLiveStations(stations);
          setNearbyState(stations.length ? 'ready' : 'empty');
        }, 300);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLiveStations([]);
          window.setTimeout(() => setNearbyState('error'), 300);
        }
      });
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [isMyLocation, userCoordinates?.lat, userCoordinates?.lng, selectedFuel, selectedRegion]);

  const activeStations = liveStations.length ? liveStations : data.stations;
  const best = activeStations[0] ?? data.stations[0];
  const history = useMemo(() => getFuelHistory(data, selectedFuel, selectedRegion, 7), [data, selectedFuel, selectedRegion]);
  const trendValues = history.map((point) => point.averagePrice);
  const trendLabels = history.map((point) => point.date);
  const regions = regionOptions.length ? regionOptions : Array.from(new Set(data.regionRows.map((row) => row.region))).filter(Boolean);
  const savingPerLiter = best ? Math.max(0, data.averagePrice - best.price) : 0;
  const saving50Target = Math.round(savingPerLiter * 50);
  const saving50 = useCountUp(saving50Target);
  const bestPrice = useCountUp(best?.price ?? 0);
  const freshnessCopy = nearbyState === 'ready' ? '10분 전 업데이트' : '최근 저장 기준';

  if (!best) {
    return <div className="mx-auto max-w-[1280px]"><NearbyNotice type="empty" onAction={onUseLocation} /></div>;
  }

  return <div className={`v6-page mx-auto max-w-[1280px] space-y-ds-4 px-0 ${reducedMotion ? 'v6-reduce-motion' : ''}`}>
    <section className="v6-block v6-delay-0 overflow-hidden rounded-lg border border-primary-100 bg-gradient-to-br from-primary-50 via-white to-amber-50 p-ds-4 shadow-popover">
      <div className="grid gap-ds-6 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-center">
        <div className="min-w-0">
          <span className="inline-flex rounded-full bg-primary-600 px-ds-2 py-ds-0.5 text-[11px] text-white">LITER SAVE</span>
          <h1 className="mt-ds-2 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-ink-900">오늘 최대 <span className="inline-flex items-baseline tabular"><span>{saving50.toLocaleString()}</span><MoneyUnit>원</MoneyUnit></span> 절약</h1>
          <p className="mt-ds-1 text-[15px] leading-[1.5] text-ink-700">{isMyLocation ? '내 위치' : selectedRegion} · {selectedFuel} · {freshnessCopy}</p>
          <div className="mt-ds-3 flex flex-wrap gap-ds-1"><Button onClick={() => onTabChange('stations')} rightIcon={<Navigation size={16} />}>가격지도 보기</Button><Button variant="secondary" onClick={() => onTabChange('analysis')} rightIcon={<WalletCards size={16} />}>절약 계산</Button></div>
        </div>
        <div className="v6-card-hover rounded-lg border border-white bg-white p-ds-3 shadow-card">
          <div className="flex items-start justify-between gap-ds-2"><div><p className="text-[11px] text-primary-600">최저가 추천</p><h2 className="mt-ds-0.5 truncate text-[20px] font-bold leading-[1.3] text-ink-900">{best.name}</h2><p className="mt-ds-0.5 truncate text-[13px] text-ink-500">{best.brand} · {best.distance}km</p></div><MapPin className="text-primary-600" size={22} /></div>
          <strong className="mt-ds-2 flex items-baseline text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-primary-600 tabular"><span>{bestPrice.toLocaleString()}</span><MoneyUnit>원/L</MoneyUnit></strong>
          <div className="mt-ds-2 flex flex-wrap items-center gap-ds-1"><PriceBadge direction={changeDirection(best.avgDiff)} text={formatSignedWon(best.avgDiff)} />{saving50Target > 0 ? <span className="inline-flex items-baseline rounded-full bg-down-bg px-ds-2 py-ds-0.5 text-[13px] text-down">50L&nbsp;<span className="tabular">{saving50Target.toLocaleString()}</span><MoneyUnit>원</MoneyUnit>&nbsp;절약</span> : null}</div>
        </div>
      </div>
    </section>

    <div className="v6-block v6-delay-1 grid gap-ds-2 md:grid-cols-2">
      <SavingTile label="최저가" value={<PriceValue value={best.price} unit="원/L" />} sub={best.name} tone="dark" />
      <SavingTile label="50L 절약" value={<PriceValue value={saving50Target} unit="원" />} sub="50L 주유 기준" tone="orange" />
    </div>

    <Card padding="normal" interactive={false} className="v6-block v6-delay-2 rounded-lg">
      <SectionHeader title="조회 기준" />
      <div className="space-y-ds-2">
        <FilterChips items={data.fuelOptions} active={selectedFuel} onChange={(fuel) => onFuelChange?.(fuel)} ariaLabel="유종 선택" />
        <div className="grid gap-ds-2 lg:grid-cols-[minmax(0,1fr)_auto]">
          <label className="block text-[13px] text-ink-500">지역 선택<select aria-label="지역 선택" value={selectedRegion} onChange={(event) => onRegionChange?.(event.target.value)} className="mt-ds-0.5 h-10 w-full rounded-md border border-ink-200 bg-white px-ds-2 text-[15px] text-ink-900 focus-visible:outline-none focus-visible:shadow-focus">{regions.map((region) => <option key={region} value={region}>{region}</option>)}</select></label>
          <Button variant="secondary" onClick={onUseLocation} loading={locating} className="self-end"><MapPin size={16} />내 위치 기준</Button>
        </div>
      </div>
    </Card>

    <div className="v6-block v6-delay-3 grid gap-ds-3 xl:grid-cols-[420px_minmax(0,1fr)]">
      <Card padding="normal" className="rounded-lg">
        <SectionHeader title={isMyLocation ? '내 위치 가까운 주유소' : '주변 최저가'} action="전체" onAction={() => onTabChange('stations')} />
        {nearbyState === 'loading' ? <StationSkeleton /> : nearbyState === 'empty' ? <NearbyNotice type="empty" onAction={onUseLocation} /> : nearbyState === 'error' ? <NearbyNotice type="error" onAction={onUseLocation} /> : <StationRankTable stations={activeStations} onSelect={() => onTabChange('stations')} limit={6} compact />}
      </Card>
      <KakaoMapPanel stations={activeStations} onSelect={() => onTabChange('stations')} tall />
    </div>

    <div className="v6-block v6-delay-4 grid gap-ds-3 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card padding="normal" className="rounded-lg">
        <SectionHeader title={`${selectedRegion} ${selectedFuel} 가격 흐름`} action="절약계산" onAction={() => onTabChange('analysis')} />
        <AxisLineChart values={trendValues} labels={trendLabels} direction="down" unit="원" height={220} />
      </Card>
      <Card padding="normal" className="rounded-lg">
        <SectionHeader title="유가 체크" action="뉴스" onAction={() => onTabChange('fuel-news')} />
        <div className="space-y-ds-1.5">
          {data.fuelNews.slice(0, 4).map((item) => <button type="button" key={item.id} onClick={() => onTabChange('fuel-news')} className="v6-list-row grid w-full grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-ds-1.5 rounded-md bg-ink-50 px-ds-2 py-ds-1.5 text-left"><span className="rounded-full bg-primary-50 px-ds-1 py-ds-0.5 text-[11px] text-primary-600">{item.keyword}</span><span className="truncate text-[15px] text-ink-900">{item.title}</span><span className="text-[13px] text-ink-500">{item.publishedAt}</span></button>)}
        </div>
      </Card>
    </div>
  </div>;
}
