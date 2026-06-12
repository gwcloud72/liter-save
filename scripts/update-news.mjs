import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const endpoint = 'https://openapi.naver.com/v1/search/news.json';
const clientId = String(process.env.NEWS_CLIENT_ID || '').trim();
const clientSecret = String(process.env.NEWS_CLIENT_SECRET || '').trim();
const enabled = String(process.env.NEWS_FETCH_ENABLED || 'true').toLowerCase() !== 'false';
const display = Math.min(Math.max(Number(process.env.NEWS_DISPLAY || 10), 1), 100);
const maxItems = Math.min(Math.max(Number(process.env.NEWS_MAX_ITEMS || 16), 1), 100);
const pauseMs = Math.max(Number(process.env.NEWS_REQUEST_PAUSE_MS || 250), 0);
const vendor = 'Na' + 'ver';
const target = "liter";

const config = {
  "output": "public/data/fuel-news.json",
  "queries": [
    "휘발유 가격 주유소 OPINET",
    "국제유가 휘발유 경유 가격",
    "기름값 유류세 주유소 가격",
    "LPG 경유 휘발유 가격 동향"
  ],
  "exclude": [
    "중고차",
    "전기차 보조금",
    "시승기",
    "맛집",
    "광고",
    "프로모션",
    "카드혜택"
  ],
  "keywordMap": {
    "휘발유": [
      "휘발유"
    ],
    "경유": [
      "경유"
    ],
    "LPG": [
      "LPG",
      "lpg"
    ],
    "국제유가": [
      "국제유가",
      "WTI",
      "두바이유"
    ],
    "유류세": [
      "유류세"
    ],
    "주유소": [
      "주유소",
      "OPINET",
      "오피넷"
    ]
  },
  "defaultKeyword": "유가"
};

function clean(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
function hashId(value) { return createHash('sha256').update(String(value)).digest('hex').slice(0, 16); }
function parsePublished(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
}
function hostOf(value) {
  try { return new URL(String(value || '')).hostname.replace(/^www\./, ''); }
  catch { return '뉴스'; }
}
function hasExcludedWord(item) {
  const text = `${item.title} ${item.description}`.toLowerCase();
  return config.exclude.some((word) => text.includes(word.toLowerCase()));
}
function classify(item, query) {
  const text = `${item.title} ${item.description} ${query}`;
  for (const [label, words] of Object.entries(config.keywordMap)) {
    if (words.some((word) => text.includes(word))) return label;
  }
  return config.defaultKeyword;
}
async function fetchQuery(query) {
  const url = new URL(endpoint);
  url.searchParams.set('query', query);
  url.searchParams.set('display', String(display));
  url.searchParams.set('start', '1');
  url.searchParams.set('sort', 'date');
  const response = await fetch(url, {
    headers: {
      [`X-${vendor}-Client-Id`]: clientId,
      [`X-${vendor}-Client-Secret`]: clientSecret,
    },
  });
  if (!response.ok) throw new Error(`news search failed ${response.status}`);
  const payload = await response.json();
  return (Array.isArray(payload.items) ? payload.items : [])
    .map((item) => {
      const title = clean(item.title);
      const summary = clean(item.description);
      const originallink = String(item.originallink || '').trim();
      const link = String(item.link || originallink || '').trim();
      return {
        id: hashId(link || originallink || title),
        title,
        summary,
        source: hostOf(originallink || link),
        publishedAt: parsePublished(item.pubDate),
        link,
        originallink,
        keyword: classify({ title, description: summary }, query),
      };
    })
    .filter((item) => item.title && !hasExcludedWord({ title: item.title, description: item.summary }));
}
async function main() {
  const outputPath = path.join(root, config.output);
  await mkdir(path.dirname(outputPath), { recursive: true });
  if (!enabled) {
    console.log('뉴스 갱신 비활성화: 기존 유가 뉴스 데이터를 유지합니다.');
    return;
  }
  if (!clientId || !clientSecret) {
    console.log('뉴스 인증값 미설정: 기존 유가 뉴스 데이터를 유지합니다.');
    return;
  }
  const rows = [];
  for (const query of config.queries) {
    try { rows.push(...await fetchQuery(query)); }
    catch (error) { console.warn(`${query}: ${error.message}`); }
    if (pauseMs) await new Promise((resolve) => setTimeout(resolve, pauseMs));
  }
  const deduped = [...new Map(rows.map((item) => [item.originallink || item.link || item.title, item])).values()]
    .sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')))
    .slice(0, maxItems);
  if (!deduped.length) {
    console.log(`${target} 뉴스 결과 없음: 기존 데이터를 유지합니다.`);
    return;
  }
  const payload = {
    metadata: {
      source: 'naver-search-news',
      target,
      updatedAt: deduped.length ? new Date().toISOString() : null,
      queryCount: config.queries.length,
      itemCount: deduped.length,
    },
    items: deduped,
  };
  await writeFile(outputPath, JSON.stringify(payload, null, 2) + '\n');
  console.log(`${target} news data written: ${deduped.length} item(s), ${config.queries.length} queries`);
}
main().catch((error) => { console.error(error); process.exit(1); });
