import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadTokens } from '../lib/load.mjs';
import { atRule, declarations, declValue, rule } from '../lib/emit.mjs';

const fixture = (f) => fileURLToPath(new URL(`./fixtures/mini/${f}`, import.meta.url));

describe('loadTokens', () => {
  it('returns only source tokens, with aliases resolved and originals kept', async () => {
    const tokens = await loadTokens({ include: [fixture('ref.json')], source: [fixture('sys.json')] });
    expect(tokens.map((t) => t.path.join('.'))).toEqual(['sys.color.ink', 'sys.radius.control']);
    const ink = tokens[0];
    expect(ink.type).toBe('color');
    expect(ink.original).toBe('{ref.color.graphite.21}');
    expect(ink.value.hex).toBe('#141a18');
  });
});

describe('emit', () => {
  it('turns whole-value aliases into var() and raw values into CSS', async () => {
    const tokens = await loadTokens({ include: [fixture('ref.json')], source: [fixture('sys.json')] });
    expect(declValue(tokens[0])).toBe('var(--focsd-ref-graphite-21)');
    expect(declarations(tokens)).toEqual(['--focsd-ink: var(--focsd-ref-graphite-21);', '--focsd-radius-control: 4px;']);
  });

  it('formats rules and at-rules with two-space indentation', () => {
    expect(rule(':root', ['a: b;'])).toBe(':root {\n  a: b;\n}');
    expect(atRule('@layer x', rule(':root', ['a: b;']))).toBe('@layer x {\n  :root {\n    a: b;\n  }\n}');
  });
});
