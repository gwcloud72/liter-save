import { createServer } from 'vite';
import React from 'react';
import ReactDOMServer from 'react-dom/server';

const tabs = ['home', 'stations', 'analysis', 'fuel-news', 'records'];
const expectedText = {'home': '오늘 최대', 'stations': '가격지도', 'analysis': '가격 분석', 'fuel-news': '유가 뉴스', 'records': '내 차량'};
const errors = [];
global.window = { location: { hash: '' }, history: { replaceState(_state, _title, url) { global.window.location.hash = String(url || '').replace(new RegExp('^[^#]*'), ''); } }, addEventListener() {}, removeEventListener() {}, setTimeout(callback) { callback(); return 0; }, clearTimeout() {} };
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'SSR' }, configurable: true });

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
try {
  const mod = await vite.ssrLoadModule('/src/App.tsx');
  for (const tab of tabs) {
    try {
      global.window.location.hash = tab === 'home' ? '' : `#${tab}`;
      const html = ReactDOMServer.renderToString(React.createElement(mod.default));
      if (!html.includes('id="main-content"')) errors.push(`${tab}: main-content 렌더링 누락`);
      if (!html.includes('href="#main-content"')) errors.push(`${tab}: 본문 바로가기 렌더링 누락`);
      if (html.includes('undefined') || html.includes('NaN')) errors.push(`${tab}: undefined 또는 NaN 출력 확인`);
      const text = expectedText[tab];
      const candidates = Array.isArray(text) ? text : [text];
      const hasExpectedText = candidates.length === 0 || candidates.some((item) => html.includes(item));
      const hasPendingState = html.includes('주유소 가격 데이터');
      if (!hasExpectedText && !hasPendingState) errors.push(`${tab}: 전용 화면 또는 데이터 대기 문구 누락 - ${candidates.join(' | ')}`);
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
console.log(`Rendered tabs: ${tabs.length}`);
