import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import proj4 from 'proj4';

const OUTPUT_PATH = path.resolve('public/data/oil-prices.json');
const HISTORY_PATH = path.resolve('public/data/oil-history.json');
const API_BASE = String(process.env.OPINET_API_BASE || 'http://www.opinet.co.kr/api').trim();
const RAW_KEY = process.env.OPINET_CERT_KEY || process.env.OPINET_API_KEY || '';
const API_KEY = String(RAW_KEY).trim().replace(/^['"]|['"]$/g, '');
const COUNT = Number(process.env.OPINET_COUNT || 20);
const FORCED_AUTH_PARAM = String(process.env.OPINET_AUTH_PARAM || '').trim();
const HISTORY_RETENTION_DAYS = Math.max(30, Number(process.env.HISTORY_RETENTION_DAYS || 90));

const DEFAULT_FUELS = [
  { code: 'B027', name: '휘발유' },
  { code: 'D047', name: '경유' },
];

const DEFAULT_REGIONS = [
  { code: 'ALL', name: '전국' },
  { code: '01', name: '서울' },
  { code: '02', name: '경기' },
  { code: '03', name: '강원' },
  { code: '04', name: '충북' },
  { code: '05', name: '충남' },
  { code: '06', name: '전북' },
  { code: '07', name: '전남' },
  { code: '08', name: '경북' },
  { code: '09', name: '경남' },
  { code: '10', name: '부산' },
  { code: '11', name: '제주' },
  { code: '14', name: '대구' },
  { code: '15', name: '인천' },
  { code: '16', name: '광주' },
  { code: '17', name: '대전' },
  { code: '18', name: '울산' },
  { code: '19', name: '세종' },
];

const BRAND_NAMES = {
  SKE: 'SK에너지',
  GSC: 'GS칼텍스',
  HDO: '현대오일뱅크',
  SOL: 'S-OIL',
  RTE: '자영알뜰',
  RTX: '고속도로알뜰',
  NHO: '농협알뜰',
  ETC: '자가상표',
  E1G: 'E1',
  SKG: 'SK가스',
};

const KATEC_CRS = '+proj=tmerc +lat_0=38 +lon_0=128 +k=0.9999 +x_0=400000 +y_0=600000 +ellps=bessel +towgs84=-146.43,507.89,681.46,0,0,0,0 +units=m +no_defs';
const WGS84_CRS = 'WGS84';

function parsePairs(value, fallback) {
  if (!value || !String(value).trim()) return fallback;
  return String(value)
    .split(',')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [code, name] = pair.split(':');
      return {
        code: code?.trim() ?? '',
        name: name?.trim() || code?.trim() || '이름 없음',
      };
    })
    .filter((pair) => pair.code);
}

