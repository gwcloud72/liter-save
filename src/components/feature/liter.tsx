import { ExternalLink, MapPin, Navigation, Star } from "lucide-react";
import { Card, RankBadge, MiniTrend, PriceAmount } from "../common/ui";
import type { UserCoordinates } from "../../context/LocationContext";
import type { Station } from "../../data/model";
import { priceDiffCopy } from "../../data/normalize";
import { kakaoRouteHref } from "../../utils/kakao";
import { formatDistanceKm } from "../../utils/stationDistance";
import { KakaoStationMap } from "../map/KakaoStationMap";

function StationIdentity({ station, meta }: { station: Station; meta?: string }) {
  const title = `${station.brand} · ${station.name} · ${station.address}`;
  return (
    <span className="block min-w-0 text-left" title={title} aria-label={title}>
      <span className="inline-flex max-w-full whitespace-nowrap rounded-full bg-ink-100 px-ds-1.5 py-ds-0.5 text-[11px] font-bold text-ink-700">
        {station.brand}
      </span>
      <b className="v7-station-title v8-station-name mt-ds-0.5 block text-sm text-ink-900 no-underline">
        {station.name}
      </b>
      {meta ? (
        <span className="v7-station-meta mt-ds-0.5 block text-xs text-ink-600">
          {meta}
        </span>
      ) : null}
    </span>
  );
}

