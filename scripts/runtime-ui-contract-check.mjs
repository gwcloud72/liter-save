import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; }
function walk(target) {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  return fs.readdirSync(target).flatMap((entry) => walk(path.join(target, entry)));
}
const files = walk(path.join(root, 'src')).filter((file) => /\.(ts|tsx|css)$/.test(file));
const src = files.map(read).join('\n');
const packageJson = JSON.parse(read(path.join(root, 'package.json')) || '{}');
const requiredDeps = ['lucide-react', 'dayjs', 'react', 'react-dom'];
for (const dep of requiredDeps) if (!packageJson.dependencies?.[dep]) errors.push(`dependency 누락: ${dep}`);
if (!packageJson.devDependencies?.typescript) errors.push('typescript devDependency 누락');
const forbidden = ['대시보드', ['G','P','T'].join(''), ['R','E','A','D','M','E'].join(''), ['GitHub','Actions'].join(' '), ['J','S','O','N'].join(''), ['개발','자'].join(''), '프리미엄', '멤버십', '프로'];
for (const word of forbidden) if (src.includes(word)) errors.push(`UI/소스 금지 문자열 감지: ${word}`);
for (const required of ['href="#main-content"', 'id="main-content"', 'aria-current', 'aria-live="polite"', 'aria-pressed', 'URLSearchParams', 'window.history.replaceState', "addEventListener('hashchange'", 'function MobileNav', 'VITE_DATA_VERSION', "cache: 'no-store'", 'setReloadKey']) {
  if (!src.includes(required)) errors.push(`계약 누락: ${required}`);
}
if (!src.includes('<svg') || !src.includes('role="img"') || !src.includes('aria-label')) errors.push('SVG 차트 컴포넌트 누락');
if (!src.includes('lucide-react')) errors.push('lucide-react 아이콘 사용 누락');
if (!src.includes('BottomWidgetPanel')) errors.push('하단 3열 위젯 컴포넌트 누락');
const jsxFiles = walk(path.join(root, 'src')).filter((file) => /\.(js|jsx)$/.test(file));
if (jsxFiles.length) errors.push(`src 안 JS/JSX 파일 남음: ${jsxFiles.map((file) => path.relative(root, file)).join(', ')}`);
if (errors.length) {
  console.error('runtime-ui:check failed');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log('runtime-ui:check passed');
