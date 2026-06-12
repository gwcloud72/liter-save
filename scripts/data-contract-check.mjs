import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const warnings = [];

const MAX_DATA_AGE_DAYS = Number(process.env.OPINET_MAX_DATA_AGE_DAYS || 3);

const REQUIRED_REGION_CODES = ['01','02','03','04','05','06','07','08','09','10','11','14','15','16','17','18','19'];
const REQUIRED_REGION_NAMES = ['서울','경기','강원','충북','충남','전북','전남','경북','경남','부산','제주','대구','인천','광주','대전','울산','세종'];
const REQUIRED_FUEL_CODES = ['B027', 'D047', 'K015'];
function validateRegionCoverage(datasets, label) {
 if (!datasets.length || !label.startsWith('public/data/')) return;
 const names = new Set(datasets.map((dataset) => String(dataset.regionName || '')));
 const fuelCodes = new Set(datasets.map((dataset) => String(dataset.fuelCode || '')));
 const missingFuels = REQUIRED_FUEL_CODES.filter((code) => !fuelCodes.has(code));
 if (missingFuels.length) errors.push(`${label}: 필수 유종 데이터가 누락되었습니다. 누락 유종=${missingFuels.join(',')}`);
 for (const fuelCode of REQUIRED_FUEL_CODES.filter((code) => fuelCodes.has(code))) {
  const codes = new Set(datasets.filter((dataset) => String(dataset.fuelCode || '') === fuelCode).map((dataset) => String(dataset.regionCode || '')));
  const missingCodes = REQUIRED_REGION_CODES.filter((code) => !codes.has(code));
  if (missingCodes.length) errors.push(`${label}: ${fuelCode} 유종의 전국 17개 시도 데이터가 누락되었습니다. 누락 코드=${missingCodes.join(',')}`);
 }
 const specialOnly = [...names].filter((name) => name && !REQUIRED_REGION_NAMES.includes(name) && name !== '전국');
 if (specialOnly.length) warnings.push(`${label}: 광역자치단체 외 지역명이 감지되었습니다. UI에는 시도 기준으로 묶어 표시해야 합니다: ${specialOnly.join(',')}`);
}


function parseDate(value) {
 const date = new Date(value);
 return Number.isNaN(date.getTime()) ? null : date;
}

function latestOilDate(prices, history) {
 const candidates = [prices?.generatedAt, history?.generatedAt, history?.updatedAt];
 for (const snapshot of Array.isArray(history?.snapshots) ? history.snapshots : []) {
  candidates.push(snapshot.capturedAt || snapshot.generatedAt || snapshot.date);
 }
 return candidates.map(parseDate).filter(Boolean).sort((a, b) => b - a)[0] || null;
}

function validateFreshOilPublicData(prices, history) {
 const datasets = Array.isArray(prices?.datasets) ? prices.datasets : [];
 if (!datasets.length) return;
 const latest = latestOilDate(prices, history);
 if (!latest) {
  errors.push('public/data/oil-prices.json: 갱신 기준일 확인이 필요합니다.');
  return;
 }
 const days = Math.floor((Date.now() - latest.getTime()) / 86400000);
 if (days > MAX_DATA_AGE_DAYS) {
  errors.push(`public/data/oil-prices.json: 최신 갱신일 ${latest.toISOString()}이 ${days}일 전입니다. ${MAX_DATA_AGE_DAYS}일 초과 유가 데이터는 배포 금지입니다.`);
 }
}


function readJsonIfExists(filePath, { optional = false } = {}) {
 if (!fs.existsSync(filePath)) {
  if (!optional) errors.push(`${path.relative(root, filePath)}: 파일 확인이 필요합니다.`);
  else warnings.push(`${path.relative(root, filePath)}: 운영 데이터 파일 확인 필요 - fallback 화면로 렌더링됩니다.`);
  return null;
 }
 try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
 catch (error) { errors.push(`${path.relative(root, filePath)}: JSON parse 실패 (${error.message})`); return null; }
}

function isObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function numeric(value) { return value === null || value === undefined || value === '' || Number.isFinite(Number(value)); }
function dateLike(value) { return !value || /^\d{4}-\d{2}-\d{2}/.test(String(value)) || !Number.isNaN(new Date(value).getTime()); }

function validatePrices(payload, label) {
 if (!isObject(payload)) { errors.push(`${label}: 루트는 객체여야 합니다.`); return; }
 if (payload.datasets !== undefined && !Array.isArray(payload.datasets)) { errors.push(`${label}.datasets: 배열이어야 합니다.`); return; }
 const datasets = Array.isArray(payload.datasets) ? payload.datasets : [];
 validateRegionCoverage(datasets, label);
 datasets.forEach((dataset, index) => {
  if (!isObject(dataset)) { errors.push(`${label}.datasets[${index}]: 객체여야 합니다.`); return; }
  if (!Array.isArray(dataset.stations)) { errors.push(`${label}.datasets[${index}].stations: 배열이어야 합니다.`); return; }
  dataset.stations.forEach((station, stationIndex) => {
   if (!isObject(station)) { errors.push(`${label}.datasets[${index}].stations[${stationIndex}]: 객체여야 합니다.`); return; }
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
if (prices) validateFreshOilPublicData(prices, history);
const newsData = readJsonIfExists(path.join(root, 'public/data/fuel-news.json'), { optional: true });
if (newsData) validateNewsData(newsData, 'public/data/fuel-news.json');

if (warnings.length) { console.log('data:check warnings'); warnings.forEach((message) => console.log(`- ${message}`)); }
if (errors.length) { console.error('data:check failed'); errors.forEach((message) => console.error(`- ${message}`)); process.exit(1); }
console.log('data:check passed');
