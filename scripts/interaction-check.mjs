import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const warnings = [];

function walk(target) {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  return fs.readdirSync(target).flatMap((entry) => walk(path.join(target, entry)));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function expect(source, snippet, label) {
  if (!source.includes(snippet)) errors.push(`${label} 누락`);
}

const sourceFiles = walk(path.join(root, 'src')).filter((filePath) => /\.(ts|tsx)$/.test(filePath));
const sourceText = sourceFiles.map((filePath) => fs.readFileSync(filePath, 'utf8')).join('\n');
const pkg = JSON.parse(read('package.json'));

function checkControls() {
  for (const filePath of sourceFiles) {
    const relativePath = path.relative(root, filePath);
    const source = fs.readFileSync(filePath, 'utf8');
    const controls = source.match(/<(input|select|textarea)\b[^>]*>/g) || [];
    controls.forEach((control, index) => {
      if (!/aria-label=|aria-labelledby=|id=/.test(control)) errors.push(`${relativePath}: control #${index + 1} 접근성 이름 누락`);
    });
    const buttons = source.match(/<button\b[^>]*>/g) || [];
    buttons.forEach((button, index) => {
      if (!/onClick=|onFocus=|onMouseEnter=|type="submit"/.test(button)) errors.push(`${relativePath}: button #${index + 1} 동작 핸들러 누락`);
      if (!/type=/.test(button)) warnings.push(`${relativePath}: button #${index + 1} type 명시 권장`);
    });
    const links = source.match(/<a\b[^>]*>/g) || [];
    links.forEach((link, index) => {
      if (/target="_blank"/.test(link) && !/rel="noopener noreferrer"/.test(link)) errors.push(`${relativePath}: external link #${index + 1} rel 누락`);
    });
  }
}

for (const [snippet, label] of [
  ['href="#main-content"', '본문 바로가기'],
  ['id="main-content"', '본문 영역'],
  ['aria-current=', '현재 탐색 상태'],
  ['aria-live="polite"', '상태 알림'],
  ['URLSearchParams', 'URL 상태'],
  ['window.history.replaceState', 'URL 교체'],
  ['window.history.pushState', 'URL 이동'],
  ["addEventListener('hashchange'", '뒤로가기 동기화'],
  ["addEventListener('popstate'", 'history 동기화'],
  ['MobileNav', '모바일 탐색'],
  ['VITE_DATA_VERSION', '데이터 버전'],
  ["cache: 'no-store'", '데이터 재요청'],
  ['setReloadKey', '다시 불러오기'],
  ['AdaptiveTaskLayout', '적응형 과업 레이아웃'],
  ['data-first-answer="true"', '첫 답'],
  ['data-primary-action="true"', '주요 행동'],
  ['useTaskRoute', '과업 URL 읽기'],
  ['writeTaskRoute', '과업 URL 쓰기'],
]) expect(sourceText, snippet, label);

if (/onClick=\{\(\) => undefined\}|handleStaticControlClick|href=["']#["']/.test(sourceText)) errors.push('정적 또는 무동작 컨트롤 발견');

if (pkg.name === 'liter-save') {
  for (const [snippet, label] of [
    ['예상 총비용', '총비용 기준'],
    ['이 주유소로 길찾기', '길찾기 행동'],
    ['비교할 3곳', '비교 목록'],
    ['kakaoRouteHref', '카카오 길찾기 연결'],
    ['favoriteStationIds', '명시적 관심 주유소 상태'],
    ["stations: { tab: 'home'", '주유소 별칭 경로'],
    ["alerts: { tab: 'guide'", '미구현 알림 경로 정리'],
  ]) expect(sourceText, snippet, label);
  if (/이메일 알림|가격 알림 저장/.test(sourceText)) errors.push('지원하지 않는 알림 기능 문구 발견');
}

if (pkg.name === 'farm-price-note') {
  for (const [snippet, label] of [
    ['같은 단위로 지역 비교', '동일 단위 지역 비교'],
    ['저렴한 지역 3곳', '지역 비교 목록'],
    ['KakaoRegionalPriceMap', '지역 지도'],
    ['favoriteCropIds', '명시적 관심 품목 상태'],
    ["markets: { tab: 'regions'", '시장 별칭 경로'],
    ["alerts: { tab: 'guide'", '미구현 알림 경로 정리'],
  ]) expect(sourceText, snippet, label);
  if (/가격 알림 저장|이메일 알림/.test(sourceText)) errors.push('지원하지 않는 알림 기능 문구 발견');
}

if (pkg.name === 'sangjang-note') {
  const shell = read('src/pages/ProjectShell.tsx');
  const viewModel = read('src/data/ipoViewModel.ts');
  for (const [snippet, label] of [
    ['가장 가까운 공모 일정', '가까운 일정'],
    ['DART 원문 확인', 'DART 원문 행동'],
    ['회사의 사업과 공시 사실만 설명합니다', '설명 범위'],
    ['watchCompanyIds', '명시적 관심 종목 상태'],
    ["calendar: { tab: 'home'", '일정 별칭 경로'],
    ["filings: { tab: 'ai'", '공시 별칭 경로'],
  ]) expect(sourceText, snippet, label);
  expect(shell, 'useState<string[]>(() => readArray(WATCH_COMPANY_IDS_KEY, isString))', '빈 관심 종목 초기화');
  expect(viewModel, 'return companies.filter((company) => watched.has(company.id));', '선택된 관심 종목만 반환');
  if (/이메일 알림/.test(sourceText)) errors.push('지원하지 않는 이메일 알림 문구 발견');
}

checkControls();

if (warnings.length) {
  console.log('interaction:check warnings');
  warnings.forEach((warning) => console.log(`- ${warning}`));
}
if (errors.length) {
  console.error('interaction:check failed');
  errors.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}
console.log('interaction:check passed');
console.log(`Scanned files: ${sourceFiles.length}`);
