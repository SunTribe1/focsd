/**
 * Color parsing, formatting and maths for the color picker. Colors are `{ r, g, b, a }` with
 * sRGB channels 0–255 and alpha 0–1. Accepts hex, rgb(), hsl(), oklch() and the CSS named colors,
 * in both comma and space syntax.
 */

import { clamp } from './number.js';

/**
 * An sRGB color: channels 0–255, alpha 0–1.
 * @typedef {{ r: number, g: number, b: number, a: number }} Color
 */

/**
 * Hue (0–360), saturation and value (0–100), alpha 0–1.
 * @typedef {{ h: number, s: number, v: number, a: number }} Hsv
 */

// cspell:disable
/** @type {Record<string, string>} */
const NAMED = Object.fromEntries(
  `aliceblue f0f8ff antiquewhite faebd7 aqua 00ffff aquamarine 7fffd4 azure f0ffff beige f5f5dc bisque ffe4c4 black 000000
blanchedalmond ffebcd blue 0000ff blueviolet 8a2be2 brown a52a2a burlywood deb887 cadetblue 5f9ea0 chartreuse 7fff00
chocolate d2691e coral ff7f50 cornflowerblue 6495ed cornsilk fff8dc crimson dc143c cyan 00ffff darkblue 00008b
darkcyan 008b8b darkgoldenrod b8860b darkgray a9a9a9 darkgreen 006400 darkgrey a9a9a9 darkkhaki bdb76b darkmagenta 8b008b
darkolivegreen 556b2f darkorange ff8c00 darkorchid 9932cc darkred 8b0000 darksalmon e9967a darkseagreen 8fbc8f
darkslateblue 483d8b darkslategray 2f4f4f darkslategrey 2f4f4f darkturquoise 00ced1 darkviolet 9400d3 deeppink ff1493
deepskyblue 00bfff dimgray 696969 dimgrey 696969 dodgerblue 1e90ff firebrick b22222 floralwhite fffaf0 forestgreen 228b22
fuchsia ff00ff gainsboro dcdcdc ghostwhite f8f8ff gold ffd700 goldenrod daa520 gray 808080 green 008000 greenyellow adff2f
grey 808080 honeydew f0fff0 hotpink ff69b4 indianred cd5c5c indigo 4b0082 ivory fffff0 khaki f0e68c lavender e6e6fa
lavenderblush fff0f5 lawngreen 7cfc00 lemonchiffon fffacd lightblue add8e6 lightcoral f08080 lightcyan e0ffff
lightgoldenrodyellow fafad2 lightgray d3d3d3 lightgreen 90ee90 lightgrey d3d3d3 lightpink ffb6c1 lightsalmon ffa07a
lightseagreen 20b2aa lightskyblue 87cefa lightslategray 778899 lightslategrey 778899 lightsteelblue b0c4de lightyellow ffffe0
lime 00ff00 limegreen 32cd32 linen faf0e6 magenta ff00ff maroon 800000 mediumaquamarine 66cdaa mediumblue 0000cd
mediumorchid ba55d3 mediumpurple 9370db mediumseagreen 3cb371 mediumslateblue 7b68ee mediumspringgreen 00fa9a
mediumturquoise 48d1cc mediumvioletred c71585 midnightblue 191970 mintcream f5fffa mistyrose ffe4e1 moccasin ffe4b5
navajowhite ffdead navy 000080 oldlace fdf5e6 olive 808000 olivedrab 6b8e23 orange ffa500 orangered ff4500 orchid da70d6
palegoldenrod eee8aa palegreen 98fb98 paleturquoise afeeee palevioletred db7093 papayawhip ffefd5 peachpuff ffdab9
peru cd853f pink ffc0cb plum dda0dd powderblue b0e0e6 purple 800080 rebeccapurple 663399 red ff0000 rosybrown bc8f8f
royalblue 4169e1 saddlebrown 8b4513 salmon fa8072 sandybrown f4a460 seagreen 2e8b57 seashell fff5ee sienna a0522d
silver c0c0c0 skyblue 87ceeb slateblue 6a5acd slategray 708090 slategrey 708090 snow fffafa springgreen 00ff7f
steelblue 4682b4 tan d2b48c teal 008080 thistle d8bfd8 tomato ff6347 turquoise 40e0d0 violet ee82ee wheat f5deb3
white ffffff whitesmoke f5f5f5 yellow ffff00 yellowgreen 9acd32`
    .trim()
    .split(/\s+/)
    .reduce(
      (pairs, word, i, all) => (i % 2 ? pairs : [...pairs, [word, /** @type {string} */ (all[i + 1])]]),
      /** @type {[string, string][]} */ ([]),
    ),
);
// cspell:enable

