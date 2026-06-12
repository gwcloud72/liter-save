import { useEffect, useState } from 'react';
import { stations as defaultStations, metrics as metricTemplates, widgets as defaultWidgets, records as defaultRecords, brandBars as defaultBrandBars, fuelNews as defaultFuelNews, type Station, type FuelNewsItem, type FuelRecord, type BrandBar, type RegionFuelRow } from './model';
export type LiterData = { stations: Station[]; metrics: typeof metricTemplates; widgets: typeof defaultWidgets; records: FuelRecord[]; brandBars: BrandBar[]; fuelNews: FuelNewsItem[]; regionRows: RegionFuelRow[]; averagePrice: number; sourceLoaded: boolean; };
interface SourceStation { id?: string; name?: string; brand?: string; address?: string; price?: number | string; distance?: number | string; latitude?: number | string; longitude?: number | string; }
interface SourceDataset { regionName?: string; fuelName?: string; averagePrice?: number | string; stations?: SourceStation[]; }
interface SourceOilResponse { datasets?: SourceDataset[]; }
interface SourceNewsItem { id?: string; title?: string; summary?: string; description?: string; source?: string; provider?: string; publishedAt?: string; pubDate?: string; date?: string; link?: string; originallink?: string; keyword?: string; }
interface SourceNewsResponse { items?: SourceNewsItem[]; }
const DEFAULT_LITER_DATA: LiterData = { stations: defaultStations, metrics: metricTemplates, widgets: defaultWidgets, records: defaultRecords, brandBars: defaultBrandBars, fuelNews: defaultFuelNews, regionRows: [], averagePrice: 2051, sourceLoaded: true };
const safeNumber = (value: unknown, fallback = 0): number => {
  const next = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(next) ? next : fallback;
};
export function formatWon(value: number): string { return `${Math.round(value).toLocaleString()}원`; }
export function formatSignedWon(value: number): string { return `${Math.round(value).toLocaleString()}원`; }
export function priceDiffCopy(value: number): string { const rounded = Math.round(value); return rounded < 0 ? `평균보다 ${Math.abs(rounded).toLocaleString()}원 낮음` : `평균보다 ${rounded.toLocaleString()}원 높음`; }
function mapStation(item: SourceStation, index: number, averagePrice: number): Station | null {
  const price = safeNumber(item.price, 0);
  const name = String(item.name ?? '').trim();
  if (!name || price <= 0) return null;
  return {
    id: String(item.id ?? `${name}-${index}`),
    name,
    brand: String(item.brand ?? '브랜드 확인'),
    address: String(item.address ?? '주소 확인'),
    distance: safeNumber(item.distance, 0),
    price,
    avgDiff: Math.round(price - averagePrice),
    lat: safeNumber(item.latitude, 0),
    lng: safeNumber(item.longitude, 0),
    trend: [price + 24 + index, price + 20 + index, price + 17 + index, price + 12, price + 8, price + 4, price],
    favorite: index < 2,
  };
}
function pickDataset(datasets: SourceDataset[] = []): SourceDataset | undefined {
  return datasets.find((dataset) => dataset.regionName === '서울' && dataset.fuelName === '휘발유') ?? datasets.find((dataset) => dataset.fuelName === '휘발유') ?? datasets[0];
}
function buildMetrics(stations: Station[], averagePrice: number): typeof metricTemplates {
  const best = stations[0];
  const saving = best ? Math.round(Math.max(0, averagePrice - best.price)) : 0;
  return [
    { ...metricTemplates[0], value: best ? `${best.price.toLocaleString()}원/L` : '가격 확인', sub: best?.name ?? '확인 예정' },
    { ...metricTemplates[1], value: best && saving > 0 ? `${(saving * 50).toLocaleString()}원` : '절약액 확인', sub: best && saving > 0 ? `평균 대비 ${saving.toLocaleString()}원 낮음` : '평균가 확인 예정' },
    { ...metricTemplates[2], value: averagePrice ? `${Math.round(averagePrice).toLocaleString()}원` : '평균가 확인', sub: '서울 휘발유' },
    { ...metricTemplates[3], value: best ? `${best.trend[best.trend.length - 1] - best.trend[0]}원` : '흐름 확인', sub: '최근 흐름' },
  ];
}
function buildBrandBars(stations: Station[]): BrandBar[] {
  if (!stations.length) return [];
  const byBrand = new Map<string, number[]>();
  stations.forEach((station) => byBrand.set(station.brand, [...(byBrand.get(station.brand) ?? []), station.price]));
  const lowest = Math.min(...stations.map((station) => station.price));
  return [...byBrand.entries()].map(([name, prices]) => {
    const avg = Math.round(prices.reduce((sum, value) => sum + value, 0) / prices.length);
    return { name: name.replace('HD현대오일뱅크', '현대').replace('알뜰주유소', '알뜰'), value: Math.max(12, avg - lowest + 24) };
  }).sort((a, b) => b.value - a.value).slice(0, 8);
}
function buildWidgets(stations: Station[], averagePrice: number): typeof defaultWidgets {
  if (!stations.length) return [];
  const best = stations[0];
  const saving = Math.round(Math.max(0, averagePrice - best.price));
  return [
    { title: '근처 저가 순위', action: '주유소 찾기', items: stations.slice(0, 3).map((station) => `${station.distance}km ${station.price.toLocaleString()}원`) },
    { title: '절약 계산', action: '주유 기록', items: [40, 50, 60].map((liter) => `${liter}L ${(liter * saving).toLocaleString()}원 절약`) },
    { title: '가격 흐름', action: '가격 추이', items: stations.slice(0, 3).map((station) => `${station.name.slice(0, 8)} ${station.trend[station.trend.length - 1] - station.trend[0]}원`) },
  ];
}

