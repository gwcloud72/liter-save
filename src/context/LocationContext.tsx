import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { FUEL_OPTIONS, REGION_OPTIONS, type FuelKind } from '../data/model';
import { resolveUserRegion, type LocationResolutionSource } from '../utils/location';

export const REGIONS = ['전국', ...REGION_OPTIONS] as const;
export type Fuel = FuelKind;
export interface UserCoordinates { lat: number; lng: number; accuracy?: number; }

export interface UserLocationSelection {
  coordinates: UserCoordinates;
  administrativeRegion: string;
  dataRegion: string;
  resolutionSource: LocationResolutionSource;
}

interface LocationState {
  region: string;
  fuel: Fuel;
  isMyLocation: boolean;
  locating: boolean;
  coordinates: UserCoordinates | null;
  locationLabel: string | null;
  locationSource: LocationResolutionSource | null;
  setRegion: (region: string) => void;
  setFuel: (fuel: Fuel) => void;
  useMyLocation: () => Promise<UserLocationSelection | null>;
  useGrantedLocation: () => Promise<UserLocationSelection | null>;
}

const LocationContext = createContext<LocationState | null>(null);

function currentPosition(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 180000 },
    );
  });
}

async function geolocationPermissionGranted(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) return false;
  try {
    const permission = await navigator.permissions.query({ name: 'geolocation' });
    return permission.state === 'granted';
  } catch {
    return false;
  }
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [region, setRegionState] = useState<string>('서울');
  const [fuel, setFuelState] = useState<Fuel>('휘발유');
  const [isMyLocation, setIsMyLocation] = useState(false);
  const [locating, setLocating] = useState(false);
  const [coordinates, setCoordinates] = useState<UserCoordinates | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [locationSource, setLocationSource] = useState<LocationResolutionSource | null>(null);

  const setRegion = useCallback((nextRegion: string) => {
    if (!REGIONS.includes(nextRegion as typeof REGIONS[number])) return;
    setRegionState(nextRegion);
    setIsMyLocation(false);
    setCoordinates(null);
    setLocationLabel(null);
    setLocationSource(null);
  }, []);

  const setFuel = useCallback((nextFuel: Fuel) => {
    if (!FUEL_OPTIONS.includes(nextFuel)) return;
    setFuelState(nextFuel);
  }, []);

  const captureLocation = useCallback(async (): Promise<UserLocationSelection | null> => {
    setLocating(true);
    try {
      const position = await currentPosition();
      if (!position) return null;
      const nextCoordinates = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
      const appKey = String(import.meta.env.VITE_KAKAO_MAP_APP_KEY ?? '').trim();
      const resolvedRegion = await resolveUserRegion(nextCoordinates.lat, nextCoordinates.lng, appKey);
      setCoordinates(nextCoordinates);
      setRegionState(resolvedRegion.dataRegion);
      setLocationLabel(resolvedRegion.administrativeRegion);
      setLocationSource(resolvedRegion.source);
      setIsMyLocation(true);
      return {
        coordinates: nextCoordinates,
        administrativeRegion: resolvedRegion.administrativeRegion,
        dataRegion: resolvedRegion.dataRegion,
        resolutionSource: resolvedRegion.source,
      };
    } finally {
      setLocating(false);
    }
  }, []);

  const useMyLocation = useCallback(() => captureLocation(), [captureLocation]);

  const useGrantedLocation = useCallback(async () => {
    const granted = await geolocationPermissionGranted();
    return granted ? captureLocation() : null;
  }, [captureLocation]);

  const value = useMemo<LocationState>(() => ({
    region,
    fuel,
    isMyLocation,
    locating,
    coordinates,
    locationLabel,
    locationSource,
    setRegion,
    setFuel,
    useMyLocation,
    useGrantedLocation,
  }), [region, fuel, isMyLocation, locating, coordinates, locationLabel, locationSource, setRegion, setFuel, useMyLocation, useGrantedLocation]);

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocationSelection() {
  const value = useContext(LocationContext);
  if (!value) throw new Error('useLocationSelection must be used inside LocationProvider');
  return value;
}
