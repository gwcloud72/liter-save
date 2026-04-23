import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import proj4 from 'proj4';

const OUTPUT_PATH = path.resolve('public/data/oil-prices.json');
const API_BASE = 'https://www.opinet.co.kr/api';
const CERT_KEY = (process.env.OPINET_CERT_KEY ?? '').trim();
const COUNT = Number(process.env.OPINET_COUNT || 20);

const DEFAULT_FUELS = [
  { code: 'B027', name: '휘발유' },
  { code: 'D047', name: '경유' },
];

const BRAND_NAMES = {
  SKE: 'SK에너지',
  GSC: 'GS칼텍스',
  HDO: '현대오일뱅크',
  SOL: 'S-OIL',
  RTE: '자영알뜰',
  RTX: '고속도로알뜰',
  NHO: '농협알뜰',
  ETC: '자가상표',
  E1G: 'E1',
  SKG: 'SK가스',
};

const KATEC_CRS = '+proj=tmerc +lat_0=38 +lon_0=128 +k=0.9999 +x_0=400000 +y_0=600000 +ellps=bessel +towgs84=-146.43,507.89,681.46,0,0,0,0 +units=m +no_defs';
const WGS84_CRS = 'WGS84';

function parsePairs(value, fallback) {
  if (!value || !String(value).trim()) return fallback;
  const pairs = String(value)
    .split(',')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [code, name] = pair.split(':');
      return { code: code?.trim() ?? '', name: name?.trim() || code?.trim() || '이름 없음' };
    })
    .filter((item) => item.code);

  return pairs.length ? pairs : fallback;
}

function findArrayWithKeys(value, keys) {
  if (Array.isArray(value) && value.some((item) => keys.every((key) => key in Object(item)))) {
    return value;
  }
  if (!value || typeof value !== 'object') return [];
  for (const child of Object.values(value)) {
    const found = findArrayWithKeys(child, keys);
    if (found.length) return found;
  }
  return [];
}

function redactUrl(urlLike) {
  const url = new URL(String(urlLike));
  if (url.searchParams.has('certkey')) {
    url.searchParams.set('certkey', '***');
  }
  return url.toString();
}

function summarizePayload(raw) {
  try {
    const topLevelKeys = raw && typeof raw === 'object' ? Object.keys(raw).slice(0, 10) : [];
    const resultKeys = raw?.RESULT && typeof raw.RESULT === 'object' ? Object.keys(raw.RESULT).slice(0, 10) : [];
    return JSON.stringify({ topLevelKeys, resultKeys, result: raw?.RESULT ?? null }).slice(0, 500);
  } catch {
    return '응답 요약 생성 실패';
  }
}

function extractApiMessage(raw) {
  const candidates = [
    raw?.RESULT?.CODE,
    raw?.RESULT?.MSG,
    raw?.RESULT?.MESSAGE,
    raw?.RESULT?.ERROR,
    raw?.CODE,
    raw?.MSG,
    raw?.MESSAGE,
    raw?.ERROR,
    raw?.error,
    raw?.message,
  ].filter(Boolean);

  return candidates.length ? candidates.join(' / ') : null;
}

