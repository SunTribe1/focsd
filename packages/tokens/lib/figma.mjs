/**
 * Figma Variables export: DTCG `.tokens.json` files that Figma imports natively, one file per
 * mode. Tokens that change with the theme go in the Theme collection (light, dark, contrast),
 * tokens that change with density in the Density collection, and the rest in Base.
 * Figma variables hold colors, px dimensions, durations in seconds, numbers and font families;
 * anything else (em tracking, easing curves, shadows) is left out.
 */
const REM_PX = 16;
const LENGTH = /^(-?\d*\.?\d+)(rem|px)$/;

const round = (n) => Math.round(n * 1000) / 1000;

function lengthPx(text) {
  const m = LENGTH.exec(text.trim());

  if (!m) return null;

  return round(Number(m[1]) * (m[2] === 'rem' ? REM_PX : 1));
}

function color(hex) {
  const h = hex.replace('#', '');
  const channel = (i) => Number.parseInt(h.slice(i, i + 2), 16) / 255;
  const alpha = h.length === 8 ? round(channel(6)) : 1;

  return { colorSpace: 'srgb', components: [0, 2, 4].map((i) => round(channel(i))), alpha, hex: `#${h.slice(0, 6)}` };
}

/**
 * One resolved token row as a DTCG token Figma can import, or null when Figma has no matching type.
 * @param {{ name: string, value: string, hex?: string }} row
 */
export function figmaValue(row) {
  const { value, hex } = row;

  if (hex) return { $type: 'color', $value: color(hex) };
  const clamp = /^clamp\(.*,\s*([^,]+)\)$/.exec(value);
  const px = lengthPx(clamp ? clamp[1] : value);

  if (px !== null) return { $type: 'dimension', $value: { value: px, unit: 'px' } };
  const ms = /^(\d*\.?\d+)(ms|s)$/.exec(value);

  if (ms) return { $type: 'duration', $value: { value: round(Number(ms[1]) / (ms[2] === 'ms' ? 1000 : 1)), unit: 's' } };

  if (/^-?\d*\.?\d+$/.test(value)) return { $type: 'number', $value: Number(value) };

  if (row.name.startsWith('font-')) {
    const first = value
      .split(',')[0]
      .trim()
      .replaceAll(/^["']|["']$/g, '');

    return { $type: 'fontFamily', $value: first };
  }

  return null;
}

/** Add a token under its type group, without mutating the input. */
const withToken = (file, token, name) => ({ ...file, [token.$type]: { ...file[token.$type], [name]: token } });

/**
 * Every Figma file, keyed by file name.
 * @param {{ theme: string, density: string, name: string, value: string, hex?: string }[]} rows
 * @returns {Record<string, object>}
 */
export function figmaFiles(rows) {
  const themes = [...new Set(rows.map((r) => r.theme))];
  const densities = [...new Set(rows.map((r) => r.density))];
  const [baseTheme] = themes;
  const [baseDensity] = densities;
  const at = new Map(rows.map((r) => [`${r.theme}|${r.density}|${r.name}`, r]));
  const names = [...new Set(rows.map((r) => r.name))];
  const lookup = (theme, density, name) => at.get(`${theme}|${density}|${name}`);
  const signature = (r) => `${r?.value}|${r?.hex ?? ''}`;
  const byTheme = (name) => new Set(themes.map((m) => signature(lookup(m, baseDensity, name)))).size > 1;
  const byDensity = (name) => new Set(densities.map((m) => signature(lookup(baseTheme, m, name)))).size > 1;

  const files = { 'base.tokens.json': {} };

  for (const m of themes) files[`theme.${m}.tokens.json`] = {};

  for (const m of densities) files[`density.${m}.tokens.json`] = {};

  for (const name of names) {
    if (byTheme(name)) {
      for (const m of themes) {
        const token = figmaValue(lookup(m, baseDensity, name));
        const key = `theme.${m}.tokens.json`;

        if (token) files[key] = withToken(files[key], token, name);
      }
    } else if (byDensity(name)) {
      for (const m of densities) {
        const token = figmaValue(lookup(baseTheme, m, name));
        const key = `density.${m}.tokens.json`;

        if (token) files[key] = withToken(files[key], token, name);
      }
    } else {
      const token = figmaValue(lookup(baseTheme, baseDensity, name));

      if (token) files['base.tokens.json'] = withToken(files['base.tokens.json'], token, name);
    }
  }

  return files;
}
