import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const projectRoot = process.cwd();
const require = createRequire(import.meta.url);
const tailwindConfig = require(path.join(projectRoot, 'tailwind.config.cjs'));
const extendedTheme = tailwindConfig.theme?.extend ?? {};
const errors = [];

function expectEqual(actual, expected, label) {
  if (actual !== expected) errors.push(`${label}: expected '${expected}', received '${actual}'`);
}

function expect(source, snippet, label) {
  if (!source.includes(snippet)) errors.push(`${label}: missing '${snippet}'`);
}

const expectedSpacing = {
  'ds-0.5': '4px',
  'ds-1': '8px',
  'ds-1.5': '12px',
  'ds-2': '16px',
  'ds-2.5': '20px',
  'ds-3': '24px',
  'ds-4': '32px',
  'ds-6': '48px',
  'ds-8': '64px',
  'page-mobile': 'var(--layout-page-gutter-compact)',
  'page-tablet': 'var(--layout-page-gutter-medium)',
  'page-desktop': 'var(--layout-page-gutter-expanded)',
  'section-mobile': 'var(--layout-section-gap-compact)',
  'section-tablet': 'var(--layout-section-gap-medium)',
  'section-desktop': 'var(--layout-section-gap-expanded)',
  'card-mobile': 'var(--layout-card-gap-compact)',
  'card-tablet': 'var(--layout-card-gap-medium)',
  'card-desktop': 'var(--layout-card-gap-expanded)',
  pane: 'var(--layout-pane-gap)',
  'card-pad-compact': 'var(--component-card-padding-compact)',
  'card-pad-medium': 'var(--component-card-padding-medium)',
  'card-pad-expanded': 'var(--component-card-padding-expanded)',
  'control-sm': 'var(--size-control-compact)',
  'control-md': 'var(--size-control-default)',
  'control-lg': 'var(--size-control-touch)',
  sidebar: 'var(--layout-sidebar-width)',
  'right-panel': 'var(--layout-supporting-pane-width)',
  topbar: 'var(--layout-topbar-height)',
  'mobile-nav': 'var(--layout-mobile-nav-height)',
};
for (const [tokenName, tokenValue] of Object.entries(expectedSpacing)) {
  expectEqual(extendedTheme.spacing?.[tokenName], tokenValue, `spacing.${tokenName}`);
}

const expectedRadii = { xs: '8px', sm: '8px', md: '8px', lg: '12px', xl: '16px', '2xl': '16px', control: '8px', card: '12px', 'card-lg': '16px' };
for (const [tokenName, tokenValue] of Object.entries(expectedRadii)) {
  expectEqual(extendedTheme.borderRadius?.[tokenName], tokenValue, `borderRadius.${tokenName}`);
}

expectEqual(extendedTheme.maxWidth?.shell, 'var(--layout-content-max)', 'maxWidth.shell');
expectEqual(extendedTheme.maxWidth?.content, 'var(--layout-content-max)', 'maxWidth.content');
expectEqual(extendedTheme.maxWidth?.readable, 'var(--layout-reading-max)', 'maxWidth.readable');
expectEqual(extendedTheme.maxHeight?.['task-list'], '560px', 'maxHeight.task-list');
expectEqual(extendedTheme.maxHeight?.['task-rail'], '400px', 'maxHeight.task-rail');
expectEqual(extendedTheme.screens?.compact, '480px', 'screens.compact');
expectEqual(extendedTheme.screens?.tablet, '768px', 'screens.tablet');
expectEqual(extendedTheme.screens?.desktop, '1024px', 'screens.desktop');
expectEqual(extendedTheme.screens?.wide, '1280px', 'screens.wide');
expectEqual(extendedTheme.screens?.large, '1440px', 'screens.large');

for (const semanticGrid of ['content-rail', 'rail-content', 'filter-pair', 'disclosure-filters', 'disclosure-summary', 'calendar-dashboard', 'watch-table', 'dashboard-primary', 'dashboard-secondary']) {
  if (!extendedTheme.gridTemplateColumns?.[semanticGrid]) errors.push(`gridTemplateColumns.${semanticGrid}: missing`);
}

