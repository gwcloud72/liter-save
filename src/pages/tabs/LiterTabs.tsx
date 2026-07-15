import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarDays,
  Download,
  ExternalLink,
  Fuel,
  Gauge,
  MapPin,
  Navigation,
  Newspaper,
  Plus,
  Route,
  Star,
  WalletCards,
} from "lucide-react";
import { HorizontalBarChart } from "../../components/charts/HorizontalBarChart";
import { DeviationBarChart } from "../../components/charts/DeviationBarChart";
import {
  AxisLineChart,
  Button,
  Card,
  DataTable,
  EmptyState,
  FilterChips,
  MiniTrend,
  PriceBadge,
  PriceAmount,
  ServiceStateNotice,
  SearchField,
  SectionHeader,
  StatsStrip,
} from "../../components/common/ui";
import {
  KakaoMapPanel,
  SavingsCalculator,
  StationCard,
  StationRankTable,
} from "../../components/feature/liter";
import type { LiterData } from "../../data/normalize";
import {
  changeDirection,
  formatSignedWon,
  getFuelHistory,
} from "../../data/normalize";
import type { UserCoordinates } from "../../context/LocationContext";
import { fetchNearbyStations } from "../../services/nearbyStations";
import { kakaoRouteHref } from "../../utils/kakao";
import {
  formatDistanceKm,
  sortStationsByUserDistance,
} from "../../utils/stationDistance";

