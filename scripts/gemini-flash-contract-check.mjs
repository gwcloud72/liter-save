import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';

const files = [
 'scripts/lib/gemini-flash.mjs',
 'scripts/generate-ai-report.mjs',
 'scripts/generate-ai-reports.mjs',
 'scripts/fetchFredMacro.js',
].filter((file) => existsSync(file));
const sourceText = files.map((file) => `${file}\n${readFileSync(file, 'utf8')}`).join('\n');
const errors = [];

if (!sourceText.includes('gemini-3.5-flash')) errors.push('gemini-3.5-flash 기본 모델이 없습니다.');
if (/gemini-2\.5-flash/i.test(sourceText)) errors.push('실행 경로에 gemini-2.5-flash 식별자가 남아 있습니다.');
if (/gemini-[^'"\s]*pro/i.test(sourceText)) errors.push('Pro 모델 식별자가 코드에 남아 있습니다.');
if (/generateContent\?key=/i.test(sourceText)) errors.push('API 키 query 전송이 남아 있습니다.');
if (!sourceText.includes("'x-goog-api-key'")) errors.push('x-goog-api-key 헤더 전송이 없습니다.');
for (const unsupported of ['temperature:', 'topP:', 'topK:', 'candidateCount:', 'thinkingBudget:', 'responseMimeType:', 'responseJsonSchema:', 'responseSchema:']) {
 if (sourceText.includes(unsupported)) errors.push(`Gemini 요청 호환성을 해치는 설정이 남아 있습니다: ${unsupported}`);
}
for (const required of ['responseFormat', 'sanitizeGeminiJsonSchema', 'thinkingConfig', 'thinkingLevel', 'AbortController', 'finishReason', 'usageMetadata', 'modelVersion', 'apiStatus']) {
 if (!sourceText.includes(required)) errors.push(`Gemini 3.5 운영 계약 누락: ${required}`);
}
if (!sourceText.includes("mimeType: 'APPLICATION_JSON'")) errors.push('Gemini responseFormat은 APPLICATION_JSON enum을 사용해야 합니다.');
if (sourceText.includes("mimeType: 'application/json'")) errors.push('responseFormat enum 자리에 MIME 문자열이 남아 있습니다.');
if (!sourceText.includes('MIN_PAUSE_MS = 5000')) errors.push('요청 간 최소 지연 5000ms 방어가 필요합니다.');
if (!sourceText.includes('cropJson') || !sourceText.includes('GEMINI_MAX_INPUT_CHARS')) errors.push('입력 크롭 방어가 필요합니다.');
if (!sourceText.includes('GEMINI_REPORTS_ENABLED')) errors.push('Gemini 호출은 명시 활성화 변수로 보호되어야 합니다.');
if (!sourceText.includes('429')) errors.push('429 재시도 처리가 필요합니다.');
if (!existsSync('scripts/gemini-3.5-runtime-check.mjs')) errors.push('결정적 Gemini 3.5 런타임 계약 검사가 없습니다.');

if (errors.length) {
 console.error('gemini:check failed');
 errors.forEach((error) => console.error(`- ${error}`));
 process.exit(1);
}
console.log('gemini:check passed');
console.log(`model=gemini-3.5-flash, source-files=${files.length}, response-format-enum=PASS, key-query=0`);
