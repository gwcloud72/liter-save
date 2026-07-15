import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const errors = [];
const warnings = [];
const REQUIRED_REGION_CODES = ['ALL','01','02','03','04','05','06','08','09','10','11','14','15','17','18','19','20'];
const LEGACY_REGION_CODES = ['07', '16'];

function valueOf(name) {
 const value = process.env[name];
 return value === undefined ? '' : String(value).trim();
}

function optionalBoolean(name) {
 const value = valueOf(name).toLowerCase();
 if (!value) return;
 if (!['true', 'false', '1', '0', 'yes', 'no', 'on', 'off'].includes(value)) {
  errors.push(`${name}: boolean 문자열이어야 합니다. 예: true 또는 false`);
 }
}

function optionalInteger(name, { min = -Infinity, max = Infinity } = {}) {
 const raw = valueOf(name);
 if (!raw) return;
 const number = Number(raw);
 if (!Number.isInteger(number)) {
  errors.push(`${name}: 정수 문자열이어야 합니다. 현재값=${raw}`);
  return;
 }
 if (number < min || number > max) errors.push(`${name}: ${min}~${max} 범위여야 합니다. 현재값=${raw}`);
}

function parsePairs(name) {
 const raw = valueOf(name);
 if (!raw) return [];
 try {
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) {
   const codes = [];
   parsed.forEach((item, index) => {
    if (!item || typeof item !== 'object') errors.push(`${name}[${index}]: 객체여야 합니다.`);
    else if (!String(item.code ?? '').trim()) errors.push(`${name}[${index}].code: 필수입니다.`);
    else codes.push(String(item.code).trim());
   });
   return codes;
  }
  errors.push(`${name}: JSON을 쓸 경우 배열이어야 합니다.`);
  return [];
 } catch {
  const pairs = raw.split(',').map((part) => part.trim()).filter(Boolean);
  if (!pairs.length) errors.push(`${name}: 확인 필요합니다.`);
  const codes = [];
  pairs.forEach((pair, index) => {
   const [code] = pair.split(':');
   if (!String(code || '').trim()) errors.push(`${name}[${index}]: code:name 형식이어야 합니다.`);
   else codes.push(String(code).trim());
  });
  return codes;
 }
}

function requireAllRegionsWhenProvided() {
 const codes = parsePairs('OPINET_REGIONS');
 if (!codes.length) return;
 const legacy = LEGACY_REGION_CODES.filter((code) => codes.includes(code));
 if (legacy.length) errors.push(`OPINET_REGIONS: 폐기된 지역코드 ${legacy.join(',')}를 제거하고 20:전남광주를 사용하거나 변수를 삭제하세요.`);
 const missing = REQUIRED_REGION_CODES.filter((code) => !codes.includes(code));
 const unknown = codes.filter((code) => !REQUIRED_REGION_CODES.includes(code));
 if (missing.length || unknown.length) errors.push(`OPINET_REGIONS: 현재 전국+16개 OPINET 지역 그룹과 일치해야 합니다. 누락=${missing.join(',') || '없음'} / 알 수 없는 코드=${unknown.join(',') || '없음'}`);
}

function optionalGeminiModel() {
 const raw = valueOf('GEMINI_MODEL');
 if (!raw) return;
 if (!/^gemini-3\.5-flash(?:-[a-z0-9.\-]+)?$/i.test(raw)) {
  errors.push('GEMINI_MODEL: Gemini 3.5 Flash 계열만 허용됩니다. 예: gemini-3.5-flash');
 }
}

function optionalThinkingLevel() {
 const raw = valueOf('GEMINI_THINKING_LEVEL');
 if (!raw) return;
 if (!['MINIMAL', 'LOW', 'MEDIUM', 'HIGH'].includes(raw.toUpperCase())) {
  errors.push(`GEMINI_THINKING_LEVEL: MINIMAL | LOW | MEDIUM | HIGH 중 하나여야 합니다. 현재값=${raw}`);
 }
}

function truthy(value) {
 return ['true', '1', 'yes', 'on'].includes(String(value || '').toLowerCase());
}

