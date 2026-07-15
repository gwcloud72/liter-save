import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const warnings = [];

const LEGACY_MAX_DATA_AGE_DAYS = Number(process.env.OPINET_MAX_DATA_AGE_DAYS || 0);
const MAX_DATA_AGE_HOURS = Number(process.env.OPINET_MAX_DATA_AGE_HOURS || (LEGACY_MAX_DATA_AGE_DAYS > 0 ? LEGACY_MAX_DATA_AGE_DAYS * 24 : 24));
const FALLBACK_MAX_AGE_HOURS = Number(process.env.OPINET_FALLBACK_MAX_AGE_HOURS || 24);
const STRICT_DATA_AGE = ['true', '1', 'yes', 'on'].includes(String(process.env.OPINET_STRICT_DATA_AGE || '').toLowerCase());

const CURRENT_REGION_CODES = ['01','02','03','04','05','06','08','09','10','11','14','15','17','18','19','20'];
const LEGACY_REGION_CODES = ['01','02','03','04','05','06','07','08','09','10','11','14','15','16','17','18','19'];
const CURRENT_REGION_NAMES = ['서울','경기','강원','충북','충남','전북','경북','경남','부산','제주','대구','인천','대전','울산','세종','전남광주'];
const LEGACY_REGION_NAMES = ['서울','경기','강원','충북','충남','전북','전남','경북','경남','부산','제주','대구','인천','광주','대전','울산','세종'];
const REQUIRED_FUEL_CODES = ['B027', 'D047', 'K015'];

function requiredRegionCodes(payload, datasets) {
 const declared = Array.isArray(payload?.collection?.regionCodes)
  ? payload.collection.regionCodes.map((code) => String(code)).filter((code) => code && code !== 'ALL')
  : [];
 if (declared.length) return [...new Set(declared)];
 const present = new Set(datasets.map((dataset) => String(dataset.regionCode || '')));
 if (present.has('20')) return CURRENT_REGION_CODES;
 if (present.has('07') || present.has('16')) return LEGACY_REGION_CODES;
 return CURRENT_REGION_CODES;
}

function validateRegionCoverage(payload, datasets, label) {
 if (!datasets.length || !label.startsWith('public/data/')) return;
 const expectedCodes = requiredRegionCodes(payload, datasets);
 const names = new Set(datasets.map((dataset) => String(dataset.regionName || '')));
 const fuelCodes = new Set(datasets.map((dataset) => String(dataset.fuelCode || '')));
 const missingFuels = REQUIRED_FUEL_CODES.filter((code) => !fuelCodes.has(code));
 if (missingFuels.length) errors.push(`${label}: 필수 유종 데이터가 누락되었습니다. 누락 유종=${missingFuels.join(',')}`);
 for (const fuelCode of REQUIRED_FUEL_CODES.filter((code) => fuelCodes.has(code))) {
  const codes = new Set(datasets.filter((dataset) => String(dataset.fuelCode || '') === fuelCode).map((dataset) => String(dataset.regionCode || '')));
  const missingCodes = expectedCodes.filter((code) => !codes.has(code));
  if (missingCodes.length) errors.push(`${label}: ${fuelCode} 유종의 전국+${expectedCodes.length}개 OPINET 지역 그룹 데이터가 누락되었습니다. 누락 코드=${missingCodes.join(',')}`);
 }
 const allowedNames = new Set([...CURRENT_REGION_NAMES, ...LEGACY_REGION_NAMES, '전국']);
 const unexpectedNames = [...names].filter((name) => name && !allowedNames.has(name));
 if (unexpectedNames.length) warnings.push(`${label}: 확인되지 않은 OPINET 지역명이 감지되었습니다: ${unexpectedNames.join(',')}`);
 if (!names.has('전남광주') && (names.has('전남') || names.has('광주'))) {
  warnings.push(`${label}: 이전 OPINET 지역코드 07/16 데이터입니다. 다음 정상 수집에서 20:전남광주로 교체해야 합니다.`);
 }
 const declaredCount = Number(payload?.collection?.requestedDatasetCount);
 if (Number.isFinite(declaredCount) && declaredCount > 0 && declaredCount !== datasets.length) {
  errors.push(`${label}: requestedDatasetCount=${declaredCount}와 실제 datasets=${datasets.length}가 일치하지 않습니다.`);
 }
}


