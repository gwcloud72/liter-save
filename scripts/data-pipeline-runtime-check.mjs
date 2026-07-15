import { createServer } from 'node:http';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const opinetScript = path.join(projectRoot, 'scripts/fetch-opinet.mjs');
const fredScript = path.join(projectRoot, 'scripts/fetch-fred-oil.mjs');
const regionPairs = 'ALL:전국,01:서울,02:경기,03:강원,04:충북,05:충남,06:전북,08:경북,09:경남,10:부산,11:제주,14:대구,15:인천,17:대전,18:울산,19:세종,20:전남광주';
const legacyRegionPairs = 'ALL:전국,01:서울,02:경기,03:강원,04:충북,05:충남,06:전북,07:전남,08:경북,09:경남,10:부산,11:제주,14:대구,15:인천,16:광주,17:대전,18:울산,19:세종';
const officialRegionRows = regionPairs.split(',').slice(1).map((pair) => { const [AREA_CD, AREA_NM] = pair.split(':'); return { AREA_CD, AREA_NM }; });
const fuelPairs = 'B027:휘발유,D047:경유,K015:LPG';

function station(area, fuel, index = 1) {
 return {
  UNI_ID: `${area || 'ALL'}-${fuel}-${index}`,
  PRICE: String(1500 + index),
  OS_NM: `${area || '전국'} ${fuel} 주유소 ${index}`,
  POLL_DIV_CD: 'SKE',
  VAN_ADR: '테스트 주소',
  NEW_ADR: '테스트 도로명 주소',
 };
}

function runNode(script, cwd, env) {
 return new Promise((resolve) => {
  const child = spawn(process.execPath, [script], { cwd, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.on('close', (code) => resolve({ code, stdout, stderr }));
 });
}

async function createWorkspace() {
 const workspace = await mkdtemp(path.join(tmpdir(), 'liter-save-pipeline-'));
 await mkdir(path.join(workspace, 'public/data'), { recursive: true });
 for (const file of ['oil-prices.json', 'oil-history.json', 'global-oil.json']) {
  const source = path.join(projectRoot, 'public/data', file);
  const target = path.join(workspace, 'public/data', file);
  await writeFile(target, await readFile(source));
 }
 return workspace;
}

async function refreshExistingOilTimestamp(workspace, hoursAgo) {
 const file = path.join(workspace, 'public/data/oil-prices.json');
 const payload = JSON.parse(await readFile(file, 'utf8'));
 const timestamp = new Date(Date.now() - hoursAgo * 3600000).toISOString();
 const legacyGrouped = new Map();
 const datasets = [];
 for (const dataset of Array.isArray(payload.datasets) ? payload.datasets : []) {
  if (!['07', '16'].includes(String(dataset.regionCode || ''))) {
   datasets.push(dataset);
   continue;
  }
  const key = String(dataset.fuelCode || '');
  const group = legacyGrouped.get(key) || [];
  group.push(dataset);
  legacyGrouped.set(key, group);
 }
 for (const [fuelCode, group] of legacyGrouped) {
  const stations = group.flatMap((dataset) => Array.isArray(dataset.stations) ? dataset.stations : [])
   .sort((left, right) => Number(left.price || 0) - Number(right.price || 0))
   .slice(0, 20);
  datasets.push({
   ...group[0],
   regionCode: '20',
   regionName: '전남광주',
   fuelCode,
   capturedAt: timestamp,
   collectionStatus: 'live',
   stations,
  });
 }
 payload.generatedAt = timestamp;
 payload.dataAsOf = timestamp;
 payload.datasets = datasets.map((dataset) => ({ ...dataset, capturedAt: timestamp, collectionStatus: 'live' }));
 payload.collection = {
  ...(payload.collection || {}),
  regions: [{ code: 'ALL', name: '전국' }, ...officialRegionRows.map((row) => ({ code: row.AREA_CD, name: row.AREA_NM }))],
  regionCodes: ['ALL', ...officialRegionRows.map((row) => row.AREA_CD)],
  requestedDatasetCount: 51,
 };
 await writeFile(file, `${JSON.stringify(payload, null, 2)}
`);
}

async function withServer(handler, callback) {
 const server = createServer(handler);
 await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
 const address = server.address();
 try {
  return await callback(`http://127.0.0.1:${address.port}`);
 } finally {
  await new Promise((resolve) => server.close(resolve));
 }
}

function createOpinetHandler({ emptyAreas = new Set(), emptyAttempts = 0, burstMaxRequests = Infinity, burstWindowMs = 0 }) {
 const attempts = new Map();
 const requestTimes = [];
 let rateLimitedCount = 0;
 return {
  attempts,
  get rateLimitedCount() { return rateLimitedCount; },
  handler(request, response) {
   const url = new URL(request.url, 'http://127.0.0.1');
   if (url.pathname.endsWith('/areaCode.do')) {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ RESULT: { OIL: officialRegionRows } }));
    return;
   }
   if (url.pathname.endsWith('/lowTop10.do')) {
    const now = Date.now();
    while (requestTimes.length && now - requestTimes[0] >= burstWindowMs) requestTimes.shift();
    const burstLimited = Number.isFinite(burstMaxRequests) && requestTimes.length >= burstMaxRequests;
    requestTimes.push(now);
    const area = url.searchParams.get('area') || 'ALL';
    const fuel = url.searchParams.get('prodcd') || '';
    const key = `${area}:${fuel}`;
    const count = (attempts.get(key) || 0) + 1;
    attempts.set(key, count);
    const empty = burstLimited || (emptyAreas.has(area) && count <= emptyAttempts);
    if (burstLimited) rateLimitedCount += 1;
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ RESULT: { OIL: empty ? [] : [station(area, fuel)] } }));
    return;
   }
   response.writeHead(404, { 'content-type': 'application/json' });
   response.end(JSON.stringify({ error: 'not found' }));
  },
 };
}

