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
function lineOf(source, index) {
  return source.slice(0, index).split('\n').length;
}
function rel(file) {
  return path.relative(root, file).replaceAll(path.sep, '/');
}

const uiFiles = [path.join(root, 'src/pages'), path.join(root, 'src/components')]
  .flatMap(walk)
  .filter((file) => /\.(tsx|ts)$/.test(file));

const forbidden = [
  { name: 'description prop', re: /\bdescription\s*=/g, message: '화면 설명 prop 금지: 제목과 부제목만 허용' },
  { name: 'desc prop', re: /\bdesc\s*=/g, message: '축약 설명 prop 금지: desc 대신 label/title만 사용' },
  { name: 'summary render', re: /\.(summary|description|consumerTip|daily|weekly|advice|ipoContext|plainSummary|note)\b/g, message: '요약/설명 본문 렌더링 금지: 목록은 제목+메타만 표시' },
  { name: 'line clamp copy', re: /\bline-clamp-\d+\b/g, message: '긴 설명을 잘라 보여주는 방식 금지: 애초에 설명을 렌더링하지 않음' },
];

for (const file of uiFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const fileRel = rel(file);
  for (const rule of forbidden) {
    for (const match of source.matchAll(rule.re)) {
      errors.push(`${fileRel}:${lineOf(source, match.index)} ${rule.message} (${rule.name})`);
    }
  }
  const subtitleCount = [...source.matchAll(/\bsubtitle\s*=/g)].length;
  if (subtitleCount > 1) warnings.push(`${fileRel}: subtitle prop ${subtitleCount}개 확인. 페이지 대표 Hero subtitle 외 사용 금지 권장`);
}

if (warnings.length) {
  console.warn('\nUI copy policy warnings');
  warnings.forEach((warning) => console.warn(`- ${warning}`));
}
if (errors.length) {
  console.error('\nUI copy policy failed');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log('UI copy policy passed');
console.log('화면 설명 prop: 0');
console.log('요약 본문 렌더링: 0');
