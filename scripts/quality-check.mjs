import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const scanRoots = ['src', 'index.html', 'tailwind.config.cjs'];
const textExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.cjs', '.mjs']);
const errors = [];
const warnings = [];

function walk(targetPath) {
  if (!fs.existsSync(targetPath)) return [];
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) return [targetPath];
  return fs.readdirSync(targetPath).flatMap((entry) => walk(path.join(targetPath, entry)));
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function extractJsxAttributeNames(tag) {
  const names = [];
  let index = 1;
  while (index < tag.length && /[\w:.-]/.test(tag[index])) index += 1;
  while (index < tag.length) {
    while (index < tag.length && /\s/.test(tag[index])) index += 1;
    if (index >= tag.length || tag[index] === '>' || tag[index] === '/') {
      index += 1;
      continue;
    }
    const start = index;
    while (index < tag.length && /[\w:.-]/.test(tag[index])) index += 1;
    const name = tag.slice(start, index);
    if (name) names.push(name);
    while (index < tag.length && /\s/.test(tag[index])) index += 1;
    if (tag[index] === '=') {
      index += 1;
      while (index < tag.length && /\s/.test(tag[index])) index += 1;
      if (tag[index] === '"' || tag[index] === "'") {
        const quote = tag[index++];
        while (index < tag.length && tag[index] !== quote) index += 1;
        index += 1;
      } else if (tag[index] === '{') {
        let depth = 0;
        while (index < tag.length) {
          if (tag[index] === '{') depth += 1;
          if (tag[index] === '}') {
            depth -= 1;
            if (depth === 0) {
              index += 1;
              break;
            }
          }
          index += 1;
        }
      } else {
        while (index < tag.length && !/\s|>/.test(tag[index])) index += 1;
      }
    }
  }
  return names;
}

function duplicateAttributesIn(source) {
  const duplicates = [];
  const tags = source.match(/<[A-Z_a-z][^>]*>/g) || [];
  for (const tag of tags) {
    if (tag.startsWith('</') || tag.startsWith('<!--')) continue;
    const names = extractJsxAttributeNames(tag).filter((name) => !name.startsWith('data-'));
    const seen = new Set();
    for (const name of names) {
      if (seen.has(name)) duplicates.push({ name, tag: tag.slice(0, 90) });
      seen.add(name);
    }
  }
  return duplicates;
}


const files = scanRoots
  .flatMap((entry) => walk(path.join(projectRoot, entry)))
  .filter((filePath) => textExtensions.has(path.extname(filePath)));

for (const filePath of files) {
  const relativePath = path.relative(projectRoot, filePath);
  const source = read(filePath);

  if (source.includes('!' + 'important')) {
    errors.push(`${relativePath}: !important 사용 금지`);
  }

  if (source.includes('@' + 'apply')) {
    errors.push(`${relativePath}: @apply 사용 금지`);
  }

  if (/style\s*=\s*\{\s*\{/.test(source)) {
    errors.push(`${relativePath}: 인라인 style={{ ... }} 사용 금지`);
  }

  if (source.includes('Math' + '.random')) {
    errors.push(`${relativePath}: 정보형 화면에서 Math.random 사용 금지`);
  }

  if (relativePath.startsWith('src/') && source.includes('<' + 'title>')) {
    errors.push(`${relativePath}: SVG 기본 title 툴팁 대신 커스텀 데이터 표시를 사용하세요`);
  }

  if (/aria-label="(?:모바일 메뉴|메뉴 열기)"/.test(source)) {
    errors.push(`${relativePath}: 동작 없는 모바일 메뉴 버튼 금지`);
  }

  const tableCount = (source.match(/<table\b/g) || []).length;
  const captionCount = (source.match(/<caption\b/g) || []).length;
  if (captionCount < tableCount) {
    errors.push(`${relativePath}: table ${tableCount}개 중 caption ${captionCount}개만 확인됨`);
  }

  const inertButtons = [...source.matchAll(/<button\b[\s\S]*?>/g)]
    .map((match) => match[0])
    .filter((tag) => !/onClick\s*=/.test(tag));
  if (inertButtons.length) {
    errors.push(`${relativePath}: onClick 없는 button ${inertButtons.length}개 확인`);
  }

  const duplicateAttrs = duplicateAttributesIn(source);
  duplicateAttrs.forEach(({ name, tag }) => {
    errors.push(`${relativePath}: JSX 중복 속성 ${name} 확인 (${tag}...)`);
  });
}

const cssFiles = files.filter((filePath) => path.extname(filePath) === '.css');
const variableDeclarations = cssFiles.flatMap((filePath) => {
  const relativePath = path.relative(projectRoot, filePath);
  const matches = read(filePath).match(/--[a-z0-9-]+\s*:/gi) || [];
  return matches.map((match) => `${relativePath} ${match.replace(/\s*:/, '')}`);
});

const allSource = files.map((filePath) => read(filePath)).join('\n');
if (!allSource.includes('href="#main-content"')) {
  errors.push('본문 바로가기 링크 누락');
}
if (!allSource.includes('id="main-content"')) {
  errors.push('main-content anchor 누락');
}
if (!allSource.includes('aria-current')) {
  errors.push('현재 탭 aria-current 누락');
}
if (!allSource.includes('aria-live')) {
  errors.push('상태 변경 aria-live 누락');
}
if (!allSource.includes('aria-pressed')) {
  errors.push('관심 저장 aria-pressed 누락');
}

if (variableDeclarations.length > 0) {
  warnings.push(`CSS 변수 선언 ${variableDeclarations.length}개 확인: ${variableDeclarations.join(', ')}`);
}

if (warnings.length > 0) {
  console.warn('\nQuality warnings');
  warnings.forEach((warning) => console.warn(`- ${warning}`));
}

if (errors.length > 0) {
  console.error('\nQuality errors');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Quality check passed');
console.log(`Scanned files: ${files.length}`);
console.log(`!important: 0`);
console.log(`@apply: 0`);
console.log(`inline style={{ ... }}: 0`);
console.log(`CSS variables: ${variableDeclarations.length}`);
