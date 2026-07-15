import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}
function hexToRgb(hexColor) {
  const hexMatch = /^#([0-9a-f]{6})$/i.exec(hexColor.trim());
  if (!hexMatch) return null;
  const hexInteger = Number.parseInt(hexMatch[1], 16);
  return [(hexInteger >> 16) & 255, (hexInteger >> 8) & 255, hexInteger & 255].map((channelValue) => channelValue / 255);
}
function channel(channelValue) {
  return channelValue <= 0.03928 ? channelValue / 12.92 : ((channelValue + 0.055) / 1.055) ** 2.4;
}
function luminance(rgb) {
  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
}
function contrast(foregroundColor, backgroundColor) {
  const foregroundRgb = hexToRgb(foregroundColor);
  const backgroundRgb = hexToRgb(backgroundColor);
  if (!foregroundRgb || !backgroundRgb) return Number.NaN;
  const foregroundLuminance = luminance(foregroundRgb);
  const backgroundLuminance = luminance(backgroundRgb);
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}
const moduleText = read('src/components/common/textContrastTokens.ts');
const match = moduleText.match(/export const textContrastTokens: TextContrastToken\[] = (\[[\s\S]*?\]);/);
if (!match) {
  errors.push('textContrastTokens export missing');
} else {
  const tokens = JSON.parse(match[1]);
  for (const token of tokens) {
    const actual = Number(contrast(token.hex, token.background).toFixed(2));
    const minimum = Number(token.minimum ?? 4.5);
    if (actual < minimum) {
      errors.push(`${token.role} ${token.token} ${token.hex} on ${token.background}: ${actual} < ${minimum}`);
    }
    if (token.afterRatio < minimum) {
      errors.push(`${token.role} documented afterRatio ${token.afterRatio} < ${minimum}`);
    }
  }
}
for (const required of ['--text-caption', '--text-placeholder', '--text-link', '--text-badge', '--border-muted', '--divider-muted']) {
  if (!read('src/styles/DesignTokens.css').includes(required)) errors.push(`CSS token missing: ${required}`);
}
if (!moduleText.includes('비텍스트') && !moduleText.includes('텍스트 금지')) {
  errors.push('non-text border/divider evidence missing');
}
if (errors.length) {
  console.error('Text contrast token check failed');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('Text contrast token check passed');
console.log('All text tokens meet WCAG AA thresholds; border/divider tokens separated as non-text.');