/** @type {(n: number, d?: number) => number} */
const round = (n, d = 0) => Number(n.toFixed(d));

/** @type {(n: number, d: number) => string} */
const fmt = (n, d) => String(round(n, d));

const NUMBER = /^[-+]?(\d+\.?\d*|\.\d+)(%|deg)?$/i;

/**
 * One CSS number token: { value, percent } or null.
 * @param {string} text
 * @returns {{ value: number, percent: boolean } | null}
 */
function token(text) {
  const m = NUMBER.exec(text.trim());

  if (!m) return null;

  return { value: Number.parseFloat(text), percent: m[2] === '%' };
}

/**
 * @param {string | undefined} text
 * @returns {number | null}
 */
function alphaOf(text) {
  if (text === undefined) return 1;
  const t = token(text);

  if (!t) return null;

  return round(clamp(t.percent ? t.value / 100 : t.value, 0, 1), 3);
}

/**
 * @param {string} text
 * @returns {Color | null}
 */
function parseHex(text) {
  const m = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(text);

  if (!m) return null;
  let hex = /** @type {string} */ (m[1]);

  if (hex.length <= 4) hex = [...hex].map((c) => c + c).join('');
  /** @param {number} i */
  const n = (i) => Number.parseInt(hex.slice(i, i + 2), 16);

  return { r: n(0), g: n(2), b: n(4), a: hex.length === 8 ? round(n(6) / 255, 3) : 1 };
}

/**
 * Split a function's arguments: three channels plus an optional alpha, comma or space syntax.
 * @param {string} inner
 * @returns {string[] | null}
 */
function args(inner) {
  if (inner.includes(',')) {
    const parts = inner.split(',').map((s) => s.trim());

    return parts.length === 3 || parts.length === 4 ? parts : null;
  }

  const [main, alpha, extra] = inner.split('/');

  if (extra !== undefined) return null;
  const parts = /** @type {string} */ (main).trim().split(/\s+/);

  if (parts.length !== 3) return null;

  return alpha === undefined ? parts : [...parts, alpha.trim()];
}

/**
 * @param {number} h
 * @param {number} s
 * @param {number} l
 * @returns {[number, number, number]}
 */
function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r, g, b] = hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = l - c / 2;

  return /** @type {[number, number, number]} */ ([r + m, g + m, b + m].map((v) => Math.round(clamp(v, 0, 1) * 255)));
}

/**
 * @param {Color} color
 * @returns {{ h: number, s: number, l: number }}
 */
function rgbToHsl({ r, g, b }) {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) return { h: 0, s: 0, l: l * 100 };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === rn ? ((gn - bn) / d) % 6 : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  h = (h * 60 + 360) % 360;

  return { h, s: s * 100, l: l * 100 };
}

/** @param {number} c */
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** @param {number} c */
const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/**
 * @param {number} L
 * @param {number} C
 * @param {number} H
 * @returns {[number, number, number]}
 */
function oklchToRgb(L, C, H) {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;

  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];

  return /** @type {[number, number, number]} */ (rgb.map((v) => Math.round(clamp(toGamma(v), 0, 1) * 255)));
}

/**
 * @param {Color} color
 * @returns {{ L: number, C: number, H: number }}
 */