function parseDate(value) {
 const date = new Date(value);
 return Number.isNaN(date.getTime()) ? null : date;
}

function currentOilDate(prices) {
 return parseDate(prices?.dataAsOf || prices?.generatedAt || prices?.updatedAt);
}

function ageHours(value) {
 const date = parseDate(value);
 if (!date) return null;
 return Math.max(0, (Date.now() - date.getTime()) / 3600000);
}

function validateFreshOilPublicData(prices) {
 const datasets = Array.isArray(prices?.datasets) ? prices.datasets : [];
 if (!datasets.length) return;
 const current = currentOilDate(prices);
 if (!current) {
  errors.push('public/data/oil-prices.json: 가격 기준시각 확인이 필요합니다.');
  return;
 }
 const hours = Math.max(0, (Date.now() - current.getTime()) / 3600000);
 if (hours > MAX_DATA_AGE_HOURS) {
  const message = `public/data/oil-prices.json: 가격 기준시각 ${current.toISOString()}이 ${hours.toFixed(1)}시간 전입니다. ${MAX_DATA_AGE_HOURS}시간 초과 유가 데이터는 배포 금지입니다.`;
  if (STRICT_DATA_AGE) errors.push(message);
  else warnings.push(`${message} 로컬 검사는 경고로 처리되며 CI 배포에서는 실패합니다.`);
 }
 const cachedDatasets = datasets.filter((dataset) => dataset?.collectionStatus === 'cached');
 for (const dataset of cachedDatasets) {
  const cachedAge = ageHours(dataset?.capturedAt || prices?.dataAsOf || prices?.generatedAt);
  if (cachedAge === null) {
   errors.push(`public/data/oil-prices.json: ${dataset?.regionName || dataset?.regionCode}/${dataset?.fuelName || dataset?.fuelCode} 직전 정상 데이터의 기준시각이 필요합니다.`);
  } else if (cachedAge > FALLBACK_MAX_AGE_HOURS) {
   errors.push(`public/data/oil-prices.json: ${dataset?.regionName || dataset?.regionCode}/${dataset?.fuelName || dataset?.fuelCode} 직전 정상 데이터가 ${cachedAge.toFixed(1)}시간 전으로 ${FALLBACK_MAX_AGE_HOURS}시간을 초과했습니다.`);
  }
 }
}


function readJsonIfExists(filePath, { optional = false } = {}) {
 if (!fs.existsSync(filePath)) {
  if (!optional) errors.push(`${path.relative(root, filePath)}: 파일 확인이 필요합니다.`);
  else warnings.push(`${path.relative(root, filePath)}: 운영 데이터 파일 확인 필요 - fallback 화면로 렌더링됩니다.`);
  return null;
 }
 try {
  const raw = fs.readFileSync(filePath, 'utf8');
  if (!raw.trim()) {
   errors.push(`${path.relative(root, filePath)}: 파일이 비어 있습니다. 수집 실패 데이터를 배포할 수 없습니다.`);
   return null;
  }
  return JSON.parse(raw);
 }
 catch (error) { errors.push(`${path.relative(root, filePath)}: JSON parse 실패 (${error.message})`); return null; }
}

function isObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function numeric(value) { return value === null || value === undefined || value === '' || Number.isFinite(Number(value)); }
function dateLike(value) { return !value || /^\d{4}-\d{2}-\d{2}/.test(String(value)) || !Number.isNaN(new Date(value).getTime()); }

