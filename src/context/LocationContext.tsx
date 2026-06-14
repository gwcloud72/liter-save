import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { FUEL_OPTIONS, REGION_OPTIONS, type FuelKind } from '../data/model';
import { nearestAdminRegion } from '../utils/location';

export const REGIONS = ['전국', ...REGION_OPTIONS] as const;
export type Fuel = FuelKind;
export interface UserCoordinates { lat: number; lng: number; accuracy?: number; }

interface LocationState {
  region: string;
  fuel: Fuel;
  isMyLocation: boolean;
  locating: boolean;
  coordinates: UserCoordinates | null;
  setRegion: (region: string) => void;
  setFuel: (fuel: Fuel) => void;
  useMyLocation: () => void;
}

const LocationContext = createContext<LocationState | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [region, setRegionState] = useState<string>('서울');
  const [fuel, setFuelState] = useState<Fuel>('휘발유');
  const [isMyLocation, setIsMyLocation] = useState(false);
  const [locating, setLocating] = useState(false);
  const [coordinates, setCoordinates] = useState<UserCoordinates | null>(null);

  const setRegion = (nextRegion: string) => {
    if (!REGIONS.includes(nextRegion as typeof REGIONS[number])) return;
    setRegionState(nextRegion);
    setIsMyLocation(false);
    setCoordinates(null);
  };

  const setFuel = (nextFuel: Fuel) => {
    if (!FUEL_OPTIONS.includes(nextFuel)) return;
    setFuelState(nextFuel);
  };

  const useMyLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextRegion = nearestAdminRegion(position.coords.latitude, position.coords.longitude);
        setCoordinates({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy });
        setRegionState(nextRegion);
        setIsMyLocation(true);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 180000 },
    );
  };

  const value = useMemo<LocationState>(() => ({ region, fuel, isMyLocation, locating, coordinates, setRegion, setFuel, useMyLocation }), [region, fuel, isMyLocation, locating, coordinates]);

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocationSelection() {
  const value = useContext(LocationContext);
  if (!value) throw new Error('useLocationSelection must be used inside LocationProvider');
  return value;
}
