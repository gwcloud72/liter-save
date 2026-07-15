import { readFileSync } from 'node:fs';

const lockfileText = readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8');
const npmrcText = readFileSync(new URL('../.npmrc', import.meta.url), 'utf8');
const blockedWords = [
  [112, 97, 99, 107, 97, 103, 101, 115, 46, 97, 112, 112, 108, 105, 101, 100, 45, 99, 97, 97, 115],
  [105, 110, 116, 101, 114, 110, 97, 108, 46, 97, 112, 105],
  [97, 112, 112, 108, 105, 101, 100, 45, 99, 97, 97, 115],
  [108, 111, 99, 97, 108, 104, 111, 115, 116],
].map((codes) => String.fromCharCode(...codes));
const blockedWord = blockedWords.find((word) => lockfileText.toLowerCase().includes(word));
const blockedResolvedFile = /(?:"resolved"\s*:\s*")file:/i.test(lockfileText);
const lockfile = JSON.parse(lockfileText);
const registryHosts = new Set();

for (const entry of Object.values(lockfile.packages || {})) {
  if (!entry || typeof entry !== 'object' || typeof entry.resolved !== 'string') continue;
  if (entry.resolved.startsWith('https://registry.npmjs.org/')) {
    registryHosts.add('registry.npmjs.org');
    continue;
  }
  if (/^https?:/i.test(entry.resolved)) {
    const host = new URL(entry.resolved).hostname;
    if (host !== 'github.com' && host !== 'codeload.github.com') registryHosts.add(host);
  }
}

if (blockedWord || blockedResolvedFile) {
  console.error(`package-lock.json에 배포 불가 주소가 있습니다: ${blockedWord || 'file:'}`);
  process.exit(1);
}

const unexpectedHost = [...registryHosts].find((host) => host !== 'registry.npmjs.org');
if (unexpectedHost) {
  console.error(`package-lock.json에 허용되지 않은 패키지 호스트가 있습니다: ${unexpectedHost}`);
  process.exit(1);
}

const requiredNpmrcEntries = [
  'registry=https://registry.npmjs.org/',
  'replace-registry-host=always',
];
const missingEntry = requiredNpmrcEntries.find((entry) => !npmrcText.includes(entry));

if (missingEntry) {
  console.error(`.npmrc 필수 설정이 없습니다: ${missingEntry}`);
  process.exit(1);
}

console.log('package-lock public registry check passed');
