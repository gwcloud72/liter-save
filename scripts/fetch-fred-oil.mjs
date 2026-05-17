import fs from 'node:fs/promises';

const OUTPUT_PATH = 'public/data/global-oil.json';
const HISTORY_DAYS = Number.parseInt(process.env.FRED_HISTORY_DAYS || '120', 10);
const SERIES = [
  { key: 'brent', name: 'Brent', seriesId: 'DCOILBRENTEU', required: true },
  { key: 'wti', name: 'WTI', seriesId: 'DCOILWTICO', required: false },
];

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseFredText(series, text) {
  const rows = String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^\d{4}-\d{2}-\d{2}\s+/.test(line))
    .map((line) => {
      const [date, rawValue] = line.split(/\s+/);
      const value = rawValue === '.' ? null : toNumber(rawValue);
      return { date, value };
    })
    .filter((row) => row.date && row.value !== null)
    .sort((left, right) => left.date.localeCompare(right.date));

  const latest = rows.at(-1);
  const previous = rows.at(-2);

  if (!latest) {
    throw new Error(`${series.name} 데이터가 비어 있습니다.`);
  }

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
    },
    history: rows.slice(-HISTORY_DAYS).map((row) => ({
      date: row.date,
      price: row.value,
    })),
  };
}

async function fetchFredSeries(series) {
  const response = await fetch(`https://fred.stlouisfed.org/data/${series.seriesId}`);
  if (!response.ok) {
    throw new Error(`${series.name} 요청 실패: ${response.status} ${response.statusText}`);
  }

  return parseFredText(series, await response.text());
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
      fetched.push({ ...existingItem, stale: true });
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
  await writePayload({
    mode: 'pending',
    source: 'FRED / U.S. Energy Information Administration',
    updatedAt: null,
    checkedAt: new Date().toISOString(),
    notice: '국제유가는 국내 주유소 가격 해석을 돕기 위한 참고 지표입니다. FRED 수집 성공 후 표시됩니다.',
    items: [],
    history: {},
    warnings: failures.map(({ series, error }) => ({ key: series.key, name: series.name, message: error.message })),
  });
  console.warn('Brent 수집 실패로 대기 상태 global-oil.json을 생성했습니다. 배포는 계속 진행합니다.');
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
  stale: item.stale ? 'yes' : 'no',
})));
