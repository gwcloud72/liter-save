function encodeSegment(value) {
  return encodeURIComponent(String(value || '').trim());
}

export function buildKakaoRouteUrl(station) {
  const latitude = Number(station?.latitude);
  const longitude = Number(station?.longitude);
  const name = station?.name || '주유소';

  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return `https://map.kakao.com/link/to/${encodeSegment(name)},${latitude},${longitude}`;
  }

  const query = [station?.name, station?.roadAddress, station?.address].filter(Boolean).join(' ');
  return `https://map.kakao.com/link/search/${encodeSegment(query || name)}`;
}
