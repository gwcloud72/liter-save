import { useEffect, useState } from 'react';
import { stations as defaultStations, metrics as metricTemplates, widgets as defaultWidgets, records as defaultRecords, brandBars as defaultBrandBars, fuelNews as defaultFuelNews, type Station, type FuelNewsItem, type FuelRecord, type BrandBar, type RegionFuelRow } from './model';

export interface LiterAiReport { headline: string; daily: string; weekly: string; monthly: string; consumerTip: string; note: string; sourceLabel: string; }
export interface OilHistoryMetric { regionName: string; fuelName: string; averagePrice: number | null; lowestPrice: number | null; stationCount: number; }
export interface OilHistorySnapshot { capturedAt: string; metrics: OilHistoryMetric[]; }
export interface OilHistoryPoint { date: string; averagePrice: number; lowestPrice: number | null; stationCount: number; }
export interface GlobalOilPoint { date: string; brent: number | null; wti: number | null; }
export interface GlobalOilData { updatedAt: string | null; points: GlobalOilPoint[]; latest: GlobalOilPoint | null; summary: string; }
export interface FuelView { fuel: string; region: string; stations: Station[]; metrics: typeof metricTemplates; widgets: typeof defaultWidgets; brandBars: BrandBar[]; regionRows: RegionFuelRow[]; averagePrice: number; }
interface SourceAiReportResponse { provider?: string; model?: string | null; report?: Partial<LiterAiReport>; }
export type LiterData = { stations: Station[]; metrics: typeof metricTemplates; widgets: typeof defaultWidgets; records: FuelRecord[]; brandBars: BrandBar[]; fuelNews: FuelNewsItem[]; regionRows: RegionFuelRow[]; averagePrice: number; aiReport: LiterAiReport | null; fuelOptions: string[]; fuelViews: FuelView[]; selectedFuel: string; fuel: string; region: string; sourceLoaded: boolean; historySnapshots: OilHistorySnapshot[]; globalOil: GlobalOilData; };
interface SourceStation { id?: string; name?: string; brand?: string; address?: string; price?: number | string; distance?: number | string; latitude?: number | string | null; longitude?: number | string | null; }
interface SourceDataset { regionName?: string; fuelName?: string; averagePrice?: number | string; stations?: SourceStation[]; }
interface SourceOilResponse { datasets?: SourceDataset[]; }
interface SourceNewsItem { id?: string; title?: string; summary?: string; description?: string; source?: string; provider?: string; publishedAt?: string; pubDate?: string; date?: string; link?: string; originallink?: string; keyword?: string; }
interface SourceNewsResponse { items?: SourceNewsItem[]; }
interface SourceOilHistoryResponse { snapshots?: { capturedAt?: string; metrics?: Partial<OilHistoryMetric>[] }[]; }
interface SourceGlobalOilResponse { updatedAt?: string; series?: { date?: string; brent?: number | string; wti?: number | string }[]; history?: Record<string, { date?: string; price?: number | string }[]>; items?: { key?: string; date?: string; price?: number | string; change?: number | string }[]; }

const safeNumber = (value: unknown, fallback = 0): number => {
  const next = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(next) ? next : fallback;
};

export function formatWon(value: number): string { return `${Math.round(value).toLocaleString()}원`; }
export function formatSignedWon(value: number): string { const rounded = Math.round(value); return rounded === 0 ? '보합' : `${rounded.toLocaleString()}원`; }
export function changeDirection(value: number): 'up' | 'down' | 'flat' { const rounded = Math.round(value); return rounded === 0 ? 'flat' : rounded < 0 ? 'down' : 'up'; }
export function priceDiffCopy(value: number): string { const rounded = Math.round(value); return rounded === 0 ? '평균과 동일' : rounded < 0 ? `평균보다 ${Math.abs(rounded).toLocaleString()}원 낮음` : `평균보다 ${rounded.toLocaleString()}원 높음`; }

