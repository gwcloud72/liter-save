import type { Station } from '../data/model';
import type { UserCoordinates } from '../context/LocationContext';

const EARTH_RADIUS_KM = 6371;

function toRadians(degreeValue: number): number {
  return (degreeValue * Math.PI) / 180;
}

function hasCoordinates(station: Pick<Station, 'lat' | 'lng'>): boolean {
  return Number.isFinite(station.lat) && Number.isFinite(station.lng) && station.lat !== 0 && station.lng !== 0;
}

export function hasStationCoordinates(station: Pick<Station, 'lat' | 'lng'>): boolean {
  return hasCoordinates(station);
}

export function distanceKm(from: UserCoordinates, station: Pick<Station, 'lat' | 'lng'>): number {
  if (!hasCoordinates(station)) return Number.POSITIVE_INFINITY;
  const latitudeDeltaRadians = toRadians(station.lat - from.lat);
  const longitudeDeltaRadians = toRadians(station.lng - from.lng);
  const haversineValue = Math.sin(latitudeDeltaRadians / 2) ** 2 + Math.cos(toRadians(from.lat)) * Math.cos(toRadians(station.lat)) * Math.sin(longitudeDeltaRadians / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(haversineValue), Math.sqrt(1 - haversineValue));
}

export function formatDistanceKm(value: number | null | undefined): string {
  if (!Number.isFinite(value) || !value || value <= 0) return '거리 미제공';
  return `${Number(value).toFixed(1)}km`;
}

export function sortStationsByUserDistance(stations: Station[], coordinates: UserCoordinates): Station[] {
  return stations
    .map((station) => {
      const distance = distanceKm(coordinates, station);
      return Number.isFinite(distance) ? { ...station, distance: Number(distance.toFixed(1)) } : { ...station, distance: 0 };
    })
    .sort((nearerStation, fartherStation) => {
      const nearerStationDistance = nearerStation.distance > 0 ? nearerStation.distance : Number.POSITIVE_INFINITY;
      const fartherStationDistance = fartherStation.distance > 0 ? fartherStation.distance : Number.POSITIVE_INFINITY;
      const distanceDiff = nearerStationDistance - fartherStationDistance;
      return distanceDiff !== 0 ? distanceDiff : nearerStation.price - fartherStation.price;
    });
}
