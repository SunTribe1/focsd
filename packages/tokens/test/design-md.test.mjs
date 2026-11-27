import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const designMd = await readFile(new URL('../../../DESIGN.md', import.meta.url), 'utf8');
const rows = JSON.parse(await readFile(new URL('../dist/tokens.resolved.json', import.meta.url), 'utf8'));

/** Parse the `colors:` block of DESIGN.md's YAML front matter into { key: hex }. */
function designColors(md) {
  const front = md.split(/^---$/m)[1];
  const block = front.split(/^colors:\n/m)[1].split(/^\S/m)[0];

  return Object.fromEntries([...block.matchAll(/^ {2}([\w-]+): "(#[0-9A-Fa-f]{6})"/gm)].map((m) => [m[1], m[2].toLowerCase()]));
}

const themeOf = (key) =>
  key.startsWith('dark-') ? ['dark', key.slice(5)] : key.startsWith('contrast-') ? ['contrast', key.slice(9)] : ['light', key];

describe('DESIGN.md ↔ tokens', () => {
  const colors = designColors(designMd);

  it('lists the pressed and raised states with their resolved hex values', () => {
    const listed = ['action-press', 'surface-raised', 'dark-action-hover', 'dark-action-press', 'dark-surface-raised'].map((key) => {
      const [theme, name] = themeOf(key);
      const row = rows.find((r) => r.theme === theme && r.density === 'default' && r.name === name);

      return [key, colors[key], row?.hex];
    });

    for (const [key, hex, resolved] of listed) {
      expect(hex, key).toMatch(/^#[0-9a-f]{6}$/);
      expect(hex, key).toBe(resolved);
    }
  });

  it('every DESIGN.md color equals the resolved token hex', () => {
    expect(Object.keys(colors).length).toBeGreaterThan(30);

    for (const [key, hex] of Object.entries(colors)) {
      const [theme, name] = themeOf(key);
      const row = rows.find((r) => r.theme === theme && r.density === 'default' && r.name === name);
      expect(row, `${key} has no matching token ${theme}/${name}`).toBeDefined();
      expect(row.hex, key).toBe(hex);
    }
  });
});
