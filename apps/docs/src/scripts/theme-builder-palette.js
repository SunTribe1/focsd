/**
 * The theme builder's neutral tint, status colors and fonts. Colors are worked out in OKLCH with
 * the library's own color helpers, on the same lightness steps the presets use, so a tinted
 * neutral keeps the contrast the default theme has.
 */
import { formatColor, parseColor } from '@focsd/primitives/utils';

/** @typedef {'light' | 'dark'} Theme */

/**
 * Neutral tints: a hue and a small chroma for the grounds, surfaces, text and edges. `none` keeps
 * the theme's own neutrals (nothing is written).
 * @type {Record<string, { label: string, hue?: number, chroma?: number }>}
 */
export const NEUTRALS = {
  none: { label: 'Theme default' },
  slate: { label: 'Slate (cool blue)', hue: 250, chroma: 0.014 },
  sage: { label: 'Sage (green)', hue: 150, chroma: 0.012 },
  sand: { label: 'Sand (warm)', hue: 75, chroma: 0.014 },
  stone: { label: 'Stone (warm gray)', hue: 50, chroma: 0.008 },
  mauve: { label: 'Mauve (violet)', hue: 305, chroma: 0.013 },
};

/** Lightness of each neutral role, per theme: the steps the presets use (tokens preset-palettes.mjs). */
const NEUTRAL_STEPS = {
  light: {
    ground: 0.97,
    surface: 0.995,
    'surface-sunk': 0.952,
    'surface-raised': 0.995,
    ink: 0.22,
    'ink-muted': 0.47,
    edge: 0.6,
    'edge-quiet': 0.88,
  },
  dark: {
    ground: 0.19,
    surface: 0.23,
    'surface-sunk': 0.16,
    'surface-raised': 0.23,
    ink: 0.94,
    'ink-muted': 0.75,
    edge: 0.57,
    'edge-quiet': 0.32,
  },
};

/** Light-theme roles kept near white. */
const LIGHT_CARDS = new Set(['surface', 'surface-raised']);

/** @param {number} l @param {number} c @param {number} h */
const oklch = (l, c, h) => {
  const color = parseColor(`oklch(${l} ${c} ${h})`);

  if (!color) throw new Error(`Theme builder: cannot make oklch(${l} ${c} ${h}).`);

  return formatColor(color, 'hex');
};

/**
 * Lightness, chroma and hue of a hex color.
 * @param {string} hex
 */
function toOklch(hex) {
  const color = parseColor(hex);
  const match = color ? /oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)/.exec(formatColor(color, 'oklch')) : null;

  if (!match) throw new Error(`Theme builder: not a color: ${hex}.`);

  return { l: Number(match[1]) / 100, c: Number(match[2]), h: Number(match[3]) };
}

/**
 * The neutral role tokens for one theme, or none for `none`. The focus ring follows the ground and
 * ink, as it does in every theme.
 * @param {string} tint a key of NEUTRALS
 * @param {Theme} theme
 * @returns {Record<string, string>}
 */
export function neutralTokens(tint, theme) {
  const { hue, chroma } = NEUTRALS[tint] ?? NEUTRALS.none;

  if (hue === undefined || chroma === undefined) return {};

  // Light cards stay near white, as in the presets: their chroma is capped low.
  const chromaOf = (/** @type {string} */ role) => (theme === 'light' && LIGHT_CARDS.has(role) ? Math.min(chroma, 0.004) : chroma);
  const tokens = Object.fromEntries(Object.entries(NEUTRAL_STEPS[theme]).map(([role, l]) => [role, oklch(l, chromaOf(role), hue)]));

  return { ...tokens, 'focus-inner': tokens.ground, 'focus-outer': tokens.ink };
}

/** The status roles a builder can recolor, and the default lightness of each in the two themes. */
export const STATUSES = /** @type {const} */ (['positive', 'caution', 'critical']);

/**
 * A status color and its tint for one theme, from one hex: the light theme uses the color's hue
 * and chroma at a dark lightness (text on the page), the dark theme at a light one. The tint is the
 * color mixed far toward the ground, for a message background.
 * @param {string} hex the color people picked
 * @param {Theme} theme
 * @param {string} ground the theme's ground, hex
 * @returns {{ color: string, tint: string }}
 */
function statusPair(hex, theme, ground) {
  const { c, h } = toOklch(hex);
  const chroma = Math.min(c, 0.16);
  const color = theme === 'light' ? oklch(0.48, chroma, h) : oklch(0.8, chroma * 0.8, h);
  const g = toOklch(ground);
  const tint = oklch(theme === 'light' ? g.l - 0.03 : g.l + 0.05, Math.min(chroma, 0.04), h);

  return { color, tint };
}

/**
 * Status tokens for one theme, for the statuses that were changed.
 * @param {Partial<Record<typeof STATUSES[number], string>>} picks
 * @param {Theme} theme
 * @param {string} ground hex
 * @returns {Record<string, string>}
 */
export function statusTokens(picks, theme, ground) {
  return Object.fromEntries(
    STATUSES.flatMap((name) => {
      const hex = picks[name];

      if (!hex) return [];
      const { color, tint } = statusPair(hex, theme, ground);

      return [
        [name, color],
        [`${name}-tint`, tint],
      ];
    }),
  );
}

/**
 * Font stacks people can start from. A named font is not loaded by the theme: the app loads it
 * (for example from its own files or a font service), or the stack falls back to the system font.
 */
export const SANS_FONTS = {
  default: { label: 'Atkinson Hyperlegible Next (default)' },
  system: { label: 'System UI', stack: 'ui-sans-serif, system-ui, sans-serif' },
  inter: { label: 'Inter', stack: 'Inter, ui-sans-serif, system-ui, sans-serif' },
  plex: { label: 'IBM Plex Sans', stack: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif' },
  lexend: { label: 'Lexend', stack: 'Lexend, ui-sans-serif, system-ui, sans-serif' },
  'source-serif': { label: 'Source Serif 4 (serif)', stack: '"Source Serif 4", ui-serif, Georgia, serif' },
};

export const MONO_FONTS = {
  default: { label: 'Atkinson Hyperlegible Mono (default)' },
  system: { label: 'System monospace', stack: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' },
  'jetbrains-mono': { label: 'JetBrains Mono', stack: '"JetBrains Mono", ui-monospace, monospace' },
  'plex-mono': { label: 'IBM Plex Mono', stack: '"IBM Plex Mono", ui-monospace, monospace' },
};

/**
 * Font tokens for the chosen stacks; the defaults write nothing.
 * @param {string} sans a key of SANS_FONTS
 * @param {string} mono a key of MONO_FONTS
 * @returns {Record<string, string>}
 */
export function fontTokens(sans, mono) {
  /** @type {Record<string, string>} */
  const tokens = {};
  const sansStack = SANS_FONTS[sans]?.stack;
  const monoStack = MONO_FONTS[mono]?.stack;

  if (sansStack) tokens['font-sans'] = sansStack;

  if (monoStack) tokens['font-mono'] = monoStack;

  return tokens;
}
