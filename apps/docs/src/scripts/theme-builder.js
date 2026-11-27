/**
 * Theme builder: turns a brand color per theme, a neutral tint, status colors, fonts, corner
 * radius and density into a CSS override of Focsd's system tokens, and checks the WCAG contrast of
 * every pair it changes. Pure functions; the page script wires them to the controls.
 */
import { fontTokens, neutralTokens, statusTokens } from './theme-builder-palette.js';

/**
 * The choices beyond the brand color. Each default writes nothing.
 * @typedef {{ neutral?: string, statuses?: Partial<Record<'positive' | 'caution' | 'critical', string>>, sans?: string, mono?: string }} Extras
 * @typedef {Record<'light' | 'dark', { ground: string, surface: string, route: string }>} Surfaces
 */

/**
 * Text on a brand color is one of two colors, whichever contrasts more. They are the light and
 * dark themes' own `on-action` tokens, which the page reads from `@focsd-dev/tokens/resolved.json`.
 * @typedef {{ light: string, dark: string }} TextColors
 */

const BLACK = '#000000';
const WHITE = '#ffffff';

/** @param {string} hex `#rgb` or `#rrggbb` */
export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;

  if (!/^[0-9a-f]{6}$/i.test(full)) throw new Error(`Not a hex color: ${hex}`);

  return [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16));
}

const linear = (c) => {
  const s = c / 255;

  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

/** WCAG relative luminance of an [r, g, b] color (0-255 channels). */
const luminance = ([r, g, b]) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);

