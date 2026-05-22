#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const errors = [];
const warnings = [];

function read(relativePath) {
  const absolute = path.join(root, relativePath);
  if (!fs.existsSync(absolute)) {
    errors.push(`${relativePath}: 파일이 없습니다.`);
    return '';
  }
  return fs.readFileSync(absolute, 'utf8');
}

function walk(targetPath) {
  if (!fs.existsSync(targetPath)) return [];
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) return [targetPath];
  return fs.readdirSync(targetPath).flatMap((entry) => walk(path.join(targetPath, entry)));
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function expectSourceContains(snippet, label) {
  if (!allSource.includes(snippet)) errors.push(`${label} 누락`);
}

function expectFileContains(relativePath, snippets, label) {
  const source = read(relativePath);
  for (const snippet of snippets) {
    if (!source.includes(snippet)) errors.push(`${relativePath}: ${label} 확인 실패 (${snippet})`);
  }
}

function expectFileNotContains(relativePath, snippet, label) {
  const source = read(relativePath);
  if (source.includes(snippet)) errors.push(`${relativePath}: ${label} 위반 (${snippet})`);
}

async function importFrom(relativePath) {
  const absolute = path.join(root, relativePath);
  return import(pathToFileURL(absolute).href);
}

const sourceFiles = walk(path.join(root, 'src')).filter((filePath) => /\.(js|jsx|ts|tsx)$/.test(filePath));
const allSource = sourceFiles.map((filePath) => fs.readFileSync(filePath, 'utf8')).join('\n');

function checkFormControlsHaveLabels() {
  for (const filePath of sourceFiles) {
    const relativePath = path.relative(root, filePath);
    const source = fs.readFileSync(filePath, 'utf8');
    const controls = source.match(/<(input|select|textarea)\b[^>]*>/g) || [];
    controls.forEach((control, index) => {
      if (!/aria-label=/.test(control) && !/id=/.test(control)) {
        errors.push(`${relativePath}: ${control.match(/^<\w+/)?.[0] || 'control'} #${index + 1} 접근성 label 누락`);
      }
    });
  }
}

function checkButtonsHaveHandlers() {
  for (const filePath of sourceFiles) {
    const relativePath = path.relative(root, filePath);
    const source = fs.readFileSync(filePath, 'utf8');
    const buttons = source.match(/<button\b[^>]*>/g) || [];
    buttons.forEach((button, index) => {
      const hasHandler = /onClick=|onFocus=|onMouseEnter=/.test(button);
      const hasType = /type=/.test(button);
      if (!hasHandler) errors.push(`${relativePath}: button #${index + 1} 동작 핸들러 누락`);
      if (!hasType) warnings.push(`${relativePath}: button #${index + 1} type 명시 권장`);
    });
  }
}

function checkExternalLinksHaveRel() {
  for (const filePath of sourceFiles) {
    const relativePath = path.relative(root, filePath);
    const source = fs.readFileSync(filePath, 'utf8');
    const links = source.match(/<a\b[^>]*>/g) || [];
    links.forEach((link, index) => {
      if (/target="_blank"/.test(link)) {
        const rel = (link.match(/rel="([^"]+)"/)?.[1] || '').split(/\s+/);
        if (!rel.includes('noopener') || !rel.includes('noreferrer')) {
          errors.push(`${relativePath}: external link #${index + 1} rel="noopener noreferrer" 누락`);
        }
      }
    });
  }
}

function checkSharedContracts() {
  expectSourceContains('href="#main-content"', '본문 바로가기 링크');
  expectSourceContains('id="main-content"', 'main-content anchor');
  expectSourceContains('aria-current={tab === item.id ? \'page\' : undefined}', '현재 탭 aria-current');
  expectSourceContains('aria-live="polite"', '결과/차트 live region');
  expectSourceContains('URLSearchParams', 'hash query 상태 관리');
  expectSourceContains('window.history.replaceState', 'URL 상태 유지');
  expectSourceContains('window.localStorage.setItem', '관심 목록 저장');
  expectSourceContains('try {', '저장소/URL 예외 방어');
  expectSourceContains('catch {', '저장소/URL 예외 방어');
  expectSourceContains('toggle:', '관심 목록 toggle API');
  expectSourceContains('조건에 맞는', '빈 결과 상태');
  expectSourceContains('onMouseEnter', '그래프 hover 상호작용');
  expectSourceContains('onFocus', '그래프 keyboard focus 상호작용');
  checkFormControlsHaveLabels();
  checkButtonsHaveHandlers();
  checkExternalLinksHaveRel();
}