try {
 require('../tailwind.config.cjs');
} catch (error) {
 errors.push(`tailwind.config.cjs 로드 실패: ${error.message}`);
}

optionalInteger('OPINET_COUNT', { min: 1, max: 20 });
optionalInteger('HISTORY_RETENTION_DAYS', { min: 30, max: 730 });
optionalInteger('OPINET_REQUEST_TIMEOUT_MS', { min: 1000, max: 60000 });
optionalInteger('OPINET_REQUEST_PAUSE_MS', { min: 0, max: 10000 });
optionalInteger('OPINET_REQUEST_MAX_RETRIES', { min: 0, max: 6 });
optionalInteger('OPINET_REQUEST_RETRY_BASE_MS', { min: 100, max: 30000 });
optionalInteger('OPINET_RATE_LIMIT_MAX_REQUESTS', { min: 1, max: 100 });
optionalInteger('OPINET_RATE_LIMIT_WINDOW_MS', { min: 1000, max: 300000 });
optionalInteger('OPINET_EMPTY_RESPONSE_COOLDOWN_MS', { min: 0, max: 300000 });
optionalInteger('OPINET_FALLBACK_MAX_AGE_HOURS', { min: 1, max: 168 });
optionalInteger('FRED_HISTORY_DAYS', { min: 7, max: 730 });
optionalInteger('FRED_REQUEST_TIMEOUT_MS', { min: 1000, max: 60000 });
optionalInteger('FRED_MAX_RETRIES', { min: 0, max: 6 });
optionalInteger('FRED_RETRY_BASE_MS', { min: 100, max: 30000 });
optionalInteger('NEWS_DISPLAY', { min: 1, max: 100 });
optionalInteger('NEWS_MAX_ITEMS', { min: 1, max: 100 });
optionalInteger('NEWS_REQUEST_PAUSE_MS', { min: 0, max: 5000 });
optionalBoolean('GEMINI_REPORTS_ENABLED');
optionalInteger('GEMINI_REQUEST_PAUSE_MS', { min: 5000, max: 60000 });
optionalInteger('GEMINI_MAX_INPUT_CHARS', { min: 4000, max: 60000 });
optionalInteger('GEMINI_MAX_RETRIES', { min: 0, max: 4 });
optionalInteger('GEMINI_TIMEOUT_MS', { min: 5000, max: 120000 });
optionalThinkingLevel();
optionalGeminiModel();
requireAllRegionsWhenProvided();
parsePairs('OPINET_FUELS');

if (!valueOf('OPINET_CERT_KEY') && !valueOf('OPINET_API_KEY')) {
 warnings.push('OPINET 인증 정보가 설정되지 않으면 Actions는 대기용 데이터로 전환하고 기본 표시 데이터로 배포합니다.');
}
if (!valueOf('FRED_API_KEY')) {
 warnings.push('FRED_API_KEY가 없으면 국제유가는 공개 CSV 내보내기 경로로 수집합니다.');
}
if (!valueOf('VITE_KAKAO_MAP_APP_KEY')) {
 warnings.push('카카오맵 연동 정보가 설정되지 않으면 화면은 지도 안내 영역으로 렌더링됩니다.');
}
if (!valueOf('NEWS_CLIENT_ID') || !valueOf('NEWS_CLIENT_SECRET')) {
 warnings.push('NEWS_CLIENT_ID/NEWS_CLIENT_SECRET가 설정되지 않으면 뉴스 수집을 건너뜁니다.');
}
if (truthy(valueOf('GEMINI_REPORTS_ENABLED')) && !valueOf('GEMINI_API_KEY')) {
 errors.push('GEMINI_REPORTS_ENABLED=true이면 GEMINI_API_KEY가 필요합니다.');
}

if (warnings.length) {
 console.log('actions:check warnings');
 warnings.forEach((message) => console.log(`- ${message}`));
}
if (errors.length) {
 console.error('actions:check failed');
 errors.forEach((message) => console.error(`- ${message}`));
 process.exit(1);
}
console.log('actions:check passed');
