const percent = (n) => `${Number((n * 100).toFixed(2))}%`;

/** @param {{ colorSpace: string, components: number[], alpha?: number, hex: string }} value */
export function colorToCss(value) {
  if (value.colorSpace !== 'oklch') {
    throw new Error(`Unsupported colorSpace "${value.colorSpace}": author Focsd colors in oklch`);
  }

  const [l, c, h] = value.components;
  const alpha = value.alpha ?? 1;

  return `oklch(${percent(l)} ${c} ${h}${alpha < 1 ? ` / ${alpha}` : ''})`;
}

/** @param {{ alpha?: number, hex: string }} value */
export function colorToHexFallback(value) {
  const alpha = value.alpha ?? 1;
  const hex = value.hex.toLowerCase();

  if (alpha >= 1) return hex;

  return `${hex}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')}`;
}

/** @param {{ value: number, unit: string } | string} value */
export const dimensionToCss = (value) => (typeof value === 'string' ? value : `${value.value}${value.unit}`);

const quoteFamily = (name) => (/\s/.test(name) ? `"${name}"` : name);

const shadowLayer = (s) =>
  `${s.inset ? 'inset ' : ''}${dimensionToCss(s.offsetX)} ${dimensionToCss(s.offsetY)} ${dimensionToCss(s.blur)} ${dimensionToCss(s.spread)} ${colorToCss(s.color)}`;

/**
 * Serialize a resolved DTCG value to a CSS value string.
 * @param {any} value
 * @param {string | undefined} type
 */
export function toCss(value, type) {
  switch (type) {
    case 'color':
      return colorToCss(value);
    case 'dimension':
    case 'duration':
      return dimensionToCss(value);
    case 'cubicBezier':
      return `cubic-bezier(${value.join(', ')})`;
    case 'fontFamily':
      return (Array.isArray(value) ? value : [value]).map(quoteFamily).join(', ');
    case 'fontWeight':
    case 'number':
      return String(value);
    case 'shadow': {
      const layers = Array.isArray(value) ? value : [value];

      return layers.length === 0 ? 'none' : layers.map(shadowLayer).join(', ');
    }

    case undefined:
    case 'string':
      if (typeof value === 'string') return value;
      break;
    default:
      break;
  }

  throw new Error(`Cannot serialize token of type ${type}: ${JSON.stringify(value)}`);
}