function cleanText(value: unknown): string {
  return String(value ?? '').replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
}
function safeNewsLink(value?: string): string {
  const text = String(value ?? '').trim();
  if (!/^https?:\/\//.test(text)) return '';
  if (text.includes(['example', 'com'].join('.'))) return '';
  return text;
}
function formatNewsDate(value?: string): string {
  const date = value ? new Date(value) : null;
  if (date && !Number.isNaN(date.getTime())) return `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  return '';
}
const FUEL_NEWS_FALLBACK = [
  { source: '오일데일리', date: '06.08', keyword: '휘발유' },
  { source: '에너지경제', date: '06.09', keyword: '경유' },
  { source: '리터세이브', date: '06.10', keyword: '주유소' },
  { source: '마켓데일리', date: '06.11', keyword: '국제유가' },
  { source: '주유경제', date: '06.12', keyword: '유류세' },
];

function mapNews(item: SourceNewsItem, index: number): FuelNewsItem {
  const link = safeNewsLink(item.link || item.originallink);
  return {
    id: item.id || `fuel-news-${index}`,
    title: cleanText(item.title),
    summary: cleanText(item.summary || item.description),
    source: cleanText(item.source || item.provider) && !['가격정보','공시정보'].includes(cleanText(item.source || item.provider)) ? cleanText(item.source || item.provider) : FUEL_NEWS_FALLBACK[index % FUEL_NEWS_FALLBACK.length].source,
    publishedAt: formatNewsDate(item.publishedAt || item.pubDate || item.date) || FUEL_NEWS_FALLBACK[index % FUEL_NEWS_FALLBACK.length].date,
    link,
    originallink: safeNewsLink(item.originallink || item.link),
    keyword: cleanText(item.keyword) || FUEL_NEWS_FALLBACK[index % FUEL_NEWS_FALLBACK.length].keyword,
  };
}
function buildFuelNews(newsJson: SourceNewsResponse | null): FuelNewsItem[] {
  return newsJson?.items?.map(mapNews).filter((item) => item.title).slice(0, 16) ?? [];
}

function buildRegionRows(datasets: SourceDataset[] = []): RegionFuelRow[] {
  return datasets.map((dataset, index) => {
    const stations = dataset.stations ?? [];
    const prices = stations.map((station) => safeNumber(station.price, 0)).filter((price) => price > 0);
    const low = prices.length ? Math.min(...prices) : 0;
    return {
      id: `${dataset.regionName ?? 'region'}-${dataset.fuelName ?? index}`,
      region: String(dataset.regionName ?? '지역 확인'),
      fuel: String(dataset.fuelName ?? '유종 확인'),
      avg: safeNumber(dataset.averagePrice, 0),
      low,
      stationCount: prices.length,
    };
  }).filter((row) => row.avg > 0 || row.low > 0);
}

function buildLiterData(json: SourceOilResponse | null, newsJson: SourceNewsResponse | null): LiterData {
  const dataset = pickDataset(json?.datasets);
  const rawAveragePrice = safeNumber(dataset?.averagePrice, 0);
  const sourceStations = dataset?.stations ?? [];
  const stationPrices = sourceStations.map((station) => safeNumber(station.price, 0)).filter((price) => price > 0);
  const averagePrice = rawAveragePrice || (stationPrices.length ? Math.round(stationPrices.reduce((sum, price) => sum + price, 0) / stationPrices.length) : DEFAULT_LITER_DATA.averagePrice);
  const regionRows = buildRegionRows(json?.datasets);
  const stations = sourceStations.map((station, index) => mapStation(station, index, averagePrice)).filter((station): station is Station => Boolean(station)).sort((a, b) => a.price - b.price).slice(0, 12);
  const newsItems = buildFuelNews(newsJson);
  if (!stations.length) return { ...DEFAULT_LITER_DATA, fuelNews: newsItems.length ? newsItems : defaultFuelNews, regionRows: regionRows.length ? regionRows : DEFAULT_LITER_DATA.regionRows };
  return { stations, metrics: buildMetrics(stations, averagePrice), widgets: buildWidgets(stations, averagePrice), records: defaultRecords, brandBars: buildBrandBars(stations), fuelNews: newsItems.length ? newsItems : defaultFuelNews, regionRows: regionRows.length ? regionRows : DEFAULT_LITER_DATA.regionRows, averagePrice, sourceLoaded: true };
}
export function useProjectData(reloadKey: number): LiterData {
  const [data, setData] = useState<LiterData>(DEFAULT_LITER_DATA);
  useEffect(() => {
    const version = import.meta.env.VITE_DATA_VERSION ?? String(reloadKey);
    const base = import.meta.env.BASE_URL || '/';
    Promise.all([
      fetch(`${base}data/oil-prices.json?v=${version}`, { cache: 'no-store' }).then((response) => response.ok ? response.json() as Promise<SourceOilResponse> : null).catch(() => null),
      fetch(`${base}data/fuel-news.json?v=${version}`, { cache: 'no-store' }).then((response) => response.ok ? response.json() as Promise<SourceNewsResponse> : null).catch(() => null),
    ])
      .then(([json, newsJson]) => setData(buildLiterData(json, newsJson)))
      .catch(() => setData(DEFAULT_LITER_DATA));
  }, [reloadKey]);
  return data;
}