async function checkFarmContracts() {
  if (!fs.existsSync(path.join(root, 'src/lib/dashboardFilters.js')) || !fs.existsSync(path.join(root, 'src/components/farm'))) return;
  const mod = await importFrom('src/lib/dashboardFilters.js');
  assert(mod.normalizeSort('가격 낮은 순') === 'price-asc', '농산물: 레거시 정렬 label 매핑 실패');
  assert(mod.normalizeSort('bad') === mod.DEFAULT_FILTERS.sort, '농산물: 잘못된 정렬값 fallback 실패');
  const rows = mod.decorateRows([
    { name: '배추', region: '서울', high: '서울', low: '제주', range: '900~1,200', price: 1200, diff: 35, rate: 3.1 },
    { name: '대파', region: '부산', high: '부산', low: '전남', range: '700~950', price: 800, diff: -10, rate: -1.2 },
    { name: '무', region: '서울', high: '서울', low: '강원', range: '600~900', price: 650, diff: 8, rate: 0.8 },
  ]);
  assert(mod.filterRows(rows, { ...mod.DEFAULT_FILTERS, query: '배추' }).length === 1, '농산물: 검색 필터 실패');
  assert(mod.filterRows(rows, { ...mod.DEFAULT_FILTERS, region: '서울' }).length === 2, '농산물: 지역 필터 실패');
  assert(mod.sortRows(rows, 'price-asc')[0].name === '무', '농산물: 가격 낮은 순 정렬 실패');
  assert(mod.sliceSeries([1,2,3,4,5,6,7,8,9], ['1','2','3','4','5','6','7','8','9'], '최근 7일').values[0] === 3, '농산물: 기간별 차트 slice 실패');
  expectFileContains('src/components/farm/TrendChart.jsx', ['tabIndex="0"', 'aria-live="polite"'], '차트 접근성');
  expectFileContains('src/components/farm/CropTable.jsx', ['<caption', 'aria-pressed', 'EmptyState'], '표/관심/빈 상태');
  expectFileNotContains('src/components/farm/CropTable.jsx', 'rows.slice(', '모바일 결과 임의 제한 제거');
}

async function checkLiterSaveContracts() {
  if (!fs.existsSync(path.join(root, 'src/lib/dashboardData.js')) || !fs.existsSync(path.join(root, 'src/components/litersave'))) return;
  const mod = await importFrom('src/lib/dashboardData.js');
  assert(mod.normalizeSort('unknown') === mod.DEFAULT_FILTERS.sort, 'Liter Save: 잘못된 정렬값 fallback 실패');
  assert(mod.safeExternalUrl('javascript:alert(1)') === '', 'Liter Save: 위험 URL 차단 실패');
  assert(mod.safeExternalUrl('https://example.com/a') === 'https://example.com/a', 'Liter Save: 안전 URL 허용 실패');
  const stations = [
    { id: 'a', name: '강남 셀프', brand: 'S-OIL', address: '서울 강남구', roadAddress: '서울 강남구', price: 1590 },
    { id: 'b', name: '종로 주유소', brand: 'SK에너지', address: '서울 종로구', roadAddress: '서울 종로구', price: 1680 },
    { id: 'c', name: '서초 주유소', brand: 'GS칼텍스', address: '서울 서초구', roadAddress: '서울 서초구', price: 1620 },
  ];
  const avg = mod.average(stations.map((item) => item.price));
  assert(avg === 1630, 'Liter Save: 평균 계산 실패');
  assert(mod.filterStations(stations, { ...mod.DEFAULT_FILTERS, query: '강남' }, avg).length === 1, 'Liter Save: 검색 필터 실패');
  assert(mod.filterStations(stations, { ...mod.DEFAULT_FILTERS, sort: 'price-asc' }, avg)[0].id === 'a', 'Liter Save: 가격 정렬 실패');
  assert(mod.mapSearchUrl(stations[0]).startsWith('https://map.naver.com/'), 'Liter Save: 길찾기 URL 생성 실패');
  expectFileContains('src/components/litersave/TrendCard.jsx', ['tabIndex="0"', 'aria-live="polite"'], '차트 접근성');
  expectFileContains('src/components/litersave/StationTable.jsx', ['<caption', 'aria-pressed', 'rel="noopener noreferrer"', 'EmptyState'], '표/관심/외부 링크/빈 상태');
  expectFileNotContains('src/components/litersave/StationTable.jsx', 'stations.slice(', '모바일 결과 임의 제한 제거');
}

