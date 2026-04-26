export const SORT_MODE_LABELS = {
  price: '저렴한 순',
  nearby: '가까운 순',
  value: '가성비 추천',
};

export function uniqueOptions(datasets, codeKey, nameKey) {
  const seen = new Set();
  const options = [];
  datasets.forEach((item) => {
    const code = item?.[codeKey];
    if (!code || seen.has(code)) return;
    seen.add(code);
    options.push({ code, name: item?.[nameKey] || code });
  });
  return options;
}

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

export function calculateDistanceKm(from, to) {
  const fromLatitude = toFiniteNumber(from?.latitude);
  const fromLongitude = toFiniteNumber(from?.longitude);
  const toLatitude = toFiniteNumber(to?.latitude);
  const toLongitude = toFiniteNumber(to?.longitude);

  if (
    fromLatitude === null
    || fromLongitude === null
    || toLatitude === null
    || toLongitude === null
  ) {
    return null;
  }

  const earthRadiusKm = 6371;
  const deltaLatitude = toRadians(toLatitude - fromLatitude);
  const deltaLongitude = toRadians(toLongitude - fromLongitude);
  const latitudeA = toRadians(fromLatitude);
  const latitudeB = toRadians(toLatitude);

  const a = (Math.sin(deltaLatitude / 2) ** 2)
    + (Math.cos(latitudeA) * Math.cos(latitudeB) * (Math.sin(deltaLongitude / 2) ** 2));
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Number((earthRadiusKm * c).toFixed(2));
}

export function sortStationsByPrice(stations = []) {
  return [...stations].sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
}

export function getPriceStats(stations = []) {
  const prices = stations
    .map((station) => Number(station.price))
    .filter((price) => Number.isFinite(price) && price > 0);

  const sortedByPrice = sortStationsByPrice(stations);
  const lowest = sortedByPrice[0] ?? null;
  const average = prices.length
    ? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length)
    : 0;

  return { lowest, average };
}

export function decorateStations(stations = [], averagePrice = 0, userLocation = null) {
  return stations.map((station) => {
    const price = Number(station.price || 0);
    const savingPerLiter = Number.isFinite(averagePrice)
      ? Math.round((averagePrice - price) * 10) / 10
      : null;
    const expectedSavings40L = savingPerLiter !== null
      ? Math.round(savingPerLiter * 40)
      : null;
    const distanceKm = userLocation ? calculateDistanceKm(userLocation, station) : null;
    const distancePenalty = Number.isFinite(distanceKm) ? distanceKm * 140 : 0;
    const valueScore = expectedSavings40L !== null && Number.isFinite(distanceKm)
      ? Number((expectedSavings40L - distancePenalty).toFixed(2))
      : null;

    return {
      ...station,
      savingPerLiter,
      expectedSavings40L,
      distanceKm,
      valueScore,
    };
  });
}

function compareNullableAscending(a, b) {
  const left = Number(a);
  const right = Number(b);
  const leftValid = Number.isFinite(left);
  const rightValid = Number.isFinite(right);

  if (leftValid && rightValid) return left - right;
  if (leftValid) return -1;
  if (rightValid) return 1;
  return 0;
}

function compareNullableDescending(a, b) {
  const left = Number(a);
  const right = Number(b);
  const leftValid = Number.isFinite(left);
  const rightValid = Number.isFinite(right);

  if (leftValid && rightValid) return right - left;
  if (leftValid) return -1;
  if (rightValid) return 1;
  return 0;
}

export function sortStations(stations = [], sortMode = 'price') {
  const safeStations = [...stations];

  if (sortMode === 'nearby') {
    return safeStations.sort((a, b) => (
      compareNullableAscending(a.distanceKm, b.distanceKm)
      || compareNullableAscending(a.price, b.price)
      || String(a.name || '').localeCompare(String(b.name || ''), 'ko-KR')
    ));
  }

  if (sortMode === 'value') {
    return safeStations.sort((a, b) => (
      compareNullableDescending(a.valueScore, b.valueScore)
      || compareNullableAscending(a.distanceKm, b.distanceKm)
      || compareNullableAscending(a.price, b.price)
      || String(a.name || '').localeCompare(String(b.name || ''), 'ko-KR')
    ));
  }

  return sortStationsByPrice(safeStations);
}

export function getNearestStation(stations = []) {
  return sortStations(stations, 'nearby').find((station) => Number.isFinite(station.distanceKm)) ?? null;
}

export function getBestValueStation(stations = []) {
  return sortStations(stations, 'value').find((station) => Number.isFinite(station.valueScore)) ?? null;
}
