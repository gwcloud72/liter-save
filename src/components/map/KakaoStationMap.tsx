import { useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, LoaderCircle, Minus, Plus } from "lucide-react";
import type { UserCoordinates } from "../../context/LocationContext";
import type { Station } from "../../data/model";
import {
  loadKakaoMapsSdk,
  type KakaoCustomOverlayInstance,
  type KakaoMapInstance,
  type KakaoMapsSdk,
} from "../../utils/kakaoMapsSdk";

type KakaoMapStatus = "loading" | "ready" | "missing-key" | "error" | "empty";

interface KakaoStationMapProps {
  stations: Station[];
  onSelect: (station: Station) => void;
  userCoordinates?: UserCoordinates | null;
  tall?: boolean;
}

function isValidCoordinate(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= 33 &&
    latitude <= 39.5 &&
    longitude >= 124 &&
    longitude <= 132
  );
}

function statusCopy(status: KakaoMapStatus) {
  if (status === "loading") return "카카오맵을 불러오는 중입니다.";
  if (status === "missing-key") {
    return "지도를 표시할 수 없습니다. 목록에서 위치와 가격 정보를 계속 확인할 수 있습니다.";
  }
  if (status === "error") {
    return "지도를 불러오지 못했습니다. 잠시 후 다시 시도하거나 목록을 이용해 주세요.";
  }
  if (status === "empty") return "지도에 표시할 유효한 주유소 좌표가 없습니다.";
  return "카카오맵이 연결되었습니다.";
}

