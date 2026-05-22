
import { createServer } from 'vite';
import React from 'react';
import ReactDOMServer from 'react-dom/server';

const tab = process.argv[2] || 'home';
global.window = {
  location: { hash: tab === 'home' ? '' : `#${tab}` },
  addEventListener() {},
  removeEventListener() {},
};
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'SSR' }, configurable: true });

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent',
});
try {
  const mod = await vite.ssrLoadModule('/src/App.jsx');
  const html = ReactDOMServer.renderToString(React.createElement(mod.default));
  process.stdout.write(html);
} finally {
  await vite.close();
}
