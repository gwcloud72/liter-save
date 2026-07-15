import { loadKakaoMapsSdk, type KakaoRegionCodeResult } from './kakaoMapsSdk';

export const ADMIN_REGION_COORDS = [
  { name: '서울', dataRegion: '서울', lat: 37.5665, lng: 126.9780 },
  { name: '부산', dataRegion: '부산', lat: 35.1796, lng: 129.0756 },
  { name: '대구', dataRegion: '대구', lat: 35.8714, lng: 128.6014 },
  { name: '인천', dataRegion: '인천', lat: 37.4563, lng: 126.7052 },
  { name: '광주', dataRegion: '전남광주', lat: 35.1595, lng: 126.8526 },
  { name: '대전', dataRegion: '대전', lat: 36.3504, lng: 127.3845 },
  { name: '울산', dataRegion: '울산', lat: 35.5384, lng: 129.3114 },
  { name: '세종', dataRegion: '세종', lat: 36.4800, lng: 127.2890 },
  { name: '경기', dataRegion: '경기', lat: 37.4138, lng: 127.5183 },
  { name: '강원', dataRegion: '강원', lat: 37.8228, lng: 128.1555 },
  { name: '충북', dataRegion: '충북', lat: 36.6357, lng: 127.4917 },
  { name: '충남', dataRegion: '충남', lat: 36.5184, lng: 126.8000 },
  { name: '전북', dataRegion: '전북', lat: 35.7175, lng: 127.1530 },
  { name: '전남', dataRegion: '전남광주', lat: 34.8679, lng: 126.9910 },
  { name: '경북', dataRegion: '경북', lat: 36.4919, lng: 128.8889 },
  { name: '경남', dataRegion: '경남', lat: 35.4606, lng: 128.2132 },
  { name: '제주', dataRegion: '제주', lat: 33.4996, lng: 126.5312 },
] as const;

export type AdminRegionName = typeof ADMIN_REGION_COORDS[number]['dataRegion'];
export type LocationResolutionSource = 'kakao' | 'nearest' | 'outside-korea';

export interface ResolvedUserRegion {
  administrativeRegion: string;
  dataRegion: AdminRegionName | '전국';
  source: LocationResolutionSource;
}

const REGION_ALIASES = new Map<string, ResolvedUserRegion>([
  ['서울', { administrativeRegion: '서울', dataRegion: '서울', source: 'kakao' }],
  ['서울특별시', { administrativeRegion: '서울', dataRegion: '서울', source: 'kakao' }],
  ['부산', { administrativeRegion: '부산', dataRegion: '부산', source: 'kakao' }],
  ['부산광역시', { administrativeRegion: '부산', dataRegion: '부산', source: 'kakao' }],
  ['대구', { administrativeRegion: '대구', dataRegion: '대구', source: 'kakao' }],
  ['대구광역시', { administrativeRegion: '대구', dataRegion: '대구', source: 'kakao' }],
  ['인천', { administrativeRegion: '인천', dataRegion: '인천', source: 'kakao' }],
  ['인천광역시', { administrativeRegion: '인천', dataRegion: '인천', source: 'kakao' }],
  ['광주', { administrativeRegion: '광주', dataRegion: '전남광주', source: 'kakao' }],
  ['광주광역시', { administrativeRegion: '광주', dataRegion: '전남광주', source: 'kakao' }],
  ['대전', { administrativeRegion: '대전', dataRegion: '대전', source: 'kakao' }],
  ['대전광역시', { administrativeRegion: '대전', dataRegion: '대전', source: 'kakao' }],
  ['울산', { administrativeRegion: '울산', dataRegion: '울산', source: 'kakao' }],
  ['울산광역시', { administrativeRegion: '울산', dataRegion: '울산', source: 'kakao' }],
  ['세종', { administrativeRegion: '세종', dataRegion: '세종', source: 'kakao' }],
  ['세종특별자치시', { administrativeRegion: '세종', dataRegion: '세종', source: 'kakao' }],
  ['경기', { administrativeRegion: '경기', dataRegion: '경기', source: 'kakao' }],
  ['경기도', { administrativeRegion: '경기', dataRegion: '경기', source: 'kakao' }],
  ['강원', { administrativeRegion: '강원', dataRegion: '강원', source: 'kakao' }],
  ['강원도', { administrativeRegion: '강원', dataRegion: '강원', source: 'kakao' }],
  ['강원특별자치도', { administrativeRegion: '강원', dataRegion: '강원', source: 'kakao' }],
  ['충북', { administrativeRegion: '충북', dataRegion: '충북', source: 'kakao' }],
  ['충청북도', { administrativeRegion: '충북', dataRegion: '충북', source: 'kakao' }],
  ['충남', { administrativeRegion: '충남', dataRegion: '충남', source: 'kakao' }],
  ['충청남도', { administrativeRegion: '충남', dataRegion: '충남', source: 'kakao' }],
  ['전북', { administrativeRegion: '전북', dataRegion: '전북', source: 'kakao' }],
  ['전라북도', { administrativeRegion: '전북', dataRegion: '전북', source: 'kakao' }],
  ['전북특별자치도', { administrativeRegion: '전북', dataRegion: '전북', source: 'kakao' }],
  ['전남', { administrativeRegion: '전남', dataRegion: '전남광주', source: 'kakao' }],
  ['전라남도', { administrativeRegion: '전남', dataRegion: '전남광주', source: 'kakao' }],
  ['경북', { administrativeRegion: '경북', dataRegion: '경북', source: 'kakao' }],
  ['경상북도', { administrativeRegion: '경북', dataRegion: '경북', source: 'kakao' }],
  ['경남', { administrativeRegion: '경남', dataRegion: '경남', source: 'kakao' }],
  ['경상남도', { administrativeRegion: '경남', dataRegion: '경남', source: 'kakao' }],
  ['제주', { administrativeRegion: '제주', dataRegion: '제주', source: 'kakao' }],
  ['제주도', { administrativeRegion: '제주', dataRegion: '제주', source: 'kakao' }],
  ['제주특별자치도', { administrativeRegion: '제주', dataRegion: '제주', source: 'kakao' }],
]);

