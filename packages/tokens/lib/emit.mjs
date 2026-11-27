import { cssName } from './names.mjs';
import { colorToCss, dimensionToCss, toCss } from './serialize.mjs';

const WHOLE_ALIAS = /^\{([^}]+)\}$/;

const aliasVar = (authored) => {
  const match = typeof authored === 'string' ? authored.match(WHOLE_ALIAS) : null;

  return match ? `var(${cssName(match[1].split('.'))})` : null;
};

/** Shadow layers keep aliased colors as var() so they inherit the reference hex fallbacks. */
const shadowValue = (resolved, authored) =>
  resolved.length === 0
    ? 'none'
    : resolved
        .map((layer, i) => {
          const color = aliasVar(authored[i]?.color) ?? colorToCss(layer.color);

          return `${layer.inset ? 'inset ' : ''}${dimensionToCss(layer.offsetX)} ${dimensionToCss(layer.offsetY)} ${dimensionToCss(layer.blur)} ${dimensionToCss(layer.spread)} ${color}`;
        })
        .join(', ');

/** A token whose authored value is exactly one alias is emitted as var(); everything else is serialized. */
export function declValue(token) {
  const whole = aliasVar(token.original);

  if (whole) return whole;

  if (token.type === 'shadow' && Array.isArray(token.value) && Array.isArray(token.original)) {
    return shadowValue(token.value, token.original);
  }

  return toCss(token.value, token.type);
}

export const declarations = (tokens) => tokens.map((t) => `${cssName(t.path)}: ${declValue(t)};`);

export const rule = (selector, lines) => `${selector} {\n${lines.map((l) => `  ${l}`).join('\n')}\n}`;

export const atRule = (prelude, body) =>
  `${prelude} {\n${body
    .split('\n')
    .map((l) => (l ? `  ${l}` : l))
    .join('\n')}\n}`;
