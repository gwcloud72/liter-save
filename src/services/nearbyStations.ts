import type { Station } from '../data/model';
import type { UserCoordinates } from '../context/LocationContext';

interface ApiStation { id?: string; name?: string; brand?: string; address?: string; roadAddress?: string; price?: number | string; distance?: number | string; latitude?: number | string | null; longitude?: number | string | null; }
interface NearbyResponse { stations?: ApiStation[]; }
export type NearbySort = 'distance' | 'price';
const safeNumber = (value: unknown, fallback = 0) => { const n = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, '')); return Number.isFinite(n) ? n : fallback; };
const trendFor = (price: number, index: number) => [price + 18 + index, price + 15 + index, price + 12, price + 8, price + 4, price + 2, price].map(Math.round);
function toStation(item: ApiStation, index: number, averagePrice: number, fuel: Station['fuel'], region: string): Station | null {
  const price = safeNumber(item.price, 0);
  const name = String(item.name ?? '').trim();
  if (!name || price <= 0) return null;
  const rawDistance = safeNumber(item.distance, 0);
  return { id: String(item.id ?? `nearby-${fuel}-${name}-${index}`), name, brand: String(item.brand ?? '브랜드 확인'), address: String(item.roadAddress || item.address || '주소 확인'), distance: Number((rawDistance > 80 ? rawDistance / 1000 : rawDistance).toFixed(1)), price, avgDiff: Math.round(price - averagePrice), lat: safeNumber(item.latitude, 0), lng: safeNumber(item.longitude, 0), trend: trendFor(price, index), favorite: false, fuel, region };
}
export async function fetchNearbyStations({ coordinates, fuel, region, sort = 'distance', signal }: { coordinates: UserCoordinates; fuel: string; region: string; sort?: NearbySort; signal?: AbortSignal; }): Promise<Station[]> {
  const params = new URLSearchParams({ lat: String(coordinates.lat), lng: String(coordinates.lng), fuel, sort });
  const response = await fetch(`/api/nearby-stations?${params.toString()}`, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error(`nearby station api failed: ${response.status}`);
  const json = await response.json() as NearbyResponse;
  const rows = Array.isArray(json.stations) ? json.stations : [];
  const prices = rows.map((station) => safeNumber(station.price, 0)).filter((price) => price > 0);
  const averagePrice = prices.length ? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length) : 0;
  return rows.map((station, index) => toStation(station, index, averagePrice, fuel === '경유' || fuel === 'LPG' ? fuel : '휘발유', region)).filter((station): station is Station => Boolean(station));
}
