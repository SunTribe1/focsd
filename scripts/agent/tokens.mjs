/**
 * Design tokens in the W3C Design Tokens (DTCG 2025.10) format, one file per theme, from the
 * resolved token table (default density). Values DTCG can express exactly become structured
 * values (oklch colors, px/rem dimensions, ms durations, cubic-bezier arrays, numbers, font
 * families); anything else (clamp(), em tracking, composite shadows, `none`) keeps the CSS string
 * as `$value`, with `$extensions["dev.focsd"].raw: true` so tools know to pass it through.
 */
import { splitTop } from './types.mjs';

export const THEMES = /** @type {const} */ (['light', 'dark', 'contrast']);

const EXTENSION = 'dev.focsd';
const NUMBER = /^-?\d*\.?\d+$/;
const DIMENSION = /^(-?\d*\.?\d+)(px|rem)$/;
const DURATION = /^(\d*\.?\d+)(ms|s)$/;
const BEZIER = /^cubic-bezier\(([^)]+)\)$/;
const OKLCH = /^oklch\((-?\d*\.?\d+)%\s+(-?\d*\.?\d+)\s+(-?\d*\.?\d+)(?:\s*\/\s*(\d*\.?\d+))?\)$/;

/** @param {string} path */
export const tokenPath = (path) => `/schema/tokens/${path}.json`;

/** Round away float noise from the percent conversion. */
const round = (/** @type {number} */ n) => Number(n.toFixed(6));

/** @param {string} value */
function color(value) {
  const m = OKLCH.exec(value);

  if (!m) return null;

  return {
    colorSpace: 'oklch',
    components: [round(Number(m[1]) / 100), Number(m[2]), Number(m[3])],
    alpha: m[4] === undefined ? 1 : Number(m[4]),
  };
}

/** @param {string} value */
const fontFamily = (value) => splitTop(value, ',').map((f) => f.replaceAll(/^["']|["']$/g, ''));

/**
 * The DTCG type a token's name and value imply, with the structured value when exact.
 * @param {string} name
 * @param {string} value
 * @returns {{ $type: string, $value: unknown, raw?: boolean }}
 */
export function dtcgValue(name, value) {
  const dimension = DIMENSION.exec(value);
  const duration = DURATION.exec(value);
  const bezier = BEZIER.exec(value);
  const oklch = color(value);

  if (name.startsWith('font-')) return { $type: 'fontFamily', $value: fontFamily(value) };

  if (name.endsWith('-weight') && NUMBER.test(value)) return { $type: 'fontWeight', $value: Number(value) };

  if (NUMBER.test(value)) return { $type: 'number', $value: Number(value) };

  if (dimension) return { $type: 'dimension', $value: { value: Number(dimension[1]), unit: dimension[2] } };

  if (duration) return { $type: 'duration', $value: { value: Number(duration[1]), unit: duration[2] } };

  if (bezier) return { $type: 'cubicBezier', $value: bezier[1].split(',').map(Number) };

  if (oklch) return { $type: 'color', $value: oklch };

  return { $type: /shadow|focus-ring/.test(name) ? 'shadow' : 'dimension', $value: value, raw: true };
}

/**
 * One theme's tokens as a flat DTCG group (token names are already unique and kebab-case).
 * @param {{ theme: string, density: string, name: string, css: string, value: string }[]} rows
 * @param {string} theme
 */
export function themeTokens(rows, theme) {
  /** @type {Record<string, unknown>} */
  const out = {
    $description: `Focsd design tokens, ${theme} theme, default density. CSS custom property in $extensions["${EXTENSION}"].css.`,
  };

  for (const row of rows.filter((r) => r.theme === theme && r.density === 'default')) {
    const { raw, ...token } = dtcgValue(row.name, row.value);
    /** @type {{ css: string, raw?: true }} */
    const extension = { css: row.css };

    if (raw) extension.raw = true;
    out[row.name] = { ...token, $extensions: { [EXTENSION]: extension } };
  }

  return out;
}

/** @param {string} version */
export function tokensIndex(version) {
  return {
    name: 'Focsd design tokens',
    version,
    format: 'https://www.designtokens.org/tr/2025.10/format/',
    description: 'One DTCG file per theme. Densities (comfortable, compact) change only spacing and sizes; see the tokens guide.',
    themes: THEMES.map((theme) => ({ theme, url: tokenPath(theme) })),
  };
}