const designTokenCss = fs.readFileSync(path.join(projectRoot, 'src/styles/DesignTokens.css'), 'utf8');
for (const requiredToken of [
  '--layout-content-max: 1600px',
  '--layout-reading-max: 760px',
  '--layout-page-gutter-compact: 16px',
  '--layout-page-gutter-medium: 20px',
  '--layout-page-gutter-expanded: 24px',
  '--layout-section-gap-compact: 16px',
  '--layout-section-gap-medium: 20px',
  '--layout-section-gap-expanded: 20px',
  '--layout-card-gap-compact: 12px',
  '--layout-card-gap-medium: 16px',
  '--layout-card-gap-expanded: 16px',
  '--layout-pane-gap: 16px',
  '--component-card-padding-compact: 16px',
  '--component-card-padding-medium: 20px',
  '--component-card-padding-expanded: 20px',
  '--size-control-compact: 36px',
  '--size-control-default: 40px',
  '--size-control-touch: 44px',
  '--layout-sidebar-width: 200px',
  '--layout-supporting-pane-width: 304px',
  '--layout-workspace-divider: var(--border-muted)',
  '--layout-workspace-toolbar-block: 16px',
  '--layout-workspace-toolbar-inline: 20px',
  '--layout-workspace-toolbar-gap: 20px',
  '--layout-list-pane-compact: 260px',
  '--layout-list-pane-standard: 300px',
  '--layout-list-pane-dense: 336px',
  '--layout-context-pane-width: 320px',
  '--layout-context-card-min: 300px',
  '--layout-list-scroll-max: 640px',
  '--radius-control: 8px',
  '--radius-card: 12px',
  '--radius-card-large: 16px',
]) expect(designTokenCss, requiredToken, 'DesignTokens.css');

for (const retiredToken of ['--content-max-width', '--reading-max-width', '--page-padding-', '--section-gap-', '--card-gap-', '--control-height-', '--sidebar-width', '--right-panel-width']) {
  if (designTokenCss.includes(retiredToken)) errors.push(`DesignTokens.css still contains retired token '${retiredToken}'`);
}

const requiredFiles = [
  'src/components/layout/PagePrimitives.tsx',
  'src/components/common/Card.tsx',
  'src/components/common/MetricCard.tsx',
  'src/components/common/EmptyState.tsx',
  'src/components/task/AdaptiveTaskLayout.tsx',
];
for (const requiredFile of requiredFiles) {
  if (!fs.existsSync(path.join(projectRoot, requiredFile))) errors.push(`missing ${requiredFile}`);
}

const cardSource = fs.readFileSync(path.join(projectRoot, 'src/components/common/Card.tsx'), 'utf8');
expect(cardSource, "normal: 'p-card-pad-compact tablet:p-card-pad-medium desktop:p-card-pad-expanded'", 'Card semantic padding');
expect(cardSource, "'min-w-0 rounded-card border", 'Card min-width contract');
expect(cardSource, 'data-ui-card="true"', 'Card surface marker');
expect(cardSource, 'data-card-tone={tone}', 'Card tone marker');
expect(cardSource, 'data-card-padding={padding}', 'Card padding marker');

const homePageSource = fs.readFileSync(path.join(projectRoot, 'src/pages/HomePage.tsx'), 'utf8');
const adaptiveLayoutSource = fs.readFileSync(path.join(projectRoot, 'src/components/task/AdaptiveTaskLayout.tsx'), 'utf8');
for (const contract of [
  'data-task-layout="adaptive"',
  'data-density-layout="adaptive-data"',
  'data-layout-mode={mode}',
  'data-layout-flow={layoutEstimate.flow}',
  'data-wide-layout={layoutEstimate.wide}',
  'data-collection-density={listDensity}',
  'data-context-density={supportingDensity}',
  'data-collection-count={collectionCount}',
  'data-supporting-section-count={supportingSectionCount}',
  'data-estimated-list-height={layoutEstimate.listHeight}',
  'data-estimated-detail-height={layoutEstimate.detailHeight}',
  'data-estimated-context-height={layoutEstimate.contextHeight}',
  'data-task-toolbar="true"',
  'data-task-pane="list"',
  'data-task-pane="detail"',
  'data-task-pane="supporting"',
  'collectionDensity',
  'contextDensity',
  'estimateLayout',
  "const wide = supportingSectionCount >= 3 ? 'three-pane' : 'two-pane';",
  "listHeight >= detailHeight * 1.25",
  "detailHeight + contextHeight <= listHeight * 1.25",
  'task-workspace',
  'task-adaptive-grid',
]) expect(adaptiveLayoutSource, contract, 'AdaptiveTaskLayout');
for (const retiredContract of ['data-density-layout="balanced"', 'desktop:grid-cols-dashboard-primary', 'wide:grid-cols-dashboard-3', 'task-detail-priority', 'detailCentered', 'task-detail-center']) {
  if (adaptiveLayoutSource.includes(retiredContract)) errors.push(`AdaptiveTaskLayout contains retired contract ${retiredContract}`);
}
for (const contract of ['AdaptiveTaskLayout', 'data-first-answer="true"', 'data-primary-action="true"', 'toolbar=', 'collectionCount=', 'supportingSectionCount=', 'mode=', 'detailPriority']) {
  expect(homePageSource, contract, 'HomePage');
}