export function StationRankTable({
  stations,
  onSelect,
  limit = 8,
  compact = false,
}: {
  stations: Station[];
  onSelect: (station: Station) => void;
  limit?: number;
  compact?: boolean;
}) {
  return (
    <div className="space-y-2">
      {stations.slice(0, limit).map((station, index) => (
        <div
          key={station.id}
          className={`v6-list-row grid w-full ${compact ? "grid-cols-[32px_minmax(0,1fr)] sm:grid-cols-[32px_minmax(0,1fr)_92px]" : "grid-cols-[36px_minmax(0,1fr)] sm:grid-cols-[36px_minmax(0,1fr)_104px]"} items-start gap-ds-2 rounded-lg border bg-white text-left transition hover:border-ink-400 ${compact ? "px-ds-2 py-ds-1.5" : "px-ds-3 py-ds-2"} ${index < 3 ? "border-ink-200 shadow-card" : "border-ink-200"}`}
        >
          <button
            type="button"
            onClick={() => onSelect(station)}
            className="contents"
          >
            <RankBadge value={index + 1} />
            <StationIdentity
              station={station}
              meta={`${formatDistanceKm(station.distance)} · ${station.address}`}
            />
            <span className="col-start-2 text-left sm:col-start-auto sm:text-right">
              <PriceAmount value={station.price} unit="원/L" size="md" className="justify-start sm:justify-end" />
            </span>
          </button>
          {compact ? null : (
            <a
              href={kakaoRouteHref(station)}
              target="_blank"
              rel="noopener noreferrer"
              className="col-start-2 inline-flex min-h-11 w-fit items-center justify-center gap-1 whitespace-nowrap rounded-md border border-ink-200 px-ds-2 text-[13px] font-bold text-ink-700 hover:border-ink-400 hover:bg-ink-50 active:scale-[0.98]"
              aria-label={`${station.name} 길찾기`}
            >
              <Navigation size={14} />
              길찾기
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

export function KakaoMapPanel({
  stations,
  onSelect,
  userCoordinates = null,
  tall = false,
  showSummary = true,
}: {
  stations: Station[];
  onSelect: (station: Station) => void;
  userCoordinates?: UserCoordinates | null;
  tall?: boolean;
  showSummary?: boolean;
}) {
  const best = stations[0];
  return (
    <Card
      padding="normal"
      className={`relative overflow-hidden bg-ink-50 ${tall ? "min-h-map" : "min-h-hero"}`}
    >
      <div className="relative flex items-center justify-between gap-ds-2">
        <div>
          <h3 className="text-heading-2 text-ink-900">가까운 주유소</h3>
          <span className="sr-only">카카오 실제 지도 기반 지역 가격 지도</span>
          <p className="mt-ds-0.5 text-caption text-ink-500">
            실제 지도에서 가격과 위치를 함께 비교하세요
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ink-100 px-3 py-1 text-xs font-bold text-ink-700">
          <MapPin size={13} />
          {userCoordinates ? "GPS 포함" : "카카오맵"}
        </span>
      </div>
      <div className="mt-5">
        <KakaoStationMap
          stations={stations}
          onSelect={onSelect}
          userCoordinates={userCoordinates}
          tall={tall}
        />
      </div>
      {best && showSummary ? (
        <button
          type="button"
          onClick={() => onSelect(best)}
          className="relative mt-4 flex w-full items-center justify-between rounded-lg border border-ink-200 bg-white px-4 py-3 text-left shadow-card hover:border-ink-400"
        >
          <div>
            <p className="text-[11px] font-bold text-ink-600">가장 낮은 가격</p>
            <StationIdentity
              station={best}
              meta={`${formatDistanceKm(best.distance)} · ${best.address}`}
            />
          </div>
          <PriceAmount value={best.price} unit="원/L" size="md" />
        </button>
      ) : null}
      {best && showSummary ? (
        <a
          href={kakaoRouteHref(best)}
          target="_blank"
          rel="noopener noreferrer"
          className="relative mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md border border-ink-200 bg-white text-[15px] font-bold text-ink-800 hover:bg-ink-100"
        >
          카카오맵 길찾기
          <ExternalLink size={15} />
        </a>
      ) : null}
    </Card>
  );
}

export function SavingsCalculator({
  selectedLiter,
  onChange,
  savingPerLiter,
  compact = false,
}: {
  selectedLiter: number;
  onChange: (liter: number) => void;
  savingPerLiter: number;
  compact?: boolean;
}) {
  return (
    <Card padding={compact ? "compact" : "normal"}>
      <h3 className="text-base font-bold">50L 절약 계산</h3>
      <div className="mt-4 flex gap-2">
        {[40, 50, 60].map((liter) => (
          <button
            type="button"
            key={liter}
            aria-pressed={selectedLiter === liter}
            onClick={() => onChange(liter)}
            className={`h-9 rounded-full border px-4 text-sm ${selectedLiter === liter ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-white text-ink-700"}`}
          >
            {liter}L
          </button>
        ))}
      </div>
      <PriceAmount
        value={Math.round(selectedLiter * Math.max(0, savingPerLiter))}
        unit="원"
        size="lg"
        tone="saving"
        className="mt-5"
      />
    </Card>
  );
}

export function StationCard({
  station,
  favorite = false,
  onToggle,
  onRoute,
}: {
  station: Station;
  favorite?: boolean;
  onToggle: () => void;
  onRoute?: () => void;
}) {
  return (
    <Card padding="normal">
      <div className="flex items-start justify-between gap-3">
        <StationIdentity
          station={station}
          meta={`${formatDistanceKm(station.distance)} · ${station.address}`}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={favorite}
          className={`shrink-0 rounded-full p-2 ${favorite ? "bg-ink-900 text-white" : "bg-ink-100 text-ink-600 hover:text-ink-900"}`}
        >
          <Star size={17} fill={favorite ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="mt-5 grid grid-cols-trend-110 items-end gap-4">
        <div>
          <PriceAmount value={station.price} unit="원/L" size="md" />
          <p className="mt-ds-0.5 text-[13px] text-ink-600">
            {priceDiffCopy(station.avgDiff)}
          </p>
        </div>
        <MiniTrend values={station.trend} direction="down" />
      </div>
      <a
        href={kakaoRouteHref(station)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onRoute}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md border border-ink-200 text-[15px] font-bold text-ink-700 hover:border-ink-400 hover:bg-ink-50"
      >
        길찾기
        <ExternalLink size={15} />
      </a>
    </Card>
  );
}
