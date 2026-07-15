import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const errors = [];

function walk(target) {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  return fs.readdirSync(target).flatMap((entry) => walk(path.join(target, entry)));
}

function read(relativePath) {
  const file = path.join(root, relativePath);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function expect(source, snippet, label) {
  if (!source.includes(snippet)) errors.push(`${label} 누락`);
}

function occurrence(source, snippet) {
  return source.split(snippet).length - 1;
}

function hexToRgb(hexColor) {
  const match = /^#([0-9a-f]{6})$/i.exec(hexColor.trim());
  if (!match) return null;
  const value = Number.parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((channelValue) => channelValue / 255);
}

function channel(value) {
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(rgb) {
  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
}

function contrast(foreground, background) {
  const foregroundRgb = hexToRgb(foreground);
  const backgroundRgb = hexToRgb(background);
  if (!foregroundRgb || !backgroundRgb) return Number.NaN;
  const a = luminance(foregroundRgb);
  const b = luminance(backgroundRgb);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function cssToken(css, name) {
  return css.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`))?.[1] ?? '';
}

const sourceFiles = [path.join(root, 'src/pages'), path.join(root, 'src/components'), path.join(root, 'src/data/navigation.ts')]
  .flatMap(walk)
  .filter((file) => /\.(ts|tsx)$/.test(file));
const source = sourceFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
const home = read('src/pages/HomePage.tsx');
const shell = read('src/pages/ProjectShell.tsx');
const navigation = read('src/data/navigation.ts');
const taskLayout = read('src/components/task/AdaptiveTaskLayout.tsx');
const tokens = read('src/styles/DesignTokens.css');
const button = read('src/components/common/Button.tsx');
const price = read('src/components/common/PriceAmount.tsx');
const productState = read('src/components/common/ProductStateNotice.tsx');
const disclaimer = read('src/components/common/DataDisclaimer.tsx');
const appLayout = read('src/components/layout/AppLayout.tsx');
const mobileNav = read('src/components/layout/MobileNav.tsx');
const designSystem = read('src/components/common/designSystem.ts');
const contrastTokens = read('src/components/common/textContrastTokens.ts');

for (const [snippet, label] of [
  ['accentText', '의미 기반 강조색 토큰'],
  ['surfacePage', '페이지 표면 토큰'],
  ['textCaption', '보조 텍스트 토큰'],
  ['nonTextBorder', '비텍스트 경계 토큰'],
]) expect(designSystem, snippet, label);
expect(contrastTokens, 'textContrastTokens', '텍스트 대비 증빙');
expect(contrastTokens, 'nonTextColorTokens', '비텍스트 대비 증빙');
expect(tokens, '--accent-text', 'CSS 강조색 토큰');
expect(tokens, '--surface-page', 'CSS 페이지 표면 토큰');
expect(button, 'data-primary-cta', '공통 주요 CTA 표식');
expect(price, 'whitespace-nowrap', '가격 단위 줄바꿈 방지');
expect(price, 'items-baseline', '가격 단위 기준선 정렬');
expect(productState, 'data-state-kind', '상태 표식');
expect(productState, "'hard-error'", 'hard-error 상태');
expect(productState, 'ds-skeleton', '로딩 스켈레톤');
expect(disclaimer, 'data-disclaimer="api-source"', 'API 출처 안내');
expect(appLayout, '<DataDisclaimer />', '공통 출처 안내 렌더링');
expect(taskLayout, 'data-task-layout="adaptive"', '적응형 과업 레이아웃 표식');
expect(taskLayout, 'data-task-pane="list"', '목록 pane');
expect(taskLayout, 'data-task-pane="detail"', '상세 pane');
expect(taskLayout, 'data-task-pane="supporting"', '보조 pane');
expect(taskLayout, 'data-density-layout="adaptive-data"', '실데이터 기반 밀도 표식');
expect(taskLayout, 'data-layout-flow={layoutEstimate.flow}', '실데이터 기반 세로 흐름');
expect(taskLayout, 'data-wide-layout={layoutEstimate.wide}', '실데이터 기반 와이드 pane');
expect(taskLayout, 'data-collection-count={collectionCount}', '실제 목록 개수 표식');
expect(taskLayout, 'data-supporting-section-count={supportingSectionCount}', '실제 보조 섹션 개수 표식');
expect(taskLayout, 'estimateLayout', '레이아웃 추정 함수');
expect(mobileNav, 'aria-current=', '모바일 현재 메뉴 상태');

const ink500 = cssToken(tokens, '--color-ink-500') || '#6B7280';
const ink700 = cssToken(tokens, '--color-ink-700') || '#444444';
const accentText = cssToken(tokens, '--accent-text');
for (const [label, foreground, minimum] of [['ink-500', ink500, 4.5], ['ink-700', ink700, 4.5], ['accent-text', accentText, 4.5]]) {
  const ratio = contrast(foreground, '#FFFFFF');
  if (!Number.isFinite(ratio) || ratio < minimum) errors.push(`${label} contrast ${Number.isFinite(ratio) ? ratio.toFixed(2) : 'NaN'} < ${minimum}`);
}

const navIds = [...navigation.matchAll(/id:\s*'([^']+)'/g)].map((match) => match[1]);
if (navIds.length !== 5) errors.push(`핵심 내비게이션은 5개여야 합니다: ${navIds.length}`);
if (new Set(navIds).size !== navIds.length) errors.push('중복 내비게이션 id 발견');
if (occurrence(home, 'data-first-answer="true"') !== 1) errors.push('첫 답 표식은 정확히 1개여야 합니다');
if (occurrence(home, 'data-primary-action="true"') !== 1) errors.push('주요 행동 표식은 정확히 1개여야 합니다');
expect(home, 'AdaptiveTaskLayout', '홈 적응형 레이아웃');
expect(home, 'MobileDisclosure', '긴 보조 정보 progressive disclosure');
expect(shell, 'useTaskRoute', 'URL 기반 현재 화면');
expect(shell, 'writeTaskRoute', 'URL 기반 화면 이동');

for (const word of ['TODO', 'FIXME', 'HACK', '한눈에', '한 눈에', '워크벤치', '원문 확인 큐']) {
  if (source.includes(word)) errors.push(`금지된 제품 문구 또는 미완료 표식: ${word}`);
}
if (/onClick=\{\(\) => undefined\}|handleStaticControlClick|href=["']#["']/.test(source)) errors.push('무동작 컨트롤 발견');

if (pkg.name === 'liter-save') {
  for (const [snippet, label] of [
    ['들를 가치가 있는 주유소 찾기', '단일 과업 제목'],
    ['예상 총비용', '추천 근거'],
    ['이 주유소로 길찾기', '주요 행동'],
    ['비교할 3곳', '후보 비교'],
    ['travelCost', '이동비 계산'],
    ['totalCost', '총비용 계산'],
    ['kakaoRouteHref', '실제 길찾기 링크'],
    ['collectionCount={ranked.length}', '실제 주유소 개수 전달'],
    ['maxItems={ranked.length}', '데스크톱 전체 후보 표시'],
    ['catalog', '데스크톱 목록 탐색 모드'],
    ["analysis: { tab: 'home'", '분석 route 통합'],
    ["alerts: { tab: 'guide'", '미구현 알림 route 정리'],
  ]) expect(home + shell, snippet, label);
  if (/이메일 알림|가격 알림 저장/.test(source)) errors.push('지원하지 않는 알림 기능 노출');
}

if (pkg.name === 'farm-price-note') {
  for (const [snippet, label] of [
    ['같은 단위로 가격 비교', '단일 과업 제목'],
    ['같은 단위로 지역 비교', '주요 행동'],
    ['저렴한 지역 3곳', '지역 비교'],
    ['단위가 다른 값은 섞지 않고', '단위 정합성 안내'],
    ['가격 사실만 보여주며 구매 시점이나 구매 여부를 판단하지 않습니다.', '비판단 원칙'],
    ['KakaoRegionalPriceMap', '지역 지도'],
    ["markets: { tab: 'regions'", '시장 route 통합'],
    ["alerts: { tab: 'guide'", '미구현 알림 route 정리'],
  ]) expect(home + shell, snippet, label);
  if (/가격 알림 저장|이메일 알림|장보기 결론/.test(source)) errors.push('지원하지 않거나 판단을 유도하는 기능 문구 노출');
}

if (pkg.name === 'sangjang-note') {
  for (const [snippet, label] of [
    ['가장 가까운 공모 일정', '단일 과업 제목'],
    ['DART 원문 확인', '주요 행동'],
    ['회사의 사업과 공시 사실만 설명합니다', '설명 범위'],
    ['청약 참여 여부, 투자 적합성, 목표가와 수익 전망은 제공하지 않습니다.', '투자 판단 차단 안내'],
    ['관리 데이터', '비AI 데이터 표시'],
    ["calendar: { tab: 'home'", '일정 route 통합'],
    ["filings: { tab: 'ai'", '공시 route 통합'],
  ]) expect(home + shell + source, snippet, label);
  if (/이메일|emailSubscription|EmailSignupModal|MAIL_SUBSCRIPTION/i.test(source)) errors.push('발송 백엔드 없는 이메일 기능 노출');
  if (home.includes('FilingTable filings={filings}')) errors.push('홈에서 전체 공시 표 중복 노출');
  for (const legacy of ['공시에서 확인할 항목', '청약 시작·마감일 확인', '정정 공시 여부 확인']) {
    if (source.includes(legacy)) errors.push(`반복 안내 문구 잔존: ${legacy}`);
  }
}

if (!source.includes('ProductStateNotice') && !source.includes('ServiceStateNotice')) errors.push('오류·빈 상태 컴포넌트 미사용');

if (errors.length) {
  console.error('Product QA gate failed');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log('Product QA gate passed');
console.log(`accent contrast ${contrast(accentText, '#FFFFFF').toFixed(2)}: passed`);
console.log(`primary navigation ${navIds.length}: passed`);
console.log('task-first answer/action contract: passed');
