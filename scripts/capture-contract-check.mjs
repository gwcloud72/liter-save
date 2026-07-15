import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const appName = pkg.name;
const errors = [];
const contractPath = path.join(root, 'scripts', 'capture-contract.json');
const adaptivePath = path.join(root, 'src', 'components', 'task', 'AdaptiveTaskLayout.tsx');
const homePath = path.join(root, 'src', 'pages', 'HomePage.tsx');
const stylesPath = path.join(root, 'src', 'styles.css');

function requireSource(source, snippet, label) {
  if (!source.includes(snippet)) errors.push(`${label} missing: ${snippet}`);
}

if (!fs.existsSync(contractPath)) {
  errors.push('capture contract missing');
} else {
  const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  if (contract.contrastRequired !== true) errors.push('capture contract must require contrast check');
  if (contract.issueCountCanBypassRequiredChecks !== false) errors.push('issueCount bypass must be disabled');
  if (contract.primaryCtaPerScreenMax !== 1) errors.push('primary CTA max must be 1');
  if (contract.textContrastEvidenceRequired !== true) errors.push('text contrast evidence must be required');
  if (contract.loadingErrorCaptureRequired !== true) errors.push('loading/error capture must be required');
  if (contract.mobileTabMax !== 5) errors.push('mobile tab max must be 5');
  if (contract.adaptiveDataLayoutRequired !== true) errors.push('adaptive data layout must be required');
  if (contract.workspaceContinuityRequired !== true) errors.push('continuous workspace must be required');
  if (contract.collectionCountRequired !== true) errors.push('actual collection count must be required');
  if (contract.containerQueryRequired !== true) errors.push('container query must be required');
  const states = new Set(contract.requiredStates ?? []);
  for (const required of ['loading', 'hard-error']) {
    if (!states.has(required)) errors.push(`required capture state missing: ${required}`);
  }
  const expectedAppStates = appName.includes('farm')
    ? ['empty-alerts', 'empty-season']
    : appName.includes('liter')
      ? ['location-denied', 'empty-nearby', 'data-expired']
      : ['empty-watchlist', 'empty-week', 'empty-filings'];
  for (const required of expectedAppStates) {
    if (!states.has(required)) errors.push(`app capture state missing: ${required}`);
  }
  const adaptive = fs.readFileSync(adaptivePath, 'utf8');
  const home = fs.readFileSync(homePath, 'utf8');
  const styles = fs.readFileSync(stylesPath, 'utf8');
  for (const [snippet, label] of [
    ['data-density-layout="adaptive-data"', 'adaptive layout marker'],
    ['data-layout-flow={layoutEstimate.flow}', 'data-driven flow'],
    ['data-wide-layout={layoutEstimate.wide}', 'data-driven wide layout'],
    ['data-collection-count={collectionCount}', 'actual collection count marker'],
    ['data-supporting-section-count={supportingSectionCount}', 'supporting section count marker'],
    ['data-estimated-list-height={layoutEstimate.listHeight}', 'collection height estimate'],
    ['data-estimated-detail-height={layoutEstimate.detailHeight}', 'detail height estimate'],
    ['data-estimated-context-height={layoutEstimate.contextHeight}', 'context height estimate'],
  ]) requireSource(adaptive, snippet, label);
  for (const [snippet, label] of [
    ['toolbar=', 'workspace toolbar input'],
    ['collectionCount=', 'actual collection count input'],
    ['supportingSectionCount=', 'actual supporting count input'],
    ['mode=', 'layout mode input'],
  ]) requireSource(home, snippet, label);
  for (const [snippet, label] of [
    ['container-type: inline-size', 'container query boundary'],
    ['@container (min-width: 900px)', 'detail-stack threshold'],
    ['@container (min-width: 1260px)', 'three-pane threshold'],
    ['[data-layout-flow="detail-stack"]', 'detail stack rule'],
    ['[data-wide-layout="three-pane"]', 'wide three-pane rule'],
    ['repeat(auto-fit', 'context auto distribution'],
  ]) requireSource(styles, snippet, label);
  if (contract.nearWhiteDensityBandDesktop) errors.push('fixed near-white density band must not be used');
}
if (errors.length) {
  console.error('Capture contract check failed');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log('Capture contract check passed');
console.log('contrast and state captures: required');
console.log('adaptive data layout evidence: required');
console.log('continuous workspace and container-query evidence: required');
console.log('fixed empty-space percentage target: disabled');
