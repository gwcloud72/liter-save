import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const PRICE_PATH = path.resolve('public/data/oil-prices.json');
const HISTORY_PATH = path.resolve('public/data/oil-history.json');
const OUTPUT_PATH = path.resolve('public/data/oil-ai-report.json');

const GEMINI_API_KEY = String(process.env.GEMINI_API_KEY || '').trim();
const GEMINI_MODEL = String(process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`;
const REGION_CODE = 'ALL';
const GASOLINE_CODE = 'B027';
const DIESEL_CODE = 'D047';

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function roundCurrency(value) {
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}

function formatDiff(value) {
  if (!Number.isFinite(value)) return null;
  const rounded = roundCurrency(value);
  if (rounded === 0) return '0';
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

function getDirectionWord(value) {
  if (!Number.isFinite(value) || Math.abs(value) < 0.01) return '보합';
  return value > 0 ? '상승' : '하락';
}

function formatWon(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';
  return `${Math.round(number).toLocaleString('ko-KR')}원`;
}

async function readJson(filePath, fallback) {
  try {
    const text = await readFile(filePath, 'utf8');
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function findMetric(snapshot, fuelCode) {
  const metrics = Array.isArray(snapshot?.metrics) ? snapshot.metrics : [];
  return metrics.find((metric) => metric.regionCode === REGION_CODE && metric.fuelCode === fuelCode) ?? null;
}

function buildHistorySeries(historyPayload) {
  const snapshots = Array.isArray(historyPayload?.snapshots) ? historyPayload.snapshots : [];
  return snapshots
    .map((snapshot) => {
      const gasoline = findMetric(snapshot, GASOLINE_CODE);
      const diesel = findMetric(snapshot, DIESEL_CODE);
      const capturedAt = snapshot?.capturedAt;
      const timestamp = new Date(capturedAt).getTime();

      if (!gasoline || !diesel || Number.isNaN(timestamp)) return null;

      return {
        capturedAt,
        timestamp,
        gasolineAverage: toNumber(gasoline.averagePrice),
        gasolineLowest: toNumber(gasoline.lowestPrice),
        dieselAverage: toNumber(diesel.averagePrice),
        dieselLowest: toNumber(diesel.lowestPrice),
        gasolineStationCount: toNumber(gasoline.stationCount),
        dieselStationCount: toNumber(diesel.stationCount),
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.timestamp - right.timestamp);
}

function getLatestEntry(series) {
  return series[series.length - 1] ?? null;
}

function getPreviousEntry(series, latestEntry, daysBack) {
  if (!latestEntry) return null;
  const target = latestEntry.timestamp - daysBack * 24 * 60 * 60 * 1000;
  const candidates = series
    .filter((entry) => entry.timestamp <= target)
    .sort((left, right) => right.timestamp - left.timestamp);

  return candidates[0] ?? null;
}

function buildSummary(historyPayload, pricePayload) {
  const series = buildHistorySeries(historyPayload);
  const latest = getLatestEntry(series);
  const datasets = Array.isArray(pricePayload?.datasets) ? pricePayload.datasets : [];
  const stationTotal = datasets.reduce((sum, dataset) => sum + (Array.isArray(dataset?.stations) ? dataset.stations.length : 0), 0);

  if (!latest) {
    return {
      ready: false,
      seriesCount: 0,
      stationTotal,
      datasetCount: datasets.length,
      generatedAt: pricePayload?.generatedAt ?? null,
      latest: null,
      changes: {
        day: { gasoline: null, diesel: null },
        week: { gasoline: null, diesel: null },
        month: { gasoline: null, diesel: null },
      },
    };
  }

  const previousDay = getPreviousEntry(series, latest, 1);
  const previousWeek = getPreviousEntry(series, latest, 7);
  const previousMonth = getPreviousEntry(series, latest, 30);

  const change = (current, previous) => {
    if (!Number.isFinite(current) || !previous || !Number.isFinite(previous)) return null;
    return roundCurrency(current - previous);
  };

  return {
    ready: true,
    seriesCount: series.length,
    stationTotal,
    datasetCount: datasets.length,
    generatedAt: latest.capturedAt,
    latest: {
      gasolineAverage: latest.gasolineAverage,
      gasolineLowest: latest.gasolineLowest,
      dieselAverage: latest.dieselAverage,
      dieselLowest: latest.dieselLowest,
    },
    changes: {
      day: {
        gasoline: change(latest.gasolineAverage, previousDay?.gasolineAverage),
        diesel: change(latest.dieselAverage, previousDay?.dieselAverage),
      },
      week: {
        gasoline: change(latest.gasolineAverage, previousWeek?.gasolineAverage),
        diesel: change(latest.dieselAverage, previousWeek?.dieselAverage),
      },
      month: {
        gasoline: change(latest.gasolineAverage, previousMonth?.gasolineAverage),
        diesel: change(latest.dieselAverage, previousMonth?.dieselAverage),
      },
    },
  };
}

function buildFallbackReport(summary) {
  if (!summary?.ready || !summary.latest) {
    return {
      headline: '유가 흐름 리포트를 준비 중입니다.',
      daily: '누적 데이터가 아직 부족해 오늘 흐름 분석을 준비하는 중입니다.',
      weekly: '최근 7일 흐름은 수집 데이터가 더 쌓이면 표시됩니다.',
      monthly: '최근 30일 흐름은 수집 데이터가 더 쌓이면 표시됩니다.',
      consumerTip: '지금은 지역별 최저가와 가까운 순 비교를 함께 확인해보세요.',
      note: '공개 유가 데이터를 바탕으로 생성한 참고용 리포트입니다.',
    };
  }

  const { latest, changes, seriesCount } = summary;
  const dayGasoline = changes.day.gasoline;
  const dayDiesel = changes.day.diesel;
  const weekGasoline = changes.week.gasoline;
  const weekDiesel = changes.week.diesel;
  const monthGasoline = changes.month.gasoline;
  const monthDiesel = changes.month.diesel;

  const headline = `전국 평균 기준 휘발유 ${formatWon(latest.gasolineAverage)}, 경유 ${formatWon(latest.dieselAverage)} 수준으로 집계됐습니다.`;

  const daily = Number.isFinite(dayGasoline) || Number.isFinite(dayDiesel)
    ? `전일 대비 휘발유 ${formatDiff(dayGasoline) ?? '-'}원, 경유 ${formatDiff(dayDiesel) ?? '-'}원으로 ${getDirectionWord((dayGasoline ?? 0) + (dayDiesel ?? 0))} 흐름입니다.`
    : seriesCount > 0
      ? '현재 누적 데이터가 1회라 전일 비교는 준비 중입니다.'
      : '오늘 흐름을 분석할 데이터가 아직 없습니다.';

  const weekly = Number.isFinite(weekGasoline) || Number.isFinite(weekDiesel)
    ? `최근 7일 기준 휘발유 ${formatDiff(weekGasoline) ?? '-'}원, 경유 ${formatDiff(weekDiesel) ?? '-'}원으로 ${getDirectionWord((weekGasoline ?? 0) + (weekDiesel ?? 0))} 흐름입니다.`
    : '최근 7일 흐름은 누적 데이터가 더 쌓이면 더 정확하게 확인할 수 있습니다.';

  const monthly = Number.isFinite(monthGasoline) || Number.isFinite(monthDiesel)
    ? `최근 30일 기준 휘발유 ${formatDiff(monthGasoline) ?? '-'}원, 경유 ${formatDiff(monthDiesel) ?? '-'}원으로 ${getDirectionWord((monthGasoline ?? 0) + (monthDiesel ?? 0))} 흐름입니다.`
    : '최근 30일 흐름은 누적 데이터가 더 쌓이면 더 정확하게 확인할 수 있습니다.';

  let consumerTip = '가격과 거리 조건을 함께 비교해 조회된 주유소 기준으로 가성비 좋은 곳을 확인해보세요.';
  if (Number.isFinite(weekGasoline) && Number.isFinite(weekDiesel)) {
    if (weekGasoline > 0 && weekDiesel > 0) {
      consumerTip = '상승 흐름이 이어질 때는 가까운 저가 주유소를 먼저 비교하는 편이 유리합니다.';
    } else if (weekGasoline < 0 && weekDiesel < 0) {
      consumerTip = '완만한 하락 흐름이라면 급하지 않은 주유는 시점을 조금 더 지켜볼 수 있습니다.';
    }
  }

  return {
    headline,
    daily,
    weekly,
    monthly,
    consumerTip,
    note: '공개 유가 데이터를 바탕으로 생성한 참고용 리포트입니다.',
  };
}

function buildPrompt(summary, fallbackReport) {
  return [
    '당신은 한국 유가 데이터 요약 도우미입니다.',
    '입력으로 제공되는 전국 평균 유가 요약값을 바탕으로 짧고 신뢰감 있는 한국어 리포트를 작성하세요.',
    '출력은 JSON 객체만 반환하세요.',
    '필드는 headline, daily, weekly, monthly, consumerTip, note 만 포함하세요.',
    '과장 표현, 투자 조언, 확정 예측, AI 자기언급은 금지합니다.',
    '각 문장은 95자 이내로 유지하세요.',
    "note에는 반드시 '공개 유가 데이터를 바탕으로 생성한 참고용 리포트입니다.' 문구를 포함하세요.",
    '',
    '[요약 데이터]',
    JSON.stringify(summary, null, 2),
    '',
    '[규칙 기반 초안]',
    JSON.stringify(fallbackReport, null, 2),
  ].join('\n');
}

function extractGeminiText(raw) {
  const parts = raw?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((part) => String(part?.text || '')).join('').trim();
}

function stripCodeFence(text) {
  return String(text)
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

function normalizeReport(report, fallbackReport) {
  const safe = report && typeof report === 'object' ? report : {};
  return {
    headline: String(safe.headline || fallbackReport.headline),
    daily: String(safe.daily || fallbackReport.daily),
    weekly: String(safe.weekly || fallbackReport.weekly),
    monthly: String(safe.monthly || fallbackReport.monthly),
    consumerTip: String(safe.consumerTip || fallbackReport.consumerTip),
    note: String(safe.note || fallbackReport.note),
  };
}

async function generateWithGemini(summary, fallbackReport) {
  const payload = {
    contents: [
      {
        parts: [{ text: buildPrompt(summary, fallbackReport) }],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 420,
      response_mime_type: 'application/json',
      response_schema: {
        type: 'OBJECT',
        required: ['headline', 'daily', 'weekly', 'monthly', 'consumerTip', 'note'],
        properties: {
          headline: { type: 'STRING' },
          daily: { type: 'STRING' },
          weekly: { type: 'STRING' },
          monthly: { type: 'STRING' },
          consumerTip: { type: 'STRING' },
          note: { type: 'STRING' },
        },
        propertyOrdering: ['headline', 'daily', 'weekly', 'monthly', 'consumerTip', 'note'],
      },
    },
  };

  const response = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Gemini API 호출 실패: ${response.status} ${response.statusText} | ${text.slice(0, 280)}`);
  }

  const raw = JSON.parse(text);
  const jsonText = stripCodeFence(extractGeminiText(raw));
  if (!jsonText) {
    throw new Error('Gemini 응답 본문이 비어 있습니다.');
  }

  return normalizeReport(JSON.parse(jsonText), fallbackReport);
}