export function KakaoStationMap({
  stations,
  onSelect,
  userCoordinates = null,
  tall = false,
}: KakaoStationMapProps) {
  const appKey = String(import.meta.env.VITE_KAKAO_MAP_APP_KEY ?? "").trim();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const sdkRef = useRef<KakaoMapsSdk | null>(null);
  const onSelectRef = useRef(onSelect);
  const [status, setStatus] = useState<KakaoMapStatus>(
    appKey ? "loading" : "missing-key",
  );

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const mapStations = useMemo(
    () =>
      stations
        .filter((station) => isValidCoordinate(station.lat, station.lng))
        .slice(0, 12),
    [stations],
  );
  const coordinateSignature = mapStations
    .map((station) => `${station.id}:${station.lat}:${station.lng}:${station.price}`)
    .join("|");
  const validUserCoordinates =
    userCoordinates &&
    isValidCoordinate(userCoordinates.lat, userCoordinates.lng)
      ? userCoordinates
      : null;

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;
    if (!appKey) {
      setStatus("missing-key");
      return;
    }
    if (!mapStations.length) {
      setStatus("empty");
      return;
    }

    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;
    const overlays: KakaoCustomOverlayInstance[] = [];
    const markerCleanups: Array<() => void> = [];
    setStatus("loading");

    loadKakaoMapsSdk(appKey)
      .then((sdk) => {
        if (disposed) return;
        sdkRef.current = sdk;
        const firstStation = mapStations[0];
        const center = validUserCoordinates
          ? new sdk.LatLng(validUserCoordinates.lat, validUserCoordinates.lng)
          : new sdk.LatLng(firstStation.lat, firstStation.lng);
        const map = new sdk.Map(container, {
          center,
          level: 5,
          draggable: true,
          scrollwheel: false,
        });
        mapRef.current = map;

        const bounds = new sdk.LatLngBounds();
        const uniquePositions = new Set<string>();
        mapStations.forEach((station, index) => {
          const position = new sdk.LatLng(station.lat, station.lng);
          bounds.extend(position);
          uniquePositions.add(`${station.lat.toFixed(5)}:${station.lng.toFixed(5)}`);

          const markerButton = document.createElement("button");
          markerButton.type = "button";
          markerButton.className = `kakao-station-price-marker${index === 0 ? " is-best" : ""}`;
          markerButton.textContent = `${station.price.toLocaleString()}원`;
          markerButton.title = `${station.name} · ${station.brand} · ${station.address}`;
          markerButton.setAttribute(
            "aria-label",
            `${station.name}, 리터당 ${station.price.toLocaleString()}원`,
          );
          markerButton.dataset.stationId = station.id;
          const handleMarkerClick = () => onSelectRef.current(station);
          markerButton.addEventListener("click", handleMarkerClick);
          markerCleanups.push(() =>
            markerButton.removeEventListener("click", handleMarkerClick),
          );

          const overlay = new sdk.CustomOverlay({
            position,
            content: markerButton,
            xAnchor: 0.5,
            yAnchor: 1.25,
            zIndex: index === 0 ? 12 : 8,
            clickable: true,
          });
          overlay.setMap(map);
          overlays.push(overlay);
        });

        if (validUserCoordinates) {
          const userPosition = new sdk.LatLng(
            validUserCoordinates.lat,
            validUserCoordinates.lng,
          );
          bounds.extend(userPosition);
          uniquePositions.add(
            `${validUserCoordinates.lat.toFixed(5)}:${validUserCoordinates.lng.toFixed(5)}`,
          );
          const userMarker = document.createElement("span");
          userMarker.className = "kakao-map-current-position";
          userMarker.setAttribute("role", "img");
          userMarker.setAttribute("aria-label", "GPS 현재 위치");
          const userOverlay = new sdk.CustomOverlay({
            position: userPosition,
            content: userMarker,
            xAnchor: 0.5,
            yAnchor: 0.5,
            zIndex: 15,
          });
          userOverlay.setMap(map);
          overlays.push(userOverlay);
        }

        if (uniquePositions.size > 1) map.setBounds(bounds);
        else map.setLevel(5);

        if (typeof ResizeObserver !== "undefined") {
          resizeObserver = new ResizeObserver(() => map.relayout());
          resizeObserver.observe(container);
        }
        setStatus("ready");
      })
      .catch(() => {
        if (!disposed) setStatus("error");
      });

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      markerCleanups.forEach((cleanup) => cleanup());
      overlays.forEach((overlay) => overlay.setMap(null));
      mapRef.current = null;
      sdkRef.current = null;
    };
  }, [appKey, coordinateSignature, validUserCoordinates?.lat, validUserCoordinates?.lng]);

  const fitMapToContent = () => {
    const map = mapRef.current;
    const sdk = sdkRef.current;
    if (!map || !sdk || !mapStations.length) return;
    const bounds = new sdk.LatLngBounds();
    const uniquePositions = new Set<string>();
    mapStations.forEach((station) => {
      bounds.extend(new sdk.LatLng(station.lat, station.lng));
      uniquePositions.add(`${station.lat.toFixed(5)}:${station.lng.toFixed(5)}`);
    });
    if (validUserCoordinates) {
      bounds.extend(
        new sdk.LatLng(validUserCoordinates.lat, validUserCoordinates.lng),
      );
      uniquePositions.add(
        `${validUserCoordinates.lat.toFixed(5)}:${validUserCoordinates.lng.toFixed(5)}`,
      );
    }
    if (uniquePositions.size > 1) map.setBounds(bounds);
    else {
      map.setCenter(new sdk.LatLng(mapStations[0].lat, mapStations[0].lng));
      map.setLevel(5);
    }
  };

  const focusCurrentPosition = () => {
    const map = mapRef.current;
    const sdk = sdkRef.current;
    if (!map || !sdk || !validUserCoordinates) return;
    map.panTo(new sdk.LatLng(validUserCoordinates.lat, validUserCoordinates.lng));
    map.setLevel(4);
  };

  const changeZoom = (delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.setLevel(Math.max(1, Math.min(14, map.getLevel() + delta)));
  };

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-white/80 bg-ink-50 ${tall ? "h-80" : "h-56"}`}
      data-kakao-map-state={status}
      data-real-map={status === "ready" ? "kakao" : "pending"}
    >
      <div
        ref={mapContainerRef}
        className="kakao-map-canvas"
        role="region"
        aria-label="카카오맵 주유소 가격 지도"
      />

      {status !== "ready" ? (
        <div
          className="absolute inset-0 z-10 grid place-items-center bg-ink-50/95 p-ds-3 text-center"
          data-map-fallback={status}
        >
          <div className="max-w-sm">
            {status === "loading" ? (
              <LoaderCircle className="mx-auto animate-spin text-ink-500" size={28} />
            ) : (
              <Crosshair className="mx-auto text-ink-400" size={28} />
            )}
            <p className="mt-ds-1 text-sm font-bold text-ink-800">
              {status === "missing-key" ? "지도 이용 안내" : "지도 상태 확인"}
            </p>
            <p className="mt-ds-0.5 text-caption leading-relaxed text-ink-600">
              {statusCopy(status)}
            </p>
          </div>
        </div>
      ) : null}

      {status === "ready" ? (
        <div className="absolute right-ds-1 top-ds-1 z-20 flex flex-col gap-ds-0.5">
          <button
            type="button"
            onClick={() => changeZoom(-1)}
            className="grid h-control-lg w-control-lg place-items-center rounded-md border border-ink-200 bg-white text-ink-800 shadow-card"
            aria-label="지도 확대"
          >
            <Plus size={18} />
          </button>
          <button
            type="button"
            onClick={() => changeZoom(1)}
            className="grid h-control-lg w-control-lg place-items-center rounded-md border border-ink-200 bg-white text-ink-800 shadow-card"
            aria-label="지도 축소"
          >
            <Minus size={18} />
          </button>
          <button
            type="button"
            onClick={validUserCoordinates ? focusCurrentPosition : fitMapToContent}
            className="grid h-control-lg w-control-lg place-items-center rounded-md border border-ink-200 bg-white text-ink-800 shadow-card"
            aria-label={validUserCoordinates ? "GPS 현재 위치로 이동" : "전체 주유소 보기"}
          >
            <Crosshair size={18} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