function validatePrices(payload, label) {
 if (!isObject(payload)) { errors.push(`${label}: 루트는 객체여야 합니다.`); return; }
 if (label === 'public/data/oil-prices.json') {
  if (!String(payload.source || '').trim()) errors.push(`${label}.source: 데이터 출처가 필요합니다.`);
  if (!String(payload.generatedAt || payload.updatedAt || '').trim()) errors.push(`${label}: generatedAt 또는 updatedAt이 필요합니다.`);
 }
 if (payload.datasets !== undefined && !Array.isArray(payload.datasets)) { errors.push(`${label}.datasets: 배열이어야 합니다.`); return; }
 const datasets = Array.isArray(payload.datasets) ? payload.datasets : [];
 if (label === 'public/data/oil-prices.json' && datasets.length === 0) { errors.push(`${label}.datasets: 최소 1개 이상의 지역/유종 데이터가 필요합니다.`); return; }
 validateRegionCoverage(payload, datasets, label);
 datasets.forEach((dataset, index) => {
  if (!isObject(dataset)) { errors.push(`${label}.datasets[${index}]: 객체여야 합니다.`); return; }
  if (!Array.isArray(dataset.stations)) { errors.push(`${label}.datasets[${index}].stations: 배열이어야 합니다.`); return; }
  if (label === 'public/data/oil-prices.json' && dataset.stations.length === 0) errors.push(`${label}.datasets[${index}].stations: 주유소 데이터가 필요합니다.`);
  if (dataset.collectionStatus !== undefined && !['live', 'cached'].includes(String(dataset.collectionStatus))) errors.push(`${label}.datasets[${index}].collectionStatus: live 또는 cached여야 합니다.`);
  if (dataset.collectionStatus === 'cached' && !dateLike(dataset.capturedAt)) errors.push(`${label}.datasets[${index}].capturedAt: cached 데이터에는 기준시각이 필요합니다.`);
  dataset.stations.forEach((station, stationIndex) => {
   if (!isObject(station)) { errors.push(`${label}.datasets[${index}].stations[${stationIndex}]: 객체여야 합니다.`); return; }
   if (!(Number(String(station.price ?? '').replace(/,/g, '')) > 0)) errors.push(`${label}.datasets[${index}].stations[${stationIndex}].price: 양수 가격이 필요합니다.`);
   if (!numeric(station.price)) errors.push(`${label}.datasets[${index}].stations[${stationIndex}].price: 숫자로 변환 가능해야 합니다.`);
   if (station.latitude !== undefined && !numeric(station.latitude)) errors.push(`${label}.datasets[${index}].stations[${stationIndex}].latitude: 숫자로 변환 가능해야 합니다.`);
   if (station.longitude !== undefined && !numeric(station.longitude)) errors.push(`${label}.datasets[${index}].stations[${stationIndex}].longitude: 숫자로 변환 가능해야 합니다.`);
   if (station.coordinateSource === 'region-fallback') errors.push(`${label}.datasets[${index}].stations[${stationIndex}]: 검증되지 않은 지역 좌표는 허용하지 않습니다.`);
   if ((station.latitude === null || station.longitude === null) && station.coordinateSource && !['none', 'not-provided'].includes(String(station.coordinateSource))) warnings.push(`${label}.datasets[${index}].stations[${stationIndex}]: 좌표가 없으면 coordinateSource는 none/not-provided 여야 합니다.`);
   if ((station.name ?? station.stationName) !== undefined && String(station.name ?? station.stationName).trim() === '') warnings.push(`${label}.datasets[${index}].stations[${stationIndex}]: 주유소명이 확인 필요합니다.`);
  });
 });
}

function validateHistory(payload, label) {
 if (!isObject(payload)) { errors.push(`${label}: 루트는 객체여야 합니다.`); return; }
 if (payload.snapshots !== undefined && !Array.isArray(payload.snapshots)) { errors.push(`${label}.snapshots: 배열이어야 합니다.`); return; }
 const snapshots = Array.isArray(payload.snapshots) ? payload.snapshots : [];
 snapshots.forEach((snapshot, index) => {
  if (!isObject(snapshot)) { errors.push(`${label}.snapshots[${index}]: 객체여야 합니다.`); return; }
  if (!dateLike(snapshot.capturedAt)) warnings.push(`${label}.snapshots[${index}].capturedAt: 날짜 형식이 아닙니다.`);
  if (snapshot.metrics !== undefined && !Array.isArray(snapshot.metrics)) { errors.push(`${label}.snapshots[${index}].metrics: 배열이어야 합니다.`); return; }
  (Array.isArray(snapshot.metrics) ? snapshot.metrics : []).forEach((metric, metricIndex) => {
   if (!isObject(metric)) { errors.push(`${label}.snapshots[${index}].metrics[${metricIndex}]: 객체여야 합니다.`); return; }
   if (!numeric(metric.averagePrice ?? metric.price ?? metric.avgPrice)) errors.push(`${label}.snapshots[${index}].metrics[${metricIndex}]: 평균 가격은 숫자로 변환 가능해야 합니다.`);
  });
 });
}