async function runOpinetScenario({ emptyAreas, emptyAttempts, existingHoursAgo, retries, expectCode, expectedCached, burstMaxRequests = Infinity, burstWindowMs = 0, rateLimitMaxRequests = 100, rateLimitWindowMs = 1000, emptyResponseCooldownMs = 0, configuredRegions = regionPairs }) {
 const workspace = await createWorkspace();
 await refreshExistingOilTimestamp(workspace, existingHoursAgo);
 const mock = createOpinetHandler({ emptyAreas, emptyAttempts, burstMaxRequests, burstWindowMs });
 try {
  await withServer(mock.handler, async (baseUrl) => {
   const result = await runNode(opinetScript, workspace, {
    OPINET_CERT_KEY: 'test-key',
    OPINET_API_BASE: `${baseUrl}/api`,
    OPINET_AUTH_PARAM: 'code',
    OPINET_REGIONS: configuredRegions,
    OPINET_FUELS: fuelPairs,
    OPINET_COUNT: '20',
    OPINET_REQUEST_TIMEOUT_MS: '2000',
    OPINET_REQUEST_PAUSE_MS: '0',
    OPINET_REQUEST_MAX_RETRIES: String(retries),
    OPINET_REQUEST_RETRY_BASE_MS: '100',
    OPINET_RATE_LIMIT_MAX_REQUESTS: String(rateLimitMaxRequests),
    OPINET_RATE_LIMIT_WINDOW_MS: String(rateLimitWindowMs),
    OPINET_EMPTY_RESPONSE_COOLDOWN_MS: String(emptyResponseCooldownMs),
    OPINET_FALLBACK_MAX_AGE_HOURS: '24',
    HISTORY_RETENTION_DAYS: '90',
   });
   if (result.code !== expectCode) throw new Error(`OPINET scenario exit=${result.code}\n${result.stdout}\n${result.stderr}`);
   if (expectCode === 0) {
    const payload = JSON.parse(await readFile(path.join(workspace, 'public/data/oil-prices.json'), 'utf8'));
    if (payload.datasets.length !== 51) throw new Error(`OPINET dataset count=${payload.datasets.length}`);
    if (!payload.collection?.regionCodes?.includes('20')) throw new Error('OPINET region code 20 missing');
    if (payload.collection?.regionCodes?.includes('07') || payload.collection?.regionCodes?.includes('16')) throw new Error('legacy OPINET region codes remain');
    if (payload.collection?.cachedDatasetCount !== expectedCached) throw new Error(`OPINET cached count=${payload.collection?.cachedDatasetCount}`);
    if (!payload.dataAsOf) throw new Error('OPINET dataAsOf missing');
   }
  });
 } finally {
  await rm(workspace, { recursive: true, force: true });
 }
 return mock;
}

function fredPayload(seriesId) {
 const value = seriesId === 'DCOILBRENTEU' ? ['70.10', '71.20', '72.30'] : ['66.10', '67.20', '68.30'];
 return {
  observations: [
   { date: '2026-07-10', value: value[2] },
   { date: '2026-07-09', value: value[1] },
   { date: '2026-07-08', value: value[0] },
  ],
 };
}

