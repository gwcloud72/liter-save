import fs from 'node:fs/promises';

const SERIES = [
  { key: 'wti', name: 'WTI', seriesId: 'DCOILWTICO' },
  { key: 'brent', name: 'Brent', seriesId: 'DCOILBRENTEU' },
];

function parseFredText(series, text) {
  const rows = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^\d{4}-\d{2}-\d{2}\s+/.test(line))
    .map((line) => {
      const [date, rawValue] = line.split(/\s+/);
      const value = rawValue === '.' ? null : Number(rawValue);
      return { date, value };
    })
    .filter((row) => Number.isFinite(row.value));

  const latest = rows.at(-1);
  const previous = rows.at(-2);

  if (!latest) throw new Error(`${series.name} 데이터가 비어 있습니다.`);

  return {
    key: series.key,
    name: series.name,
    seriesId: series.seriesId,
    unit: 'USD per barrel',
    date: latest.date,
    price: latest.value,
    previousPrice: previous?.value ?? null,
    change: previous ? Number((latest.value - previous.value).toFixed(2)) : null,
  };
}

async function fetchFredSeries(series) {
  const response = await fetch(`https://fred.stlouisfed.org/data/${series.seriesId}`);
  if (!response.ok) {
    throw new Error(`${series.name} 요청 실패: ${response.status} ${response.statusText}`);
  }

  return parseFredText(series, await response.text());
}

const items = await Promise.all(SERIES.map(fetchFredSeries));

const payload = {
  mode: 'fred',
  source: 'FRED / U.S. Energy Information Administration',
  updatedAt: new Date().toISOString(),
  notice: '국제유가는 국내 주유소 가격 해석을 돕기 위한 참고 지표입니다.',
  items,
};

await fs.mkdir('public/data', { recursive: true });
await fs.writeFile('public/data/global-oil.json', JSON.stringify(payload, null, 2), 'utf-8');

console.log('FRED 국제유가 데이터 저장 완료');
console.table(items.map((item) => ({
  name: item.name,
  date: item.date,
  price: item.price,
  change: item.change,
})));
