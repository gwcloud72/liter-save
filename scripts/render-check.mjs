#!/usr/bin/env node
import { createServer } from 'vite';
import React from 'react';
import ReactDOMServer from 'react-dom/server';

const tabs = ["home", "regions", "fuel", "report", "favorites"];
const errors = [];

const storage = {
  getItem() { return null; },
  setItem() {},
  removeItem() {},
};

global.window = {
  location: { hash: '' },
  history: { replaceState(_state, _title, url) { global.window.location.hash = String(url || '').replace(/^[^#]*/, ''); } },
  localStorage: storage,
  addEventListener() {},
  removeEventListener() {},
};
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'SSR' }, configurable: true });

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
try {
  const mod = await vite.ssrLoadModule('/src/App.jsx');
  for (const tab of tabs) {
    try {
      global.window.location.hash = tab === 'home' ? '' : `#${tab}`;
      const html = ReactDOMServer.renderToString(React.createElement(mod.default));
      if (!html.includes('id="main-content"')) errors.push(`${tab}: main-content 렌더링 누락`);
      if (!html.includes('href="#main-content"')) errors.push(`${tab}: 본문 바로가기 렌더링 누락`);
      if (html.includes('undefined') || html.includes('NaN')) errors.push(`${tab}: undefined 또는 NaN 출력 확인`);
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
