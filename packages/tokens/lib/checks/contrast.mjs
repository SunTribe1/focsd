import { toGamut, wcagContrast } from 'culori';

const toRgb = toGamut('rgb', 'oklch');
const asCulori = (v) => ({ mode: 'oklch', l: v.components[0], c: v.components[1], h: v.components[2] });

/** WCAG 2.x contrast ratio between two DTCG oklch colors, after mapping into the sRGB gamut. */
export const ratio = (a, b) => wcagContrast(toRgb(asCulori(a)), toRgb(asCulori(b)));

/** Map of system color name (e.g. "ink-muted") → resolved DTCG color. */
export const colorMap = (tokens) =>
  new Map(tokens.filter((t) => t.path[0] === 'sys' && t.path[1] === 'color').map((t) => [t.path.slice(2).join('-'), t.value]));

export function checkContrast(theme, colors, spec) {
  const get = (name) => {
    const value = colors.get(name);

    if (!value) throw new Error(`Contrast rule names unknown color "${name}" (theme ${theme})`);

    return value;
  };

  const errors = [];

  for (const { fg, bg, min } of spec.pairs ?? []) {
    for (const f of fg) {
      for (const b of bg) {
        const r = ratio(get(f), get(b));

        if (r < min) errors.push(`${theme}: ${f} on ${b} is ${r.toFixed(2)}:1, needs ${min}:1`);
      }
    }
  }

  for (const { fg, bg, min } of spec.anyOf ?? []) {
    for (const b of bg) {
      const best = Math.max(...fg.map((f) => ratio(get(f), get(b))));

      if (best < min) errors.push(`${theme}: none of ${fg.join(', ')} reaches ${min}:1 on ${b}`);
    }
  }

  return errors;
}
