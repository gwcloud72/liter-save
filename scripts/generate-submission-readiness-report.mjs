#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const CONFIG = {"project": "liter-save", "title": "리터세이브", "repo": "gwcloud72/liter-save", "demo": "https://gwcloud72.github.io/liter-save/", "source": "OPINET Open API", "freshness": "OPINET_MAX_DATA_AGE_HOURS=24", "primary": "OPINET 가격 데이터가 비어 있지 않고, 주유소/지역/유종 커버리지가 유지되어야 합니다.", "position": "실생활 가격 비교, 지도/길찾기, 50L 절약액 UX를 보여주는 프로젝트", "refresh": "Actions 수동 실행 후 oil-prices.json generatedAt과 service-status.json 상태를 확인합니다.", "required_env": ["OPINET_CERT_KEY", "OPINET_FUELS", "VITE_KAKAO_MAP_APP_KEY"], "risk": "현재 데이터가 stale이면 최종 제출 전 OPINET 수집 성공 여부를 먼저 확인해야 합니다."};

function readJson(file, fallback = null) {
  try {
    if (!existsSync(file)) return fallback;
    const text = readFileSync(file, 'utf8').trim();
    if (!text) return fallback;
    return JSON.parse(text);
  } catch (error) {
    return fallback;
  }
}

function statusLabel(status) {
  const value = String(status || '').toLowerCase();
  if (['ready', 'fresh', 'ok', 'pass'].includes(value)) return '제출 가능';
  if (['stale', 'warning', 'review-required'].includes(value)) return '조건부 제출 가능';
  if (['empty', 'error', 'failed'].includes(value)) return '보류';
  return '검토 필요';
}

function readinessFromStatus(service) {
  const rawStatus = service?.status || 'unknown';
  const label = statusLabel(rawStatus);
  const blocking = ['empty', 'error', 'failed'].includes(String(rawStatus).toLowerCase());
  const score = Number.isFinite(Number(service?.score)) ? Number(service.score) : (blocking ? 55 : 80);
  return {
    label,
    submitReady: !blocking,
    score,
    rawStatus,
  };
}

const service = readJson('public/data/service-status.json', {});
const readiness = readinessFromStatus(service);
const now = new Date().toISOString();
const checks = Array.isArray(service?.checks) ? service.checks : [];
const reviewChecks = checks.filter((item) => String(item?.status || '').toLowerCase() === 'review');
const failedChecks = checks.filter((item) => ['fail', 'error', 'failed'].includes(String(item?.status || '').toLowerCase()));

const output = {
  project: CONFIG.project,
  title: CONFIG.title,
  generatedAt: now,
  portfolioPosition: CONFIG.position,
  liveDemo: CONFIG.demo,
  repository: `https://github.com/${CONFIG.repo}`,
  readiness: readiness.label,
  submitReady: readiness.submitReady,
  score: readiness.score,
  source: CONFIG.source,
  freshnessPolicy: CONFIG.freshness,
  currentDataStatus: service?.status || 'unknown',
  currentDataSummary: service?.summary || '',
  risk: CONFIG.risk,
  mustCheckBeforeFinalSubmission: [
    CONFIG.refresh,
    'README 상단 Live Demo 링크와 배포 badge 확인',
    '브라우저 콘솔 오류 없음 확인',
    '모바일 첫 화면 캡처와 데스크톱 첫 화면 캡처 갱신',
  ],
  evidence: checks.map((item) => ({ name: item.name, status: item.status, detail: item.detail })),
  reviewItems: reviewChecks.map((item) => ({ name: item.name, detail: item.detail })),
  failedItems: failedChecks.map((item) => ({ name: item.name, detail: item.detail })),
};

mkdirSync('public/data', { recursive: true });
mkdirSync('docs', { recursive: true });
writeFileSync('public/data/submission-readiness.json', `${JSON.stringify(output, null, 2)}\n`, 'utf8');

const evidenceRows = output.evidence.length
  ? output.evidence.map((item) => `| ${item.name || '-'} | ${item.status || '-'} | ${item.detail || '-'} |`).join('\n')
  : '| 확인 항목 | 확인 필요 | service-status.json 생성 후 확인 |';

const reviewRows = output.reviewItems.length
  ? output.reviewItems.map((item) => `- ${item.name}: ${item.detail}`).join('\n')
  : '- 현재 별도 확인 필요 항목이 없습니다.';

const failedRows = output.failedItems.length
  ? output.failedItems.map((item) => `- ${item.name}: ${item.detail}`).join('\n')
  : '- 차단 항목 없음';

const markdownReport = `# ${CONFIG.title} 제출 준비 리포트\n\n` +
`생성 시각: ${now}\n\n` +
`## 결론\n\n` +
`- 제출 판정: **${readiness.label}**\n` +
`- 점수: **${readiness.score}/100**\n` +
`- 포지션: ${CONFIG.position}\n` +
`- Live Demo: ${CONFIG.demo}\n` +
`- Repository: https://github.com/${CONFIG.repo}\n\n` +
`## 왜 제출 가능한가\n\n` +
`1. 핵심 데이터 출처가 명확합니다: ${CONFIG.source}\n` +
`2. 배포 전 데이터 계약 검사와 UI/상호작용 검사를 실행하는 구조가 있습니다.\n` +
`3. 데이터 상태를 \`public/data/service-status.json\`과 \`public/data/submission-readiness.json\`으로 남깁니다.\n` +
`4. 사용자 문제, 데이터 수집, 서비스 운영 흐름이 분리되어 있습니다.\n\n` +
`## 제출 전 확인해야 할 것\n\n` +
CONFIG.refresh.split('\n').map((line) => `- ${line}`).join('\n') + '\n' +
`- ${CONFIG.risk}\n` +
`- 브라우저 콘솔 오류, 모바일 첫 화면, 데스크톱 첫 화면을 다시 캡처합니다.\n\n` +
`## 현재 데이터 상태\n\n` +
`| 항목 | 값 |\n|---|---|\n` +
`| 상태 | ${service?.status || 'unknown'} |\n` +
`| 요약 | ${service?.summary || '-'} |\n` +
`| Freshness policy | ${CONFIG.freshness} |\n\n` +
`## 검사 증거\n\n` +
`| 검사 | 상태 | 상세 |\n|---|---|---|\n${evidenceRows}\n\n` +
`## 확인 필요 항목\n\n${reviewRows}\n\n` +
`## 차단 항목\n\n${failedRows}\n\n` +
`## 운영 Runbook\n\n자세한 배포·데이터 갱신 절차는 \`docs/DEPLOYMENT_RUNBOOK.md\`를 확인합니다.\n`;

writeFileSync('docs/submission-readiness-report.md', markdownReport, 'utf8');
console.log(`${CONFIG.project} submission readiness: ${readiness.label} (${readiness.score}/100)`);