function rgbToOklch({ r, g, b }) {
  const [rl, gl, bl] = /** @type {[number, number, number]} */ ([r, g, b].map((v) => toLinear(v / 255)));
  const l = Math.cbrt(0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl);
  const m = Math.cbrt(0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl);
  const s = Math.cbrt(0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(A, B);
  const H = C < 1e-4 ? 0 : ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;

  return { L, C, H };
}

/**
 * @param {string} text
 * @returns {Color | null}
 */
function parseFunction(text) {
  const m = /^(rgba?|hsla?|oklch)\((.*)\)$/i.exec(text);

  if (!m) return null;
  const parts = args(/** @type {string} */ (m[2]));

  if (!parts) return null;
  const [x, y, z] = parts.slice(0, 3).map(token);
  const a = alphaOf(parts[3]);

  if (!x || !y || !z || a === null) return null;
  const fn = /** @type {string} */ (m[1]).toLowerCase();

  if (fn.startsWith('rgb')) {
    const [r, g, b] = /** @type {[number, number, number]} */ (
      [x, y, z].map((t) => Math.round(clamp(t.percent ? t.value * 2.55 : t.value, 0, 255)))
    );

    return { r, g, b, a };
  }

  if (fn.startsWith('hsl')) {
    const [r, g, b] = hslToRgb(x.value, clamp(y.value, 0, 100) / 100, clamp(z.value, 0, 100) / 100);

    return { r, g, b, a };
  }

  const L = x.percent ? x.value / 100 : x.value;
  const [r, g, b] = oklchToRgb(clamp(L, 0, 1), Math.max(0, y.percent ? (y.value / 100) * 0.4 : y.value), z.value);

  return { r, g, b, a };
}

/**
 * Parse any supported CSS color, or null when it is not one.
 * @param {string | null | undefined} text
 * @returns {Color | null}
 */
export function parseColor(text) {
  const t = String(text ?? '').trim();

  if (!t) return null;

  if (t.startsWith('#')) return parseHex(t);
  const named = NAMED[t.toLowerCase()];

  if (named) return parseHex(`#${named}`);

  return parseFunction(t);
}

/** Reverse of `NAMED`, `rrggbb` to name. The first spelling listed wins, so `gray` beats `grey`. */
const NAMES = new Map();

for (const [name, hex] of Object.entries(NAMED)) if (!NAMES.has(hex)) NAMES.set(hex, name);

/**
 * The CSS named color that matches exactly (opaque only), lower case, or null.
 * @param {Color} c
 * @returns {string | null}
 */
export function colorName(c) {
  if (c.a !== 1) return null;

  return NAMES.get(formatColor(c, 'hex').slice(1)) ?? null;
}

/** @param {number} n */
const hex2 = (n) => Math.round(n).toString(16).padStart(2, '0');

/**
 * Serialize a color in `format` (hex, rgb, hsl or oklch); alpha only when `alpha` and below 1.
 * @param {Color} c
 * @param {string} [format]
 * @param {boolean} [alpha]
 * @returns {string}
 */
export function formatColor(c, format = 'hex', alpha = false) {
  const withAlpha = alpha && c.a < 1;
  const slash = withAlpha ? ` / ${fmt(c.a, 3)}` : '';

  switch (format) {
    case 'rgb':
      return `rgb(${c.r} ${c.g} ${c.b}${slash})`;
    case 'hsl': {
      const { h, s, l } = rgbToHsl(c);

      return `hsl(${fmt(h, 1)} ${fmt(s, 1)}% ${fmt(l, 1)}%${slash})`;
    }

    case 'oklch': {
      const { L, C, H } = rgbToOklch(c);

      return `oklch(${fmt(L * 100, 1)}% ${fmt(C, 4)} ${fmt(H, 2)}${slash})`;
    }

    default:
      return `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}${withAlpha ? hex2(c.a * 255) : ''}`;
  }
}

/**
 * sRGB to hue (0–360), saturation and value (0–100).
 * @param {{ r: number, g: number, b: number, a?: number }} color
 * @returns {Hsv}
 */
export function toHsv({ r, g, b, a = 1 }) {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const d = max - Math.min(rn, gn, bn);
  let h = 0;

  if (d) h = max === rn ? ((gn - bn) / d) % 6 : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;

  return { h: round((h * 60 + 360) % 360, 2), s: round(max ? (d / max) * 100 : 0, 2), v: round(max * 100, 2), a };
}

/**
 * Hue (0–360), saturation and value (0–100) to sRGB.
 * @param {{ h: number, s: number, v: number, a?: number }} hsv
 * @returns {Color}
 */
export function fromHsv({ h, s, v, a = 1 }) {
  const sv = clamp(s, 0, 100) / 100;
  const vv = clamp(v, 0, 100) / 100;
  const l = vv * (1 - sv / 2);
  const sl = l === 0 || l === 1 ? 0 : (vv - l) / Math.min(l, 1 - l);
  const [r, g, b] = hslToRgb(h, sl, l);

  return { r, g, b, a };
}

/** @param {{ r: number, g: number, b: number }} color */
const luminance = ({ r, g, b }) => {
  const [rl, gl, bl] = /** @type {[number, number, number]} */ ([r, g, b].map((v) => toLinear(v / 255)));

  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
};

/**
 * WCAG 2.2 contrast ratio between two colors, to two decimals.
 * @param {{ r: number, g: number, b: number }} x
 * @param {{ r: number, g: number, b: number }} y
 * @returns {number}
 */
export function contrastRatio(x, y) {
  const [hi, lo] = /** @type {[number, number]} */ ([luminance(x), luminance(y)].toSorted((p, q) => q - p));

  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}