interface PageProps {
  data: LiterData;
  onTabChange: (tab: string) => void;
  onAction: (text: string) => void;
  favoriteStationIds?: string[];
  onFavoriteToggle?: (stationId: string) => void;
  onRecordsChange?: (records: FuelRecord[]) => void;
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
function isDataExpired(data: LiterData): boolean {
  if (!data.generatedAt) return false;
  const generated = new Date(data.generatedAt).getTime();
  if (!Number.isFinite(generated)) return false;
  return Date.now() - generated > 1000 * 60 * 60 * 24;
}

function Shell({
  title,
  children,
  data,
  contextLine,
  locationDenied = false,
}: {
  title: string;
  children: ReactNode;
  data: LiterData;
  onAction: (text: string) => void;
  compact?: boolean;
  contextLine?: string;
  locationDenied?: boolean;
}) {
  const refreshPage = () => {
    if (typeof window !== "undefined") window.location.reload();
  };
  return (
    <div className="v6-page min-w-0 space-y-section-mobile tablet:space-y-section-tablet desktop:space-y-section-desktop">
      <SectionHeader title={title} />
      <div className="rounded-md border border-ink-200 bg-white px-ds-2 py-ds-1 text-caption font-bold text-ink-700">
        {contextLine ??
          `${data.dataStatus.sourceLabel} · ${data.stations.length.toLocaleString()}곳 · ${data.dataStatus.shortLabel}`}
      </div>
      {isDataExpired(data) ? (
        <ServiceStateNotice
          kind="data-expired"
          onAction={refreshPage}
          compact
        />
      ) : null}
      {locationDenied ? (
        <ServiceStateNotice kind="location-denied" compact />
      ) : null}
      {children}
    </div>
  );
}

type FuelRecord = LiterData["records"][number];

function csvCell(value: string | number): string {
  const text = String(value).replace(/\r?\n/g, " ");
  return /[",]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function RecordMetric({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Fuel;
  label: string;
  value: ReactNode;
  sub: string;
}) {
  return (
    <Card padding="normal" className="v6-card-hover">
      <div className="flex items-start justify-between gap-ds-2">
        <div>
          <p className="text-caption text-ink-600">{label}</p>
          <strong className="mt-ds-1 block text-2xl font-bold text-ink-900 tabular">
            {value}
          </strong>
          <p className="mt-ds-0.5 text-xs text-ink-600">{sub}</p>
        </div>
        <span className="rounded-lg bg-ink-100 p-2 text-ink-700">
          <Icon size={18} />
        </span>
      </div>
    </Card>
  );
}
function PriceText({
  value,
  unit = "원",
  className = "",
}: {
  value: number;
  unit?: string;
  className?: string;
}) {
  return (
    <PriceAmount value={value} unit={unit} size="sm" className={className} />
  );
}

function uniqueStations(stations: LiterData["stations"]) {
  return Array.from(
    new Map(stations.map((station) => [station.id, station])).values(),
  );
}

function scopeTitle(_isMyLocation: boolean, selectedRegion: string) {
  return selectedRegion;
}

function sourceLine(
  data: LiterData,
  isMyLocation: boolean,
  selectedFuel: string,
) {
  return isMyLocation
    ? `${data.dataStatus.sourceLabel} · GPS 내 위치 기준 · ${data.stations.length.toLocaleString()}곳 · ${data.dataStatus.shortLabel}`
    : `${data.dataStatus.sourceLabel} · ${data.stations.length.toLocaleString()}곳 · ${data.dataStatus.shortLabel}`;
}

function RegionFuelControl({
  data,
  selectedFuel,
  onFuelChange,
  selectedRegion,
  regionOptions = [],
  onRegionChange,
  onUseLocation,
  locating = false,
  isMyLocation = false,
  locationDenied = false,
}: {
  data: LiterData;
  selectedFuel: string;
  onFuelChange?: (fuel: string) => void;
  selectedRegion: string;
  regionOptions?: readonly string[];
  onRegionChange?: (region: string) => void;
  onUseLocation?: () => void;
  locating?: boolean;
  isMyLocation?: boolean;
  locationDenied?: boolean;
}) {
  const regions = regionOptions.length
    ? regionOptions
    : Array.from(new Set(data.regionRows.map((row) => row.region))).filter(
        Boolean,
      );
  return (
    <Card padding="normal" interactive={false}>
      <SectionHeader title="지역·유종 선택" />
      <div className="space-y-ds-2">
        <FilterChips
          items={data.fuelOptions}
          active={selectedFuel}
          onChange={(fuel) => onFuelChange?.(fuel)}
          ariaLabel="유종 선택"
        />
        <div className="grid gap-ds-2 lg:grid-cols-[minmax(0,1fr)_auto]">
          <label className="block text-caption font-bold text-ink-500">
            지역 선택
            <select
              aria-label="지역 선택"
              value={selectedRegion}
              onChange={(event) => onRegionChange?.(event.target.value)}
              className="mt-ds-0.5 h-11 w-full rounded-md border border-ink-200 bg-white px-3 text-sm text-ink-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              {regions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </label>
          <Button
            variant={isMyLocation ? "primary" : "secondary"}
            onClick={onUseLocation}
            loading={locating}
            className="self-end"
          >
            <MapPin size={16} />
            {isMyLocation ? "GPS 적용 중" : "GPS 내 위치"}
          </Button>
        </div>
        {locationDenied ? (
          <ServiceStateNotice kind="location-denied" compact />
        ) : null}
      </div>
    </Card>
  );
}

export function StationsPage({
  data,
  onAction,
  favoriteStationIds = [],
  onFavoriteToggle,
  selectedFuel = data.fuelOptions[0] ?? "휘발유",
  onFuelChange,
  selectedRegion = "서울",
  regionOptions = [],
  onRegionChange,
  onUseLocation,
  locating = false,
  isMyLocation = false,
  userCoordinates = null,
  locationDenied = false,
}: PageProps) {
  const [q, setQ] = useState("");
  const [liveStations, setLiveStations] = useState<LiterData["stations"]>([]);
  useEffect(() => {
    if (!isMyLocation || !userCoordinates) {
      setLiveStations([]);
      return;
    }
    const controller = new AbortController();
    fetchNearbyStations({
      coordinates: userCoordinates,
      fuel: selectedFuel,
      region: selectedRegion,
      sort: "distance",
      signal: controller.signal,
    })
      .then((stations) => setLiveStations(stations))
      .catch(() => {
        if (!controller.signal.aborted)
          setLiveStations(
            sortStationsByUserDistance(data.stations, userCoordinates),
          );
      });
    return () => controller.abort();
  }, [
    isMyLocation,
    userCoordinates?.lat,
    userCoordinates?.lng,
    selectedFuel,
    selectedRegion,
  ]);
  const [selectedId, setSelectedId] = useState(data.stations[0]?.id ?? "");
  const sourceStations = liveStations.length ? liveStations : data.stations;
  const list = sourceStations.filter(
    (station) =>
      station.name.includes(q) ||
      station.brand.includes(q) ||
      station.address.includes(q) ||
      q === "",
  );
  const selected = list.find((station) => station.id === selectedId) ?? list[0];
  const selectStation = (
    station: (typeof data.stations)[number],
    source: string,
  ) => {
    setSelectedId(station.id);
    onAction(`${station.name} ${source}`);
  };
  return (
    <Shell
      title={`지도 · ${selectedRegion} ${selectedFuel}`}
      data={data}
      onAction={onAction}
      contextLine={sourceLine(data, isMyLocation, selectedFuel)}
      locationDenied={locationDenied}
    >
      <div className="v6-block v6-delay-0">
        <RegionFuelControl
          data={data}
          selectedFuel={selectedFuel}
          onFuelChange={onFuelChange}
          selectedRegion={selectedRegion}
          regionOptions={regionOptions}
          onRegionChange={onRegionChange}
          onUseLocation={onUseLocation}
          locating={locating}
          isMyLocation={isMyLocation}
          locationDenied={locationDenied}
        />
      </div>
      <div className="v6-block v6-delay-1">
        <SearchField
          value={q}
          onChange={setQ}
          placeholder="주유소명·브랜드·주소 검색"
        />
      </div>
      <div className="v6-block v6-delay-2 grid gap-ds-3 wide:grid-cols-map-search">
        <Card padding="normal">
          <SectionHeader
            title={`${selectedRegion} ${selectedFuel} 검색 결과`}
            action="거리순"
            onAction={() => onAction("거리순")}
          />
          {list.length ? (
            <StationRankTable
              stations={list}
              onSelect={(station) => selectStation(station, "선택")}
            />
          ) : (
            <ServiceStateNotice kind="empty-nearby" onAction={() => setQ("")} />
          )}
        </Card>
        <div className="space-y-ds-2">
          <KakaoMapPanel
            stations={list}
            onSelect={(station) => selectStation(station, "지도 선택")}
            userCoordinates={isMyLocation ? userCoordinates : null}
            tall
          />
          {selected ? (
            <Card padding="normal" selected>
              <div className="flex flex-wrap items-start justify-between gap-ds-2">
                <div className="min-w-0">
                  <p className="text-caption font-bold text-ink-700">
                    선택 주유소
                  </p>
                  <h3 className="mt-ds-0.5 truncate text-heading-2 text-ink-900">
                    {selected.name}
                  </h3>
                  <p className="mt-ds-0.5 text-sm text-ink-600">
                    {selected.brand} · {formatDistanceKm(selected.distance)} ·{" "}
                    {selected.address}
                  </p>
                </div>
                <div className="text-right">
                  <strong className="inline-flex items-baseline justify-end gap-0.5 text-price-lg text-ink-900 tabular">
                    <PriceText value={selected.price} unit="원/L" />
                  </strong>
                  <div className="mt-ds-1.5">
                    <PriceBadge
                      direction={changeDirection(selected.avgDiff)}
                      text={formatSignedWon(selected.avgDiff)}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-ds-3 grid gap-ds-2 sm:grid-cols-4">
                <div className="rounded-md bg-ink-50 px-ds-2 py-ds-1.5">
                  <p className="text-caption text-ink-700">50L 예상</p>
                  <strong className="text-lg font-bold text-ink-700 tabular">
                    <PriceText value={selected.price * 50} />
                  </strong>
                </div>
                <div className="rounded-md bg-down-bg px-ds-2 py-ds-1.5">
                  <p className="text-caption text-down">평균 대비</p>
                  <strong className="text-lg font-bold text-down tabular">
                    <PriceText
                      value={Math.round(
                        Math.max(0, 50 * (data.averagePrice - selected.price)),
                      )}
                    />{" "}
                    절약
                  </strong>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => onFavoriteToggle?.(selected.id)}
                  className="h-control-lg"
                >
                  <Star
                    size={15}
                    fill={
                      favoriteStationIds.includes(selected.id)
                        ? "currentColor"
                        : "none"
                    }
                  />
                  {favoriteStationIds.includes(selected.id) ? "저장됨" : "저장"}
                </Button>
                <a
                  href={kakaoRouteHref(selected)}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-primary-cta
                  onClick={() => onAction(`${selected.name} 길찾기`)}
                  className="inline-flex h-control-lg items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary-600 px-4 text-sm font-bold text-white hover:bg-primary-700"
                >
                  <ExternalLink size={15} />
                  길찾기
                </a>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </Shell>
  );
}

export function AnalysisPage({
  data,
  onTabChange,
  onAction,
  selectedFuel = data.fuelOptions[0] ?? "휘발유",
  onFuelChange,
  selectedRegion = "서울",
  regionOptions = [],
  onRegionChange,
  onUseLocation,
  locating = false,
  isMyLocation = false,
  locationDenied = false,
}: PageProps) {
  const brandRows = data.brandBars.slice(0, 6);
  const brandAverage = brandRows.length
    ? Math.round(
        brandRows.reduce((sum, row) => sum + row.value, 0) / brandRows.length,
      )
    : 0;
  const best = data.stations[0];
  const savingPerLiter = best ? Math.max(0, data.averagePrice - best.price) : 0;
  const saving50 = Math.round(savingPerLiter * 50);
  const trend = getFuelHistory(data, selectedFuel, selectedRegion, 7);
  const firstTrend = trend[0]?.averagePrice ?? data.averagePrice;
  const latestTrend = trend.length ? trend[trend.length - 1].averagePrice : firstTrend;
  const trendDelta = latestTrend - firstTrend;
  const decision =
    savingPerLiter >= 10 || trendDelta >= 0
      ? "오늘은 지금 넣는 쪽이 유리해요"
      : "가격 변동을 조금 더 지켜보세요";
  const latestOil = data.globalOil.latest;
  return (
    <Shell
      title={`분석 · ${scopeTitle(isMyLocation, selectedRegion)} ${selectedFuel}`}
      data={data}
      onAction={onAction}
      contextLine={sourceLine(data, isMyLocation, selectedFuel)}
      locationDenied={locationDenied}
    >
      <Card
        padding="normal"
        className="v6-block v6-delay-1 border-ink-200 bg-ink-50"
      >
        <SectionHeader title="오늘 주유 판단" />
        <div className="grid gap-ds-2 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
          <div>
            <h2 className="text-[24px] font-bold leading-[1.2] text-ink-900">
              {decision}
            </h2>
            <p className="mt-ds-1 text-[14px] leading-[1.6] text-ink-700">
              {best?.name ?? selectedRegion} 기준으로 주변 평균보다 50L{" "}
              {saving50.toLocaleString()}원 아끼고, 최근 7일 평균은{" "}
              {formatSignedWon(trendDelta)}입니다.
            </p>
            <div className="mt-ds-2 grid gap-ds-1 text-[13px] font-bold text-ink-700 sm:grid-cols-3">
              <span className="rounded-md bg-white px-ds-2 py-ds-1 shadow-card">절약액 {saving50.toLocaleString()}원</span>
              <span className="rounded-md bg-white px-ds-2 py-ds-1 shadow-card">흐름 {formatSignedWon(trendDelta)}</span>
              <span className="rounded-md bg-white px-ds-2 py-ds-1 shadow-card">할인 조건은 선택 시 반영</span>
            </div>
          </div>
          <div className="grid gap-ds-1.5 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-md bg-white px-ds-2 py-ds-1.5 shadow-card">
              <p className="text-caption text-ink-600">현장 최저</p>
              <PriceAmount
                value={best?.price ?? data.averagePrice}
                unit="원/L"
                size="md"
              />
            </div>
            <Button variant="secondary" onClick={() => onTabChange("discount")}>
              <WalletCards size={16} />
              할인 조건은 따로 계산
            </Button>
          </div>
        </div>
      </Card>
      <RegionFuelControl
        data={data}
        selectedFuel={selectedFuel}
        onFuelChange={onFuelChange}
        selectedRegion={selectedRegion}
        regionOptions={regionOptions}
        onRegionChange={onRegionChange}
        onUseLocation={onUseLocation}
        locating={locating}
        isMyLocation={isMyLocation}
        locationDenied={locationDenied}
      />
      <div className="v6-block v6-delay-1 grid items-start gap-ds-2 wide:grid-cols-main-420">
        <Card padding="normal">
          <SectionHeader
            title={`${selectedRegion} ${selectedFuel} 브랜드별 평균 대비`}
            action="지도"
            onAction={() => onTabChange("stations")}
          />
          <DeviationBarChart
            data={brandRows.map((bar) => ({
              name: bar.name,
              value: bar.value,
            }))}
            average={brandAverage}
            height={300}
            limit={6}
            unit="원"
            axisLabel="브랜드 평균 대비"
            contextLabel={`브랜드 평균 ${brandAverage.toLocaleString()}원/L 기준`}
          />
        </Card>
        <Card padding="normal">
          <SectionHeader
            title="유가 이슈"
            action="가격 추이"
            onAction={() => onTabChange("trend")}
          />
          {data.aiReport ? (
            <div className="space-y-3">
              <span className="inline-flex rounded-full bg-ink-100 px-2 py-1 text-xs font-bold text-ink-700">
                {data.aiReport.sourceLabel}
              </span>
              <h3 className="text-base font-bold text-ink-900">
                {data.aiReport.headline}
              </h3>
            </div>
          ) : null}
        </Card>
      </div>
      <div className="grid items-start gap-ds-2 large:grid-cols-[minmax(0,1fr)_minmax(560px,1.35fr)]">
        <Card padding="normal">
          <SectionHeader title="국제 동향" />
          <div className="grid gap-ds-2 md:grid-cols-2">
            <div className="rounded-md bg-ink-50 p-ds-2">
              <p className="text-caption text-ink-600">Brent 최근값</p>
              <strong className="mt-ds-1 block text-2xl font-bold text-ink-900 tabular">
                {latestOil?.brent?.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                }) ?? "자료 대기"}
              </strong>
              <p className="mt-ds-0.5 text-xs text-ink-600">
                {latestOil?.date ?? "기준일 대기"}
              </p>
            </div>
            <div className="rounded-md bg-ink-50 p-ds-2">
              <p className="text-caption text-ink-600">WTI 최근값</p>
              <strong className="mt-ds-1 block text-2xl font-bold text-ink-900 tabular">
                {latestOil?.wti?.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                }) ?? "자료 대기"}
              </strong>
              <p className="mt-ds-0.5 text-xs text-ink-600">USD/bbl</p>
            </div>
          </div>
        </Card>
        <DataTable
          caption={`${selectedRegion} ${selectedFuel} 지역 평균 비교`}
          columns={[
            { key: "region", label: "지역" },
            { key: "fuel", label: "유종" },
            { key: "avg", label: "평균가", align: "right" },
            { key: "low", label: "최저가", align: "right" },
            { key: "stationCount", label: "주유소", align: "right" },
          ]}
          rows={data.regionRows.slice(0, 10).map((row) => ({
            id: row.id,
            cells: {
              region: <b>{row.region}</b>,
              fuel: row.fuel,
              avg: <PriceText value={row.avg} />,
              low: <PriceText value={row.low} />,
              stationCount: (
                <span className="tabular">
                  {row.stationCount.toLocaleString()}곳
                </span>
              ),
            },
          }))}
        />
      </div>
    </Shell>
  );
}