function fredCsv(seriesId) {
 const value = seriesId === 'DCOILBRENTEU' ? ['70.10', '71.20', '72.30'] : ['66.10', '67.20', '68.30'];
 return `observation_date,${seriesId}\n2026-07-08,${value[0]}\n2026-07-09,${value[1]}\n2026-07-10,${value[2]}\n`;
}

async function runFredScenario({ apiFails, expectedStrategy }) {
 const workspace = await createWorkspace();
 try {
  await withServer((request, response) => {
   const url = new URL(request.url, 'http://127.0.0.1');
   const seriesId = url.searchParams.get('series_id') || url.searchParams.get('id') || '';
   if (url.pathname === '/api') {
    if (apiFails) {
     response.writeHead(503, { 'content-type': 'application/json' });
     response.end(JSON.stringify({ error: 'temporary' }));
    } else {
     response.writeHead(200, { 'content-type': 'application/json' });
     response.end(JSON.stringify(fredPayload(seriesId)));
    }
    return;
   }
   if (url.pathname === '/csv') {
    response.writeHead(200, { 'content-type': 'text/csv' });
    response.end(fredCsv(seriesId));
    return;
   }
   response.writeHead(404);
   response.end();
  }, async (baseUrl) => {
   const result = await runNode(fredScript, workspace, {
    FRED_API_KEY: 'test-key',
    FRED_API_ENDPOINT: `${baseUrl}/api`,
    FRED_CSV_ENDPOINT: `${baseUrl}/csv`,
    FRED_HISTORY_DAYS: '30',
    FRED_REQUEST_TIMEOUT_MS: '2000',
    FRED_MAX_RETRIES: '0',
    FRED_RETRY_BASE_MS: '100',
   });
   if (result.code !== 0) throw new Error(`FRED scenario failed\n${result.stdout}\n${result.stderr}`);
   const payload = JSON.parse(await readFile(path.join(workspace, 'public/data/global-oil.json'), 'utf8'));
   if (payload.items.length !== 2) throw new Error(`FRED item count=${payload.items.length}`);
   if (payload.items.some((item) => item.strategy !== expectedStrategy)) throw new Error(`FRED strategy mismatch=${payload.items.map((item) => item.strategy).join(',')}`);
  });
 } finally {
  await rm(workspace, { recursive: true, force: true });
 }
}

const retryScenario = await runOpinetScenario({ emptyAreas: new Set(['20']), emptyAttempts: 1, existingHoursAgo: 1, retries: 2, expectCode: 0, expectedCached: 0 });
for (const area of ['20']) {
 for (const fuel of ['B027', 'D047', 'K015']) {
  if ((retryScenario.attempts.get(`${area}:${fuel}`) || 0) < 2) throw new Error(`${area}/${fuel} retry missing`);
 }
}
await runOpinetScenario({ emptyAreas: new Set(), emptyAttempts: 0, existingHoursAgo: 1, retries: 0, expectCode: 0, expectedCached: 0, configuredRegions: '' });
await runOpinetScenario({ emptyAreas: new Set(['20']), emptyAttempts: 10, existingHoursAgo: 1, retries: 0, expectCode: 0, expectedCached: 3 });
await runOpinetScenario({ emptyAreas: new Set(['20']), emptyAttempts: 10, existingHoursAgo: 48, retries: 0, expectCode: 1, expectedCached: 0 });
await runOpinetScenario({ emptyAreas: new Set(), emptyAttempts: 0, existingHoursAgo: 1, retries: 0, expectCode: 1, expectedCached: 0, configuredRegions: legacyRegionPairs });
const burstProtectedScenario = await runOpinetScenario({
 emptyAreas: new Set(),
 emptyAttempts: 0,
 existingHoursAgo: 48,
 retries: 0,
 expectCode: 0,
 expectedCached: 0,
 burstMaxRequests: 20,
 burstWindowMs: 1000,
 rateLimitMaxRequests: 18,
 rateLimitWindowMs: 1000,
});
if (burstProtectedScenario.rateLimitedCount !== 0) {
 throw new Error(`OPINET 요청 창 보호 실패: rateLimited=${burstProtectedScenario.rateLimitedCount}`);
}
await runFredScenario({ apiFails: false, expectedStrategy: 'api' });
await runFredScenario({ apiFails: true, expectedStrategy: 'csv' });

console.log('data-pipeline:check passed');