function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(5, 10).replace('-', '.');
  return `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

const DEFAULT_GLOBAL_OIL: GlobalOilData = {
  updatedAt: '2026-06-12T09:00:00+09:00',
  points: [
    { date: '2026-06-05', brent: 78.5, wti: 74.2 },
    { date: '2026-06-06', brent: 78.2, wti: 73.95 },
    { date: '2026-06-07', brent: 77.9, wti: 73.7 },
    { date: '2026-06-08', brent: 77.6, wti: 73.45 },
    { date: '2026-06-09', brent: 77.3, wti: 73.2 },
    { date: '2026-06-10', brent: 77.0, wti: 72.95 },
    { date: '2026-06-11', brent: 76.7, wti: 72.7 },
  ],
  latest: { date: '2026-06-11', brent: 76.7, wti: 72.7 },
  summary: 'Brent와 WTI 모두 최근 관측 구간에서 완만한 하락 흐름입니다. 국내 가격 판단은 지역 평균과 함께 봐야 합니다.',
};

const DEFAULT_AI_REPORT: LiterAiReport = {
  headline: '지역 평균과 저가 기준을 함께 보면 실제 결제액 차이가 더 분명합니다.',
  daily: '최근 관측 구간은 큰 급등 없이 완만한 안정 흐름입니다.',
  weekly: '7일 기준으로는 저가 상표와 지역 평균 차이를 우선 확인하는 편이 좋습니다.',
  monthly: '30일·90일 구간은 자동 수집 이력으로 확장됩니다.',
  consumerTip: '주유 전에는 선택 지역, 유종, 50L 예상 결제액, 길찾기 동선을 함께 확인하세요.',
  note: 'OPINET 지역 가격과 FRED 국제유가를 나눠서 보여주는 참고용 리포트입니다.',
  sourceLabel: '유가 리포트',
};

const DEFAULT_HISTORY_SNAPSHOTS: OilHistorySnapshot[] = [
  {
    "capturedAt": "2026-03-14T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2096.3,
        "lowestPrice": 2015.99,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2081.64,
        "lowestPrice": 2045.71,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1187.74,
        "lowestPrice": 1156.31,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-03-15T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2095.35,
        "lowestPrice": 2015.21,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2080.73,
        "lowestPrice": 2044.97,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1187.05,
        "lowestPrice": 1155.75,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-03-16T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2094.2,
        "lowestPrice": 2014.29,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2079.63,
        "lowestPrice": 2044.08,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1186.18,
        "lowestPrice": 1155.05,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-03-17T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2092.92,
        "lowestPrice": 2013.26,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2078.4,
        "lowestPrice": 2043.09,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1185.17,
        "lowestPrice": 1154.24,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-03-18T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2091.56,
        "lowestPrice": 2012.16,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2077.08,
        "lowestPrice": 2042.02,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1184.08,
        "lowestPrice": 1153.36,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-03-19T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2090.18,
        "lowestPrice": 2011.04,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2075.74,
        "lowestPrice": 2040.94,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1182.97,
        "lowestPrice": 1152.46,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-03-20T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2088.83,
        "lowestPrice": 2009.95,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2074.44,
        "lowestPrice": 2039.89,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1181.89,
        "lowestPrice": 1151.6,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-03-21T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2087.59,
        "lowestPrice": 2008.95,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2073.24,
        "lowestPrice": 2038.92,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1180.91,
        "lowestPrice": 1150.81,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-03-22T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2086.49,
        "lowestPrice": 2008.06,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2072.19,
        "lowestPrice": 2038.08,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1180.09,
        "lowestPrice": 1150.15,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-03-23T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2085.59,
        "lowestPrice": 2007.33,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2071.34,
        "lowestPrice": 2037.38,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1179.46,
        "lowestPrice": 1149.64,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-03-24T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2084.92,
        "lowestPrice": 2006.78,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2070.71,
        "lowestPrice": 2036.87,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1179.05,
        "lowestPrice": 1149.31,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-03-25T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2084.48,
        "lowestPrice": 2006.42,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2070.31,
        "lowestPrice": 2036.55,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1178.88,
        "lowestPrice": 1149.17,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-03-26T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2084.27,
        "lowestPrice": 2006.25,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2070.15,
        "lowestPrice": 2036.41,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1178.95,
        "lowestPrice": 1149.22,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-03-27T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2084.29,
        "lowestPrice": 2006.25,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2070.21,
        "lowestPrice": 2036.45,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1179.23,
        "lowestPrice": 1149.45,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-03-28T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2084.49,
        "lowestPrice": 2006.4,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2070.45,
        "lowestPrice": 2036.64,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1179.7,
        "lowestPrice": 1149.82,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-03-29T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2084.82,
        "lowestPrice": 2006.66,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2070.84,
        "lowestPrice": 2036.93,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1180.31,
        "lowestPrice": 1150.3,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-03-30T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2085.24,
        "lowestPrice": 2006.98,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2071.3,
        "lowestPrice": 2037.29,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1180.99,
        "lowestPrice": 1150.84,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-03-31T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2085.68,
        "lowestPrice": 2007.33,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2071.78,
        "lowestPrice": 2037.67,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1181.7,
        "lowestPrice": 1151.41,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-04-01T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2086.08,
        "lowestPrice": 2007.64,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2072.23,
        "lowestPrice": 2038.02,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1182.38,
        "lowestPrice": 1151.94,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-04-02T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2086.38,
        "lowestPrice": 2007.87,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2072.58,
        "lowestPrice": 2038.29,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1182.95,
        "lowestPrice": 1152.39,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-04-03T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2086.53,
        "lowestPrice": 2007.98,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2072.77,
        "lowestPrice": 2038.44,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1183.37,
        "lowestPrice": 1152.73,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-04-04T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2086.49,
        "lowestPrice": 2007.94,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2072.77,
        "lowestPrice": 2038.43,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1183.59,
        "lowestPrice": 1152.9,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-04-05T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2086.22,
        "lowestPrice": 2007.71,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2072.55,
        "lowestPrice": 2038.25,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1183.59,
        "lowestPrice": 1152.9,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-04-06T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2085.72,
        "lowestPrice": 2007.3,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2072.09,
        "lowestPrice": 2037.87,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1183.36,
        "lowestPrice": 1152.71,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-04-07T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2084.98,
        "lowestPrice": 2006.7,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2071.4,
        "lowestPrice": 2037.3,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1182.89,
        "lowestPrice": 1152.33,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-04-08T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2084.02,
        "lowestPrice": 2005.92,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2070.48,
        "lowestPrice": 2036.56,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1182.2,
        "lowestPrice": 1151.77,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-04-09T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2082.88,
        "lowestPrice": 2005.0,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2069.39,
        "lowestPrice": 2035.68,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1181.33,
        "lowestPrice": 1151.07,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-04-10T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2081.6,
        "lowestPrice": 2003.97,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2068.15,
        "lowestPrice": 2034.68,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1180.32,
        "lowestPrice": 1150.26,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-04-11T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2080.24,
        "lowestPrice": 2002.87,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2066.83,
        "lowestPrice": 2033.62,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1179.23,
        "lowestPrice": 1149.38,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-04-12T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2078.85,
        "lowestPrice": 2001.75,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2065.49,
        "lowestPrice": 2032.54,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1178.11,
        "lowestPrice": 1148.48,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-04-13T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2077.51,
        "lowestPrice": 2000.67,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2064.19,
        "lowestPrice": 2031.49,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1177.04,
        "lowestPrice": 1147.62,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-04-14T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2076.26,
        "lowestPrice": 1999.66,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2062.99,
        "lowestPrice": 2030.52,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1176.06,
        "lowestPrice": 1146.83,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-04-15T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2075.17,
        "lowestPrice": 1998.77,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2061.94,
        "lowestPrice": 2029.67,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1175.24,
        "lowestPrice": 1146.17,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-04-16T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2074.27,
        "lowestPrice": 1998.05,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2061.09,
        "lowestPrice": 2028.98,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1174.61,
        "lowestPrice": 1145.66,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-04-17T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2073.59,
        "lowestPrice": 1997.5,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2060.46,
        "lowestPrice": 2028.47,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1174.2,
        "lowestPrice": 1145.33,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-04-18T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2073.15,
        "lowestPrice": 1997.14,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2060.07,
        "lowestPrice": 2028.15,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1174.03,
        "lowestPrice": 1145.19,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-04-19T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2072.95,
        "lowestPrice": 1996.96,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2059.91,
        "lowestPrice": 2028.01,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1174.1,
        "lowestPrice": 1145.24,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-04-20T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2072.96,
        "lowestPrice": 1996.96,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2059.97,
        "lowestPrice": 2028.05,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1174.38,
        "lowestPrice": 1145.47,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-04-21T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2073.16,
        "lowestPrice": 1997.11,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2060.21,
        "lowestPrice": 2028.23,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1174.85,
        "lowestPrice": 1145.84,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-04-22T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2073.5,
        "lowestPrice": 1997.37,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2060.59,
        "lowestPrice": 2028.53,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1175.45,
        "lowestPrice": 1146.32,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-04-23T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2073.91,
        "lowestPrice": 1997.7,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2061.05,
        "lowestPrice": 2028.89,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1176.14,
        "lowestPrice": 1146.86,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-04-24T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2074.35,
        "lowestPrice": 1998.04,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2061.54,
        "lowestPrice": 2029.27,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1176.85,
        "lowestPrice": 1147.43,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-04-25T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2074.76,
        "lowestPrice": 1998.35,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2061.98,
        "lowestPrice": 2029.62,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1177.52,
        "lowestPrice": 1147.96,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-04-26T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2075.06,
        "lowestPrice": 1998.58,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2062.33,
        "lowestPrice": 2029.89,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1178.09,
        "lowestPrice": 1148.41,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-04-27T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2075.21,
        "lowestPrice": 1998.7,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2062.53,
        "lowestPrice": 2030.04,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1178.51,
        "lowestPrice": 1148.75,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-04-28T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2075.16,
        "lowestPrice": 1998.65,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2062.53,
        "lowestPrice": 2030.03,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1178.74,
        "lowestPrice": 1148.92,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-04-29T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2074.9,
        "lowestPrice": 1998.43,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2062.3,
        "lowestPrice": 2029.84,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1178.74,
        "lowestPrice": 1148.92,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-04-30T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2074.39,
        "lowestPrice": 1998.01,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2061.84,
        "lowestPrice": 2029.47,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1178.51,
        "lowestPrice": 1148.73,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-05-01T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2073.65,
        "lowestPrice": 1997.41,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2061.15,
        "lowestPrice": 2028.9,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1178.03,
        "lowestPrice": 1148.35,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-05-02T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2072.69,
        "lowestPrice": 1996.64,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2060.24,
        "lowestPrice": 2028.16,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1177.35,
        "lowestPrice": 1147.79,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-05-03T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2071.55,
        "lowestPrice": 1995.71,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2059.14,
        "lowestPrice": 2027.28,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1176.48,
        "lowestPrice": 1147.09,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-05-04T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2070.27,
        "lowestPrice": 1994.68,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2057.91,
        "lowestPrice": 2026.28,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1175.47,
        "lowestPrice": 1146.28,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-05-05T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2068.91,
        "lowestPrice": 1993.58,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2056.59,
        "lowestPrice": 2025.22,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1174.37,
        "lowestPrice": 1145.4,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-05-06T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2067.53,
        "lowestPrice": 1992.46,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2055.25,
        "lowestPrice": 2024.14,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1173.26,
        "lowestPrice": 1144.5,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-05-07T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2066.18,
        "lowestPrice": 1991.38,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2053.95,
        "lowestPrice": 2023.09,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1172.18,
        "lowestPrice": 1143.64,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-05-08T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2064.93,
        "lowestPrice": 1990.37,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2052.75,
        "lowestPrice": 2022.12,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1171.21,
        "lowestPrice": 1142.85,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-05-09T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2063.84,
        "lowestPrice": 1989.49,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2051.7,
        "lowestPrice": 2021.27,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1170.38,
        "lowestPrice": 1142.19,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-05-10T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2062.94,
        "lowestPrice": 1988.76,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2050.84,
        "lowestPrice": 2020.58,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1169.75,
        "lowestPrice": 1141.68,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-05-11T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2062.26,
        "lowestPrice": 1988.21,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2050.21,
        "lowestPrice": 2020.07,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1169.35,
        "lowestPrice": 1141.35,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-05-12T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2061.83,
        "lowestPrice": 1987.85,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2049.82,
        "lowestPrice": 2019.74,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1169.18,
        "lowestPrice": 1141.21,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-05-13T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2061.62,
        "lowestPrice": 1987.68,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2049.66,
        "lowestPrice": 2019.61,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1169.24,
        "lowestPrice": 1141.26,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-05-14T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2061.64,
        "lowestPrice": 1987.68,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2049.72,
        "lowestPrice": 2019.65,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1169.53,
        "lowestPrice": 1141.49,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-05-15T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2061.83,
        "lowestPrice": 1987.83,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2049.96,
        "lowestPrice": 2019.83,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1169.99,
        "lowestPrice": 1141.86,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-05-16T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2062.17,
        "lowestPrice": 1988.08,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2050.34,
        "lowestPrice": 2020.13,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1170.6,
        "lowestPrice": 1142.34,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-05-17T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2062.59,
        "lowestPrice": 1988.41,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2050.8,
        "lowestPrice": 2020.49,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1171.29,
        "lowestPrice": 1142.88,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-05-18T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2063.03,
        "lowestPrice": 1988.75,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2051.29,
        "lowestPrice": 2020.87,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1172.0,
        "lowestPrice": 1143.45,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-05-19T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2063.43,
        "lowestPrice": 1989.07,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2051.74,
        "lowestPrice": 2021.22,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1172.67,
        "lowestPrice": 1143.98,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-05-20T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2063.73,
        "lowestPrice": 1989.3,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2052.08,
        "lowestPrice": 2021.49,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1173.24,
        "lowestPrice": 1144.43,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-05-21T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2063.88,
        "lowestPrice": 1989.41,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2052.28,
        "lowestPrice": 2021.63,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1173.66,
        "lowestPrice": 1144.76,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-05-22T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2063.84,
        "lowestPrice": 1989.36,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2052.28,
        "lowestPrice": 2021.63,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1173.89,
        "lowestPrice": 1144.94,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-05-23T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2063.57,
        "lowestPrice": 1989.14,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2052.06,
        "lowestPrice": 2021.44,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1173.89,
        "lowestPrice": 1144.94,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-05-24T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2063.07,
        "lowestPrice": 1988.73,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2051.6,
        "lowestPrice": 2021.06,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1173.65,
        "lowestPrice": 1144.75,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-05-25T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2062.33,
        "lowestPrice": 1988.12,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2050.9,
        "lowestPrice": 2020.5,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1173.18,
        "lowestPrice": 1144.37,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-05-26T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2061.37,
        "lowestPrice": 1987.35,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2049.99,
        "lowestPrice": 2019.76,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1172.49,
        "lowestPrice": 1143.81,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-05-27T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2060.23,
        "lowestPrice": 1986.43,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2048.89,
        "lowestPrice": 2018.87,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1171.62,
        "lowestPrice": 1143.11,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-05-28T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2058.95,
        "lowestPrice": 1985.39,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2047.66,
        "lowestPrice": 2017.88,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1170.61,
        "lowestPrice": 1142.3,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-05-29T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2057.58,
        "lowestPrice": 1984.29,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2046.34,
        "lowestPrice": 2016.82,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1169.52,
        "lowestPrice": 1141.42,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-05-30T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2056.2,
        "lowestPrice": 1983.18,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2045.0,
        "lowestPrice": 2015.73,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1168.4,
        "lowestPrice": 1140.52,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-05-31T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2054.85,
        "lowestPrice": 1982.09,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2043.7,
        "lowestPrice": 2014.69,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1167.33,
        "lowestPrice": 1139.66,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-06-01T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2053.61,
        "lowestPrice": 1981.09,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2042.5,
        "lowestPrice": 2013.72,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1166.35,
        "lowestPrice": 1138.87,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-06-02T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2052.51,
        "lowestPrice": 1980.2,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2041.45,
        "lowestPrice": 2012.87,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1165.53,
        "lowestPrice": 1138.21,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-06-03T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2051.61,
        "lowestPrice": 1979.47,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2040.6,
        "lowestPrice": 2012.18,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1164.9,
        "lowestPrice": 1137.7,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-06-04T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2050.94,
        "lowestPrice": 1978.92,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2039.96,
        "lowestPrice": 2011.66,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1164.49,
        "lowestPrice": 1137.37,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-06-05T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2050.5,
        "lowestPrice": 1978.56,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2039.57,
        "lowestPrice": 2011.34,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1164.32,
        "lowestPrice": 1137.23,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-06-06T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2050.3,
        "lowestPrice": 1978.39,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2039.41,
        "lowestPrice": 2011.2,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1164.39,
        "lowestPrice": 1137.28,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-06-07T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2050.31,
        "lowestPrice": 1978.39,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2039.47,
        "lowestPrice": 2011.24,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1164.67,
        "lowestPrice": 1137.51,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-06-08T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2050.51,
        "lowestPrice": 1978.54,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2039.71,
        "lowestPrice": 2011.43,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1165.14,
        "lowestPrice": 1137.88,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-06-09T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2050.84,
        "lowestPrice": 1978.8,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2040.09,
        "lowestPrice": 2011.72,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1165.74,
        "lowestPrice": 1138.36,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-06-10T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2051.26,
        "lowestPrice": 1979.12,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2040.56,
        "lowestPrice": 2012.09,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1166.43,
        "lowestPrice": 1138.9,
        "stationCount": 4
      }
    ]
  },
  {
    "capturedAt": "2026-06-11T09:00:00+09:00",
    "metrics": [
      {
        "regionName": "서울",
        "fuelName": "휘발유",
        "averagePrice": 2051.12,
        "lowestPrice": 1979,
        "stationCount": 6
      },
      {
        "regionName": "서울",
        "fuelName": "경유",
        "averagePrice": 2040.46,
        "lowestPrice": 2012,
        "stationCount": 4
      },
      {
        "regionName": "서울",
        "fuelName": "LPG",
        "averagePrice": 1166.56,
        "lowestPrice": 1139,
        "stationCount": 4
      }
    ]
  }
];

function buildHistorySnapshots(historyJson: SourceOilHistoryResponse | null): OilHistorySnapshot[] {
  return (historyJson?.snapshots ?? []).map((snapshot) => ({
    capturedAt: String(snapshot.capturedAt ?? ''),
    metrics: (snapshot.metrics ?? []).map((metric) => ({
      regionName: String(metric.regionName ?? ''),
      fuelName: String(metric.fuelName ?? ''),
      averagePrice: safeNumber(metric.averagePrice, NaN),
      lowestPrice: safeNumber(metric.lowestPrice, NaN),
      stationCount: Math.max(0, Math.round(safeNumber(metric.stationCount, 0))),
    })).filter((metric) => metric.regionName && metric.fuelName && Number.isFinite(metric.averagePrice ?? NaN)),
  })).filter((snapshot) => snapshot.capturedAt && snapshot.metrics.length).sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
}

function buildGlobalOil(globalJson: SourceGlobalOilResponse | null): GlobalOilData {
  const fromSeries = (globalJson?.series ?? []).map((row) => ({ date: String(row.date ?? ''), brent: safeNumber(row.brent, NaN), wti: safeNumber(row.wti, NaN) })).filter((row) => row.date && (Number.isFinite(row.brent ?? NaN) || Number.isFinite(row.wti ?? NaN)));
  const fromHistory = (() => {
    const brent = globalJson?.history?.brent ?? [];
    const wti = globalJson?.history?.wti ?? [];
    const byDate = new Map<string, GlobalOilPoint>();
    brent.forEach((row) => { const date = String(row.date ?? ''); if (date) byDate.set(date, { date, brent: safeNumber(row.price, NaN), wti: null }); });
    wti.forEach((row) => { const date = String(row.date ?? ''); if (!date) return; const current = byDate.get(date) ?? { date, brent: null, wti: null }; current.wti = safeNumber(row.price, NaN); byDate.set(date, current); });
    return [...byDate.values()].filter((row) => Number.isFinite(row.brent ?? NaN) || Number.isFinite(row.wti ?? NaN));
  })();
  const points = (fromSeries.length ? fromSeries : fromHistory).map((row) => ({ date: row.date, brent: Number.isFinite(row.brent ?? NaN) ? Number(row.brent) : null, wti: Number.isFinite(row.wti ?? NaN) ? Number(row.wti) : null })).sort((a, b) => a.date.localeCompare(b.date));
  if (!points.length) return DEFAULT_GLOBAL_OIL;
  const latest = points.length ? points[points.length - 1] : null;
  const first = points[0];
  const brentDiff = latest?.brent !== null && latest?.brent !== undefined && first?.brent !== null && first?.brent !== undefined ? latest.brent - first.brent : null;
  const wtiDiff = latest?.wti !== null && latest?.wti !== undefined && first?.wti !== null && first?.wti !== undefined ? latest.wti - first.wti : null;
  const direction = (brentDiff ?? wtiDiff ?? 0) < 0 ? '하락' : (brentDiff ?? wtiDiff ?? 0) > 0 ? '상승' : '보합';
  return { updatedAt: globalJson?.updatedAt ?? null, points, latest, summary: `국제유가는 최근 관측 구간에서 ${direction} 흐름입니다. 국내 주유소 가격은 지역 평균과 국제 흐름을 함께 확인하세요.` };
}

export function getFuelHistory(data: LiterData, fuel: string, region: string, days: number): OilHistoryPoint[] {
  const rows = data.historySnapshots.map((snapshot) => {
    const metric = snapshot.metrics.find((item) => item.regionName === region && item.fuelName === fuel)
      ?? snapshot.metrics.find((item) => item.regionName === '전국' && item.fuelName === fuel)
      ?? snapshot.metrics.find((item) => item.fuelName === fuel);
    if (!metric || !Number.isFinite(metric.averagePrice ?? NaN)) return null;
    return { date: formatShortDate(snapshot.capturedAt), averagePrice: Math.round(Number(metric.averagePrice)), lowestPrice: Number.isFinite(metric.lowestPrice ?? NaN) ? Math.round(Number(metric.lowestPrice)) : null, stationCount: metric.stationCount };
  }).filter((point): point is OilHistoryPoint => Boolean(point));
  const sliced = rows.slice(-Math.max(days, 1));
  if (sliced.length >= 2) return sliced;
  const first = data.stations[0];
  if (!first) return [];
  return first.trend.map((value, index) => ({ date: index === first.trend.length - 1 ? '현재' : `${first.trend.length - index - 1}일 전`, averagePrice: value, lowestPrice: null, stationCount: data.stations.length }));
}

function trendFor(price: number, index: number): number[] {
  return [price + 24 + index, price + 20 + index, price + 17 + index, price + 12, price + 8, price + 4, price].map(Math.round);
}

function mapStation(item: SourceStation, index: number, averagePrice: number, fuel: string, region = '서울'): Station | null {
  const price = safeNumber(item.price, 0);
  const name = String(item.name ?? '').trim();
  if (!name || price <= 0) return null;
  return {
    id: String(item.id ?? `${fuel}-${name}-${index}`),
    name,
    brand: String(item.brand ?? '브랜드 확인'),
    address: String(item.address ?? '주소 확인'),
    distance: safeNumber(item.distance, 0),
    price,
    avgDiff: Math.round(price - averagePrice),
    lat: safeNumber(item.latitude, 0),
    lng: safeNumber(item.longitude, 0),
    trend: trendFor(price, index),
    favorite: false,
    fuel: (fuel === '경유' || fuel === 'LPG' ? fuel : '휘발유') as Station['fuel'],
    region,
  };
}

function buildMetrics(stations: Station[], averagePrice: number, fuel = '휘발유', region = '서울'): typeof metricTemplates {
  const best = stations[0];
  const saving = best ? Math.round(Math.max(0, averagePrice - best.price)) : 0;
  return [
    { ...metricTemplates[0], value: best ? `${best.price.toLocaleString()}원/L` : '가격 확인', sub: best?.name ?? '확인 예정' },
    { ...metricTemplates[1], value: best && saving > 0 ? `${(saving * 50).toLocaleString()}원` : '절약액 확인', sub: best && saving > 0 ? `평균 대비 ${saving.toLocaleString()}원 낮음` : '평균가 확인 예정' },
    { ...metricTemplates[2], value: averagePrice ? `${Math.round(averagePrice).toLocaleString()}원` : '평균가 확인', sub: `${region} ${fuel}` },
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

function buildWidgets(stations: Station[], averagePrice: number, fuel = '휘발유', region = '서울'): typeof defaultWidgets {
  if (!stations.length) return [];
  const best = stations[0];
  const saving = Math.round(Math.max(0, averagePrice - best.price));
  return [
    { title: `${region} ${fuel} 저가`, action: '주유소 찾기', items: stations.slice(0, 3).map((station) => `${station.name} ${station.price.toLocaleString()}원`) },
    { title: '절약 계산', action: '주유 기록', items: [40, 50, 60].map((liter) => `${liter}L ${(liter * saving).toLocaleString()}원 절약`) },
    { title: '가격 흐름', action: '가격 추이', items: stations.slice(0, 3).map((station) => `${station.name.slice(0, 8)} ${station.trend[station.trend.length - 1] - station.trend[0]}원`) },
  ];
}

function buildRegionRows(datasets: SourceDataset[] = [], fuel?: string): RegionFuelRow[] {
  return datasets.filter((dataset) => !fuel || dataset.fuelName === fuel).map((dataset, index) => {
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

function createFuelView(fuel: string, datasets: SourceDataset[], region = '서울'): FuelView | null {
  const dataset = datasets.find((item) => item.regionName === region && item.fuelName === fuel) ?? datasets.find((item) => item.regionName === '서울' && item.fuelName === fuel) ?? datasets.find((item) => item.fuelName === fuel);
  if (!dataset) return null;
  const rawAveragePrice = safeNumber(dataset.averagePrice, 0);
  const sourceStations = dataset.stations ?? [];
  const stationPrices = sourceStations.map((station) => safeNumber(station.price, 0)).filter((price) => price > 0);
  const averagePrice = rawAveragePrice || (stationPrices.length ? Math.round(stationPrices.reduce((sum, price) => sum + price, 0) / stationPrices.length) : 0);
  const regionName = String(dataset.regionName ?? region);
  const stations = sourceStations.map((station, index) => mapStation(station, index, averagePrice, fuel, regionName)).filter((station): station is Station => Boolean(station)).sort((a, b) => a.price - b.price).slice(0, 12);
  if (!stations.length || !averagePrice) return null;
  return { fuel, region: regionName, stations, metrics: buildMetrics(stations, averagePrice, fuel, regionName), widgets: buildWidgets(stations, averagePrice, fuel, regionName), brandBars: buildBrandBars(stations), regionRows: buildRegionRows(datasets, fuel), averagePrice };
}

const DEFAULT_REGION_ROWS: RegionFuelRow[] = [
  {
    "id": "서울-휘발유",
    "region": "서울",
    "fuel": "휘발유",
    "avg": 2051,
    "low": 1979,
    "stationCount": 6
  },
  {
    "id": "서울-경유",
    "region": "서울",
    "fuel": "경유",
    "avg": 2040,
    "low": 2012,
    "stationCount": 4
  },
  {
    "id": "서울-LPG",
    "region": "서울",
    "fuel": "LPG",
    "avg": 1167,
    "low": 1139,
    "stationCount": 4
  },
  {
    "id": "경기-휘발유",
    "region": "경기",
    "fuel": "휘발유",
    "avg": 2009,
    "low": 1981,
    "stationCount": 4
  },
  {
    "id": "경기-경유",
    "region": "경기",
    "fuel": "경유",
    "avg": 2004,
    "low": 1976,
    "stationCount": 4
  },
  {
    "id": "경기-LPG",
    "region": "경기",
    "fuel": "LPG",
    "avg": 1108,
    "low": 1080,
    "stationCount": 4
  },
  {
    "id": "강원-휘발유",
    "region": "강원",
    "fuel": "휘발유",
    "avg": 2019,
    "low": 1991,
    "stationCount": 4
  },
  {
    "id": "강원-경유",
    "region": "강원",
    "fuel": "경유",
    "avg": 2013,
    "low": 1985,
    "stationCount": 4
  },
  {
    "id": "강원-LPG",
    "region": "강원",
    "fuel": "LPG",
    "avg": 1137,
    "low": 1109,
    "stationCount": 4
  },
  {
    "id": "충북-휘발유",
    "region": "충북",
    "fuel": "휘발유",
    "avg": 2015,
    "low": 1987,
    "stationCount": 4
  },
  {
    "id": "충북-경유",
    "region": "충북",
    "fuel": "경유",
    "avg": 2010,
    "low": 1982,
    "stationCount": 4
  },
  {
    "id": "충북-LPG",
    "region": "충북",
    "fuel": "LPG",
    "avg": 1099,
    "low": 1071,
    "stationCount": 4
  },
  {
    "id": "충남-휘발유",
    "region": "충남",
    "fuel": "휘발유",
    "avg": 2015,
    "low": 1987,
    "stationCount": 4
  },
  {
    "id": "충남-경유",
    "region": "충남",
    "fuel": "경유",
    "avg": 2009,
    "low": 1981,
    "stationCount": 4
  },
  {
    "id": "충남-LPG",
    "region": "충남",
    "fuel": "LPG",
    "avg": 1113,
    "low": 1085,
    "stationCount": 4
  },
  {
    "id": "전북-휘발유",
    "region": "전북",
    "fuel": "휘발유",
    "avg": 2006,
    "low": 1978,
    "stationCount": 4
  },
  {
    "id": "전북-경유",
    "region": "전북",
    "fuel": "경유",
    "avg": 2003,
    "low": 1975,
    "stationCount": 4
  },
  {
    "id": "전북-LPG",
    "region": "전북",
    "fuel": "LPG",
    "avg": 1071,
    "low": 1043,
    "stationCount": 4
  },
  {
    "id": "전남-휘발유",
    "region": "전남",
    "fuel": "휘발유",
    "avg": 2015,
    "low": 1987,
    "stationCount": 4
  },
  {
    "id": "전남-경유",
    "region": "전남",
    "fuel": "경유",
    "avg": 2011,
    "low": 1983,
    "stationCount": 4
  },
  {
    "id": "전남-LPG",
    "region": "전남",
    "fuel": "LPG",
    "avg": 1119,
    "low": 1091,
    "stationCount": 4
  },
  {
    "id": "경북-휘발유",
    "region": "경북",
    "fuel": "휘발유",
    "avg": 2004,
    "low": 1976,
    "stationCount": 4
  },
  {
    "id": "경북-경유",
    "region": "경북",
    "fuel": "경유",
    "avg": 1998,
    "low": 1970,
    "stationCount": 4
  },
  {
    "id": "경북-LPG",
    "region": "경북",
    "fuel": "LPG",
    "avg": 1097,
    "low": 1069,
    "stationCount": 4
  },
  {
    "id": "경남-휘발유",
    "region": "경남",
    "fuel": "휘발유",
    "avg": 2002,
    "low": 1974,
    "stationCount": 4
  },
  {
    "id": "경남-경유",
    "region": "경남",
    "fuel": "경유",
    "avg": 1999,
    "low": 1971,
    "stationCount": 4
  },
  {
    "id": "경남-LPG",
    "region": "경남",
    "fuel": "LPG",
    "avg": 1089,
    "low": 1061,
    "stationCount": 4
  },
  {
    "id": "부산-휘발유",
    "region": "부산",
    "fuel": "휘발유",
    "avg": 1995,
    "low": 1967,
    "stationCount": 4
  },
  {
    "id": "부산-경유",
    "region": "부산",
    "fuel": "경유",
    "avg": 1990,
    "low": 1962,
    "stationCount": 4
  },
  {
    "id": "부산-LPG",
    "region": "부산",
    "fuel": "LPG",
    "avg": 1102,
    "low": 1074,
    "stationCount": 4
  },
  {
    "id": "제주-휘발유",
    "region": "제주",
    "fuel": "휘발유",
    "avg": 2027,
    "low": 1999,
    "stationCount": 4
  },
  {
    "id": "제주-경유",
    "region": "제주",
    "fuel": "경유",
    "avg": 2019,
    "low": 1991,
    "stationCount": 4
  },
  {
    "id": "제주-LPG",
    "region": "제주",
    "fuel": "LPG",
    "avg": 1142,
    "low": 1114,
    "stationCount": 4
  },
  {
    "id": "대구-휘발유",
    "region": "대구",
    "fuel": "휘발유",
    "avg": 1990,
    "low": 1962,
    "stationCount": 4
  },
  {
    "id": "대구-경유",
    "region": "대구",
    "fuel": "경유",
    "avg": 1984,
    "low": 1956,
    "stationCount": 4
  },
  {
    "id": "대구-LPG",
    "region": "대구",
    "fuel": "LPG",
    "avg": 1128,
    "low": 1100,
    "stationCount": 4
  },
  {
    "id": "인천-휘발유",
    "region": "인천",
    "fuel": "휘발유",
    "avg": 2007,
    "low": 1979,
    "stationCount": 4
  },
  {
    "id": "인천-경유",
    "region": "인천",
    "fuel": "경유",
    "avg": 2003,
    "low": 1975,
    "stationCount": 4
  },
  {
    "id": "인천-LPG",
    "region": "인천",
    "fuel": "LPG",
    "avg": 1103,
    "low": 1075,
    "stationCount": 4
  },
  {
    "id": "광주-휘발유",
    "region": "광주",
    "fuel": "휘발유",
    "avg": 1999,
    "low": 1971,
    "stationCount": 4
  },
  {
    "id": "광주-경유",
    "region": "광주",
    "fuel": "경유",
    "avg": 1996,
    "low": 1968,
    "stationCount": 4
  },
  {
    "id": "광주-LPG",
    "region": "광주",
    "fuel": "LPG",
    "avg": 1112,
    "low": 1084,
    "stationCount": 4
  },
  {
    "id": "대전-휘발유",
    "region": "대전",
    "fuel": "휘발유",
    "avg": 1999,
    "low": 1971,
    "stationCount": 4
  },
  {
    "id": "대전-경유",
    "region": "대전",
    "fuel": "경유",
    "avg": 1996,
    "low": 1968,
    "stationCount": 4
  },
  {
    "id": "대전-LPG",
    "region": "대전",
    "fuel": "LPG",
    "avg": 1086,
    "low": 1058,
    "stationCount": 4
  },
  {
    "id": "울산-휘발유",
    "region": "울산",
    "fuel": "휘발유",
    "avg": 1993,
    "low": 1965,
    "stationCount": 4
  },
  {
    "id": "울산-경유",
    "region": "울산",
    "fuel": "경유",
    "avg": 1993,
    "low": 1965,
    "stationCount": 4
  },
  {
    "id": "울산-LPG",
    "region": "울산",
    "fuel": "LPG",
    "avg": 1119,
    "low": 1091,
    "stationCount": 4
  },
  {
    "id": "세종-휘발유",
    "region": "세종",
    "fuel": "휘발유",
    "avg": 2005,
    "low": 1977,
    "stationCount": 4
  },
  {
    "id": "세종-경유",
    "region": "세종",
    "fuel": "경유",
    "avg": 2004,
    "low": 1976,
    "stationCount": 4
  },
  {
    "id": "세종-LPG",
    "region": "세종",
    "fuel": "LPG",
    "avg": 1112,
    "low": 1084,
    "stationCount": 4
  }
];
const defaultGasView: FuelView = { fuel: '휘발유', region: '서울', stations: defaultStations, metrics: buildMetrics(defaultStations, 2051, '휘발유', '서울'), widgets: defaultWidgets, brandBars: defaultBrandBars, regionRows: DEFAULT_REGION_ROWS.filter((row) => row.fuel === '휘발유'), averagePrice: 2051 };
const defaultDieselStations: Station[] = defaultStations.slice(0, 4).map((station, index) => ({ ...station, id: `diesel-${index}`, name: station.name.replace('휘발유', '경유'), price: station.price - 12, avgDiff: station.avgDiff - 3, trend: trendFor(station.price - 12, index), favorite: false, fuel: '경유' as Station['fuel'], region: '서울' }));
const defaultLpgStations: Station[] = defaultStations.slice(0, 4).map((station, index) => ({ ...station, id: `lpg-${index}`, name: station.name.replace('휘발유', 'LPG'), price: 1139 + index * 14, avgDiff: -28 + index * 14, trend: trendFor(1139 + index * 14, index), favorite: false, fuel: 'LPG' as Station['fuel'], region: '서울' }));
const defaultFuelViews: FuelView[] = [
  defaultGasView,
  { fuel: '경유', region: '서울', stations: defaultDieselStations, metrics: buildMetrics(defaultDieselStations, 2040, '경유', '서울'), widgets: buildWidgets(defaultDieselStations, 2040, '경유', '서울'), brandBars: buildBrandBars(defaultDieselStations), regionRows: DEFAULT_REGION_ROWS.filter((row) => row.fuel === '경유'), averagePrice: 2040 },
  { fuel: 'LPG', region: '서울', stations: defaultLpgStations, metrics: buildMetrics(defaultLpgStations, 1167, 'LPG', '서울'), widgets: buildWidgets(defaultLpgStations, 1167, 'LPG', '서울'), brandBars: buildBrandBars(defaultLpgStations), regionRows: DEFAULT_REGION_ROWS.filter((row) => row.fuel === 'LPG'), averagePrice: 1167 },
];
const DEFAULT_LITER_DATA: LiterData = { ...defaultGasView, records: defaultRecords, fuelNews: defaultFuelNews, aiReport: DEFAULT_AI_REPORT, fuelOptions: defaultFuelViews.map((view) => view.fuel), fuelViews: defaultFuelViews, selectedFuel: '휘발유', sourceLoaded: true, historySnapshots: DEFAULT_HISTORY_SNAPSHOTS, globalOil: DEFAULT_GLOBAL_OIL };

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
  { source: '리터세이브', date: '06.10', keyword: 'LPG' },
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
function buildAiReport(reportJson: SourceAiReportResponse | null): LiterAiReport | null {
  const report = reportJson?.report;
  if (!report) return null;
  const headline = cleanText(report.headline);
  if (!headline) return null;
  return {
    headline,
    daily: cleanText(report.daily) || '일간 흐름 확인 중입니다.',
    weekly: cleanText(report.weekly) || '주간 흐름 확인 중입니다.',
    monthly: cleanText(report.monthly) || '월간 흐름 확인 중입니다.',
    consumerTip: cleanText(report.consumerTip) || '가격과 거리 조건을 함께 비교하세요.',
    note: cleanText(report.note) || '공개 유가 데이터 기반 참고용 리포트입니다.',
    sourceLabel: reportJson?.model ? '자동 요약' : '유가 리포트',
  };
}

function buildLiterData(json: SourceOilResponse | null, newsJson: SourceNewsResponse | null, reportJson: SourceAiReportResponse | null, historyJson: SourceOilHistoryResponse | null, globalJson: SourceGlobalOilResponse | null): LiterData {
  const fuelOrder = ['휘발유', '경유', 'LPG'];
  const datasets = json?.datasets ?? [];
  const regions = [...new Set(datasets.map((dataset) => dataset.regionName).filter((region): region is string => Boolean(region)))];
  const views = fuelOrder.flatMap((fuel) => regions.map((region) => createFuelView(fuel, datasets, region)).filter((view): view is FuelView => Boolean(view)));
  const newsItems = buildFuelNews(newsJson);
  const aiReport = buildAiReport(reportJson);
  const historySnapshots = buildHistorySnapshots(historyJson);
  const globalOil = buildGlobalOil(globalJson);
  if (!views.length) return { ...DEFAULT_LITER_DATA, fuelNews: newsItems.length ? newsItems : defaultFuelNews, aiReport, historySnapshots, globalOil };
  const primary = views[0];
  return { ...primary, records: defaultRecords, fuelNews: newsItems.length ? newsItems : defaultFuelNews, aiReport, fuelOptions: fuelOrder.filter((fuel) => views.some((view) => view.fuel === fuel)), fuelViews: views, selectedFuel: primary.fuel, sourceLoaded: true, historySnapshots, globalOil };
}

function buildNationalFuelView(data: LiterData, fuel: string): FuelView | null {
  const views = data.fuelViews.filter((item) => item.fuel === fuel && item.region !== '전국');
  if (!views.length) return null;
  const avgValues = views.map((view) => view.averagePrice).filter((value) => value > 0);
  const averagePrice = avgValues.length ? Math.round(avgValues.reduce((sum, value) => sum + value, 0) / avgValues.length) : 0;
  const stations = views.map((view, index) => {
    const best = view.stations[0];
    if (!best) return null;
    return {
      ...best,
      id: `national-${fuel}-${view.region}`,
      name: `${view.region} ${fuel} 저가 기준`,
      brand: view.region,
      address: '지역별 저가 기준',
      distance: Number((1.2 + index * 0.3).toFixed(1)),
      avgDiff: Math.round(best.price - averagePrice),
      trend: trendFor(best.price, index),
      favorite: false,
      region: '전국',
    };
  }).filter((station): station is Station => Boolean(station)).sort((a, b) => a.price - b.price).slice(0, 12);
  if (!stations.length || !averagePrice) return null;
  const regionRows = data.regionRows.filter((row) => row.fuel === fuel);
  return { fuel, region: '전국', stations, metrics: buildMetrics(stations, averagePrice, fuel, '전국'), widgets: buildWidgets(stations, averagePrice, fuel, '전국'), brandBars: buildBrandBars(stations), regionRows, averagePrice };
}

export function getFuelView(data: LiterData, fuel: string, region = '서울'): LiterData {
  const view = region === '전국'
    ? buildNationalFuelView(data, fuel) ?? data.fuelViews.find((item) => item.fuel === fuel)
    : data.fuelViews.find((item) => item.fuel === fuel && item.region === region) ?? data.fuelViews.find((item) => item.fuel === fuel) ?? data.fuelViews[0];
  if (!view) return data;
  return { ...data, ...view, records: data.records, fuelNews: data.fuelNews, aiReport: data.aiReport, fuelOptions: data.fuelOptions, fuelViews: data.fuelViews, selectedFuel: view.fuel, sourceLoaded: data.sourceLoaded, historySnapshots: data.historySnapshots, globalOil: data.globalOil };
}

export const selectFuelData = getFuelView;

export function useProjectData(reloadKey: number): LiterData {
  const [data, setData] = useState<LiterData>(DEFAULT_LITER_DATA);
  useEffect(() => {
    const version = import.meta.env.VITE_DATA_VERSION ?? String(reloadKey);
    const base = import.meta.env.BASE_URL || '/';
    Promise.all([
      fetch(`${base}data/oil-prices.json?v=${version}`, { cache: 'no-store' }).then((response) => response.ok ? response.json() as Promise<SourceOilResponse> : null).catch(() => null),
      fetch(`${base}data/fuel-news.json?v=${version}`, { cache: 'no-store' }).then((response) => response.ok ? response.json() as Promise<SourceNewsResponse> : null).catch(() => null),
      fetch(`${base}data/oil-ai-report.json?v=${version}`, { cache: 'no-store' }).then((response) => response.ok ? response.json() as Promise<SourceAiReportResponse> : null).catch(() => null),
      fetch(`${base}data/oil-history.json?v=${version}`, { cache: 'no-store' }).then((response) => response.ok ? response.json() as Promise<SourceOilHistoryResponse> : null).catch(() => null),
      fetch(`${base}data/global-oil.json?v=${version}`, { cache: 'no-store' }).then((response) => response.ok ? response.json() as Promise<SourceGlobalOilResponse> : null).catch(() => null),
    ])
      .then(([json, newsJson, reportJson, historyJson, globalJson]) => setData(buildLiterData(json, newsJson, reportJson, historyJson, globalJson)))
      .catch(() => setData(DEFAULT_LITER_DATA));
  }, [reloadKey]);
  return data;
}
