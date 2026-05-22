#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const warnings = [];

function readJsonIfExists(filePath, { optional = false } = {}) {
  if (!fs.existsSync(filePath)) {
    if (!optional) errors.push(`${path.relative(root, filePath)}: 파일이 없습니다.`);
    else warnings.push(`${path.relative(root, filePath)}: 운영 데이터 파일 없음 - empty state로 렌더링됩니다.`);
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
  datasets.forEach((dataset, index) => {
    if (!isObject(dataset)) { errors.push(`${label}.datasets[${index}]: 객체여야 합니다.`); return; }
    if (!Array.isArray(dataset.stations)) { errors.push(`${label}.datasets[${index}].stations: 배열이어야 합니다.`); return; }
    dataset.stations.forEach((station, stationIndex) => {
      if (!isObject(station)) { errors.push(`${label}.datasets[${index}].stations[${stationIndex}]: 객체여야 합니다.`); return; }
      if (!numeric(station.price)) errors.push(`${label}.datasets[${index}].stations[${stationIndex}].price: 숫자로 변환 가능해야 합니다.`);
      if ((station.name ?? station.stationName) !== undefined && String(station.name ?? station.stationName).trim() === '') warnings.push(`${label}.datasets[${index}].stations[${stationIndex}]: 주유소명이 비어 있습니다.`);
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
  if (payload.summary !== undefined && !Array.isArray(payload.summary) && typeof payload.summary !== 'string' && !isObject(payload.summary)) warnings.push(`${label}.summary: 배열, 문자열 또는 객체가 아니면 리포트 empty state가 표시됩니다.`);
}

function validateFixtureBundle(payload, label) {
  if (!isObject(payload)) { errors.push(`${label}: fixture bundle은 객체여야 합니다.`); return; }
  for (const key of ['normal', 'edge', 'empty']) {
    if (!isObject(payload[key])) { errors.push(`${label}.${key}: fixture 객체가 필요합니다.`); continue; }
    validatePrices(payload[key].prices, `${label}.${key}.prices`);
    validateHistory(payload[key].history, `${label}.${key}.history`);
    validateReport(payload[key].report, `${label}.${key}.report`);
  }
}

const prices = readJsonIfExists(path.join(root, 'public/data/oil-prices.json'), { optional: true });
if (prices) validatePrices(prices, 'public/data/oil-prices.json');
const history = readJsonIfExists(path.join(root, 'public/data/oil-history.json'), { optional: true });
if (history) validateHistory(history, 'public/data/oil-history.json');
const report = readJsonIfExists(path.join(root, 'public/data/oil-ai-report.json'), { optional: true });
if (report) validateReport(report, 'public/data/oil-ai-report.json');
const fixtures = readJsonIfExists(path.join(root, 'scripts/fixtures/data-contract-fixtures.json'));
if (fixtures) validateFixtureBundle(fixtures, 'scripts/fixtures/data-contract-fixtures.json');

if (warnings.length) { console.log('data:check warnings'); warnings.forEach((message) => console.log(`- ${message}`)); }
if (errors.length) { console.error('data:check failed'); errors.forEach((message) => console.error(`- ${message}`)); process.exit(1); }
console.log('data:check passed');