function buildApiUrl(endpoint, params = {}, strategy = 'code') {
  const url = new URL(`${API_BASE}/${endpoint}`);
  url.searchParams.set('out', 'json');

  if (API_KEY) {
    if (strategy === 'code' || strategy === 'both') {
      url.searchParams.set('code', API_KEY);
    }
    if (strategy === 'certkey' || strategy === 'both') {
      url.searchParams.set('certkey', API_KEY);
    }
  }

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

function redactUrl(url) {
  const clone = new URL(url.toString());
  if (clone.searchParams.has('code')) clone.searchParams.set('code', '[REDACTED]');
  if (clone.searchParams.has('certkey')) clone.searchParams.set('certkey', '[REDACTED]');
  return clone.toString();
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json,text/plain,*/*',
      'User-Agent': 'liter-save-build/2.0',
    },
    redirect: 'follow',
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${redactUrl(url)} | ${text.slice(0, 300)}`);
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`JSON 파싱 실패: ${redactUrl(url)} | ${text.slice(0, 300)}`);
  }
}

function extractOilItems(raw) {
  const direct = raw?.RESULT?.OIL ?? raw?.OIL;
  if (Array.isArray(direct)) return direct;
  if (direct && typeof direct === 'object') return [direct];
  return [];
}

function summarizeRaw(raw) {
  return {
    topLevelKeys: raw && typeof raw === 'object' ? Object.keys(raw) : [],
    resultKeys: raw?.RESULT && typeof raw.RESULT === 'object' ? Object.keys(raw.RESULT) : [],
    oilLength: Array.isArray(raw?.RESULT?.OIL) ? raw.RESULT.OIL.length : Array.isArray(raw?.OIL) ? raw.OIL.length : null,
  };
}

async function requestWithFallback(endpoint, params, label, requiredKeys = []) {
  const strategies = FORCED_AUTH_PARAM ? [FORCED_AUTH_PARAM] : ['code', 'certkey', 'both'];
  const diagnostics = [];

  for (const strategy of strategies) {
    const url = buildApiUrl(endpoint, params, strategy);
    try {
      const raw = await fetchJson(url);
      const items = extractOilItems(raw).filter((item) => (
        requiredKeys.length === 0 || requiredKeys.every((key) => key in Object(item))
      ));
      diagnostics.push({ strategy, count: items.length, summary: summarizeRaw(raw), url: redactUrl(url) });

      if (items.length > 0) {
        console.log(`${label}: ${strategy} 방식 성공 (${items.length}건)`);
        return { items, raw, strategy, diagnostics };
      }
    } catch (error) {
      diagnostics.push({ strategy, error: error.message, url: redactUrl(url) });
    }
  }

  const message = diagnostics.map((item) => JSON.stringify(item)).join('\n');
  throw new Error(`${label} 응답이 비어 있습니다. 시도 결과:\n${message}`);
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function convertKatecToWgs84(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return { latitude: null, longitude: null };
  }

  try {
    const [longitude, latitude] = proj4(KATEC_CRS, WGS84_CRS, [x, y]);
    return {
      latitude: Number.isFinite(latitude) ? Number(latitude.toFixed(7)) : null,
      longitude: Number.isFinite(longitude) ? Number(longitude.toFixed(7)) : null,
    };
  } catch (error) {
    console.warn(`좌표 변환 실패: ${error.message}`);
    return { latitude: null, longitude: null };
  }
}

function normalizeStation(item) {
  const brandCode = item.POLL_DIV_CD ?? item.POLL_DIV_CO ?? '';
  const katecX = toNumber(item.GIS_X_COOR);
  const katecY = toNumber(item.GIS_Y_COOR);
  const { latitude, longitude } = convertKatecToWgs84(katecX, katecY);

  return {
    id: String(item.UNI_ID ?? ''),
    name: String(item.OS_NM ?? '이름 없음'),
    brand: BRAND_NAMES[brandCode] ?? String(brandCode || '브랜드 미상'),
    brandCode: String(brandCode || ''),
    price: Number(item.PRICE ?? 0),
    address: String(item.VAN_ADR ?? ''),
    roadAddress: String(item.NEW_ADR ?? ''),
    katecX,
    katecY,
    latitude,
    longitude,
  };
}

async function fetchRegions() {
  const configured = parsePairs(process.env.OPINET_REGIONS, null);
  if (configured) {
    console.log(`사용자 지정 지역 사용: ${configured.map((item) => item.name).join(', ')}`);
    return configured;
  }

  try {
    const { items } = await requestWithFallback('areaCode.do', {}, '지역코드 조회', ['AREA_CD', 'AREA_NM']);
    const officialRegions = items
      .map((item) => ({ code: String(item.AREA_CD ?? ''), name: String(item.AREA_NM ?? '') }))
      .filter((item) => item.code && item.name);

    if (officialRegions.length > 0) {
      return [{ code: 'ALL', name: '전국' }, ...officialRegions];
    }
  } catch (error) {
    console.warn(`${error.message}\n→ 지역코드 API 대신 내장 전국/시도 목록을 사용합니다.`);
  }

  return DEFAULT_REGIONS;
}

async function fetchLowestStations({ region, fuel }) {
  const params = {
    prodcd: fuel.code,
    cnt: String(Math.min(Math.max(COUNT, 1), 20)),
    area: region.code && region.code !== 'ALL' ? region.code : undefined,
  };

  const { items } = await requestWithFallback(
    'lowTop10.do',
    params,
    `${region.name} / ${fuel.name} 최저가 조회`,
    ['UNI_ID', 'PRICE', 'OS_NM'],
  );

  return items
    .map(normalizeStation)
    .filter((station) => station.id && station.price > 0)
    .sort((a, b) => a.price - b.price);
}

function createWaitingPayload() {
  return {
    mode: 'not-configured',
    source: 'waiting',
    generatedAt: null,
    notice: '데이터연동대기',
    datasets: [],
  };
}

function createEmptyHistoryPayload() {
  return {
    mode: 'history',
    generatedAt: null,
    retentionDays: HISTORY_RETENTION_DAYS,
    notice: '차트 데이터가 아직 없습니다.',
    snapshots: [],
  };
}

async function readJsonOrDefault(filePath, fallbackValue) {
  try {
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return fallbackValue;
  }
}

function getPriceSummary(stations = []) {
  const prices = stations.map((station) => Number(station.price)).filter((price) => Number.isFinite(price) && price > 0);
  if (prices.length === 0) {
    return { lowestPrice: null, averagePrice: null, stationCount: 0 };
  }

  const total = prices.reduce((sum, price) => sum + price, 0);
  return {
    lowestPrice: Math.min(...prices),
    averagePrice: Math.round(total / prices.length),
    stationCount: prices.length,
  };
}

function buildHistoryMetrics(datasets = []) {
  return datasets.map((dataset) => {
    const summary = getPriceSummary(dataset.stations);
    return {
      regionCode: dataset.regionCode,
      regionName: dataset.regionName,
      fuelCode: dataset.fuelCode,
      fuelName: dataset.fuelName,
      lowestPrice: summary.lowestPrice,
      averagePrice: summary.averagePrice,
      stationCount: summary.stationCount,
    };
  });
}

function getSeoulSlotKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );

  const hour = Number(parts.hour || 0);
  const slot = hour < 12 ? 'AM' : 'PM';
  return `${parts.year}-${parts.month}-${parts.day}-${slot}`;
}

function mergeHistory(existingHistory, snapshot) {
  const existingSnapshots = Array.isArray(existingHistory?.snapshots)
    ? existingHistory.snapshots.filter((item) => item?.capturedAt && Array.isArray(item?.metrics))
    : [];

  const nextSlotKey = getSeoulSlotKey(snapshot.capturedAt);
  const withoutSameSlot = existingSnapshots.filter((item) => getSeoulSlotKey(item.capturedAt) !== nextSlotKey);
  const merged = [...withoutSameSlot, snapshot].sort((left, right) => new Date(left.capturedAt) - new Date(right.capturedAt));
  const cutoff = Date.now() - HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const retained = merged.filter((item) => {
    const timestamp = new Date(item.capturedAt).getTime();
    return Number.isFinite(timestamp) && timestamp >= cutoff;
  });

  return {
    mode: 'history',
    generatedAt: snapshot.capturedAt,
    retentionDays: HISTORY_RETENTION_DAYS,
    notice: '오전 6시와 오후 6시에 수집된 가격 데이터를 누적해 표시합니다.',
    snapshots: retained,
  };
}

async function writeWaitingFiles() {
  await writeFile(OUTPUT_PATH, JSON.stringify(createWaitingPayload(), null, 2));

  const existingHistory = await readJsonOrDefault(HISTORY_PATH, null);
  if (existingHistory) {
    await writeFile(HISTORY_PATH, JSON.stringify(existingHistory, null, 2));
  } else {
    await writeFile(HISTORY_PATH, JSON.stringify(createEmptyHistoryPayload(), null, 2));
  }

  console.log('데이터연동대기 상태 파일을 생성했습니다.');
}

async function main() {
  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await mkdir(path.dirname(HISTORY_PATH), { recursive: true });

  if (!API_KEY) {
    await writeWaitingFiles();
    return;
  }

  const fuels = parsePairs(process.env.OPINET_FUELS, DEFAULT_FUELS);
  const regions = await fetchRegions();
  const datasets = [];

  console.log(`API_BASE=${API_BASE}`);
  console.log(`연료 ${fuels.length}개, 지역 ${regions.length}개 기준으로 수집을 시작합니다.`);

  for (const region of regions) {
    for (const fuel of fuels) {
      try {
        const stations = await fetchLowestStations({ region, fuel });
        if (stations.length > 0) {
          datasets.push({
            regionCode: region.code,
            regionName: region.name,
            fuelCode: fuel.code,
            fuelName: fuel.name,
            stations,
          });
        }
        console.log(`${region.name} / ${fuel.name}: ${stations.length}개 수집`);
      } catch (error) {
        console.warn(`${region.name} / ${fuel.name} 수집 실패: ${error.message}`);
      }
    }
  }

  const totalStations = datasets.reduce((sum, dataset) => sum + dataset.stations.length, 0);
  if (totalStations === 0) {
    throw new Error('오피넷 데이터 수집 결과가 비어 있습니다. npm run opinet:test 로 먼저 avgAllPrice/areaCode/lowTop10 응답을 점검해주세요.');
  }

  const generatedAt = new Date().toISOString();
  const payload = {
    mode: 'opinet',
    source: '한국석유공사 오피넷 Open API',
    generatedAt,
    notice: '한국석유공사 오피넷 Open API 기준 데이터입니다. 실제 판매 가격과 차이가 있을 수 있습니다.',
    datasets,
  };

  const existingHistory = await readJsonOrDefault(HISTORY_PATH, createEmptyHistoryPayload());
  const nextHistory = mergeHistory(existingHistory, {
    capturedAt: generatedAt,
    metrics: buildHistoryMetrics(datasets),
  });

  await writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2));
  await writeFile(HISTORY_PATH, JSON.stringify(nextHistory, null, 2));
  console.log(`데이터 파일 생성 완료: ${OUTPUT_PATH}`);
  console.log(`차트 누적 파일 생성 완료: ${HISTORY_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
