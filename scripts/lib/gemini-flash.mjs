const DEFAULT_MODEL = 'gemini-2.5-flash';
const MIN_PAUSE_MS = 5000;
const DEFAULT_MAX_INPUT_CHARS = 18000;
let lastRequestAt = 0;

function cleanEnv(name) {
 return String(process.env[name] ?? '').trim();
}

function isTruthy(value) {
 return ['true', '1', 'yes', 'on'].includes(String(value ?? '').trim().toLowerCase());
}

function parseInteger(value, fallback, min, max) {
 const number = Number(value);
 if (!Number.isInteger(number)) return fallback;
 return Math.min(max, Math.max(min, number));
}

export function geminiIsEnabled() {
 return isTruthy(cleanEnv('GEMINI_REPORTS_ENABLED')) && Boolean(cleanEnv('GEMINI_API_KEY'));
}

export function resolveGeminiModel() {
 const raw = cleanEnv('GEMINI_MODEL');
 if (/^gemini-[a-z0-9.\-]*flash[a-z0-9.\-]*$/i.test(raw) && !/pro/i.test(raw)) return raw;
 return DEFAULT_MODEL;
}

export function geminiSettings() {
 return {
  apiKey: cleanEnv('GEMINI_API_KEY'),
  model: resolveGeminiModel(),
  pauseMs: parseInteger(cleanEnv('GEMINI_REQUEST_PAUSE_MS'), MIN_PAUSE_MS, MIN_PAUSE_MS, 60000),
  maxInputChars: parseInteger(cleanEnv('GEMINI_MAX_INPUT_CHARS'), DEFAULT_MAX_INPUT_CHARS, 4000, 60000),
  maxRetries: parseInteger(cleanEnv('GEMINI_MAX_RETRIES'), 2, 0, 4),
 };
}

export function cropText(value, maxChars = geminiSettings().maxInputChars) {
 const text = String(value ?? '').replace(/\s+/g, ' ').trim();
 if (text.length <= maxChars) return text;
 return `${text.slice(0, Math.max(0, maxChars - 20))} …`;
}

export function cropJson(value, maxChars = geminiSettings().maxInputChars) {
 return cropText(JSON.stringify(value, null, 2), maxChars);
}

export function compactArrayByChars(rows, maxChars = geminiSettings().maxInputChars) {
 const selected = [];
 let total = 2;
 for (const row of Array.isArray(rows) ? rows : []) {
  const text = JSON.stringify(row);
  if (selected.length && total + text.length + 1 > maxChars) break;
  selected.push(row);
  total += text.length + 1;
 }
 return selected;
}

function parseGeminiJson(text) {
 const trimmed = String(text ?? '').trim();
 if (!trimmed) throw new Error('empty response');
 try {
  return JSON.parse(trimmed);
 } catch {
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('json object not found');
  return JSON.parse(match[0]);
 }
}

async function sleep(ms) {
 if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForSlot(pauseMs) {
 const now = Date.now();
 const waitMs = Math.max(0, lastRequestAt + pauseMs - now);
 await sleep(waitMs);
 lastRequestAt = Date.now();
}

function retryDelayMs(response, attempt, pauseMs) {
 const retryAfter = Number(response?.headers?.get?.('retry-after'));
 if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.max(pauseMs, retryAfter * 1000);
 return pauseMs * (attempt + 1);
}

export async function generateGeminiJson({ task, schema, input, fallback, validate }) {
 const settings = geminiSettings();
 if (!geminiIsEnabled()) return { used: false, model: null, payload: fallback, reason: 'disabled' };
 const prompt = cropText([
  '다음 입력만 사용해 한국어 JSON만 반환하세요.',
  '공식 사이트에 바로 노출 가능한 중립적 문장만 사용하세요.',
  '추측, 과장, 권유, 마크다운, 코드블록은 쓰지 마세요.',
  `작업: ${task}`,
  `스키마: ${schema}`,
  `입력: ${cropJson(input, settings.maxInputChars)}`,
 ].join('\n'), settings.maxInputChars);
 const url = `https://generativelanguage.googleapis.com/v1beta/models/${settings.model}:generateContent?key=${encodeURIComponent(settings.apiKey)}`;
 let lastError = null;
 for (let attempt = 0; attempt <= settings.maxRetries; attempt += 1) {
  await waitForSlot(settings.pauseMs);
  try {
   const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
     contents: [{ role: 'user', parts: [{ text: prompt }] }],
     generationConfig: {
      temperature: 0.2,
      topP: 0.8,
      responseMimeType: 'application/json',
      maxOutputTokens: 4096,
     },
    }),
   });
   if (!response.ok) {
    const body = await response.text().catch(() => '');
    lastError = new Error(`Gemini Flash API ${response.status}: ${body.slice(0, 240)}`);
    if ([408, 409, 429, 500, 502, 503, 504].includes(response.status) && attempt < settings.maxRetries) {
     await sleep(retryDelayMs(response, attempt, settings.pauseMs));
     continue;
    }
    break;
   }
   const payload = await response.json();
   const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n') || '';
   const parsed = parseGeminiJson(text);
   if (validate && !validate(parsed)) throw new Error('Gemini JSON schema mismatch');
   return { used: true, model: settings.model, payload: parsed, reason: 'generated' };
  } catch (error) {
   lastError = error;
   if (attempt < settings.maxRetries) {
    await sleep(settings.pauseMs * (attempt + 1));
    continue;
   }
  }
 }
 console.log(`Gemini Flash 생성 건너뜀: ${lastError?.message || 'unknown error'}`);
 return { used: false, model: settings.model, payload: fallback, reason: 'fallback' };
}