async function checkSangjangContracts() {
  if (!fs.existsSync(path.join(root, 'src/lib/dashboardFilters.js')) || !fs.existsSync(path.join(root, 'src/components/sangjang'))) return;
  const mod = await importFrom('src/lib/dashboardFilters.js');
  assert(mod.normalizeSort('기업명') === 'company-asc', '상장노트: 레거시 정렬 label 매핑 실패');
  assert(mod.normalizeSort('bad') === mod.DEFAULT_FILTERS.sort, '상장노트: 잘못된 정렬값 fallback 실패');
  assert(mod.safeExternalUrl('javascript:alert(1)') === '', '상장노트: 위험 URL 차단 실패');
  assert(mod.safeExternalUrl('https://dart.fss.or.kr/test') === 'https://dart.fss.or.kr/test', '상장노트: 안전 URL 허용 실패');
  const items = [
    { id: 'a', company: '가온바이오', market: '코스닥', sector: '바이오', manager: 'NH투자증권', status: '청약 진행', filingType: '정정신고서', filingNote: '수요예측 반영', subscription: '05.22~05.23', refund: '05.26', listing: '06.02', price: '18,000원' },
    { id: 'b', company: '대한소재', market: '코스피', sector: '소재', manager: '미래에셋증권', status: '상장 예정', filingType: '증권신고서', filingNote: '원문 확인', subscription: '05.28~05.29', refund: '06.01', listing: '06.10', price: '32,000원' },
    { id: 'c', company: '청명테크', market: '코스닥', sector: 'IT', manager: '삼성증권', status: '완료', filingType: '투자설명서', filingNote: '공시', subscription: '04.10~04.11', refund: '04.14', listing: '04.21', price: '12,000원' },
  ];
  const referenceDate = new Date(2025, 4, 22);
  assert(mod.filterItems(items, { ...mod.DEFAULT_FILTERS, query: '바이오' }, referenceDate).length === 1, '상장노트: 검색 필터 실패');
  assert(mod.filterItems(items, { ...mod.DEFAULT_FILTERS, market: '코스피' }, referenceDate).length === 1, '상장노트: 시장 필터 실패');
  assert(mod.filterItems(items, { ...mod.DEFAULT_FILTERS, status: '진행' }, referenceDate).length === 1, '상장노트: 상태 필터 실패');
  assert(mod.sortItems(items, 'company-asc')[0].company === '가온바이오', '상장노트: 기업명 정렬 실패');
  assert(mod.isPriorityDisclosure(items[0]), '상장노트: 우선 확인 공시 판별 실패');
  assert(mod.priorityLabel(items[0]) === '정정', '상장노트: 우선 공시 라벨 실패');
  expectFileContains('src/components/sangjang/MonthChart.jsx', ['onFocus', 'aria-live="polite"'], '차트 접근성');
  expectFileContains('src/components/sangjang/IpoTable.jsx', ['<caption', 'aria-pressed', 'rel="noopener noreferrer"', 'EmptyState'], '표/관심/외부 링크/빈 상태');
  expectFileNotContains('src/components/sangjang/IpoTable.jsx', 'rows.slice(', '모바일 결과 임의 제한 제거');
  expectFileContains('src/components/sangjang/DisclosurePanel.jsx', ['우선 확인', '일반 공시'], '공시 우선순위 분리');
}

checkSharedContracts();
await checkFarmContracts();
await checkLiterSaveContracts();
await checkSangjangContracts();

if (warnings.length) {
  console.log('interaction:check warnings');
  warnings.forEach((message) => console.log(`- ${message}`));
}

if (errors.length) {
  console.error('interaction:check failed');
  errors.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log('interaction:check passed');
console.log(`Scanned files: ${sourceFiles.length}`);
