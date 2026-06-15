export interface KakaoRouteTarget {
  name: string;
  lat?: number;
  lng?: number;
}

function hasCoordinates(target: KakaoRouteTarget): target is Required<KakaoRouteTarget> {
  return Number.isFinite(target.lat) && Number.isFinite(target.lng) && target.lat !== 0 && target.lng !== 0;
}

export function kakaoRouteHref(target?: KakaoRouteTarget | null): string {
  if (!target || !String(target.name || '').trim()) return 'https://map.kakao.com/';
  const label = encodeURIComponent(target.name.trim());
  if (hasCoordinates(target)) {
    return `https://map.kakao.com/link/to/${label},${target.lat},${target.lng}`;
  }
  return `https://map.kakao.com/link/search/${label}`;
}
