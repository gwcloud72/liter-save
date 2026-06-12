import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const warnings = [];
const extensions = new Set(['.ts', '.tsx', '.css', '.html', '.cjs', '.mjs']);
function walk(target) {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  return fs.readdirSync(target).flatMap((entry) => walk(path.join(target, entry)));
}
function read(file) { return fs.readFileSync(file, 'utf8'); }
const files = ['src', 'index.html', 'tailwind.config.cjs', 'tsconfig.json']
  .flatMap((entry) => walk(path.join(root, entry)))
  .filter((file) => extensions.has(path.extname(file)));
for (const file of files) {
  const rel = path.relative(root, file);
  const source = read(file);
  if (source.includes('!' + 'important')) errors.push(`${rel}: !important 사용 금지`);
  if (source.includes('@' + 'apply')) errors.push(`${rel}: @apply 사용 금지`);
  if (/style\s*=\s*\{\s*\{/.test(source)) errors.push(`${rel}: 인라인 style={{ ... }} 사용 금지`);
  if (source.includes('Math' + '.random')) errors.push(`${rel}: Math.random 사용 금지`);
  if (rel.startsWith('src/') && source.includes('<' + 'title>')) errors.push(`${rel}: SVG title 태그 사용 금지`);
  if (/aria-label="(?:모바일 메뉴|메뉴 열기)"/.test(source)) errors.push(`${rel}: 동작 없는 모바일 메뉴 버튼 금지`);
  if (file.endsWith('.tsx')) {
    const tableCount = (source.match(/<table\b/g) || []).length;
    const captionCount = (source.match(/<caption\b/g) || []).length;
    if (captionCount < tableCount) errors.push(`${rel}: table ${tableCount}개 중 caption ${captionCount}개만 확인됨`);
    const inertButtons = [...source.matchAll(/<button\b[^>]*>/g)].map((match) => match[0]).filter((tag) => !/onClick\s*=/.test(tag));
    if (inertButtons.length) errors.push(`${rel}: onClick 없는 button ${inertButtons.length}개 확인`);
  }
}
const allSource = files.map(read).join('\n');
for (const required of ['href="#main-content"', 'id="main-content"', 'aria-current', 'aria-live', 'aria-pressed']) {
  if (!allSource.includes(required)) errors.push(`${required} 누락`);
}
const cssVars = files.filter((file) => file.endsWith('.css')).flatMap((file) => (read(file).match(/--[a-z0-9-]+\s*:/gi) || []));
if (cssVars.length) warnings.push(`CSS 변수 선언 ${cssVars.length}개 확인`);
if (warnings.length) { console.warn('\nQuality warnings'); warnings.forEach((warning) => console.warn(`- ${warning}`)); }
if (errors.length) { console.error('\nQuality errors'); errors.forEach((error) => console.error(`- ${error}`)); process.exit(1); }
console.log('Quality check passed');
console.log(`Scanned files: ${files.length}`);
console.log('!important: 0');
console.log('@apply: 0');
console.log('inline style={{ ... }}: 0');
console.log(`CSS variables: ${cssVars.length}`);