const globalStylesSource = fs.readFileSync(path.join(projectRoot, 'src/styles.css'), 'utf8');
for (const contract of [
  '.task-workspace',
  'container-type: inline-size',
  '.task-workspace-toolbar',
  '.task-adaptive-grid',
  'grid-template-areas',
  'repeat(auto-fit',
  '.task-workspace-list-scroll',
  '@container (min-width: 900px)',
  '[data-layout-flow="detail-stack"] .task-adaptive-grid',
  '@container (min-width: 1260px)',
  '[data-wide-layout="three-pane"] .task-adaptive-grid',
  '--task-list-width',
]) expect(globalStylesSource, contract, 'styles.css');
for (const retiredContract of ['.task-detail-priority', 'wide:grid-cols-dashboard-3', 'minmax(300px, 0.9fr) minmax(400px, 1.2fr) minmax(280px, 0.85fr)']) {
  if (globalStylesSource.includes(retiredContract)) errors.push(`styles.css contains retired contract ${retiredContract}`);
}

function walk(directoryPath) {
  return fs.readdirSync(directoryPath, { withFileTypes: true }).flatMap((directoryEntry) => {
    const entryPath = path.join(directoryPath, directoryEntry.name);
    return directoryEntry.isDirectory() ? walk(entryPath) : [entryPath];
  });
}
const sourceFiles = walk(path.join(projectRoot, 'src')).filter((filePath) => /\.(?:ts|tsx|css)$/.test(filePath));
const sourceText = sourceFiles.map((filePath) => fs.readFileSync(filePath, 'utf8')).join('\n');
const forbiddenPatterns = [
  [/\b(?:p|m|gap|space-[xy]|px|py|pt|pb|pl|pr|mx|my|mt|mb|ml|mr)-ds-(?:5|7|10)\b/g, 'legacy 40/56/80px spacing class'],
  [/max-w-\[(?:1160|1240|1440|1600)px\]/g, 'page-specific max-width'],
  [/grid-cols-\[[^\]]*(?:2[89]\d|3\d\d|4\d\d)px[^\]]*\]/g, 'fixed 280-499px page rail'],
  [/rounded-\[\d+px\]/g, 'ad-hoc pixel radius'],
  [/(?<![\w-])(?:gap|p[trblxy]?|m[trblxy]?)-\[\d+px\]/g, 'ad-hoc pixel spacing'],
  [/h-\[100dvh\]/g, 'ad-hoc dynamic viewport height'],
  [/xl:px-ds-5/g, '40px page padding'],
  [/mx-auto\s+max-w-\[390px\]/g, 'legacy 390px mobile page cap'],
  [/\blaptop:/g, 'undefined laptop breakpoint'],
  [/detailCentered|task-detail-center|task-detail-priority/g, 'retired centered-detail contract'],
];
for (const [pattern, label] of forbiddenPatterns) {
  const matches = sourceText.match(pattern) ?? [];
  if (matches.length) errors.push(`${label}: ${[...new Set(matches)].join(', ')}`);
}

if (errors.length) {
  console.error('\nDesign system contract failed');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log('Design system contract passed');
console.log('adaptive data layout: collection/context density + layout estimate');
console.log('workspace flow: balanced row / detail stack / contextual three-pane');
console.log('content max width: 1600px');
console.log('page gutter: 16 / 20 / 24px');
console.log('card padding: 16 / 20 / 20px');
console.log('control height: 36 / 40 / 44px');
console.log('retired layout contracts: 0');
console.log('ad-hoc pixel radius/spacing: 0');
