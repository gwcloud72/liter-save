import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { generateGeminiJson } from './lib/gemini-flash.mjs';

const PRICE_PATH = path.resolve('public/data/oil-prices.json');
const HISTORY_PATH = path.resolve('public/data/oil-history.json');
const OUTPUT_PATH = path.resolve('public/data/oil-ai-report.json');
const REGION_CODE = 'ALL';
const GASOLINE_CODE = 'B027';
const DIESEL_CODE = 'D047';
const BLOCKED_TEXT_PATTERN = new RegExp(['G[e]mini', '\uC81C\uBBF8\uB098\uC774', '\uBAA9\uC5C5', '\uC0D8\uD50C', '\uB370\uBAA8', '\uC784\uC2DC', '\uB370\uC774\uD130\\s*\uC5C6\uC74C', '\uD22C\uC790\\s*\uAD8C\uC720', '\uC218\uC775\uB960', '\uB9E4\uC218', '\uB9E4\uB3C4'].join('|'), 'i');

function toNumber(value) {
 const number = Number(value);
 return Number.isFinite(number) ? number : null;
}

function roundCurrency(value) {
 if (!Number.isFinite(value)) return null;
 return Math.round(value * 100) / 100;
}

function formatDiff(value) {
 if (!Number.isFinite(value)) return null;
 const rounded = roundCurrency(value);
 if (rounded === 0) return '0';
 return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

function getDirectionWord(value) {
 if (!Number.isFinite(value) || Math.abs(value) < 0.01) return '보합';
 return value > 0 ? '상승' : '하락';
}

function formatWon(value) {
 const number = Number(value);
 if (!Number.isFinite(number)) return '-';
 return `${Math.round(number).toLocaleString('ko-KR')}원`;
}

async function readJson(filePath, fallback) {
 try {
  const text = await readFile(filePath, 'utf8');
  return JSON.parse(text);
 } catch {
  return fallback;
 }
}

function aggregateMetric(metrics, fuelCode) {
 const rows = metrics.filter((metric) => metric.fuelCode === fuelCode);
 if (!rows.length) return null;
 const prices = rows.map((metric) => toNumber(metric.lowestPrice)).filter((value) => value !== null);
 const weighted = rows.reduce((acc, metric) => {
  const avg = toNumber(metric.averagePrice);
  const count = toNumber(metric.stationCount) || 0;
  if (avg === null) return acc;
  return { total: acc.total + avg * Math.max(1, count), weight: acc.weight + Math.max(1, count) };
 }, { total: 0, weight: 0 });
 return {
  regionCode: REGION_CODE,
  regionName: '전국',
  fuelCode,
  averagePrice: weighted.weight ? Math.round(weighted.total / weighted.weight) : null,
  lowestPrice: prices.length ? Math.min(...prices) : null,
  stationCount: rows.reduce((sum, metric) => sum + (toNumber(metric.stationCount) || 0), 0),
 };
}

function findMetric(snapshot, fuelCode) {
 const metrics = Array.isArray(snapshot?.metrics) ? snapshot.metrics : [];
 return metrics.find((metric) => metric.regionCode === REGION_CODE && metric.fuelCode === fuelCode) ?? aggregateMetric(metrics, fuelCode);
}

function buildHistorySeries(historyPayload) {
 const snapshots = Array.isArray(historyPayload?.snapshots) ? historyPayload.snapshots : [];
 return snapshots
  .map((snapshot) => {
   const gasoline = findMetric(snapshot, GASOLINE_CODE);
   const diesel = findMetric(snapshot, DIESEL_CODE);
   const capturedAt = snapshot?.capturedAt;
   const timestamp = new Date(capturedAt).getTime();
   if (!gasoline || !diesel || Number.isNaN(timestamp)) return null;
   return {
    capturedAt,
    timestamp,
    gasolineAverage: toNumber(gasoline.averagePrice),
    gasolineLowest: toNumber(gasoline.lowestPrice),
    dieselAverage: toNumber(diesel.averagePrice),
    dieselLowest: toNumber(diesel.lowestPrice),
    gasolineStationCount: toNumber(gasoline.stationCount),
    dieselStationCount: toNumber(diesel.stationCount),
   };
  })
  .filter(Boolean)
  .sort((left, right) => left.timestamp - right.timestamp);
}

function getLatestEntry(series) {
 return series[series.length - 1] ?? null;
}

function getPreviousEntry(series, latestEntry, daysBack) {
 if (!latestEntry) return null;
 const target = latestEntry.timestamp - daysBack * 24 * 60 * 60 * 1000;
 const candidates = series
  .filter((entry) => entry.timestamp <= target)
  .sort((left, right) => right.timestamp - left.timestamp);
 return candidates[0] ?? null;
}

function buildSummary(historyPayload, pricePayload) {
 const series = buildHistorySeries(historyPayload);
 const latest = getLatestEntry(series);
 const datasets = Array.isArray(pricePayload?.datasets) ? pricePayload.datasets : [];
 const stationTotal = datasets.reduce((sum, dataset) => sum + (Array.isArray(dataset?.stations) ? dataset.stations.length : 0), 0);
 if (!latest) {
  return {
   ready: false,
   seriesCount: 0,
   stationTotal,
   datasetCount: datasets.length,
   generatedAt: pricePayload?.generatedAt ?? null,
   latest: null,
   changes: {
    day: { gasoline: null, diesel: null },
    week: { gasoline: null, diesel: null },
    month: { gasoline: null, diesel: null },
   },
  };
 }
 const previousDay = getPreviousEntry(series, latest, 1);
 const previousWeek = getPreviousEntry(series, latest, 7);
 const previousMonth = getPreviousEntry(series, latest, 30);
 const change = (current, previous) => {
  if (!Number.isFinite(current) || !previous || !Number.isFinite(previous)) return null;
  return roundCurrency(current - previous);
 };
 return {
  ready: true,
  seriesCount: series.length,
  stationTotal,
  datasetCount: datasets.length,
  generatedAt: latest.capturedAt,
  latest: {
   gasolineAverage: latest.gasolineAverage,
   gasolineLowest: latest.gasolineLowest,
   dieselAverage: latest.dieselAverage,
   dieselLowest: latest.dieselLowest,
  },
  changes: {
   day: {
    gasoline: change(latest.gasolineAverage, previousDay?.gasolineAverage),
    diesel: change(latest.dieselAverage, previousDay?.dieselAverage),
   },
   week: {
    gasoline: change(latest.gasolineAverage, previousWeek?.gasolineAverage),
    diesel: change(latest.dieselAverage, previousWeek?.dieselAverage),
   },
   month: {
    gasoline: change(latest.gasolineAverage, previousMonth?.gasolineAverage),
    diesel: change(latest.dieselAverage, previousMonth?.dieselAverage),
   },
  },
 };
}

function buildReport(summary) {
 if (!summary?.ready || !summary.latest) {
  return {
   headline: '유가 흐름 리포트 확인 예정입니다.',
   daily: '누적 데이터가 아직 부족해 오늘 흐름 분석을 준비하는 중입니다.',
   weekly: '최근 7일 흐름은 가격 이력 확인 후 표시됩니다.',
   monthly: '최근 30일 흐름은 가격 이력 확인 후 표시됩니다.',
   consumerTip: '지금은 지역별 최저가와 가까운 순 비교를 함께 확인해보세요.',
   note: '공개 유가 데이터를 바탕으로 생성한 참고용 리포트입니다.',
  };
 }
 const { latest, changes, seriesCount } = summary;
 const dayGasoline = changes.day.gasoline;
 const dayDiesel = changes.day.diesel;
 const weekGasoline = changes.week.gasoline;
 const weekDiesel = changes.week.diesel;
 const monthGasoline = changes.month.gasoline;
 const monthDiesel = changes.month.diesel;
 const headline = `전국 평균 기준 휘발유 ${formatWon(latest.gasolineAverage)}, 경유 ${formatWon(latest.dieselAverage)} 수준으로 집계됐습니다.`;
 const daily = Number.isFinite(dayGasoline) || Number.isFinite(dayDiesel)
  ? `전일 대비 휘발유 ${formatDiff(dayGasoline) ?? '-'}원, 경유 ${formatDiff(dayDiesel) ?? '-'}원으로 ${getDirectionWord((dayGasoline ?? 0) + (dayDiesel ?? 0))} 흐름입니다.`
  : seriesCount > 0
   ? '현재 누적 데이터가 1회라 전일 비교는 확인 예정입니다.'
   : '오늘 흐름을 분석할 가격 이력을 확인 중입니다.';
 const weekly = Number.isFinite(weekGasoline) || Number.isFinite(weekDiesel)
  ? `최근 7일 기준 휘발유 ${formatDiff(weekGasoline) ?? '-'}원, 경유 ${formatDiff(weekDiesel) ?? '-'}원으로 ${getDirectionWord((weekGasoline ?? 0) + (weekDiesel ?? 0))} 흐름입니다.`
  : '최근 7일 흐름은 누적 데이터가 더 쌓이면 더 정확하게 확인할 수 있습니다.';
 const monthly = Number.isFinite(monthGasoline) || Number.isFinite(monthDiesel)
  ? `최근 30일 기준 휘발유 ${formatDiff(monthGasoline) ?? '-'}원, 경유 ${formatDiff(monthDiesel) ?? '-'}원으로 ${getDirectionWord((monthGasoline ?? 0) + (monthDiesel ?? 0))} 흐름입니다.`
  : '최근 30일 흐름은 누적 데이터가 더 쌓이면 더 정확하게 확인할 수 있습니다.';
 let consumerTip = '가격과 거리 조건을 함께 비교해 조회된 주유소 기준으로 가성비 좋은 곳을 확인해보세요.';
 if (Number.isFinite(weekGasoline) && Number.isFinite(weekDiesel)) {
  if (weekGasoline > 0 && weekDiesel > 0) {
   consumerTip = '상승 흐름이 이어질 때는 가까운 저가 주유소를 먼저 비교하는 편이 유리합니다.';
  } else if (weekGasoline < 0 && weekDiesel < 0) {
   consumerTip = '완만한 하락 흐름이라면 급하지 않은 주유는 시점을 조금 더 지켜볼 수 있습니다.';
  }
 }
 return {
  headline,
  daily,
  weekly,
  monthly,
  consumerTip,
  note: '공개 유가 데이터를 바탕으로 생성한 참고용 리포트입니다.',
 };
}

function cleanText(value, fallback, maxLength = 180) {
 const text = String(value ?? '').replace(/\s+/g, ' ').trim();
 if (!text || BLOCKED_TEXT_PATTERN.test(text)) return fallback;
 return text.slice(0, maxLength);
}

function validateGeminiOilPayload(payload) {
 return Boolean(payload && typeof payload === 'object' && ['headline', 'daily', 'weekly', 'monthly', 'consumerTip', 'note'].every((key) => typeof payload[key] === 'string'));
}

function mergeReport(localReport, incoming) {
 if (!incoming || typeof incoming !== 'object') return localReport;
 return {
  headline: cleanText(incoming.headline, localReport.headline),
  daily: cleanText(incoming.daily, localReport.daily),
  weekly: cleanText(incoming.weekly, localReport.weekly),
  monthly: cleanText(incoming.monthly, localReport.monthly),
  consumerTip: cleanText(incoming.consumerTip, localReport.consumerTip),
  note: cleanText(incoming.note, localReport.note),
 };
}

function buildGeminiInput(summary, localReport) {
 return {
  summary,
  localReport,
  outputRules: ['숫자는 입력값만 사용', '소비자 참고용 표현', '과장 표현 금지', '각 문장 90자 이내'],
 };
}

async function buildFinalReport(summary) {
 const localReport = buildReport(summary);
 const geminiResult = await generateGeminiJson({
  task: '주유 가격 화면에 표시할 짧은 유가 요약 5문장을 다듬습니다.',
  schema: '{"headline":"문장","daily":"문장","weekly":"문장","monthly":"문장","consumerTip":"문장","note":"문장"}',
  input: buildGeminiInput(summary, localReport),
  fallback: localReport,
  validate: validateGeminiOilPayload,
 });
 return {
  report: mergeReport(localReport, geminiResult.payload),
  provider: geminiResult.used ? 'gemini-flash-local-rules' : 'rule-based',
  model: geminiResult.used ? geminiResult.model : null,
 };
}

async function main() {
 await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
 const pricePayload = await readJson(PRICE_PATH, null);
 const historyPayload = await readJson(HISTORY_PATH, null);
 const summary = buildSummary(historyPayload, pricePayload);
 if (!summary.ready) {
  console.log(`운영 유가 데이터 확인 필요: 기존 리포트를 유지합니다: ${OUTPUT_PATH}`);
  return;
 }
 const finalReport = await buildFinalReport(summary);
 const payload = {
  mode: 'generated',
  provider: finalReport.provider,
  model: finalReport.model,
  generatedAt: new Date().toISOString(),
  report: finalReport.report,
  summary,
 };
 await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
 console.log(`요약 리포트 파일 생성 완료: ${OUTPUT_PATH}`);
}

main().catch((error) => {
 console.error(error);
 process.exit(1);
});
