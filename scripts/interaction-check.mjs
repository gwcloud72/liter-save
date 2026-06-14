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
const sourceFiles = walk(path.join(root, 'src')).filter((filePath) => /\.(ts|tsx)$/.test(filePath));
const sourceText = sourceFiles.map((filePath) => fs.readFileSync(filePath, 'utf8')).join('\n');
function expect(snippet, label) { if (!sourceText.includes(snippet)) errors.push(`${label} 누락`); }
function checkControls() {
  for (const filePath of sourceFiles) {
    const relativePath = path.relative(root, filePath);
    const source = fs.readFileSync(filePath, 'utf8');
    const controls = source.match(/<(input|select|textarea)\b[^>]*>/g) || [];
    controls.forEach((control, index) => { if (!/aria-label=/.test(control) && !/id=/.test(control)) errors.push(`${relativePath}: control #${index + 1} 접근성 label 누락`); });
    const buttons = source.match(/<button\b[^>]*>/g) || [];
    buttons.forEach((button, index) => { if (!/onClick=|onFocus=|onMouseEnter=/.test(button)) errors.push(`${relativePath}: button #${index + 1} 동작 핸들러 누락`); if (!/type=/.test(button)) warnings.push(`${relativePath}: button #${index + 1} type 명시 권장`); });
    const links = source.match(/<a\b[^>]*>/g) || [];
    links.forEach((link, index) => { if (/target="_blank"/.test(link) && !/rel="noopener noreferrer"/.test(link)) errors.push(`${relativePath}: external link #${index + 1} rel 누락`); });
  }
}
for (const snippet of ['href="#main-content"', 'id="main-content"', 'aria-current={active ? \'page\' : undefined}', 'aria-live="polite"', 'URLSearchParams', 'window.history.replaceState', "addEventListener('hashchange'", 'function MobileNav', 'VITE_DATA_VERSION', "cache: 'no-store'", 'setReloadKey']) expect(snippet, snippet);
const expectedSnippets = ['내 주변', '가격지도', '가격 분석', '내 차량', '유가 뉴스', '가격 흐름', '지역 가격 지도', 'priceDiffCopy', 'favoriteStationIds'];
for (const item of expectedSnippets) expect(item, item);
checkControls();
if (warnings.length) { console.log('interaction:check warnings'); warnings.forEach((warning) => console.log(`- ${warning}`)); }
if (errors.length) { console.error('interaction:check failed'); errors.forEach((message) => console.error(`- ${message}`)); process.exit(1); }
console.log('interaction:check passed');
console.log(`Scanned files: ${sourceFiles.length}`);