function validateReport(payload, label) {
 if (!isObject(payload)) { errors.push(`${label}: 루트는 객체여야 합니다.`); return; }

 
 const reportObj = payload.report;
 if (reportObj !== undefined) {
  if (!isObject(reportObj)) {
   errors.push(`${label}.report: 객체여야 합니다. 리포트 내용이 표시되지 않습니다.`);
  } else {
   for (const key of ['headline', 'daily', 'weekly', 'consumerTip', 'note']) {
    if (reportObj[key] !== undefined && typeof reportObj[key] !== 'string') {
     warnings.push(`${label}.report.${key}: 문자열이어야 합니다.`);
    }
   }
  }
 }

 
 if (payload.summary !== undefined && !isObject(payload.summary) && !Array.isArray(payload.summary)) {
  warnings.push(`${label}.summary: 객체 또는 배열이어야 합니다.`);
 }
}

function validateReportAgainstPrices(report, prices, history) {
 const datasets = Array.isArray(prices?.datasets) ? prices.datasets : [];
 const stationTotal = datasets.reduce((sum, dataset) => sum + (Array.isArray(dataset?.stations) ? dataset.stations.length : 0), 0);
 const snapshots = Array.isArray(history?.snapshots) ? history.snapshots : [];
 const hasOperationalOilData = datasets.length > 0 && stationTotal > 0 && snapshots.length > 0;
 if (hasOperationalOilData) return;
 if (!isObject(report)) return;
 if (report.generatedAt) errors.push('public/data/oil-ai-report.json: OPINET 누적 데이터가 없는데 요약 리포트 generatedAt이 들어 있습니다. 확인 상태로 저장해야 합니다.');
 if (report.summary?.ready === true) errors.push('public/data/oil-ai-report.json: OPINET 누적 데이터가 없는데 summary.ready=true 입니다.');
 const mode = String(report.mode || '').toLowerCase();
 if (['fallback', 'generated', 'live'].includes(mode)) errors.push(`public/data/oil-ai-report.json: OPINET 누적 데이터가 없는데 mode=${report.mode} 입니다.`);
}


function safeUrl(value) {
 if (!value) return true;
 try { const url = new URL(String(value)); return ['http:', 'https:'].includes(url.protocol); }
 catch { return false; }
}
function validateNewsData(payload, label) {
 if (!isObject(payload)) { errors.push(`${label}: 루트는 객체여야 합니다.`); return; }
 if (payload.items !== undefined && !Array.isArray(payload.items)) { errors.push(`${label}.items: 배열이어야 합니다.`); return; }
 const items = Array.isArray(payload.items) ? payload.items : [];
 items.forEach((item, index) => {
  if (!isObject(item)) { errors.push(`${label}.items[${index}]: 객체여야 합니다.`); return; }
  if (!String(item.title || '').trim()) errors.push(`${label}.items[${index}]: title이 필요합니다.`);
  const newsUrl = String(item.link || item.originallink || '');
  if (newsUrl && !safeUrl(newsUrl)) errors.push(`${label}.items[${index}]: 뉴스 URL은 http/https만 허용됩니다.`);
  if (newsUrl.includes(['example', 'com'].join('.'))) errors.push(`${label}.items[${index}]: 검증되지 않은 뉴스 링크는 허용하지 않습니다.`);
 });
}

const prices = readJsonIfExists(path.join(root, 'public/data/oil-prices.json'), { optional: true });
if (prices) validatePrices(prices, 'public/data/oil-prices.json');
const history = readJsonIfExists(path.join(root, 'public/data/oil-history.json'), { optional: true });
if (history) validateHistory(history, 'public/data/oil-history.json');
const report = readJsonIfExists(path.join(root, 'public/data/oil-ai-report.json'), { optional: true });
if (report) validateReport(report, 'public/data/oil-ai-report.json');
if (report) validateReportAgainstPrices(report, prices, history);
if (prices) validateFreshOilPublicData(prices);
const newsData = readJsonIfExists(path.join(root, 'public/data/fuel-news.json'), { optional: true });
if (newsData) validateNewsData(newsData, 'public/data/fuel-news.json');

if (warnings.length) { console.log('data:check warnings'); warnings.forEach((message) => console.log(`- ${message}`)); }
if (errors.length) { console.error('data:check failed'); errors.forEach((message) => console.error(`- ${message}`)); process.exit(1); }
console.log('data:check passed');