/** WCAG contrast ratio between two [r, g, b] colors, rounded down to 2 decimals. */
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].toSorted((x, y) => y - x);

  return Math.floor(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

/**
 * The text color (light or dark) that contrasts more with `brand`.
 * @param {string} brand hex
 * @param {TextColors} text
 */
export function onColor(brand, text) {
  const rgb = hexToRgb(brand);

  return contrast(rgb, hexToRgb(text.light)) >= contrast(rgb, hexToRgb(text.dark)) ? text.light : text.dark;
}

/** Mix two [r, g, b] colors in sRGB: `amount` of `b` into `a`. */
const mixRgb = (a, b, amount) => a.map((v, i) => Math.round(v + (b[i] - v) * amount));
const toHex = (rgb) => `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`;

/**
 * Action tokens for one theme: hover moves toward the text color, press away from it. Links take
 * the brand color only when `links` is set; otherwise they keep the theme's own link color.
 * @param {string} brand hex
 * @param {{ text: TextColors, links?: boolean }} options
 */
export function actionTokens(brand, { text, links = false }) {
  const on = onColor(brand, text);
  const base = hexToRgb(brand);
  const toward = hexToRgb(on);
  const away = hexToRgb(on === text.light ? BLACK : WHITE);

  /** @type {Record<string, string>} */
  const tokens = {
    action: brand.toLowerCase(),
    'action-hover': toHex(mixRgb(base, toward, 0.12)),
    'action-press': toHex(mixRgb(base, away, 0.15)),
    'on-action': on,
  };

  if (links) tokens.route = brand.toLowerCase();

  return tokens;
}

/**
 * Every token one theme changes: the action colors, then the neutral tint and the status colors.
 * @param {'light' | 'dark'} theme
 * @param {{ light: string, dark: string, text: TextColors, links?: boolean } & Extras} options
 * @param {Surfaces} surfaces the theme defaults, for the ground the status tints sit on
 * @returns {Record<string, string>}
 */
export function themeTokens(theme, options, surfaces) {
  const { text, links = false, neutral = 'none', statuses = {} } = options;
  const neutrals = neutralTokens(neutral, theme);
  const ground = neutrals.ground ?? surfaces[theme].ground;

  return { ...actionTokens(options[theme], { text, links }), ...neutrals, ...statusTokens(statuses, theme, ground) };
}

/**
 * Contrast checks for one theme's tokens against its surfaces: the action colors always, and the
 * text, edges and status colors when the theme changes them.
 * @param {Record<string, string>} tokens from actionTokens or themeTokens
 * @param {{ ground: string, surface: string, route: string }} defaults hex; the theme's own values
 * @returns {{ label: string, ratio: number, min: number, pass: boolean }[]}
 */
export function checks(tokens, defaults) {
  const surfaces = { ...defaults, ground: tokens.ground ?? defaults.ground, surface: tokens.surface ?? defaults.surface };
  const route = tokens.route ?? surfaces.route;

  const rows = [
    ['Text on button', tokens['on-action'], tokens.action, 4.5],
    ['Text on hovered button', tokens['on-action'], tokens['action-hover'], 4.5],
    ['Text on pressed button', tokens['on-action'], tokens['action-press'], 4.5],
    ['Links on the page', route, surfaces.ground, 4.5],
    ['Links on cards', route, surfaces.surface, 4.5],
    ['Button edge on the page', tokens.action, surfaces.ground, 3],
    ['Button edge on cards', tokens.action, surfaces.surface, 3],
    ['Hovered button edge', tokens['action-hover'], surfaces.ground, 3],
    ['Pressed button edge', tokens['action-press'], surfaces.ground, 3],
    ...(tokens.ink
      ? [
          ['Text on the page', tokens.ink, surfaces.ground, 4.5],
          ['Muted text on cards', tokens['ink-muted'], surfaces.surface, 4.5],
          ['Field edges on cards', tokens.edge, surfaces.surface, 3],
        ]
      : []),
    ...['positive', 'caution', 'critical'].flatMap((name) =>
      tokens[name]
        ? [
            [`${name[0].toUpperCase()}${name.slice(1)} text on the page`, tokens[name], surfaces.ground, 4.5],
            [`${name[0].toUpperCase()}${name.slice(1)} text on its tint`, tokens[name], tokens[`${name}-tint`], 4.5],
          ]
        : [],
    ),
  ];

  return rows.map(([label, fg, bg, min]) => {
    const ratio = contrast(hexToRgb(fg), hexToRgb(bg));

    return { label, ratio, min, pass: ratio >= min };
  });
}

const block = (selector, tokens, indent = '  ') =>
  `${indent}${selector} {\n${Object.entries(tokens)
    .map(([k, v]) => `${indent}  --focsd-${k}: ${v};`)
    .join('\n')}\n${indent}}`;

/** The three corner radii for a control radius in px. */
const radiusTokens = (radius) => ({
  'radius-control': `${radius}px`,
  'radius-surface': `${Math.round(radius * 1.5)}px`,
  'radius-tag': `${Math.max(0, radius - 1)}px`,
});

/** The cascade order of Focsd's layers. It is stated first so it holds wherever your sheet loads. */
const LAYER_ORDER = '@layer focsd.tokens, focsd.preset, focsd.brand;';

/**
 * The CSS to paste after `tokens.css`. It sits in the `focsd.brand` layer, above `focsd.tokens`, and
 * leaves the high-contrast theme alone.
 * @param {{ light: string, dark: string, radius: number, density: string, text: TextColors, links?: boolean, surfaces: Surfaces } & Extras} options
 */
export function themeCss(options) {
  const { radius, density, surfaces, sans = 'default', mono = 'default' } = options;
  const lightTokens = themeTokens('light', options, surfaces);
  const darkTokens = themeTokens('dark', options, surfaces);
  const shared = { ...radiusTokens(radius), ...fontTokens(sans, mono) };

  const revert = Object.fromEntries(Object.keys(lightTokens).map((k) => [k, 'revert-layer']));

  const parts = [
    LAYER_ORDER,
    `/* Load after @focsd-dev/tokens/tokens.css. */`,
    `@layer focsd.brand {`,
    block(":root:not([data-focsd-theme]),\n  [data-focsd-theme='light']", lightTokens),
    block("[data-focsd-theme='dark']", darkTokens),
    `  @media (prefers-color-scheme: dark) {\n${block(':root:not([data-focsd-theme])', darkTokens, '    ')}\n  }`,
    `  /* The high-contrast theme keeps its own colors. */\n  @media (prefers-contrast: more) {\n${block(':root:not([data-focsd-theme])', revert, '    ')}\n  }`,
    block(':root', shared),
    `}`,
  ];

  const css = parts.join('\n');

  return density === 'default'
    ? css
    : `${css}\n\n/* Density: set on <body> (or any section). */\n/* <body data-focsd-density="${density}"> */`;
}

/**
 * Inline custom properties for a preview container of one theme.
 * @param {'light' | 'dark'} theme
 * @param {{ light: string, dark: string, radius: number, text: TextColors, links?: boolean, surfaces: Surfaces } & Extras} options
 */
export function previewStyle(theme, options) {
  const { radius, surfaces, sans = 'default', mono = 'default' } = options;
  const tokens = { ...themeTokens(theme, options, surfaces), ...radiusTokens(radius), ...fontTokens(sans, mono) };

  return Object.entries(tokens)
    .map(([k, v]) => `--focsd-${k}: ${v}`)
    .join('; ');
}

/**
 * Starting values for the builder from an entry of `@focsd-dev/tokens/presets.json` (a preset, or its
 * `default`). The default has no radii, so it starts at 4px.
 * @param {{ radius?: { control: string }, swatches?: Record<'light' | 'dark', { action: string }> }} entry
 * @returns {{ light: string, dark: string, radius: number }}
 */
export function startFrom(entry) {
  if (!entry?.swatches) throw new Error('Preset entry has no swatches.');

  const radius = entry.radius ? Number.parseInt(entry.radius.control, 10) : 4;

  return { light: entry.swatches.light.action, dark: entry.swatches.dark.action, radius };
}

const mdRows = (rows) =>
  rows.map(({ label, ratio, min, pass }) => `- ${label}: ${ratio.toFixed(2)}:1 (needs ${min}:1, ${pass ? 'passes' : 'fails'})`);

/**
 * "Copy tokens" export: every token the theme sets, per theme, as JSON (token name without the
 * `--focsd-` prefix, value as CSS), for a design tool, a token pipeline or another platform.
 * @param {{ light: string, dark: string, radius: number, text: TextColors, links?: boolean, surfaces: Surfaces } & Extras} options
 */
export function themeJson(options) {
  const { radius, surfaces, sans = 'default', mono = 'default' } = options;

  return `${JSON.stringify(
    {
      $description: 'Focsd theme overrides. Each key is a system token without the --focsd- prefix.',
      shared: { ...radiusTokens(radius), ...fontTokens(sans, mono) },
      light: themeTokens('light', options, surfaces),
      dark: themeTokens('dark', options, surfaces),
    },
    null,
    2,
  )}\n`;
}

/**
 * The agent export's lines for one theme: its colors in words and its measured contrast.
 * @param {'light' | 'dark'} theme
 * @param {{ light: string, dark: string, text: TextColors, links?: boolean, surfaces: Surfaces } & Extras} options
 */
function paletteLines(theme, options) {
  const { links = false, surfaces } = options;
  const brand = options[theme];
  const tokens = themeTokens(theme, options, surfaces);

  return [
    `### ${theme[0].toUpperCase()}${theme.slice(1)} theme`,
    `- Brand (action) color: ${brand.toLowerCase()}; text on it: ${tokens['on-action']}.`,
    `- Hover: ${tokens['action-hover']}; pressed: ${tokens['action-press']}.`,
    `- Page background: ${tokens.ground ?? surfaces[theme].ground}; card background: ${tokens.surface ?? surfaces[theme].surface}.`,
    ...(tokens.ink
      ? [`- Text: ${tokens.ink}; muted text: ${tokens['ink-muted']}; edges: ${tokens.edge} (neutral tint: ${options.neutral}).`]
      : []),
    ...['positive', 'caution', 'critical'].flatMap((n) => (tokens[n] ? [`- ${n}: ${tokens[n]} on a ${tokens[`${n}-tint`]} tint.`] : [])),
    `- Link color: ${tokens.route ?? surfaces[theme].route}${links ? ' (the brand color)' : ' (the theme default)'}.`,
    '',
    'Measured contrast (WCAG 2.2 AA):',
    ...mdRows(checks(tokens, surfaces[theme])),
    '',
  ];
}

/**
 * "For agents" export: the theme described in words (palette roles, measured contrast, density,
 * radius, fonts), then the CSS from `themeCss`. The ratios come from the same `checks` the page shows.
 * @param {{ light: string, dark: string, radius: number, density: string, text: TextColors, links?: boolean,
 *   surfaces: Record<'light' | 'dark', { ground: string, surface: string, route: string }>,
 *   fonts: { sans: string, mono: string }, controlHeights: Record<string, string> }} options
 */
export function agentMarkdown({ fonts, controlHeights, ...options }) {
  const { light, dark, radius, density, sans = 'default', mono = 'default' } = options;
  const radii = radiusTokens(radius);

  const chosenFonts = {
    sans: fonts.sans,
    mono: fonts.mono,
    ...Object.fromEntries(Object.entries(fontTokens(sans, mono)).map(([k, v]) => [k.slice(5), v])),
  };

  const palette = ['light', 'dark'].flatMap((theme) => paletteLines(theme, options));

  return [
    '# Focsd theme',
    '',
    `A brand override for Focsd tokens: ${light.toLowerCase()} in the light theme, ${dark.toLowerCase()} in the dark theme. The high-contrast theme keeps its own colors.`,
    '',
    '## Palette',
    '',
    ...palette,
    '## Shape',
    '',
    `- Control radius ${radii['radius-control']}, surface radius ${radii['radius-surface']}, tag radius ${radii['radius-tag']}.`,
    '',
    '## Density',
    '',
    `- ${density}: controls are ${controlHeights[density] ?? 'the default height'} tall.${density === 'default' ? '' : ` Set \`<body data-focsd-density="${density}">\` (or any section).`}`,
    '',
    '## Fonts',
    '',
    `- Sans: ${chosenFonts.sans}`,
    `- Mono: ${chosenFonts.mono}`,
    ...(sans !== 'default' || mono !== 'default'
      ? ['- These fonts are named, not loaded: load them in the app, or the stack falls back to the system font.']
      : []),
    '',
    '## CSS',
    '',
    'Load after `@focsd-dev/tokens/tokens.css`.',
    '',
    '```css',
    themeCss(options),
    '```',
    '',
  ].join('\n');
}