function createWaitingPayload() {
  return {
    mode: 'waiting',
    provider: 'rule-based',
    model: null,
    generatedAt: null,
    report: buildFallbackReport({ ready: false }),
    summary: null,
  };
}

async function main() {
  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });

  const pricePayload = await readJson(PRICE_PATH, null);
  const historyPayload = await readJson(HISTORY_PATH, null);
  const summary = buildSummary(historyPayload, pricePayload);

  if (!summary.ready) {
    const waitingPayload = createWaitingPayload();
    await writeFile(OUTPUT_PATH, JSON.stringify(waitingPayload, null, 2));
    console.log(`AI 리포트 대기 파일 생성 완료: ${OUTPUT_PATH}`);
    return;
  }

  const fallbackReport = buildFallbackReport(summary);
  let mode = 'fallback';
  let provider = 'rule-based';
  let model = null;
  let report = fallbackReport;

  if (GEMINI_API_KEY) {
    try {
      report = await generateWithGemini(summary, fallbackReport);
      mode = 'gemini';
      provider = 'google';
      model = GEMINI_MODEL;
      console.log(`Gemini 리포트 생성 성공: ${GEMINI_MODEL}`);
    } catch (error) {
      console.warn(`Gemini 리포트 생성 실패, 규칙 기반 리포트로 대체합니다.\n${error.message}`);
    }
  } else {
    console.log('GEMINI_API_KEY가 없어 규칙 기반 리포트를 생성합니다.');
  }

  const payload = {
    mode,
    provider,
    model,
    generatedAt: new Date().toISOString(),
    report,
    summary,
  };

  await writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2));
  console.log(`AI 리포트 파일 생성 완료: ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