export function DiscountPage({
  data,
  onAction,
  selectedFuel = data.fuelOptions[0] ?? "휘발유",
  onFuelChange,
  selectedRegion = "서울",
  regionOptions = [],
  onRegionChange,
  onUseLocation,
  locating = false,
  isMyLocation = false,
  userCoordinates = null,
  locationDenied = false,
}: PageProps) {
  const best = data.stations[0];
  const nearby = data.stations.slice(0, 4);
  const [discountPerLiter, setDiscountPerLiter] = useState(0);
  const basePrice = best?.price ?? data.averagePrice;
  const finalPrice = Math.max(0, basePrice - discountPerLiter);
  const baseSaving = Math.round(
    Math.max(0, data.averagePrice - basePrice) * 50,
  );
  const conditionSaving = Math.round(
    Math.max(0, data.averagePrice - finalPrice) * 50,
  );
  const extraSaving = Math.max(0, conditionSaving - baseSaving);
  const selectedLabel =
    discountPerLiter === 0
      ? "현장 가격"
      : `${discountPerLiter.toLocaleString()}원/L 낮춤`;

  return (
    <Shell
      title={`할인 조건 · ${scopeTitle(isMyLocation, selectedRegion)} ${selectedFuel}`}
      data={data}
      onAction={onAction}
      contextLine={sourceLine(data, isMyLocation, selectedFuel)}
      locationDenied={locationDenied}
    >
      <RegionFuelControl
        data={data}
        selectedFuel={selectedFuel}
        onFuelChange={onFuelChange}
        selectedRegion={selectedRegion}
        regionOptions={regionOptions}
        onRegionChange={onRegionChange}
        onUseLocation={onUseLocation}
        locating={locating}
        isMyLocation={isMyLocation}
        locationDenied={locationDenied}
      />

      <div className="v6-block v6-delay-1 grid items-start gap-ds-3 xl:grid-cols-3">
        <Card tone="muted" padding="normal" className="h-full">
          <SectionHeader title="비교 기준" />
          <div className="grid gap-ds-2 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-md bg-ink-50 p-ds-2">
              <p className="text-caption text-ink-600">주변 평균</p>
              <PriceAmount value={data.averagePrice} unit="원/L" size="md" />
            </div>
            <div className="rounded-md bg-ink-50 p-ds-2">
              <p className="text-caption text-ink-600">현장 최저</p>
              <PriceAmount value={basePrice} unit="원/L" size="md" />
            </div>
            <div className="rounded-md bg-down-bg p-ds-2">
              <p className="text-caption text-down">50L 절약</p>
              <PriceAmount
                value={baseSaving}
                unit="원"
                size="md"
                tone="saving"
              />
            </div>
          </div>
          <p className="mt-ds-2 text-[13px] leading-[1.5] text-ink-600">
            기본 비교는 누구에게나 같은 현장 가격입니다. 할인은 사용자가 조건을
            선택한 뒤에만 반영합니다.
          </p>
        </Card>

        <Card tone="muted" padding="normal" className="h-full">
          <SectionHeader title="내 할인 조건" />
          <p className="text-[14px] leading-[1.6] text-ink-600">
            카드나 제휴 조건이 없으면 현장 가격 그대로 두세요.
          </p>
          <div className="mt-ds-2 grid gap-ds-1.5 sm:grid-cols-2">
            {[
              { label: "현장 가격", value: 0 },
              { label: "30원/L 낮춤", value: 30 },
              { label: "50원/L 낮춤", value: 50 },
              { label: "80원/L 직접 입력", value: 80 },
            ].map((item) => (
              <button
                type="button"
                key={item.label}
                onClick={() => setDiscountPerLiter(item.value)}
                aria-pressed={discountPerLiter === item.value}
                className={`min-h-11 rounded-md border px-ds-2 text-sm font-bold leading-[1.2] transition active:scale-[0.98] ${discountPerLiter === item.value ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-white text-ink-700 hover:border-ink-400 hover:bg-ink-50"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="mt-ds-2 rounded-lg border border-ink-200 bg-white p-ds-2">
            <p className="text-caption font-bold text-ink-700">
              {selectedLabel}
            </p>
            <PriceAmount value={finalPrice} unit="원/L" size="lg" />
            <span className="mt-ds-0.5 block text-caption text-ink-600">
              50L 기준 {conditionSaving.toLocaleString()}원 절약
            </span>
            <span className="mt-ds-1 inline-flex rounded-full bg-ink-100 px-ds-2 py-ds-0.5 text-caption font-bold text-ink-700">
              {extraSaving > 0
                ? `현장 가격보다 ${extraSaving.toLocaleString()}원 더 아껴요`
                : "현장 가격 그대로"}
            </span>
          </div>
        </Card>

        <Card tone="muted" padding="normal" className="h-full">
          <SectionHeader title="주유소 이동" />
          {best ? (
            <div className="space-y-ds-2">
              <span className="block min-w-0">
                <span className="inline-flex max-w-full whitespace-nowrap rounded-full bg-ink-100 px-ds-1.5 py-ds-0.5 text-[11px] font-bold text-ink-700">
                  {best.brand}
                </span>
                <b
                  className="v7-station-title v8-station-name mt-ds-0.5 block text-[16px] text-ink-900 no-underline"
                  title={best.name}
                >
                  {best.name}
                </b>
                <span className="v7-station-meta mt-ds-0.5 block text-caption text-ink-600">
                  {formatDistanceKm(best.distance)} · {best.address}
                </span>
              </span>
              <a
                href={kakaoRouteHref(best)}
                target="_blank"
                rel="noopener noreferrer"
                data-primary-cta
                className="inline-flex min-h-11 w-full items-center justify-center gap-ds-1 whitespace-nowrap rounded-md bg-primary-600 px-ds-3 text-sm font-bold text-white hover:bg-primary-700 active:scale-[0.98]"
                aria-label={`${best.name} 카카오맵 길찾기`}
              >
                <Navigation size={16} />
                길찾기
              </a>
              <Button
                variant="secondary"
                onClick={() => onAction("가격지도")}
                className="w-full"
              >
                지도에서 비교
              </Button>
            </div>
          ) : (
            <ServiceStateNotice kind="empty-nearby" />
          )}
        </Card>
      </div>

      <div className="grid items-start gap-ds-3 wide:grid-cols-main-380">
        <KakaoMapPanel
          stations={nearby}
          onSelect={(station) => onAction(`${station.name} 지도 선택`)}
          userCoordinates={isMyLocation ? userCoordinates : null}
          tall={false}
        />
        <Card tone="muted" padding="normal">
          <SectionHeader title="가까운 저가 주유소" />
          <StationRankTable
            stations={nearby}
            onSelect={(station) => onAction(`${station.name} 선택`)}
            limit={4}
            compact
          />
        </Card>
      </div>
    </Shell>
  );
}

export function TrendPage({
  data,
  onAction,
  selectedFuel = data.fuelOptions[0] ?? "휘발유",
  onFuelChange,
  selectedRegion = "서울",
  regionOptions = [],
  onRegionChange,
  onUseLocation,
  locating = false,
  isMyLocation = false,
  locationDenied = false,
}: PageProps) {
  const initialRange = (() => {
    if (typeof window === "undefined") return 7;
    const params = new URLSearchParams(
      window.location.hash.includes("=")
        ? window.location.hash.replace(/^#/, "")
        : "",
    );
    const next = Number.parseInt(params.get("range") ?? "7", 10);
    return [7, 30, 90].includes(next) ? next : 7;
  })();
  const [range, setRange] = useState(initialRange);
  const history = useMemo(
    () => getFuelHistory(data, selectedFuel, selectedRegion, range),
    [data, selectedFuel, selectedRegion, range],
  );
  const values = history.map((point) => point.averagePrice);
  const labels = history.map((point) => point.date);
  const first = values[0] ?? 0;
  const latest = values.length ? values[values.length - 1] : first;
  const direction = changeDirection(latest - first);
  return (
    <Shell
      title={`가격 추이 · ${scopeTitle(isMyLocation, selectedRegion)} ${selectedFuel}`}
      data={data}
      onAction={onAction}
      contextLine={sourceLine(data, isMyLocation, selectedFuel)}
      locationDenied={locationDenied}
    >
      <RegionFuelControl
        data={data}
        selectedFuel={selectedFuel}
        onFuelChange={onFuelChange}
        selectedRegion={selectedRegion}
        regionOptions={regionOptions}
        onRegionChange={onRegionChange}
        onUseLocation={onUseLocation}
        locating={locating}
        isMyLocation={isMyLocation}
        locationDenied={locationDenied}
      />
      <Card
        padding="normal"
        interactive={false}
        className="v6-block v6-delay-1"
      >
        <div className="flex flex-wrap items-start justify-between gap-ds-2">
          <SectionHeader
            title={`${selectedRegion} ${selectedFuel} 기간별 가격 흐름`}
          />
          <FilterChips
            items={["7일", "30일", "90일"]}
            active={`${range}일`}
            onChange={(label) => setRange(Number.parseInt(label, 10))}
            ariaLabel="가격 추이 기간 선택"
          />
        </div>
        <AxisLineChart
          values={values}
          labels={labels}
          direction={direction}
          unit="원"
          height={260}
        />
        <div className="mt-ds-2 flex flex-wrap gap-ds-1 text-caption text-ink-600">
          <span className="rounded-full bg-ink-50 px-2 py-1">
            관측점 {history.length}개
          </span>
          <span className="rounded-full bg-ink-50 px-2 py-1">
            현재 <PriceText value={latest} unit="원/L" />
          </span>
          <PriceBadge
            direction={direction}
            text={formatSignedWon(latest - first)}
          />
        </div>
      </Card>
      <div className="grid items-start gap-ds-2 large:grid-cols-[minmax(0,1fr)_minmax(560px,1.35fr)]">
        <Card padding="normal">
          <SectionHeader
            title={`${selectedRegion} ${selectedFuel} 지역 평균 축`}
          />
          <HorizontalBarChart
            data={data.regionRows.slice(0, 17).map((row) => ({
              name: row.region,
              value: row.avg,
              tone: "primary",
            }))}
            height={360}
            unit="원"
            axisLabel="지역 평균가"
          />
        </Card>
        <DataTable
          caption={`${selectedRegion} ${selectedFuel} 최근 관측 12개`}
          columns={[
            { key: "date", label: "일자" },
            { key: "avg", label: "평균가", align: "right" },
            { key: "low", label: "최저가", align: "right" },
            { key: "count", label: "관측 주유소", align: "right" },
          ]}
          rows={history.slice(-12).map((point, index) => ({
            id: `history-${index}`,
            cells: {
              date: point.date,
              avg: <PriceText value={point.averagePrice} />,
              low: point.lowestPrice ? (
                <PriceText value={point.lowestPrice} />
              ) : (
                "자료 대기"
              ),
              count: (
                <span className="tabular">
                  {point.stationCount.toLocaleString()}곳
                </span>
              ),
            },
          }))}
        />
      </div>
    </Shell>
  );
}

export function RecordsPage({
  data,
  onAction,
  onRecordsChange,
  selectedFuel = data.fuelOptions[0] ?? "휘발유",
  selectedRegion = data.region ?? "서울",
}: PageProps) {
  const [rows, setRows] = useState<FuelRecord[]>(data.records);
  const [liter, setLiter] = useState(50);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    station: data.stations[0]?.name ?? "",
    liter: "50",
    price: String(data.stations[0]?.price ?? data.averagePrice),
  });
  useEffect(() => {
    setRows(data.records);
  }, [data.records]);

  useEffect(() => {
    const hasSelectedStation = data.stations.some(
      (station) => station.name === form.station,
    );
    if (hasSelectedStation) return;
    setForm((current) => ({
      ...current,
      station: data.stations[0]?.name ?? "",
      price: String(data.stations[0]?.price ?? data.averagePrice),
    }));
  }, [data.stations, data.averagePrice, form.station]);

  const commitRows = (nextRows: FuelRecord[]) => {
    setRows(nextRows);
    onRecordsChange?.(nextRows);
  };

  const summary = useMemo(() => {
    const totalLiter = rows.reduce((sum, row) => sum + row.liter, 0);
    const totalAmount = rows.reduce(
      (sum, row) => sum + row.liter * row.price,
      0,
    );
    const avgPrice = totalLiter > 0 ? Math.round(totalAmount / totalLiter) : 0;
    const saving = rows.reduce(
      (sum, row) =>
        sum + Math.max(0, data.averagePrice - row.price) * row.liter,
      0,
    );
    return { totalLiter, totalAmount, avgPrice, saving: Math.round(saving) };
  }, [rows, data.averagePrice]);
  const addRecord = () => {
    const nextLiter = Number.parseFloat(form.liter);
    const nextPrice = Number.parseInt(form.price, 10);
    if (
      !form.station ||
      !Number.isFinite(nextLiter) ||
      !Number.isFinite(nextPrice) ||
      nextLiter <= 0 ||
      nextPrice <= 0
    ) {
      onAction("입력값 확인");
      return;
    }
    const next: FuelRecord = {
      id: `record-${Date.now()}`,
      date: form.date,
      station: form.station,
      liter: nextLiter,
      price: nextPrice,
    };
    commitRows([next, ...rows].slice(0, 12));
    setLiter(Math.round(nextLiter));
    onAction("내 차량 추가");
  };
  const exportCsv = () => {
    const header = "date,station,liter,price,total";
    const lines = rows.map((row) =>
      [row.date, row.station, row.liter, row.price, row.liter * row.price]
        .map(csvCell)
        .join(","),
    );
    const blob = new Blob([[header, ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "litersave-records.csv";
    link.click();
    URL.revokeObjectURL(url);
    onAction("CSV 내보내기");
  };
  const best = data.stations[0];
  const recent = rows[0];
  const averageUnitPrice = summary.avgPrice || data.averagePrice;
  const projectedSaving = Math.round(
    Math.max(0, data.averagePrice - (best?.price ?? data.averagePrice)) * 50,
  );
  const monthlyKm = Math.round(Math.max(summary.totalLiter, liter) * 12.4);
  const monthlySaving = summary.saving || projectedSaving;
  const nextFuelRecommendation =
    summary.totalLiter > 0
      ? summary.totalLiter < 80
        ? "이번 주"
        : "다음 주"
      : "기록 추가 후";
  return (
    <Shell
      title={`내 차량 · ${selectedRegion} ${selectedFuel}`}
      data={data}
      onAction={onAction}
    >
      <div className="grid items-start gap-ds-3 wide:grid-cols-main-360">
        <Card padding="normal" className="v6-card-hover">
          <SectionHeader
            title="내 차량 기준"
            aside={
              <span className="text-caption text-ink-600">
                {selectedRegion} {selectedFuel}
              </span>
            }
          />
          <div className="grid gap-ds-2 md:grid-cols-2">
            <div className="rounded-md bg-ink-50 px-ds-2 py-ds-1.5">
              <p className="text-caption text-ink-700">월 주행거리</p>
              <strong className="mt-ds-0.5 block text-2xl font-bold text-ink-700 tabular">
                {monthlyKm.toLocaleString()}km
              </strong>
            </div>
            <div className="rounded-md bg-ink-50 px-ds-2 py-ds-1.5">
              <p className="text-caption text-ink-600">평균 단가</p>
              <strong className="mt-ds-0.5 block text-2xl font-bold text-ink-900 tabular">
                <PriceText value={averageUnitPrice} unit="원/L" />
              </strong>
            </div>
            <div className="rounded-md bg-down-bg px-ds-2 py-ds-1.5">
              <p className="text-caption text-down">이번 달 절약액</p>
              <strong className="mt-ds-0.5 block text-2xl font-bold text-down tabular">
                <PriceText value={monthlySaving} />
              </strong>
            </div>
            <div className="rounded-md bg-ink-900 px-ds-2 py-ds-1.5 text-white">
              <p className="text-caption text-white/60">다음 주유 시점</p>
              <strong className="mt-ds-0.5 block truncate text-[20px] font-bold text-white">
                {nextFuelRecommendation}
              </strong>
              <span className="mt-ds-0.5 block text-caption text-white/60">
                {recent
                  ? `${recent.date} · ${recent.liter}L 기록 반영`
                  : "연비·주유 기록 기반"}
              </span>
            </div>
          </div>
        </Card>
        {best ? (
          <Card padding="normal" className="v6-card-hover">
            <SectionHeader
              title="다음에 가기 좋은 주유소"
              action="지도"
              onAction={() => onAction("가격지도")}
            />
            <div className="flex items-start justify-between gap-ds-2">
              <div className="min-w-0">
                <h3 className="truncate text-body-1 font-bold text-ink-900">
                  {best.name}
                </h3>
                <p className="mt-ds-0.5 truncate text-caption text-ink-600">
                  {best.brand} · {formatDistanceKm(best.distance)}
                </p>
              </div>
              <strong className="inline-flex items-baseline text-[20px] font-bold text-ink-900 tabular">
                <PriceText value={best.price} unit="원/L" />
              </strong>
            </div>
            <div className="mt-ds-2 grid grid-cols-2 gap-ds-1.5">
              <div className="rounded-md bg-ink-50 px-ds-2 py-ds-1">
                <p className="text-caption text-ink-700">50L 예상</p>
                <strong className="text-lg font-bold text-ink-700 tabular">
                  <PriceText value={best.price * 50} />
                </strong>
              </div>
              <div className="rounded-md bg-down-bg px-ds-2 py-ds-1">
                <p className="text-caption text-down">예상 절약</p>
                <strong className="text-lg font-bold text-down tabular">
                  <PriceText value={projectedSaving} />
                </strong>
              </div>
            </div>
            <a
              href={kakaoRouteHref(best)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onAction(`${best.name} 길찾기`)}
              className="mt-ds-2 inline-flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md border border-ink-200 px-ds-2 text-sm font-bold text-ink-700 hover:border-ink-400 hover:bg-ink-50"
            >
              <ExternalLink size={15} />
              길찾기
            </a>
          </Card>
        ) : null}
      </div>
      <div className="grid items-start gap-ds-3 wide:grid-cols-main-380">
        <div className="space-y-ds-2">
          <div className="flex flex-wrap items-center justify-between gap-ds-2">
            <h3 className="text-base font-bold text-ink-900">최근 내 차량</h3>
            {rows.length > 0 ? (
              <Button variant="secondary" onClick={exportCsv}>
                <Download size={16} />
                CSV 내보내기
              </Button>
            ) : null}
          </div>
          {rows.length > 0 ? (
            <DataTable
              caption="최근 내 차량"
              columns={[
                { key: "date", label: "일자" },
                { key: "station", label: "주유소" },
                { key: "liter", label: "주유량", align: "right" },
                { key: "price", label: "단가", align: "right" },
                { key: "sum", label: "결제액", align: "right" },
              ]}
              rows={rows.map((r) => ({
                id: r.id,
                cells: {
                  date: (
                    <span className="inline-flex items-center gap-1.5 text-ink-600">
                      <CalendarDays size={14} />
                      {r.date}
                    </span>
                  ),
                  station: <b className="text-ink-900">{r.station}</b>,
                  liter: <span className="tabular">{r.liter}L</span>,
                  price: <PriceText value={r.price} />,
                  sum: (
                    <b className="tabular">
                      <PriceText value={r.liter * r.price} />
                    </b>
                  ),
                },
              }))}
            />
          ) : (
            <Card padding="normal">
              <div className="flex items-center justify-between gap-ds-2">
                <span>
                  <p className="text-caption text-ink-600">기록 추가 대기</p>
                  <strong className="mt-ds-0.5 block text-body-1 text-ink-900">
                    일자 · 주유소 · 주유량
                  </strong>
                </span>
                <WalletCards size={24} className="text-ink-300" />
              </div>
            </Card>
          )}
        </div>
        <div className="space-y-ds-2">
          <Card padding="normal">
            <SectionHeader
              title="기록 추가"
              action="최저가 적용"
              onAction={() =>
                setForm((current) => ({
                  ...current,
                  station: best?.name ?? current.station,
                  price: String(best?.price ?? current.price),
                }))
              }
            />
            <div className="space-y-3">
              <label className="block text-caption font-bold text-ink-500">
                일자
                <input
                  aria-label="주유 일자"
                  value={form.date}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                  className="mt-ds-0.5 h-11 w-full rounded-md border border-ink-200 px-3 text-sm text-ink-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </label>
              <label className="block text-caption font-bold text-ink-500">
                주유소
                <select
                  aria-label="주유소 선택"
                  value={form.station}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      station: event.target.value,
                    }))
                  }
                  className="mt-ds-0.5 h-11 w-full rounded-md border border-ink-200 px-3 text-sm text-ink-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                >
                  {data.stations.slice(0, 8).map((station) => (
                    <option key={station.id} value={station.name}>
                      {station.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-ds-2">
                <label className="block text-caption font-bold text-ink-500">
                  주유량
                  <input
                    aria-label="주유량"
                    inputMode="decimal"
                    value={form.liter}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        liter: event.target.value,
                      }))
                    }
                    className="mt-ds-0.5 h-11 w-full rounded-md border border-ink-200 px-3 text-sm text-ink-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                </label>
                <label className="block text-caption font-bold text-ink-500">
                  단가
                  <input
                    aria-label="주유 단가"
                    inputMode="numeric"
                    value={form.price}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        price: event.target.value,
                      }))
                    }
                    className="mt-ds-0.5 h-11 w-full rounded-md border border-ink-200 px-3 text-sm text-ink-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                </label>
              </div>
              <Button onClick={addRecord} className="w-full">
                <Plus size={16} />
                기록 추가
              </Button>
            </div>
          </Card>
          <SavingsCalculator
            selectedLiter={liter}
            onChange={setLiter}
            savingPerLiter={Math.max(
              0,
              data.averagePrice - (best?.price ?? data.averagePrice),
            )}
          />
        </div>
      </div>
    </Shell>
  );
}

export function FavoritesPage({
  data,
  onTabChange,
  onAction,
  favoriteStationIds = [],
  onFavoriteToggle,
  selectedFuel = data.fuelOptions[0] ?? "휘발유",
  selectedRegion = data.region ?? "서울",
}: PageProps) {
  const favorites = uniqueStations(data.stations).filter((station) =>
    favoriteStationIds.includes(station.id),
  );
  return (
    <Shell
      title={`저장 주유소 · ${selectedRegion} ${selectedFuel}`}
      data={data}
      onAction={onAction}
    >
      {favorites.length ? (
        <div className="grid gap-ds-2 lg:grid-cols-2 xl:grid-cols-3">
          {favorites.map((station) => (
            <StationCard
              key={station.id}
              station={station}
              favorite
              onToggle={() => onFavoriteToggle?.(station.id)}
              onRoute={() => onAction(`${station.name} 길찾기`)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="저장한 주유소가 없습니다"
          actionLabel="지도"
          onAction={() => onTabChange("stations")}
          icon={Star}
        />
      )}
    </Shell>
  );
}

export function FuelNewsPage({
  data,
  onAction,
  selectedFuel = data.fuelOptions[0] ?? "휘발유",
  selectedRegion = data.region ?? "서울",
}: PageProps) {
  const [keyword, setKeyword] = useState("전체");
  const keywordCounts = new Map<string, number>();
  data.fuelNews.forEach((item) =>
    keywordCounts.set(item.keyword, (keywordCounts.get(item.keyword) ?? 0) + 1),
  );
  const keywords = [
    "전체",
    ...Array.from(keywordCounts.entries())
      .filter(([, count]) => count > 0)
      .map(([item]) => item)
      .slice(0, 6),
  ];
  const rows = data.fuelNews
    .filter((item) => keyword === "전체" || item.keyword === keyword)
    .slice(0, 10);
  return (
    <Shell
      title={`유가 뉴스 · ${selectedRegion} ${selectedFuel}`}
      data={data}
      onAction={onAction}
      compact
    >
      <div className="flex flex-wrap gap-ds-1">
        {keywords.map((item) => (
          <button
            type="button"
            key={item}
            onClick={() => setKeyword(item)}
            aria-pressed={keyword === item}
            className={`rounded-full border px-ds-2 py-ds-0.5 text-sm ${keyword === item ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-white text-ink-700 hover:border-ink-400"}`}
          >
            {item}
          </button>
        ))}
      </div>
      {rows.length ? (
        <div className="grid items-start gap-ds-2 wide:grid-cols-main-360">
          <div className="space-y-3">
            {rows.slice(0, 9).map((item) => {
              const href = item.link || item.originallink;
              return (
                <article
                  key={item.id}
                  className="v6-card-hover rounded-md border border-ink-200 bg-white p-ds-2 shadow-card"
                >
                  <div className="flex flex-wrap items-center justify-between gap-ds-1 text-caption text-ink-600">
                    <span className="rounded-full bg-ink-100 px-2 py-1 font-bold text-ink-700">
                      {item.keyword}
                    </span>
                    <span>
                      {item.source} · {item.publishedAt}
                    </span>
                  </div>
                  <h3 className="mt-ds-2 text-base font-bold text-ink-900">
                    {item.title}
                  </h3>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-ds-2 inline-flex min-h-11 items-center gap-1.5 rounded-control px-ds-2 text-sm font-bold text-ink-700 hover:bg-ink-100 hover:underline"
                    >
                      <ExternalLink size={15} />
                      원문 보기
                    </a>
                  ) : null}
                </article>
              );
            })}
          </div>
          <Card padding="normal">
            <SectionHeader
              title={`${selectedRegion} ${selectedFuel} 관련 소식`}
              action="절약계산"
              onAction={() => onAction("절약계산")}
            />
            <div className="space-y-2">
              {["휘발유", "경유", "LPG", "국제유가", "유류세"]
                .map((item) => ({
                  item,
                  count: data.fuelNews.filter((news) => news.keyword === item)
                    .length,
                }))
                .filter(({ count }) => count > 0)
                .map(({ item, count }) => (
                  <div
                    key={item}
                    className="flex items-center justify-between rounded-md bg-ink-50 px-ds-2 py-ds-1"
                  >
                    <span className="text-sm font-bold text-ink-900">
                      {item}
                    </span>
                    <span className="text-caption text-ink-600">{count}건</span>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      ) : (
        <EmptyState title="유가 뉴스 항목 확인 필요" icon={Newspaper} />
      )}
    </Shell>
  );
}

export function AlertsPage({
  data,
  onTabChange,
  onAction,
  selectedFuel = data.fuelOptions[0] ?? "휘발유",
  selectedRegion = data.region ?? "서울",
}: PageProps) {
  return (
    <Shell
      title={`알림 설정 · ${selectedRegion} ${selectedFuel}`}
      data={data}
      onAction={onAction}
    >
      <EmptyState
        title="설정한 알림이 없습니다"
        actionLabel="지도"
        onAction={() => onTabChange("stations")}
        icon={Newspaper}
      />
    </Shell>
  );
}

export function GuidePage({
  data,
  onAction,
  selectedFuel = data.fuelOptions[0] ?? "휘발유",
  selectedRegion = data.region ?? "서울",
}: PageProps) {
  return (
    <Shell
      title={`이용 가이드 · ${selectedRegion} ${selectedFuel}`}
      data={data}
      onAction={onAction}
      compact
    >
      <div className="grid gap-ds-2 lg:grid-cols-3">
        {["위치 확인", "가격 비교", "길찾기", "기록 확인"].map(
          (label, index) => (
            <Card key={label} className="p-ds-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-900 text-white tabular">
                {index + 1}
              </span>
              <h3 className="mt-ds-2 font-bold">{label}</h3>
              <Button
                variant="secondary"
                onClick={() => onAction(label)}
                className="mt-ds-2 w-full"
              >
                확인
              </Button>
            </Card>
          ),
        )}
      </div>
      <Card padding="normal">
        <SectionHeader
          title="빠른 이동"
          action="지도"
          onAction={() => onAction("가격지도")}
        />
        <div className="grid gap-ds-2 md:grid-cols-3">
          <Button variant="secondary" onClick={() => onAction("가격지도")}>
            <MapPin size={16} />
            주유소
          </Button>
          <Button variant="secondary" onClick={() => onAction("절약계산")}>
            <Route size={16} />
            분석
          </Button>
          <Button variant="secondary" onClick={() => onAction("내 차량")}>
            <WalletCards size={16} />
            기록
          </Button>
        </div>
      </Card>
    </Shell>
  );
}

export function NoticePage({
  data,
  onAction,
  selectedFuel = data.fuelOptions[0] ?? "휘발유",
  selectedRegion = data.region ?? "서울",
}: PageProps) {
  return (
    <Shell
      title={`공지사항 · ${selectedRegion} ${selectedFuel}`}
      data={data}
      onAction={onAction}
      compact
    >
      <EmptyState title="공지사항 항목 확인 필요" icon={Newspaper} />
    </Shell>
  );
}
