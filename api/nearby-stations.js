import proj4 from 'proj4';
const API_BASE = process.env.OPINET_API_BASE || 'http://www.opinet.co.kr/api';
const API_KEY = String(process.env.OPINET_CERT_KEY || process.env.OPINET_API_KEY || '').trim().replace(/^['"]|['"]$/g, '');
const KATEC_CRS = '+proj=tmerc +lat_0=38 +lon_0=128 +k=0.9999 +x_0=400000 +y_0=600000 +ellps=bessel +towgs84=-146.43,507.89,681.46,0,0,0,0 +units=m +no_defs';
const WGS84_CRS = 'WGS84';
const FUEL_CODES = { '휘발유': 'B027', '경유': 'D047', LPG: 'K015' };
const BRAND_NAMES = { SKE: 'SK에너지', GSC: 'GS칼텍스', HDO: 'HD현대오일뱅크', SOL: 'S-OIL', RTE: '자영알뜰', RTX: '고속도로알뜰', NHO: '농협알뜰', ETC: '자가상표', E1G: 'E1', SKG: 'SK가스' };
function getQuery(req) { if (req.query) return req.query; const url = new URL(req.url, 'https://request.invalid'); return Object.fromEntries(url.searchParams.entries()); }
function toNumber(value) { const n = Number(value); return Number.isFinite(n) ? n : null; }
function extractOilItems(raw) { const direct = raw?.RESULT?.OIL ?? raw?.OIL; if (Array.isArray(direct)) return direct; if (direct && typeof direct === 'object') return [direct]; return []; }
function normalizeStation(item) {
  const x = toNumber(item.GIS_X_COOR ?? item.gisX ?? item.x);
  const y = toNumber(item.GIS_Y_COOR ?? item.gisY ?? item.y);
  let latitude = null; let longitude = null;
  if (Number.isFinite(x) && Number.isFinite(y)) { try { const [lng, lat] = proj4(KATEC_CRS, WGS84_CRS, [x, y]); latitude = Number.isFinite(lat) ? Number(lat.toFixed(7)) : null; longitude = Number.isFinite(lng) ? Number(lng.toFixed(7)) : null; } catch { latitude = null; longitude = null; } }
  const brandCode = item.POLL_DIV_CD ?? item.POLL_DIV_CO ?? '';
  return { id: String(item.UNI_ID ?? ''), name: String(item.OS_NM ?? '이름 없음'), brand: BRAND_NAMES[brandCode] ?? String(brandCode || '브랜드 확인'), price: Number(item.PRICE ?? 0), distance: Number(item.DISTANCE ?? 0), latitude, longitude };
}
async function fetchNearby({ lat, lng, fuel, sort }) {
  if (!API_KEY) throw new Error('OPINET_CERT_KEY 또는 OPINET_API_KEY가 필요합니다.');
  const latitude = toNumber(lat); const longitude = toNumber(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error('lat/lng 값을 확인하세요.');
  const [x, y] = proj4(WGS84_CRS, KATEC_CRS, [longitude, latitude]);
  const url = new URL(`${API_BASE}/aroundAll.do`);
  url.searchParams.set('out', 'json'); url.searchParams.set('x', String(x)); url.searchParams.set('y', String(y)); url.searchParams.set('radius', '5000'); url.searchParams.set('prodcd', FUEL_CODES[fuel] || FUEL_CODES['휘발유']); url.searchParams.set('sort', sort === 'price' ? '1' : '2'); url.searchParams.set('certkey', API_KEY);
  const response = await fetch(url, { headers: { Accept: 'application/json,text/plain,*/*', 'User-Agent': 'liter-save-nearby/1.0' } });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${text.slice(0, 180)}`);
  const raw = JSON.parse(text);
  return extractOilItems(raw).map(normalizeStation).filter((station) => station.id && station.price > 0);
}
export default async function handler(req, res) {
  try { const query = getQuery(req); const stations = await fetchNearby(query); const payload = { mode: 'opinet-aroundAll', radius: 5000, generatedAt: new Date().toISOString(), stations }; if (res?.status) return res.status(200).json(payload); return new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } }); }
  catch (error) { const payload = { error: error.message }; if (res?.status) return res.status(500).json(payload); return new Response(JSON.stringify(payload), { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } }); }
}
