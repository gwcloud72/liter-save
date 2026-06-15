import type { Station } from '../data/model';
import type { UserCoordinates } from '../context/LocationContext';

const EARTH_RADIUS_KM = 6371;

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

function hasCoordinates(station: Pick<Station, 'lat' | 'lng'>): boolean {
  return Number.isFinite(station.lat) && Number.isFinite(station.lng) && station.lat !== 0 && station.lng !== 0;
}

export function hasStationCoordinates(station: Pick<Station, 'lat' | 'lng'>): boolean {
  return hasCoordinates(station);
}

export function distanceKm(from: UserCoordinates, station: Pick<Station, 'lat' | 'lng'>): number {
  if (!hasCoordinates(station)) return Number.POSITIVE_INFINITY;
  const dLat = toRad(station.lat - from.lat);
  const dLng = toRad(station.lng - from.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(from.lat)) * Math.cos(toRad(station.lat)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistanceKm(value: number | null | undefined): string {
  if (!Number.isFinite(value) || !value || value <= 0) return '거리 확인';
  return `${Number(value).toFixed(1)}km`;
}

export function sortStationsByUserDistance(stations: Station[], coordinates: UserCoordinates): Station[] {
  return stations
    .map((station) => {
      const distance = distanceKm(coordinates, station);
      return Number.isFinite(distance) ? { ...station, distance: Number(distance.toFixed(1)) } : { ...station, distance: 0 };
    })
    .sort((a, b) => {
      const aDistance = a.distance > 0 ? a.distance : Number.POSITIVE_INFINITY;
      const bDistance = b.distance > 0 ? b.distance : Number.POSITIVE_INFINITY;
      const distanceDiff = aDistance - bDistance;
      return distanceDiff !== 0 ? distanceDiff : a.price - b.price;
    });
}
