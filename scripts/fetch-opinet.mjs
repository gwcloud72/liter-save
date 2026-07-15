import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let optionalProj4 = null;
try {
 optionalProj4 = require('proj4');
} catch {
 optionalProj4 = null;
}
const projectCoordinate = optionalProj4?.default ?? optionalProj4;

const OUTPUT_PATH = path.resolve('public/data/oil-prices.json');
const HISTORY_PATH = path.resolve('public/data/oil-history.json');
const API_BASE = String(process.env.OPINET_API_BASE || 'http://www.opinet.co.kr/api').trim();
const RAW_KEY = process.env.OPINET_CERT_KEY || process.env.OPINET_API_KEY || '';
const API_KEY = String(RAW_KEY).trim().replace(/^['"]|['"]$/g, '');
const WAITING_FALLBACK = ['true', '1', 'yes', 'on'].includes(String(process.env.OPINET_WAITING_FALLBACK || '').toLowerCase());
function parseInteger(value, fallback, { min = -Infinity, max = Infinity } = {}) {
 if (value === undefined || value === null || String(value).trim() === '') return fallback;
 const parsed = Number(value);
 if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
  throw new Error(`정수 환경변수 범위 오류: value=${value}, range=${min}~${max}`);
 }
 return parsed;
}

const COUNT = parseInteger(process.env.OPINET_COUNT, 20, { min: 1, max: 20 });
const FORCED_AUTH_PARAM = String(process.env.OPINET_AUTH_PARAM || '').trim();
const HISTORY_RETENTION_DAYS = parseInteger(process.env.HISTORY_RETENTION_DAYS, 90, { min: 30, max: 730 });
const REQUEST_TIMEOUT_MS = parseInteger(process.env.OPINET_REQUEST_TIMEOUT_MS, 15000, { min: 1000, max: 60000 });
const REQUEST_PAUSE_MS = parseInteger(process.env.OPINET_REQUEST_PAUSE_MS, 800, { min: 0, max: 10000 });
const REQUEST_MAX_RETRIES = parseInteger(process.env.OPINET_REQUEST_MAX_RETRIES, 3, { min: 0, max: 6 });
const REQUEST_RETRY_BASE_MS = parseInteger(process.env.OPINET_REQUEST_RETRY_BASE_MS, 1200, { min: 100, max: 30000 });
const RATE_LIMIT_MAX_REQUESTS = parseInteger(process.env.OPINET_RATE_LIMIT_MAX_REQUESTS, 18, { min: 1, max: 100 });
const RATE_LIMIT_WINDOW_MS = parseInteger(process.env.OPINET_RATE_LIMIT_WINDOW_MS, 60000, { min: 1000, max: 300000 });
const EMPTY_RESPONSE_COOLDOWN_MS = parseInteger(process.env.OPINET_EMPTY_RESPONSE_COOLDOWN_MS, 65000, { min: 0, max: 300000 });
const FALLBACK_MAX_AGE_HOURS = parseInteger(process.env.OPINET_FALLBACK_MAX_AGE_HOURS, 24, { min: 1, max: 168 });
let lastRequestStartedAt = 0;
const requestWindow = [];

const DEFAULT_FUELS = [
 { code: 'B027', name: '휘발유' },
 { code: 'D047', name: '경유' },
 { code: 'K015', name: 'LPG' },
];

const DEFAULT_REGIONS = [
 { code: 'ALL', name: '전국' },
 { code: '01', name: '서울' },
 { code: '02', name: '경기' },
 { code: '03', name: '강원' },
 { code: '04', name: '충북' },
 { code: '05', name: '충남' },
 { code: '06', name: '전북' },
 { code: '08', name: '경북' },
 { code: '09', name: '경남' },
 { code: '10', name: '부산' },
 { code: '11', name: '제주' },
 { code: '14', name: '대구' },
 { code: '15', name: '인천' },
 { code: '17', name: '대전' },
 { code: '18', name: '울산' },
 { code: '19', name: '세종' },
 { code: '20', name: '전남광주' },
];

const LEGACY_REGION_CODES = new Set(['07', '16']);
const REQUIRED_FUEL_CODES = DEFAULT_FUELS.map((fuel) => fuel.code);

function ensureFuelCoverage(fuels = []) {
 const incoming = new Map((Array.isArray(fuels) ? fuels : [])
  .map((fuel) => normalizePair(fuel))
  .filter((fuel) => fuel.code)
  .map((fuel) => [fuel.code, fuel]));
 return DEFAULT_FUELS.map((fuel) => ({ ...fuel, ...(incoming.get(fuel.code) || {}) }));
}

function assertDatasetCoverage(datasets = [], fuels = DEFAULT_FUELS, regions = DEFAULT_REGIONS) {
 const fuelCodes = ensureFuelCoverage(fuels).map((fuel) => fuel.code);
 const requiredRegionCodes = regions.filter((region) => region.code !== 'ALL').map((region) => region.code);
 const errors = [];
 for (const fuelCode of fuelCodes) {
  const datasetRegions = new Set(datasets.filter((dataset) => dataset.fuelCode === fuelCode).map((dataset) => dataset.regionCode));
  const missing = requiredRegionCodes.filter((code) => !datasetRegions.has(code));
  if (missing.length) errors.push(`${fuelCode}: ${missing.join(',')} 누락`);
 }
 if (errors.length) {
  throw new Error(`전국+${requiredRegionCodes.length}개 OPINET 지역 그룹의 유종별 데이터가 부족합니다. ${errors.join(' / ')}`);
 }
}

function uniqueRegions(regions = []) {
 const unique = new Map();
 for (const item of Array.isArray(regions) ? regions : []) {
  const region = normalizePair(item);
  if (!region.code || unique.has(region.code)) continue;
  unique.set(region.code, region);
 }
 return [...unique.values()];
}

function currentFallbackRegions() {
 return DEFAULT_REGIONS.map((region) => ({ ...region }));
}

function validateConfiguredRegions(configured, official) {
 const configuredRegions = uniqueRegions(configured);
 const configuredCodes = new Set(configuredRegions.map((region) => region.code));
 const officialCodes = new Set(official.map((region) => region.code));
 const legacy = [...LEGACY_REGION_CODES].filter((code) => configuredCodes.has(code));
 if (legacy.length && officialCodes.has('20')) {
  throw new Error(`OPINET_REGIONS에 폐기된 지역코드 ${legacy.join(',')}가 있습니다. 07:전남과 16:광주를 제거하고 20:전남광주를 사용하거나 OPINET_REGIONS 변수를 삭제하세요.`);
 }
 const missing = [...officialCodes].filter((code) => !configuredCodes.has(code));
 const unknown = [...configuredCodes].filter((code) => !officialCodes.has(code));
 if (missing.length || unknown.length) {
  throw new Error(`OPINET_REGIONS가 현재 지역코드 API와 일치하지 않습니다. 누락=${missing.join(',') || '없음'} / 알 수 없는 코드=${unknown.join(',') || '없음'}. 변수를 삭제하면 공식 지역코드를 자동 사용합니다.`);
 }
 return official.map((region) => ({ ...region }));
}

const BRAND_NAMES = {
 SKE: 'SK에너지',
 GSC: 'GS칼텍스',
 HDO: 'HDO',
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

function readCoordinateSource(item) {
 const sourceCoordinateX = item.GIS_X_COOR ?? item.gisX ?? item.x;
 const sourceCoordinateY = item.GIS_Y_COOR ?? item.gisY ?? item.y;
 return { x: toNumber(sourceCoordinateX), y: toNumber(sourceCoordinateY) };
}

function normalizePair(item) {
 if (typeof item === 'string') {
  const [code, ...nameParts] = item.split(':');
  return { code: String(code || '').trim(), name: String(nameParts.join(':') || code || '이름 없음').trim() };
 }
 if (item && typeof item === 'object') {
  return {
   code: String(item.code ?? item.value ?? item.prodcd ?? '').trim(),
   name: String(item.name ?? item.label ?? item.text ?? item.code ?? '이름 없음').trim(),
  };
 }
 return { code: '', name: '' };
}

function parsePairs(value, fallback) {
 if (!value || !String(value).trim()) return fallback;
 const raw = String(value).trim();

 try {
  const parsed = JSON.parse(raw);
  const list = Array.isArray(parsed) ? parsed : [];
  const normalized = list.map(normalizePair).filter((pair) => pair.code);
  return normalized.length ? normalized : fallback;
 } catch {
 }

 const normalized = raw
  .split(',')
  .map((pair) => normalizePair(pair.trim()))
  .filter((pair) => pair.code);
 return normalized.length ? normalized : fallback;
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

function pruneRequestWindow(now) {
 while (requestWindow.length && now - requestWindow[0] >= RATE_LIMIT_WINDOW_MS) {
  requestWindow.shift();
 }
}

async function waitForRequestWindow() {
 while (true) {
  const now = Date.now();
  pruneRequestWindow(now);
  const spacingWait = Math.max(0, lastRequestStartedAt + REQUEST_PAUSE_MS - now);
  const windowWait = requestWindow.length >= RATE_LIMIT_MAX_REQUESTS
   ? Math.max(0, requestWindow[0] + RATE_LIMIT_WINDOW_MS - now + 100)
   : 0;
  const waitMs = Math.max(spacingWait, windowWait);
  if (waitMs <= 0) break;
  if (windowWait > 0) {
   console.log(`OPINET 요청 보호 대기: 최근 ${RATE_LIMIT_WINDOW_MS}ms 동안 ${requestWindow.length}회 요청되어 ${waitMs}ms 기다립니다.`);
  }
  await sleep(waitMs);
 }
 const startedAt = Date.now();
 lastRequestStartedAt = startedAt;
 requestWindow.push(startedAt);
}

function retryDelay(attempt) {
 return Math.min(REQUEST_RETRY_BASE_MS * (2 ** attempt), 15000);
}

async function fetchJson(url) {
 await waitForRequestWindow();
 const controller = new AbortController();
 const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
 try {
  const response = await fetch(url, {
   headers: {
    Accept: ['application/json', 'text/plain', ['*', '*'].join('/')].join(','),
    'User-Agent': 'liter-save-build/2.1',
   },
   redirect: 'follow',
   signal: controller.signal,
  });

  const text = await response.text();

  if (!response.ok) {
   throw new Error(`${response.status} ${response.statusText}: ${redactUrl(url)} | ${text.slice(0, 300)}`);
  }

  try {
   return JSON.parse(text);
  } catch {
   throw new Error(`JSON 파싱 실패: ${redactUrl(url)} | ${text.slice(0, 300)}`);
  }
 } catch (error) {
  if (error?.name === 'AbortError') {
   throw new Error(`요청 시간 초과(${REQUEST_TIMEOUT_MS}ms): ${redactUrl(url)}`);
  }
  throw error;
 } finally {
  clearTimeout(timeout);
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
  for (let attempt = 0; attempt <= REQUEST_MAX_RETRIES; attempt += 1) {
   try {
    const raw = await fetchJson(url);
    const rawItems = extractOilItems(raw);
    const items = rawItems.filter((item) => (
     requiredKeys.length === 0 || requiredKeys.every((key) => key in Object(item))
    ));
    diagnostics.push({ strategy, attempt: attempt + 1, rawCount: rawItems.length, count: items.length, summary: summarizeRaw(raw), url: redactUrl(url) });

    if (items.length > 0) {
     console.log(`${label}: ${strategy} 방식 성공 (${items.length}건, ${attempt + 1}차 시도)`);
     return { items, raw, strategy, diagnostics };
    }
    if (attempt < REQUEST_MAX_RETRIES) {
     const delay = attempt === 0
      ? Math.max(retryDelay(attempt), EMPTY_RESPONSE_COOLDOWN_MS)
      : retryDelay(attempt);
     console.warn(`${label}: 빈 응답을 단기 요청 제한 신호로 보고 ${delay}ms 후 재시도합니다. (${attempt + 1}/${REQUEST_MAX_RETRIES + 1})`);
     await sleep(delay);
    }
   } catch (error) {
    diagnostics.push({ strategy, attempt: attempt + 1, error: error.message, url: redactUrl(url) });
    if (attempt < REQUEST_MAX_RETRIES) {
     const delay = retryDelay(attempt);
     console.warn(`${label}: ${error.message} / ${delay}ms 후 재시도합니다. (${attempt + 1}/${REQUEST_MAX_RETRIES + 1})`);
     await sleep(delay);
    }
   }
  }
 }

 const message = diagnostics.map((item) => JSON.stringify(item)).join('\n');
 throw new Error(`${label} 응답이 확인 필요합니다. 시도 결과:\n${message}`);
}

function toNumber(value) {
 const number = Number(value);
 return Number.isFinite(number) ? number : null;
}

function convertKatecToWgs84(katecX, katecY) {
 if (!Number.isFinite(katecX) || !Number.isFinite(katecY)) {
  return { latitude: null, longitude: null };
 }

 try {
  if (typeof projectCoordinate !== 'function') {
   return { latitude: null, longitude: null };
  }

  const [longitude, latitude] = projectCoordinate(KATEC_CRS, WGS84_CRS, [katecX, katecY]);
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
 const { x: katecX, y: katecY } = readCoordinateSource(item);
 const converted = convertKatecToWgs84(katecX, katecY);
 const hasConvertedCoordinates = Number.isFinite(converted.latitude) && Number.isFinite(converted.longitude);
 const address = String(item.VAN_ADR ?? '');
 const roadAddress = String(item.NEW_ADR ?? '');

 return {
  id: String(item.UNI_ID ?? ''),
  name: String(item.OS_NM ?? '이름 없음'),
  brand: BRAND_NAMES[brandCode] ?? String(brandCode || '브랜드 미상'),
  brandCode: String(brandCode || ''),
  price: Number(item.PRICE ?? 0),
  address,
  roadAddress,
  katecX,
  katecY,
  latitude: hasConvertedCoordinates ? converted.latitude : null,
  longitude: hasConvertedCoordinates ? converted.longitude : null,
  coordinateSource: hasConvertedCoordinates ? 'katec-converted' : 'not-provided',
 };
}

async function fetchRegions() {
 const configured = parsePairs(process.env.OPINET_REGIONS, null);
 try {
  const { items } = await requestWithFallback('areaCode.do', {}, '지역코드 조회', ['AREA_CD', 'AREA_NM']);
  const officialRegions = uniqueRegions([
   { code: 'ALL', name: '전국' },
   ...items
    .map((item) => ({ code: String(item.AREA_CD ?? ''), name: String(item.AREA_NM ?? '') }))
    .filter((item) => item.code && item.name),
  ]);

  if (officialRegions.length > 1) {
   if (configured) {
    const verified = validateConfiguredRegions(configured, officialRegions);
    console.log(`사용자 지정 지역을 공식 지역코드 API와 대조했습니다: ${verified.map((item) => item.name).join(', ')}`);
    return verified;
   }
   console.log(`공식 지역코드 API 사용: ${officialRegions.map((item) => item.name).join(', ')}`);
   return officialRegions;
  }
 } catch (error) {
  console.warn(`${error.message}
→ 지역코드 API 대신 현재 내장 지역 목록을 사용합니다.`);
 }

 const fallback = currentFallbackRegions();
 if (configured) {
  const verified = validateConfiguredRegions(configured, fallback);
  console.log(`사용자 지정 지역 사용: ${verified.map((item) => item.name).join(', ')}`);
  return verified;
 }
 return fallback;
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
  .sort((lowerPriceStation, higherPriceStation) => lowerPriceStation.price - higherPriceStation.price);
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
  notice: '차트 데이터가 확인 예정입니다.',
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
 const regionalMetrics = datasets.map((dataset) => {
  const summary = getPriceSummary(dataset.stations);
  return {
   regionCode: dataset.regionCode,
   regionName: dataset.regionName,
   fuelCode: dataset.fuelCode,
   fuelName: dataset.fuelName,
   lowestPrice: summary.lowestPrice,
   averagePrice: summary.averagePrice,
   stationCount: summary.stationCount,
   capturedAt: dataset.capturedAt ?? null,
   collectionStatus: dataset.collectionStatus ?? 'live',
  };
 });
 const fuels = new Map();
 for (const dataset of datasets) {
  if (!fuels.has(dataset.fuelCode)) fuels.set(dataset.fuelCode, dataset.fuelName);
 }
 const nationalMetrics = [...fuels.entries()].map(([fuelCode, fuelName]) => {
  const stations = datasets.filter((dataset) => dataset.fuelCode === fuelCode).flatMap((dataset) => dataset.stations || []);
  const summary = getPriceSummary(stations);
  return {
   regionCode: 'ALL',
   regionName: '전국',
   fuelCode,
   fuelName,
   lowestPrice: summary.lowestPrice,
   averagePrice: summary.averagePrice,
   stationCount: summary.stationCount,
  };
 });
 return [...nationalMetrics, ...regionalMetrics];
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


function datasetKey(regionCode, fuelCode) {
 return `${String(regionCode || '')}:${String(fuelCode || '')}`;
}

function datasetTimestamp(dataset, payload) {
 return dataset?.capturedAt || payload?.dataAsOf || payload?.generatedAt || payload?.updatedAt || null;
}

function hoursSince(value) {
 const timestamp = new Date(value).getTime();
 if (!Number.isFinite(timestamp)) return Infinity;
 return Math.max(0, (Date.now() - timestamp) / 3600000);
}

function buildExistingDatasetMap(payload) {
 return new Map((Array.isArray(payload?.datasets) ? payload.datasets : [])
  .filter((dataset) => Array.isArray(dataset?.stations) && dataset.stations.length > 0)
  .map((dataset) => [datasetKey(dataset.regionCode, dataset.fuelCode), dataset]));
}

function oldestDatasetTimestamp(datasets, fallback) {
 const timestamps = datasets
  .map((dataset) => new Date(dataset.capturedAt || fallback).getTime())
  .filter(Number.isFinite);
 if (!timestamps.length) return fallback;
 return new Date(Math.min(...timestamps)).toISOString();
}

async function hasExistingOilData() {
 try {
  const text = await readFile(OUTPUT_PATH, 'utf8');
  const payload = JSON.parse(text);
  const datasets = Array.isArray(payload?.datasets) ? payload.datasets : [];
  return datasets.some((item) => Array.isArray(item?.stations) && item.stations.length > 0);
 } catch {
  return false;
 }
}

async function writeWaitingFallbackData() {
 await writeFile(OUTPUT_PATH, `${JSON.stringify(createWaitingPayload(), null, 2)}\n`, 'utf8');
 await writeFile(HISTORY_PATH, `${JSON.stringify(createEmptyHistoryPayload(), null, 2)}\n`, 'utf8');
 console.warn('OPINET 인증 정보가 없어 대기용 데이터 파일을 생성했습니다. 화면은 기본 표시 데이터로 렌더링됩니다.');
}

async function main() {
 await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
 await mkdir(path.dirname(HISTORY_PATH), { recursive: true });

 if (!API_KEY) {
  if (WAITING_FALLBACK) {
   await writeWaitingFallbackData();
   return;
  }
  if (await hasExistingOilData()) {
   console.warn('OPINET 인증 정보가 없어 기존 oil-prices.json을 유지합니다.');
   return;
  }
  throw new Error('OPINET_CERT_KEY 또는 OPINET_API_KEY가 확인 필요합니다. 기존 데이터가 없어 생성을 중단합니다.');
 }

 const existingPayload = await readJsonOrDefault(OUTPUT_PATH, null);
 const existingDatasetMap = buildExistingDatasetMap(existingPayload);
 const fuels = ensureFuelCoverage(parsePairs(process.env.OPINET_FUELS, DEFAULT_FUELS));
 const regions = await fetchRegions();
 const datasets = [];
 const fallbackWarnings = [];
 const unresolvedFailures = [];

 console.log(`API_BASE=${API_BASE}`);
 console.log(`연료 ${fuels.length}개, 지역 ${regions.length}개 기준으로 수집을 시작합니다.`);
 console.log(`요청 간격 ${REQUEST_PAUSE_MS}ms, ${RATE_LIMIT_WINDOW_MS}ms당 최대 ${RATE_LIMIT_MAX_REQUESTS}회, 요청당 최대 ${REQUEST_MAX_RETRIES + 1}회, 시간 제한 ${REQUEST_TIMEOUT_MS}ms`);

 for (const region of regions) {
  for (const fuel of fuels) {
   const key = datasetKey(region.code, fuel.code);
   try {
    const stations = await fetchLowestStations({ region, fuel });
    const capturedAt = new Date().toISOString();
    datasets.push({
     regionCode: region.code,
     regionName: region.name,
     fuelCode: fuel.code,
     fuelName: fuel.name,
     capturedAt,
     collectionStatus: 'live',
     stations,
    });
    console.log(`${region.name} / ${fuel.name}: ${stations.length}개 수집`);
   } catch (error) {
    const previous = existingDatasetMap.get(key);
    const capturedAt = datasetTimestamp(previous, existingPayload);
    const ageHours = hoursSince(capturedAt);
    if (previous && ageHours <= FALLBACK_MAX_AGE_HOURS) {
     datasets.push({
      ...previous,
      regionCode: region.code,
      regionName: region.name,
      fuelCode: fuel.code,
      fuelName: fuel.name,
      capturedAt,
      collectionStatus: 'cached',
      fallbackReason: error.message,
     });
     fallbackWarnings.push({ regionCode: region.code, regionName: region.name, fuelCode: fuel.code, fuelName: fuel.name, capturedAt, ageHours: Number(ageHours.toFixed(2)), message: error.message });
     console.warn(`${region.name} / ${fuel.name}: 신규 수집 실패로 ${ageHours.toFixed(1)}시간 전 직전 정상 데이터를 사용합니다.`);
    } else {
     unresolvedFailures.push({ regionCode: region.code, regionName: region.name, fuelCode: fuel.code, fuelName: fuel.name, previousCapturedAt: capturedAt, previousAgeHours: Number.isFinite(ageHours) ? Number(ageHours.toFixed(2)) : null, message: error.message });
     console.warn(`${region.name} / ${fuel.name} 수집 실패: ${error.message}`);
    }
   }
  }
 }

 if (unresolvedFailures.length) {
  const details = unresolvedFailures.map((item) => `${item.regionName}/${item.fuelName}: ${item.message}`).join(' | ');
  throw new Error(`최신 대체 데이터가 없는 지역·유종 ${unresolvedFailures.length}건 때문에 수집을 중단합니다. ${details}`);
 }

 assertDatasetCoverage(datasets, fuels, regions);

 const totalStations = datasets.reduce((sum, dataset) => sum + dataset.stations.length, 0);
 if (totalStations === 0) {
  throw new Error('오피넷 데이터 수집 결과가 확인 필요합니다. npm run opinet:test 로 먼저 avgAllPrice/areaCode/lowTop10 응답을 점검해주세요.');
 }

 const generatedAt = new Date().toISOString();
 const cachedDatasetCount = datasets.filter((dataset) => dataset.collectionStatus === 'cached').length;
 const liveDatasetCount = datasets.length - cachedDatasetCount;
 const dataAsOf = oldestDatasetTimestamp(datasets, generatedAt);
 const payload = {
  mode: 'opinet',
  source: '한국석유공사 오피넷 Open API',
  generatedAt,
  dataAsOf,
  notice: cachedDatasetCount > 0
   ? `한국석유공사 오피넷 Open API 기준 데이터입니다. ${cachedDatasetCount}개 지역·유종은 24시간 이내 직전 정상 수집값입니다.`
   : '한국석유공사 오피넷 Open API 기준 데이터입니다. 실제 판매 가격과 차이가 있을 수 있습니다.',
  collection: {
   regions: regions.map((region) => ({ code: region.code, name: region.name })),
   regionCodes: regions.map((region) => region.code),
   requestedDatasetCount: regions.length * fuels.length,
   liveDatasetCount,
   cachedDatasetCount,
   failedDatasetCount: 0,
   requestPauseMs: REQUEST_PAUSE_MS,
   rateLimitMaxRequests: RATE_LIMIT_MAX_REQUESTS,
   rateLimitWindowMs: RATE_LIMIT_WINDOW_MS,
   emptyResponseCooldownMs: EMPTY_RESPONSE_COOLDOWN_MS,
   requestMaxRetries: REQUEST_MAX_RETRIES,
   fallbackMaxAgeHours: FALLBACK_MAX_AGE_HOURS,
   warnings: fallbackWarnings,
  },
  datasets,
 };

 const existingHistory = await readJsonOrDefault(HISTORY_PATH, createEmptyHistoryPayload());
 const nextHistory = mergeHistory(existingHistory, {
  capturedAt: generatedAt,
  dataAsOf,
  cachedDatasetCount,
  metrics: buildHistoryMetrics(datasets),
 });

 await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
 await writeFile(HISTORY_PATH, `${JSON.stringify(nextHistory, null, 2)}\n`, 'utf8');
 console.log(`데이터 파일 생성 완료: ${OUTPUT_PATH}`);
 console.log(`차트 누적 파일 생성 완료: ${HISTORY_PATH}`);
 console.log(`실시간 ${liveDatasetCount}개, 직전 정상값 ${cachedDatasetCount}개, 가격 기준시각 ${dataAsOf}`);
}

main().catch((error) => {
 console.error(error);
 process.exit(1);
});
