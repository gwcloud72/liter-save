import { createServer } from 'vite';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const errors = [];

const cases = pkg.name === 'liter-save'
  ? {
      home: '들를 가치가 있는 주유소 찾기',
      stations: '들를 가치가 있는 주유소 찾기',
      records: '내 차량 ·',
      'fuel-news': '유가 뉴스 ·',
      guide: '이용 가이드 ·',
      analysis: '들를 가치가 있는 주유소 찾기',
      discount: '들를 가치가 있는 주유소 찾기',
      trend: '들를 가치가 있는 주유소 찾기',
      favorites: '들를 가치가 있는 주유소 찾기',
      alerts: '이용 가이드 ·',
      notice: '이용 가이드 ·',
    }
  : pkg.name === 'farm-price-note'
    ? {
        home: '같은 단위로 가격 비교',
        items: '품목비교',
        regions: '지역·도매',
        'market-news': '수급뉴스',
        guide: '이용 안내',
        markets: '지역·도매',
        stats: '지역·도매',
        trend: '품목비교',
        favorites: '품목비교',
        alerts: '이용 안내',
        download: '이용 안내',
      }
    : {
        home: '가장 가까운 공모 일정',
        companies: '기업공시 데이터는 DART 원문',
        ai: '회사 사업 내용과',
        watch: '관심 종목',
        news: '청약 뉴스',
        calendar: '가장 가까운 공모 일정',
        timeline: '가장 가까운 공모 일정',
        filings: '회사 사업 내용과',
        favorites: '관심 종목',
        market: '청약 뉴스',
        reports: '청약 뉴스',
        memo: '청약 뉴스',
        settings: '청약 뉴스',
      };

function updateHash(url) {
  global.window.location.hash = String(url || '').replace(/^[^#]*/, '');
}

global.window = {
  location: { hash: '' },
  history: { replaceState(_state, _title, url) { updateHash(url); }, pushState(_state, _title, url) { updateHash(url); } },
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {},
  setTimeout(callback) { callback(); return 0; },
  clearTimeout() {},
};
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'SSR' }, configurable: true });

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
try {
  const mod = await vite.ssrLoadModule('/src/App.tsx');
  for (const [tab, expected] of Object.entries(cases)) {
    try {
      global.window.location.hash = `#tab=${encodeURIComponent(tab)}`;
      const html = ReactDOMServer.renderToString(React.createElement(mod.default));
      if (!html.includes('id="main-content"')) errors.push(`${tab}: main-content 렌더링 누락`);
      if (!html.includes('href="#main-content"')) errors.push(`${tab}: 본문 바로가기 렌더링 누락`);
      if (html.includes('undefined') || html.includes('NaN')) errors.push(`${tab}: undefined 또는 NaN 출력 확인`);
      const hasExpected = html.includes(expected);
      const hasPending = /가격 데이터|청약·공시 데이터/.test(html);
      if (!hasExpected && !hasPending) errors.push(`${tab}: 화면 계약 문구 누락 - ${expected}`);
    } catch (error) {
      errors.push(`${tab}: SSR 렌더링 실패 - ${error.message}`);
    }
  }
} finally {
  await vite.close();
}

if (errors.length) {
  console.error('render:check failed');
  errors.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}
console.log('render:check passed');
console.log(`Rendered routes: ${Object.keys(cases).length}`);