function distanceSquared(lat: number, lng: number, targetLat: number, targetLng: number): number {
  const latDiff = lat - targetLat;
  const lngDiff = (lng - targetLng) * Math.cos((lat * Math.PI) / 180);
  return latDiff * latDiff + lngDiff * lngDiff;
}

function isKoreanCoordinate(latitude: number, longitude: number): boolean {
  return latitude >= 32.5 && latitude <= 39.8 && longitude >= 124 && longitude <= 132.5;
}

function normalizedRegion(value: string): ResolvedUserRegion | null {
  return REGION_ALIASES.get(String(value ?? '').trim().replace(/\s+/g, '')) ?? null;
}

function nearestRegionResolution(latitude: number, longitude: number): ResolvedUserRegion {
  if (!isKoreanCoordinate(latitude, longitude)) {
    return { administrativeRegion: '국외 위치', dataRegion: '전국', source: 'outside-korea' };
  }
  const nearest = ADMIN_REGION_COORDS.reduce((currentNearest, region) => {
    const currentDistance = distanceSquared(latitude, longitude, region.lat, region.lng);
    const nearestDistance = distanceSquared(latitude, longitude, currentNearest.lat, currentNearest.lng);
    return currentDistance < nearestDistance ? region : currentNearest;
  });
  return { administrativeRegion: nearest.name, dataRegion: nearest.dataRegion, source: 'nearest' };
}

function preferredRegionResult(results: KakaoRegionCodeResult[]): KakaoRegionCodeResult | null {
  return results.find((result) => result.region_type === 'H')
    ?? results.find((result) => result.region_type === 'B')
    ?? results[0]
    ?? null;
}

async function resolveWithKakao(latitude: number, longitude: number, appKey: string): Promise<ResolvedUserRegion | null> {
  if (!appKey || !isKoreanCoordinate(latitude, longitude)) return null;
  try {
    const sdk = await loadKakaoMapsSdk(appKey);
    const services = sdk.services;
    if (!services?.Geocoder || !services.Status?.OK) return null;
    return await new Promise<ResolvedUserRegion | null>((resolve) => {
      let settled = false;
      const finish = (value: ResolvedUserRegion | null) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        resolve(value);
      };
      const timeoutId = window.setTimeout(() => finish(null), 5_000);
      const geocoder = new services.Geocoder();
      geocoder.coord2RegionCode(longitude, latitude, (results, status) => {
        if (status !== services.Status.OK) {
          finish(null);
          return;
        }
        const result = preferredRegionResult(results);
        const normalized = result ? normalizedRegion(result.region_1depth_name) : null;
        finish(normalized);
      });
    });
  } catch {
    return null;
  }
}

export function nearestAdminRegion(latitude: number, longitude: number): AdminRegionName | '전국' {
  return nearestRegionResolution(latitude, longitude).dataRegion;
}

export async function resolveUserRegion(latitude: number, longitude: number, appKey: string): Promise<ResolvedUserRegion> {
  const kakaoRegion = await resolveWithKakao(latitude, longitude, appKey);
  return kakaoRegion ?? nearestRegionResolution(latitude, longitude);
}
