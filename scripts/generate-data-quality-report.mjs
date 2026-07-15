import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const publicDataDir = path.join(root, 'public/data');
fs.mkdirSync(docsDir, { recursive: true });
fs.mkdirSync(publicDataDir, { recursive: true });

function readJson(file, fallback = null) {
  try {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    if (!text.trim()) return fallback;
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}
function parseDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}
function ageHours(value) {
  const date = parseDate(value);
  if (!date) return null;
  return Math.max(0, (Date.now() - date.getTime()) / 3600000);
}
function kst(value) {
  const date = parseDate(value);
  if (!date) return '확인 필요';
  const parts = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}.${get('month')}.${get('day')} ${get('hour')}:${get('minute')}`;
}
function writeOutputs(status, markdownReport) {
  const jsonPath = path.join(publicDataDir, 'service-status.json');
  const mdPath = path.join(docsDir, 'data-quality-report.md');
  fs.writeFileSync(jsonPath, `${JSON.stringify(status, null, 2)}\n`);
  fs.writeFileSync(mdPath, `${markdownReport.trim()}\n`);
  console.log(`service-status: ${status.project} ${status.status} score=${status.score}`);
  console.log(`- ${path.relative(root, jsonPath)}`);
  console.log(`- ${path.relative(root, mdPath)}`);
  if (['true','1','yes','on'].includes(String(process.env.PORTFOLIO_READY_STRICT || '').toLowerCase()) && status.status !== 'ready') {
    console.error(`portfolio readiness failed: ${status.status}`);
    process.exit(1);
  }
}

const prices = readJson('public/data/oil-prices.json', {});
const history = readJson('public/data/oil-history.json', {});
const report = readJson('public/data/oil-ai-report.json', {});
const news = readJson('public/data/fuel-news.json', {});
const datasets = Array.isArray(prices.datasets) ? prices.datasets : [];
const stationCount = datasets.reduce((sum, dataset) => sum + (Array.isArray(dataset.stations) ? dataset.stations.length : 0), 0);
const regionCount = new Set(datasets.map((dataset) => dataset.regionName).filter(Boolean)).size;
const fuelCount = new Set(datasets.map((dataset) => dataset.fuelName).filter(Boolean)).size;
const runGeneratedAt = prices.generatedAt || prices.updatedAt || null;
const dataAsOf = prices.dataAsOf || runGeneratedAt;
const dataAgeHours = dataAsOf ? ageHours(dataAsOf) : null;
const snapshots = Array.isArray(history.snapshots) ? history.snapshots : [];
const reportGeneratedAt = report.generatedAt || report.metadata?.generatedAt || null;
const newsCount = Array.isArray(news.items) ? news.items.length : 0;
const cachedDatasetCount = datasets.filter((dataset) => dataset?.collectionStatus === 'cached').length;
const liveDatasetCount = datasets.length - cachedDatasetCount;
const checks = [
  { name: 'OPINET 가격 데이터', status: datasets.length > 0 && stationCount > 0 ? 'pass' : 'fail', detail: `${datasets.length}개 데이터셋, ${stationCount}개 주유소` },
  { name: '실시간 수집 비율', status: cachedDatasetCount === 0 ? 'pass' : 'review', detail: `실시간 ${liveDatasetCount}개, 직전 정상값 ${cachedDatasetCount}개` },
  { name: '유종 커버리지', status: fuelCount >= 3 ? 'pass' : 'review', detail: `${fuelCount}개 유종` },
  { name: '지역 커버리지', status: regionCount >= 17 ? 'pass' : 'review', detail: `${regionCount}개 지역` },
  { name: '가격 기준시각', status: dataAgeHours !== null && dataAgeHours <= 24 ? 'pass' : 'review', detail: dataAsOf ? `${kst(dataAsOf)}, ${dataAgeHours.toFixed(1)}시간 전` : '확인 필요' },
  { name: '가격 이력', status: snapshots.length > 0 ? 'pass' : 'review', detail: `${snapshots.length}개 스냅샷` },
  { name: '유가 뉴스', status: newsCount > 0 ? 'pass' : 'review', detail: `${newsCount}건` },
];
let score = 100;
if (!datasets.length || !stationCount) score -= 45;
if (dataAgeHours === null) score -= 20;
else if (dataAgeHours > 24) score -= Math.min(30, 12 + Math.ceil((dataAgeHours - 24) / 6));
if (cachedDatasetCount > 0) score -= Math.min(20, cachedDatasetCount * 2);
if (fuelCount < 3) score -= 8;
if (regionCount < 17) score -= 8;
if (!snapshots.length) score -= 5;
score = Math.max(0, score);
const status = !datasets.length || !stationCount ? 'empty' : dataAgeHours !== null && dataAgeHours > 24 ? 'stale' : 'ready';
const payload = {
  project: 'liter-save',
  generatedAt: new Date().toISOString(),
  status,
  score,
  summary: status === 'ready'
   ? cachedDatasetCount > 0 ? `OPINET 가격 데이터가 유효하며 ${cachedDatasetCount}개 지역·유종은 24시간 이내 직전 정상값입니다.` : 'OPINET 가격 데이터가 운영 기준입니다.'
   : 'OPINET 가격 데이터 최신성 또는 수집 상태 확인이 필요합니다.',
  data: { source: prices.source || 'OPINET', runGeneratedAt, dataAsOf, ageHours: dataAgeHours, datasetCount: datasets.length, liveDatasetCount, cachedDatasetCount, stationCount, regionCount, fuelCount, snapshots: snapshots.length, reportGeneratedAt, newsCount },
  checks,
};
const markdownReport = `# liter-save 데이터 품질 리포트

| 항목 | 값 |
|---|---:|
| 상태 | ${payload.status} |
| 점수 | ${payload.score}/100 |
| 수집 실행 | ${kst(payload.data.runGeneratedAt)} |
| 가격 기준시각 | ${kst(payload.data.dataAsOf)} |
| 기준시각 경과 | ${payload.data.ageHours !== null ? `${payload.data.ageHours.toFixed(1)}시간` : '확인 필요'} |
| 실시간 데이터셋 | ${payload.data.liveDatasetCount} |
| 직전 정상값 데이터셋 | ${payload.data.cachedDatasetCount} |
| 데이터셋 | ${payload.data.datasetCount} |
| 주유소 | ${payload.data.stationCount} |
| 지역 수 | ${payload.data.regionCount} |
| 유종 수 | ${payload.data.fuelCount} |

## 검사 결과
${checks.map((check) => `- ${check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : '⚠️'} **${check.name}**: ${check.detail}`).join('\n')}

## 다음 조치
- status가 stale이면 GitHub Actions에서 OPINET 수집을 먼저 성공시킵니다.
- 화면에는 가격 기준일과 리포트 생성일을 분리해 표시합니다.
- 지도/길찾기 캡처 갱신 전 이 리포트를 다시 생성합니다.
`;
writeOutputs(payload, markdownReport);
