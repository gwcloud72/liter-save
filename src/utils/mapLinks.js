export function buildDaumMapUrl(station) {
  if (!station) return 'https://map.kakao.com/';

  const name = station.name || '주유소';
  const lat = Number(station.latitude);
  const lng = Number(station.longitude);

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`;
  }

  const keyword = [station.name, station.roadAddress || station.address]
    .filter(Boolean)
    .join(' ');

  return `https://map.kakao.com/link/search/${encodeURIComponent(keyword || '주유소')}`;
}
