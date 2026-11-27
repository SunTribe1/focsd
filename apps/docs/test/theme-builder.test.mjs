import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  actionTokens,
  agentMarkdown,
  checks,
  contrast,
  hexToRgb,
  onColor,
  startFrom,
  themeCss,
  themeJson,
  themeTokens,
} from '../src/scripts/theme-builder.js';

const TEXT = { light: '#fcfcfc', dark: '#0a0a0a' };

test('text on a brand color is whichever supplied color contrasts more', () => {
  assert.equal(onColor('#0b5cad', TEXT), TEXT.light);
  assert.equal(onColor('#ffd24a', TEXT), TEXT.dark);
});

test('action tokens carry the supplied text color', () => {
  assert.equal(actionTokens('#0b5cad', { text: TEXT })['on-action'], TEXT.light);
});

test('contrast of black on white is 21', () => {
  assert.equal(contrast(hexToRgb('#000'), hexToRgb('#fff')), 21);
});

const AGENT = {
  light: '#0b5cad',
  dark: '#8cc4ff',
  radius: 8,
  density: 'comfortable',
  links: false,
  text: TEXT,
  surfaces: {
    light: { ground: '#ffffff', surface: '#f6f6f6', route: '#0b4f9c' },
    dark: { ground: '#101413', surface: '#1a1f1e', route: '#8cc4ff' },
  },
  fonts: { sans: '"Atkinson Hyperlegible Next", sans-serif', mono: 'ui-monospace, monospace' },
  controlHeights: { default: '36px', comfortable: '44px', compact: '32px' },
};

test('agent export is stable for a fixed theme', () => {
  assert.equal(agentMarkdown(AGENT), agentMarkdown({ ...AGENT }));
  assert.match(agentMarkdown(AGENT), /^# Focsd theme\n/);
});

test('agent export states the measured ratios from the same helper as the checks', () => {
  const text = agentMarkdown(AGENT);
  const rows = checks(actionTokens(AGENT.light, { text: TEXT }), AGENT.surfaces.light);

  for (const { label, ratio } of rows) assert.ok(text.includes(`${label}: ${ratio.toFixed(2)}:1`), label);
  assert.ok(text.includes(`${checks(actionTokens(AGENT.dark, { text: TEXT }), AGENT.surfaces.dark)[0].ratio.toFixed(2)}:1`));
});

test('agent export describes roles, radius, density and fonts, then the CSS', () => {
  const text = agentMarkdown(AGENT);

  for (const needle of [
    '#0b5cad',
    '#8cc4ff',
    '8px',
    'comfortable',
    '44px',
    'Atkinson Hyperlegible Next',
    'data-focsd-density="comfortable"',
  ])
    assert.ok(text.includes(needle), needle);
  assert.ok(text.indexOf('## CSS') > text.indexOf('## Density'));
  assert.ok(text.endsWith('```\n'));
  assert.ok(text.includes(themeCss(AGENT)));
});

test('agent export flags a failing pair', () => {
  const text = agentMarkdown({ ...AGENT, light: '#ffeb3b', links: true });

  assert.match(text, /Links on the page: \d+\.\d+:1 \(needs 4\.5:1, fails\)/);
});

test('theme CSS begins with the layer order statement', () => {
  assert.ok(themeCss(AGENT).startsWith('@layer focsd.tokens, focsd.preset, focsd.brand;\n'));
  assert.ok(agentMarkdown(AGENT).includes('@layer focsd.tokens, focsd.preset, focsd.brand;'));
});

const ENTRY = {
  label: 'Harbor',
  radius: { control: '2px', surface: '4px', tag: '2px' },
  swatches: { light: { action: '#123b75' }, dark: { action: '#a8c6f2' } },
};

test('startFrom reads the brand colors and control radius of a preset', () => {
  assert.deepEqual(startFrom(ENTRY), { light: '#123b75', dark: '#a8c6f2', radius: 2 });
});

test('startFrom falls back to a 4px radius for the default theme, which has none', () => {
  assert.equal(startFrom({ swatches: ENTRY.swatches }).radius, 4);
});

test('startFrom rejects an entry without swatches', () => {
  assert.throws(() => startFrom({}), /swatches/);
});

test('a neutral tint sets the grounds, text, edges and focus ring of both themes', () => {
  const light = themeTokens('light', { ...AGENT, neutral: 'slate' }, AGENT.surfaces);
  const dark = themeTokens('dark', { ...AGENT, neutral: 'slate' }, AGENT.surfaces);

  for (const role of ['ground', 'surface', 'surface-sunk', 'ink', 'ink-muted', 'edge', 'edge-quiet', 'focus-inner', 'focus-outer'])
    assert.match(light[role], /^#[0-9a-f]{6}$/, role);
  assert.equal(light['focus-inner'], light.ground);
  assert.ok(contrast(hexToRgb(light.ink), hexToRgb(light.ground)) >= 4.5);
  assert.ok(contrast(hexToRgb(dark.ink), hexToRgb(dark.ground)) >= 4.5);
  assert.deepEqual(Object.keys(themeTokens('light', AGENT, AGENT.surfaces)).includes('ground'), false);
});

test('a status color gets a theme-fitted color and tint, checked for contrast', () => {
  const tokens = themeTokens('light', { ...AGENT, statuses: { critical: '#e11d48' } }, AGENT.surfaces);
  const rows = checks(tokens, AGENT.surfaces.light);

  assert.match(tokens.critical, /^#/);
  assert.match(tokens['critical-tint'], /^#/);
  assert.ok(rows.some((row) => row.label === 'Critical text on the page' && row.pass));
  assert.ok(rows.some((row) => row.label === 'Critical text on its tint'));
});

test('chosen fonts land in the shared block; the defaults write nothing', () => {
  assert.ok(
    themeCss({ ...AGENT, sans: 'inter', mono: 'plex-mono' }).includes('--focsd-font-sans: Inter, ui-sans-serif, system-ui, sans-serif;'),
  );
  assert.ok(!themeCss(AGENT).includes('--focsd-font-sans'));
});

test('the high-contrast theme reverts every color the theme sets', () => {
  const css = themeCss({ ...AGENT, neutral: 'sand', statuses: { positive: '#16a34a' } });

  for (const token of ['action', 'ground', 'ink', 'positive', 'positive-tint'])
    assert.ok(css.includes(`--focsd-${token}: revert-layer;`), token);
});

test('the JSON export holds the shared and per-theme tokens', () => {
  const json = JSON.parse(themeJson({ ...AGENT, neutral: 'sage', sans: 'system' }));

  assert.equal(json.shared['radius-control'], '8px');
  assert.equal(json.shared['font-sans'], 'ui-sans-serif, system-ui, sans-serif');
  assert.equal(json.light.action, '#0b5cad');
  assert.match(json.dark.ground, /^#/);
});
