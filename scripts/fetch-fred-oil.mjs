import fs from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';

const OUTPUT_PATH = 'public/data/global-oil.json';

function parseInteger(value, fallback, { min = -Infinity, max = Infinity } = {}) {
 if (value === undefined || value === null || String(value).trim() === '') return fallback;
 const parsed = Number(value);
 if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
  throw new Error(`정수 환경변수 범위 오류: value=${value}, range=${min}~${max}`);
 }
 return parsed;
}

const HISTORY_DAYS = parseInteger(process.env.FRED_HISTORY_DAYS, 120, { min: 7, max: 730 });
const REQUEST_TIMEOUT_MS = parseInteger(process.env.FRED_REQUEST_TIMEOUT_MS, 15000, { min: 1000, max: 60000 });
const MAX_RETRIES = parseInteger(process.env.FRED_MAX_RETRIES, 3, { min: 0, max: 6 });
const RETRY_BASE_MS = parseInteger(process.env.FRED_RETRY_BASE_MS, 1200, { min: 100, max: 30000 });
const API_KEY = String(process.env.FRED_API_KEY || '').trim().replace(/^['"]|['"]$/g, '');
const API_ENDPOINT = String(process.env.FRED_API_ENDPOINT || 'https://api.stlouisfed.org/fred/series/observations').trim();
const CSV_ENDPOINT = String(process.env.FRED_CSV_ENDPOINT || 'https://fred.stlouisfed.org/graph/fredgraph.csv').trim();
const SERIES = [
 { key: 'brent', name: 'Brent', seriesId: 'DCOILBRENTEU', required: true },
 { key: 'wti', name: 'WTI', seriesId: 'DCOILWTICO', required: false },
];

function toNumber(value) {
 const number = Number(value);
 return Number.isFinite(number) ? number : null;
}

function retryDelay(attempt) {
 return Math.min(RETRY_BASE_MS * (2 ** attempt), 15000);
}

async function requestText(url, label) {
 let lastError = null;
 for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
   const response = await fetch(url, {
    headers: {
     Accept: 'application/json,text/csv,text/plain,*/*',
     'User-Agent': 'liter-save-build/2.1',
    },
    redirect: 'follow',
    signal: controller.signal,
   });
   const text = await response.text();
   if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${text.slice(0, 240)}`);
   return text;
  } catch (error) {
   lastError = error?.name === 'AbortError' ? new Error(`${label} 요청 시간 초과(${REQUEST_TIMEOUT_MS}ms)`) : error;
   if (attempt < MAX_RETRIES) {
    const delay = retryDelay(attempt);
    console.warn(`${label}: ${lastError.message} / ${delay}ms 후 재시도합니다. (${attempt + 1}/${MAX_RETRIES + 1})`);
    await sleep(delay);
   }
  } finally {
   clearTimeout(timeout);
  }
 }
 throw lastError ?? new Error(`${label} 요청 실패`);
}

function normalizeRows(rows) {
 return rows
  .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(String(row.date || '')) && row.value !== null)
  .sort((left, right) => left.date.localeCompare(right.date));
}

function parseApiPayload(series, text) {
 let payload;
 try {
  payload = JSON.parse(text);
 } catch {
  throw new Error(`${series.name} FRED API JSON 파싱 실패`);
 }
 if (payload?.error_message) throw new Error(`${series.name} FRED API 오류: ${payload.error_message}`);
 const rows = normalizeRows((Array.isArray(payload?.observations) ? payload.observations : []).map((row) => ({
  date: String(row?.date || ''),
  value: row?.value === '.' ? null : toNumber(row?.value),
 })));
 if (!rows.length) throw new Error(`${series.name} FRED API 관측값이 없습니다.`);
 return rows;
}

function parseCsvPayload(series, text) {
 const lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
 if (lines.length < 2) throw new Error(`${series.name} FRED CSV 데이터가 없습니다.`);
 const rows = normalizeRows(lines.slice(1).map((line) => {
  const comma = line.indexOf(',');
  if (comma < 0) return { date: '', value: null };
  const date = line.slice(0, comma).replace(/^"|"$/g, '').trim();
  const rawValue = line.slice(comma + 1).replace(/^"|"$/g, '').trim();
  return { date, value: rawValue === '.' || rawValue === '' ? null : toNumber(rawValue) };
 }));
 if (!rows.length) throw new Error(`${series.name} FRED CSV 관측값이 없습니다.`);
 return rows;
}

function buildResult(series, rows, strategy) {
 const latest = rows.at(-1);
 const previous = rows.at(-2);
 return {
  item: {
   key: series.key,
   name: series.name,
   seriesId: series.seriesId,
   unit: 'USD per barrel',
   date: latest.date,
   price: latest.value,
   previousPrice: previous?.value ?? null,
   change: previous ? Number((latest.value - previous.value).toFixed(2)) : null,
   strategy,
  },
  history: rows.slice(-HISTORY_DAYS).map((row) => ({ date: row.date, price: row.value })),
 };
}

async function fetchFromApi(series) {
 if (!API_KEY) throw new Error('FRED_API_KEY가 설정되지 않았습니다.');
 const url = new URL(API_ENDPOINT);
 url.searchParams.set('series_id', series.seriesId);
 url.searchParams.set('api_key', API_KEY);
 url.searchParams.set('file_type', 'json');
 url.searchParams.set('sort_order', 'desc');
 url.searchParams.set('limit', String(Math.min(Math.max(HISTORY_DAYS * 2, 200), 100000)));
 const rows = parseApiPayload(series, await requestText(url, `${series.name} FRED API`));
 return buildResult(series, rows, 'api');
}

async function fetchFromCsv(series) {
 const url = new URL(CSV_ENDPOINT);
 url.searchParams.set('id', series.seriesId);
 const rows = parseCsvPayload(series, await requestText(url, `${series.name} FRED CSV`));
 return buildResult(series, rows, 'csv');
}

async function fetchFredSeries(series) {
 const failures = [];
 if (API_KEY) {
  try {
   return await fetchFromApi(series);
  } catch (error) {
   failures.push(`API: ${error.message}`);
  }
 }
 try {
  return await fetchFromCsv(series);
 } catch (error) {
  failures.push(`CSV: ${error.message}`);
 }
 throw new Error(failures.join(' / '));
}

async function readExistingPayload() {
 try {
  const text = await fs.readFile(OUTPUT_PATH, 'utf-8');
  return JSON.parse(text);
 } catch {
  return null;
 }
}

async function writePayload(payload) {
 await fs.mkdir('public/data', { recursive: true });
 await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
}

const existingPayload = await readExistingPayload();
const fetched = [];
const history = {};
const failures = [];

for (const series of SERIES) {
 try {
  const result = await fetchFredSeries(series);
  fetched.push(result.item);
  history[series.key] = result.history;
 } catch (error) {
  failures.push({ series, error });
  const existingItem = (existingPayload?.items ?? []).find((item) => item.key === series.key);
  const existingHistory = existingPayload?.history?.[series.key];
  if (existingItem && Array.isArray(existingHistory) && existingHistory.length) {
   fetched.push({ ...existingItem, stale: true, strategy: 'cached' });
   history[series.key] = existingHistory;
   console.warn(`${series.name} 신규 수집 실패. 기존 데이터를 유지합니다: ${error.message}`);
   continue;
  }
  if (!series.required) {
   console.warn(`${series.name} 보조 지표 수집 실패. 해당 지표를 제외합니다: ${error.message}`);
   continue;
  }
  console.warn(`${series.name} 필수 지표 수집 실패: ${error.message}`);
 }
}

const brent = fetched.find((item) => item.key === 'brent');
if (!brent) {
 console.warn('Brent 수집 실패: 기존 global-oil.json을 유지합니다.');
 process.exit(0);
}

const payload = {
 mode: 'fred',
 source: 'FRED / U.S. Energy Information Administration',
 updatedAt: new Date().toISOString(),
 notice: '국제유가는 국내 주유소 가격 해석을 돕기 위한 참고 지표입니다.',
 items: fetched,
 history,
 warnings: failures.map(({ series, error }) => ({ key: series.key, name: series.name, message: error.message })),
};

await writePayload(payload);

console.log('FRED 국제유가 데이터 저장 완료');
console.table(payload.items.map((item) => ({
 name: item.name,
 date: item.date,
 price: item.price,
 change: item.change,
 strategy: item.strategy,
 stale: item.stale ? 'yes' : 'no',
})));
