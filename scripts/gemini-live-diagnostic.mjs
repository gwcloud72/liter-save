import { generateGeminiJson, geminiApiKey, resolveGeminiModel } from './lib/gemini-flash.mjs';

const apiKey = geminiApiKey();
if (!apiKey) {
  console.error('GEMINI_API_KEY가 없습니다.');
  process.exit(1);
}

process.env.GEMINI_DIAGNOSTIC_ENABLED = 'true';
const result = await generateGeminiJson({
  enabledEnv: 'GEMINI_DIAGNOSTIC_ENABLED',
  task: '연결 상태 확인을 위해 입력 문장을 그대로 반환합니다.',
  jsonSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      status: { type: 'string', enum: ['ok'] },
      message: { type: 'string', description: '연결 확인 문장' },
    },
    required: ['status', 'message'],
  },
  input: { message: 'Gemini API 연결 확인' },
  fallback: { status: 'failed', message: 'Gemini API 연결 실패' },
  validate: (payload) => payload?.status === 'ok' && typeof payload?.message === 'string',
  maxRetries: 0,
  maxOutputTokens: 256,
});

const output = {
  ok: result.used,
  requestedModel: resolveGeminiModel(),
  model: result.model,
  modelVersion: result.modelVersion,
  httpStatus: result.httpStatus,
  apiStatus: result.apiStatus,
  finishReason: result.finishReason,
  attempts: result.attempts,
  error: result.error,
};

console.log(JSON.stringify(output, null, 2));
if (!result.used) process.exit(1);
