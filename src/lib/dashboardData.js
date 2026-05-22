import { formatShortDate, toNumber } from './format.js';

export const SORT_OPTIONS = [
  { label: '가격 낮은 순', value: 'price-asc' },
  { label: '평균 대비 저렴한순', value: 'saving-desc' },
  { label: '브랜드순', value: 'brand-asc' },
  { label: '주소순', value: 'address-asc' },
];
export const DEFAULT_FILTERS = { regionCode: '01', fuelCode: 'B027', query: '', sort: 'price-asc' };
const brandTones = { 'S-OIL': 'text-yellow-600', SK에너지: 'text-red-600', GS칼텍스: 'text-sky-700', 현대오일뱅크: 'text-blue-700', HYUNDAI: 'text-blue-700', Self: 'text-orange-600' };


export function normalizeSort(value) {
  return SORT_OPTIONS.find((option) => option.value === value)?.value || DEFAULT_FILTERS.sort;
}

export function hasActiveFilters(filters) {
  return filters?.regionCode !== DEFAULT_FILTERS.regionCode
    || filters?.fuelCode !== DEFAULT_FILTERS.fuelCode
    || normalize(filters?.query) !== ''
    || normalizeSort(filters?.sort) !== DEFAULT_FILTERS.sort;
}

export function safeExternalUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

export function mapSearchUrl(station) {
  return safeExternalUrl(`https://map.naver.com/v5/search/${encodeURIComponent(`${station.name} ${station.address}`)}`);
}

function normalize(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function stationPrice(station) {
  return toNumber(station.price) ?? 0;
}

export function average(values) {
  const numbers = values.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  if (!numbers.length) return 0;
  return Math.round(numbers.reduce((sum, value) => sum + value, 0) / numbers.length);
}

function stationFromLive(station, dataset, index) {
  const brand = station.brand || station.brandName || station.pollDivNm || station.brandCode || 'Self';
  return {
    ...station,
    id: station.id || station.stationId || station.uniId || `${dataset.regionCode}-${dataset.fuelCode}-${index}`,
    name: station.name || station.osNm || station.stationName || `주유소 ${index + 1}`,
    price: toNumber(station.price || station.salePrice || station.oilPrice || station.priceValue) ?? 0,
    brand,
    brandTone: brandTones[brand] || 'text-slate-700',
    address: station.roadAddress || station.address || station.newAdr || station.vanAdr || '-',
    roadAddress: station.roadAddress || station.address || station.newAdr || station.vanAdr || '-',
    regionName: dataset.regionName,
    fuelName: dataset.fuelName,
  };
}

export function buildData(pricePayload, historyPayload, reportPayload) {
  const hasLiveDatasets = Array.isArray(pricePayload?.datasets) && pricePayload.datasets.length > 0;
  const rawDatasets = hasLiveDatasets ? pricePayload.datasets : [];
  const datasets = rawDatasets.map((dataset) => ({ ...dataset, stations: (dataset.stations || []).map((station, index) => stationFromLive(station, dataset, index)).filter((station) => station.price > 0) })).filter((dataset) => dataset.stations.length);
  const regions = [...new Map(datasets.map((dataset) => [dataset.regionCode, dataset.regionName || dataset.regionCode])).entries()].map(([code, name]) => ({ code, name }));
  const fuels = [...new Map(datasets.map((dataset) => [dataset.fuelCode, dataset.fuelName || dataset.fuelCode])).entries()].map(([code, name]) => ({ code, name }));
  const allStations = datasets.flatMap((dataset) => dataset.stations);
  const regionRows = datasets.reduce((map, dataset) => {
    if (!map.has(dataset.regionName)) map.set(dataset.regionName, []);
    map.get(dataset.regionName).push(...dataset.stations.map((station) => station.price));
    return map;
  }, new Map());
  const nationalAverage = average(allStations.map((station) => station.price));
  const derivedRegions = [...regionRows.entries()].map(([name, prices]) => {
    const averagePrice = average(prices);
    return { name, averagePrice, diff: averagePrice - nationalAverage };
  }).sort((a, b) => a.averagePrice - b.averagePrice);
  const snapshots = Array.isArray(historyPayload?.snapshots) ? historyPayload.snapshots : [];
  const trendPoints = snapshots.map((snapshot) => {
    const metric = (snapshot.metrics || []).find((item) => item.regionCode === DEFAULT_FILTERS.regionCode && item.fuelCode === DEFAULT_FILTERS.fuelCode) || (snapshot.metrics || [])[0];
    return { value: toNumber(metric?.averagePrice), label: formatShortDate(snapshot.capturedAt) };
  }).filter((point) => point.value !== null).slice(-7);
  const trendValues = trendPoints.map((point) => point.value);
  const trendLabels = trendPoints.map((point) => point.label);
  const reportLines = Array.isArray(reportPayload?.summary) ? reportPayload.summary.slice(0, 3) : [];
  return {
    datasets,
    regions: regions.length ? regions : [{ code: DEFAULT_FILTERS.regionCode, name: '지역 없음' }],
    fuels: fuels.length ? fuels : [{ code: DEFAULT_FILTERS.fuelCode, name: '유종 없음' }],
    regionRows: derivedRegions,
    allStations,
    trendValues,
    trendLabels,
    reportLines,
    updatedAt: formatShortDate(pricePayload?.generatedAt),
    isLive: hasLiveDatasets,
  };
}

export function filterStations(stations, filters, averagePrice) {
  const query = normalize(filters.query);
  const filtered = stations.filter((station) => {
    const haystack = normalize(`${station.name} ${station.brand} ${station.address} ${station.roadAddress}`);
    return !query || haystack.includes(query);
  });
  const sorted = [...filtered];
  if (filters.sort === 'saving-desc') return sorted.sort((a, b) => (averagePrice - b.price) - (averagePrice - a.price));
  if (filters.sort === 'brand-asc') return sorted.sort((a, b) => String(a.brand).localeCompare(String(b.brand), 'ko-KR'));
  if (filters.sort === 'address-asc') return sorted.sort((a, b) => String(a.address).localeCompare(String(b.address), 'ko-KR'));
  return sorted.sort((a, b) => a.price - b.price);
}
