export const ADMIN_REGION_COORDS = [
  { name: '서울', lat: 37.5665, lng: 126.9780 },
  { name: '부산', lat: 35.1796, lng: 129.0756 },
  { name: '대구', lat: 35.8714, lng: 128.6014 },
  { name: '인천', lat: 37.4563, lng: 126.7052 },
  { name: '광주', lat: 35.1595, lng: 126.8526 },
  { name: '대전', lat: 36.3504, lng: 127.3845 },
  { name: '울산', lat: 35.5384, lng: 129.3114 },
  { name: '세종', lat: 36.4800, lng: 127.2890 },
  { name: '경기', lat: 37.4138, lng: 127.5183 },
  { name: '강원', lat: 37.8228, lng: 128.1555 },
  { name: '충북', lat: 36.6357, lng: 127.4917 },
  { name: '충남', lat: 36.5184, lng: 126.8000 },
  { name: '전북', lat: 35.7175, lng: 127.1530 },
  { name: '전남', lat: 34.8679, lng: 126.9910 },
  { name: '경북', lat: 36.4919, lng: 128.8889 },
  { name: '경남', lat: 35.4606, lng: 128.2132 },
  { name: '제주', lat: 33.4996, lng: 126.5312 },
] as const;

export type AdminRegionName = typeof ADMIN_REGION_COORDS[number]['name'];

function distanceSquared(lat: number, lng: number, targetLat: number, targetLng: number): number {
  const latDiff = lat - targetLat;
  const lngDiff = (lng - targetLng) * Math.cos((lat * Math.PI) / 180);
  return latDiff * latDiff + lngDiff * lngDiff;
}

export function nearestAdminRegion(latitude: number, longitude: number): AdminRegionName {
  return ADMIN_REGION_COORDS.reduce((nearest, region) => {
    const current = distanceSquared(latitude, longitude, region.lat, region.lng);
    const previous = distanceSquared(latitude, longitude, nearest.lat, nearest.lng);
    return current < previous ? region : nearest;
  }).name;
}
