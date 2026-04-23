
const API_BASE = 'https://www.opinet.co.kr/api';
const RAW_KEY = process.env.OPINET_CERT_KEY || process.env.OPINET_API_KEY || process.argv[2] || '';
const API_KEY = String(RAW_KEY).trim().replace(/^['"]|['"]$/g, '');

if (!API_KEY) {
  console.error('사용법: OPINET_CERT_KEY=발급키 npm run opinet:test');
  process.exit(1);
}

function buildUrl(endpoint, authParam, params = {}) {
  const url = new URL(`${API_BASE}/${endpoint}`);
  url.searchParams.set('out', 'json');
  url.searchParams.set(authParam, API_KEY);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json,text/plain,*/*',
      'User-Agent': 'liter-save-smoke-test/1.0',
    },
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

function oilCount(raw) {
  const oil = raw?.RESULT?.OIL ?? raw?.OIL;
  if (Array.isArray(oil)) return oil.length;
  if (oil && typeof oil === 'object') return 1;
  return 0;
}

function summarize(raw) {
  return {
    topLevelKeys: raw && typeof raw === 'object' ? Object.keys(raw) : [],
    resultKeys: raw?.RESULT && typeof raw.RESULT === 'object' ? Object.keys(raw.RESULT) : [],
    oilCount: oilCount(raw),
    firstOil: Array.isArray(raw?.RESULT?.OIL) ? raw.RESULT.OIL[0] ?? null : raw?.RESULT?.OIL ?? null,
  };
}

const tests = [
  ['avgAllPrice.do', 'code', {}],
  ['avgAllPrice.do', 'certkey', {}],
  ['areaCode.do', 'code', {}],
  ['areaCode.do', 'certkey', {}],
  ['lowTop10.do', 'code', { prodcd: 'B027', cnt: 1 }],
  ['lowTop10.do', 'certkey', { prodcd: 'B027', cnt: 1 }],
];

for (const [endpoint, authParam, params] of tests) {
  const url = buildUrl(endpoint, authParam, params);
  console.log(`\n[TEST] ${endpoint} (${authParam})`);
  console.log(url.toString().replace(API_KEY, '[REDACTED]'));
  try {
    const result = await fetchJson(url);
    console.log(`HTTP ${result.status}`);
    console.log(JSON.stringify(summarize(result.raw), null, 2));
  } catch (error) {
    console.error(`실패: ${error.message}`);
  }
}