async function fetchJson(url) {
  const response = await fetch(url);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${redactUrl(url)}`);
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`JSON 파싱 실패: ${redactUrl(url)} / ${error.message}`);
  }
}

async function validateApiKey() {
  const url = new URL(`${API_BASE}/avgAllPrice.do`);
  url.searchParams.set('out', 'json');
  url.searchParams.set('certkey', CERT_KEY);

  const raw = await fetchJson(url);
  const items = findArrayWithKeys(raw, ['TRADE_DT', 'PRODCD', 'PRICE']);

  if (!items.length) {
    const apiMessage = extractApiMessage(raw);
    throw new Error(
      `오피넷 인증키 확인 실패: 전국 평균가격 응답이 비어 있습니다.${apiMessage ? ` (${apiMessage})` : ''} 응답요약=${summarizePayload(raw)}`,
    );
  }
}

async function fetchRegions() {
  const configured = parsePairs(process.env.OPINET_REGIONS, null);
  if (configured) return configured;

  const url = new URL(`${API_BASE}/areaCode.do`);
  url.searchParams.set('out', 'json');
  url.searchParams.set('certkey', CERT_KEY);

  const raw = await fetchJson(url);
  const officialRegions = findArrayWithKeys(raw, ['AREA_CD', 'AREA_NM']).map((item) => ({
    code: String(item.AREA_CD),
    name: String(item.AREA_NM),
  }));

  if (!officialRegions.length) {
    const apiMessage = extractApiMessage(raw);
    throw new Error(
      `오피넷 지역코드 응답이 비어 있습니다.${apiMessage ? ` (${apiMessage})` : ''} 응답요약=${summarizePayload(raw)}`,
    );
  }

  return [{ code: 'ALL', name: '전국' }, ...officialRegions];
}

function extractOilItems(raw) {
  const direct = raw?.RESULT?.OIL ?? raw?.OIL;
  if (Array.isArray(direct)) return direct;
  if (direct && typeof direct === 'object' && 'UNI_ID' in direct) return [direct];
  return findArrayWithKeys(raw, ['UNI_ID', 'PRICE']);
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function convertKatecToWgs84(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return { latitude: null, longitude: null };
  }

  try {
    const [longitude, latitude] = proj4(KATEC_CRS, WGS84_CRS, [x, y]);
    return {
      latitude: Number.isFinite(latitude) ? Number(latitude.toFixed(7)) : null,
      longitude: Number.isFinite(longitude) ? Number(longitude.toFixed(7)) : null,
    };
  } catch (error) {
    console.warn(`좌표 변환 실패: ${error.message}`);
    return { latitude: null, longitude: null };
  }
}

function normalizeStation(item) {
  const brandCode = item.POLL_DIV_CD ?? item.POLL_DIV_CO ?? '';
  const katecX = toNumber(item.GIS_X_COOR);
  const katecY = toNumber(item.GIS_Y_COOR);
  const { latitude, longitude } = convertKatecToWgs84(katecX, katecY);

  return {
    id: String(item.UNI_ID ?? ''),
    name: String(item.OS_NM ?? '이름 없음'),
    brand: BRAND_NAMES[brandCode] ?? String(brandCode || '브랜드 미상'),
    brandCode: String(brandCode || ''),
    price: Number(item.PRICE ?? 0),
    address: String(item.VAN_ADR ?? ''),
    roadAddress: String(item.NEW_ADR ?? ''),
    katecX,
    katecY,
    latitude,
    longitude,
  };
}

async function fetchLowestStations({ region, fuel }) {
  const url = new URL(`${API_BASE}/lowTop10.do`);
  url.searchParams.set('out', 'json');
  url.searchParams.set('prodcd', fuel.code);
  url.searchParams.set('cnt', String(Math.min(Math.max(COUNT, 1), 20)));
  url.searchParams.set('certkey', CERT_KEY);
  if (region.code && region.code !== 'ALL') {
    url.searchParams.set('area', region.code);
  }

  const raw = await fetchJson(url);
  const items = extractOilItems(raw);

  if (!items.length) {
    const apiMessage = extractApiMessage(raw);
    if (apiMessage) {
      throw new Error(`${apiMessage} / ${redactUrl(url)} / 응답요약=${summarizePayload(raw)}`);
    }
  }

  return items
    .map(normalizeStation)
    .filter((station) => station.id && station.price > 0)
    .sort((a, b) => a.price - b.price);
}

async function writeNotConfiguredPayload() {
  const payload = {
    mode: 'not-configured',
    source: 'waiting',
    generatedAt: null,
    notice: '데이터연동대기',
    datasets: [],
  };
  await writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2));
  console.log('데이터연동대기 상태 파일을 생성했습니다.');
}

async function main() {
  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });

  if (!CERT_KEY) {
    await writeNotConfiguredPayload();
    return;
  }

  await validateApiKey();

  const fuels = parsePairs(process.env.OPINET_FUELS, DEFAULT_FUELS);
  const regions = await fetchRegions();
  const datasets = [];

  for (const region of regions) {
    for (const fuel of fuels) {
      try {
        const stations = await fetchLowestStations({ region, fuel });
        if (stations.length > 0) {
          datasets.push({
            regionCode: region.code,
            regionName: region.name,
            fuelCode: fuel.code,
            fuelName: fuel.name,
            stations,
          });
        }
        console.log(`${region.name} / ${fuel.name}: ${stations.length}개 수집`);
      } catch (error) {
        console.warn(`${region.name} / ${fuel.name} 수집 실패: ${error.message}`);
      }
    }
  }

  const totalStations = datasets.reduce((sum, dataset) => sum + dataset.stations.length, 0);

  if (totalStations === 0) {
    throw new Error('오피넷 데이터 수집 결과가 비어 있습니다. OPINET_CERT_KEY, OPINET_REGIONS, OPINET_FUELS 설정과 Actions 로그를 확인해주세요.');
  }

  const payload = {
    mode: 'opinet',
    source: 'Korea National Oil Corporation Opinet Open API',
    generatedAt: new Date().toISOString(),
    notice: '한국석유공사 오피넷 Open API 기준 데이터입니다. 실제 판매 가격과 차이가 있을 수 있습니다.',
    datasets,
  };

  await writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2));
  console.log(`데이터 파일 생성 완료: ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
