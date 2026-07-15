import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];

function walk(target) {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  return fs.readdirSync(target).flatMap((entry) => walk(path.join(target, entry)));
}
function rel(file) {
  return path.relative(root, file).replaceAll(path.sep, '/');
}
function lineOf(source, index) {
  return source.slice(0, index).split('\n').length;
}
function normalizeSelector(selector) {
  return selector.replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ').trim();
}
function contextOf(source, index) {
  const stack = [];
  let segmentStart = 0;
  for (let cursor = 0; cursor < index; cursor += 1) {
    const char = source[cursor];
    if (char === '{') {
      const prelude = source.slice(segmentStart, cursor).trim().replace(/\s+/g, ' ');
      stack.push(prelude.startsWith('@') ? prelude : '');
      segmentStart = cursor + 1;
    } else if (char === '}') {
      stack.pop();
      segmentStart = cursor + 1;
    } else if (char === ';') {
      segmentStart = cursor + 1;
    }
  }
  return stack.filter((entry) => entry.startsWith('@media') || entry.startsWith('@supports') || entry.startsWith('@layer') || entry.startsWith('@container')).join(' > ');
}

const cssFiles = [path.join(root, 'src')]
  .flatMap(walk)
  .filter((file) => file.endsWith('.css'));

const seen = new Map();
for (const file of cssFiles) {
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes('!' + 'important')) errors.push(`${rel(file)}: important 선언 사용 금지`);
  if (source.includes('@' + 'apply')) errors.push(`${rel(file)}: @apply 사용 금지`);

  const stripped = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const blockRe = /([^{}]+)\{[^{}]*\}/g;
  for (const match of stripped.matchAll(blockRe)) {
    const raw = match[1].trim();
    if (!raw || raw.startsWith('@keyframes') || raw === 'from' || raw === 'to' || /^\d+%$/.test(raw)) continue;
    if (raw.startsWith('@')) continue;
    const selector = normalizeSelector(raw);
    if (!selector) continue;
    const context = contextOf(stripped, match.index);
    const key = `${context}::${selector}`;
    const location = `${rel(file)}:${lineOf(stripped, match.index)}`;
    if (seen.has(key)) errors.push(`${location}: 중복 selector '${selector}' / context '${context || 'root'}' / first: ${seen.get(key)}`);
    else seen.set(key, location);
  }
}

if (errors.length) {
  console.error('\nSelector audit failed');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log('Selector audit passed');
console.log(`CSS files: ${cssFiles.length}`);
console.log(`unique selector blocks: ${seen.size}`);
console.log('important declarations: 0');
console.log('@apply: 0');
console.log('duplicate selector blocks: 0');
