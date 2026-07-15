import fs from 'node:fs';
import path from 'node:path';

function assert(condition, message) {
  if (!condition) {
    console.error(`[deviation:check] ${message}`);
    process.exit(1);
  }
}

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8');
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return full;
  });
}

function averageOf(data) {
  const values = data.map((item) => item.value).filter(Number.isFinite);
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function rowsFor(data, average = averageOf(data)) {
  return data.map((item) => {
    const deviationPct = ((item.value - average) / average) * 100;
    return { ...item, deviationPct, absDeviationPct: Math.abs(deviationPct) };
  });
}

function widthFor(row, scalePct) {
  return row.absDeviationPct / scalePct;
}

const sample = rowsFor([
  { name: '서울', value: 4647 },
  { name: '대전', value: 4591 },
  { name: '제주', value: 4528 },
]);
const scalePct = Math.max(3, Math.max(...sample.map((row) => row.absDeviationPct)));
const seoul = sample.find((row) => row.name === '서울');
const daejeon = sample.find((row) => row.name === '대전');
const jeju = sample.find((row) => row.name === '제주');
assert(seoul.deviationPct > daejeon.deviationPct, 'higher price must bind to a larger positive deviation');
assert(jeju.deviationPct < 0, 'lower-than-average price must render on the cheap side');
assert(widthFor(seoul, scalePct) > widthFor(daejeon, scalePct), 'bar length must follow actual deviation size');
assert(scalePct >= 3, 'small regional spreads must not be stretched to a misleading full-width scale');

const srcFiles = walk(path.join(process.cwd(), 'src')).filter((file) => /\.(tsx|ts|css)$/.test(file));
const src = srcFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
assert(src.includes('DeviationBarChart'), 'DeviationBarChart must be available for normalized deviation bars');
assert(!src.includes('!' + 'important'), 'important declarations are not allowed');
assert(!src.includes('@apply'), 'no @apply allowed');
assert(!/style=\{\{/.test(src), 'no JSX inline style allowed');

const pkg = JSON.parse(read('package.json'));
const home = read('src/pages/HomePage.tsx');

assert(home.includes('data-first-answer="true"'), 'home must identify the first answer');
assert(home.includes('data-primary-action="true"'), 'home must identify the primary action');
assert(home.includes('AdaptiveTaskLayout'), 'home must use the adaptive task layout');

if (pkg.name === 'farm-price-note') {
  const tabs = read('src/pages/tabs/FarmTabs.tsx');
  assert(home.includes('같은 단위로 지역 비교'), 'farm home must offer a same-unit regional comparison');
  assert(home.includes('저렴한 지역 3곳'), 'farm home must limit the regional summary to three places');
  assert(!home.includes('가격 알림 저장'), 'farm home must not expose a non-operational price alert');
  assert(tabs.includes('전국 평균 대비') && tabs.includes('DeviationBarChart'), 'farm region tab must use an average deviation chart');
}

if (pkg.name === 'liter-save') {
  const tabs = read('src/pages/tabs/LiterTabs.tsx');
  assert(home.includes('예상 총비용'), 'liter home must explain the total-cost recommendation');
  assert(home.includes('비교할 3곳'), 'liter home must limit the nearby comparison to three stations');
  assert(home.includes('이 주유소로 길찾기'), 'liter home must expose the route action with the first answer');
  assert(tabs.includes('브랜드별 평균 대비') && tabs.includes('DeviationBarChart'), 'liter brand comparison must use a deviation chart');
  assert(!tabs.includes('widthClass'), 'manual rank-based bar widths must be removed');
}

if (pkg.name === 'sangjang-note') {
  assert(home.includes('가장 가까운 공모 일정'), 'sangjang home must lead with the nearest IPO schedule');
  assert(home.includes('DART 원문 확인'), 'sangjang home must expose the filing source action');
  assert(home.includes('다음 일정'), 'sangjang home must keep only a compact schedule follow-up');
  assert(!/(추천|비추천|매수|매도|목표가|적정가|기대수익률)/.test(home), 'sangjang home must not contain investment decision language');
}

console.log('[deviation:check] normalized deviation and task-first contract passed');
