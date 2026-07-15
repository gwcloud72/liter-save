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

const uiFiles = [path.join(root, 'src/pages'), path.join(root, 'src/components'), path.join(root, 'src/data/navigation.ts')]
  .flatMap(walk)
  .filter((file) => /\.(tsx|ts)$/.test(file));

const copyPhrase = (...parts) => parts.join('');
const planningCopyPhrases = [
  copyPhrase('MARKET', ' BOARD'),
  copyPhrase('LITER', ' SAVE'),
  copyPhrase('IPO', ' TODAY'),
  copyPhrase('TO', 'P3'),
  copyPhrase('상승 ', 'TO', 'P'),
  copyPhrase('하락 ', 'TO', 'P'),
  copyPhrase('프리', '뷰'),
  copyPhrase('오늘 ', '가장 ', '급한'),
  copyPhrase('AI ', '3줄'),
  copyPhrase('상태 ', '배지 ', '범례'),
  copyPhrase('배지 ', '범례'),
  copyPhrase('색상만 ', '의존'),
  copyPhrase('색만 ', '보지'),
  copyPhrase('값과 ', '막대 ', '길이'),
  copyPhrase('전체 ', '리스트'),
  copyPhrase('홈', '은'),
  copyPhrase('클러', '스터'),
  copyPhrase('선택 ', '추천'),
  copyPhrase('DART ', '원문 ', '대조가 ', '먼저'),
  copyPhrase('증거금 ', '시뮬레이터'),
  copyPhrase('I', 'CS'),
  copyPhrase('화면으로 ', '이동'),
  copyPhrase('한 ', '번에'),
  copyPhrase('한번에'),
  copyPhrase('한눈에'),
  copyPhrase('한 ', '눈에'),
  copyPhrase('모아서 ', '봅니다'),
  copyPhrase('모아 ', '봅니다'),
  copyPhrase('한곳에서'),
  copyPhrase('카드 ', '할인 ', '반영'),
  copyPhrase('카드 ', '포함'),
  copyPhrase('실결제 ', '최저'),
  copyPhrase('할인 ', '가격 ', '보기'),
  copyPhrase('가격 ', '하락 ', '때'),
  copyPhrase('카드', '할인'),
  copyPhrase('카드 ', '조건 ', '입력'),
  copyPhrase('계산 ', '중'),
  copyPhrase('원천 ', '데이터'),
  copyPhrase('데이터 ', '미리', '보기'),
  copyPhrase('빈 ', '상태 ', '폴백'),
  copyPhrase('데이터 ', '지연 ', '시'),
  copyPhrase('IPO ', '워크', '벤치'),
  copyPhrase('IPO ', '기업 ', '브리프'),
  copyPhrase('원문 ', '확인 ', '큐'),
  copyPhrase('카드', '할인'),
  copyPhrase('가격 ', '하락 ', '때'),
  copyPhrase('카드 ', '조건 ', '입력'),
  copyPhrase('TO', 'DO'),
];

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
  for (const phrase of planningCopyPhrases) {
    let start = 0;
    while (true) {
      const index = source.indexOf(phrase, start);
      if (index === -1) break;
      errors.push(`${fileRel}:${lineOf(source, index)} 내부 문구 노출 금지: ${phrase}`);
      start = index + phrase.length;
    }
  }
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
console.log('internal copy phrases: 0');
