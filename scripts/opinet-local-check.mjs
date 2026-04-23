const API_BASE = String(process.env.OPINET_API_BASE || 'http://www.opinet.co.kr/api').trim();
const RAW_KEY = process.env.OPINET_CERT_KEY || process.env.OPINET_API_KEY || process.argv[2] || '';
const API_KEY = String(RAW_KEY).trim().replace(/^['"]|['"]$/g, '');
const STRATEGIES = ['code', 'certkey', 'both'];

if (!API_KEY) {
  console.error('사용법: OPINET_CERT_KEY=발급키 npm run opinet:test');
  process.exit(1);
}

function buildUrl(endpoint, strategy, params = {}) {
  const url = new URL(`${API_BASE}/${endpoint}`);
  url.searchParams.set('out', 'json');
  if (strategy === 'code' || strategy === 'both') url.searchParams.set('code', API_KEY);
  if (strategy === 'certkey' || strategy === 'both') url.searchParams.set('certkey', API_KEY);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && `${value}` !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json,text/plain,*/*',
      'user-agent': 'opinet-local-check/1.2',
    },
    redirect: 'follow',
  });
  const text = await response.text();
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    raw = text;
  }
  return { ok: response.ok, status: response.status, raw };
}

function oilArray(raw) {
  const oil = raw?.RESULT?.OIL ?? raw?.OIL;
  if (Array.isArray(oil)) return oil;
  if (oil && typeof oil === 'object') return [oil];
  return [];
}

function preview(value) {
  try {
    return JSON.stringify(value).slice(0, 280);
  } catch {
    return String(value).slice(0, 280);
  }
}

const tests = [
  ['avgAllPrice', 'avgAllPrice.do', {}, (row) => 'PRODCD' in row && 'PRICE' in row],
  ['areaCode', 'areaCode.do', {}, (row) => 'AREA_CD' in row && 'AREA_NM' in row],
  ['lowTop10 B027', 'lowTop10.do', { prodcd: 'B027', cnt: 1 }, (row) => 'UNI_ID' in row && 'PRICE' in row],
  ['lowTop10 D047', 'lowTop10.do', { prodcd: 'D047', cnt: 1 }, (row) => 'UNI_ID' in row && 'PRICE' in row],
];

console.log(`API_BASE=${API_BASE}`);

for (const [label, endpoint, params, predicate] of tests) {
  console.log(`\n[${label}]`);
  for (const strategy of STRATEGIES) {
    const url = buildUrl(endpoint, strategy, params);
    try {
      const result = await fetchJson(url);
      const rows = oilArray(result.raw);
      const validRows = rows.filter((row) => predicate(Object(row)));
      const safeUrl = url.toString().replace(API_KEY, '[REDACTED]');
      console.log(`- ${strategy} | HTTP ${result.status} | total=${rows.length} | valid=${validRows.length}`);
      console.log(`  ${safeUrl}`);
      console.log(`  preview=${preview(rows[0] ?? result.raw)}`);
    } catch (error) {
      console.log(`- ${strategy} | 실패 | ${error.message}`);
    }
  }
}
