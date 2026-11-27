import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { pkgRoot } from '../lib/paths.mjs';

const dist = (f) => readFile(new URL(`../dist/${f}`, import.meta.url), 'utf8');

describe('tokens.resolved.json', () => {
  it('has one row per system token for each theme × density', async () => {
    const rows = JSON.parse(await dist('tokens.resolved.json'));
    const names = new Set(rows.map((r) => r.name));
    expect(rows.length).toBe(names.size * 9); // 3 themes × 3 densities
    const ink = rows.find((r) => r.theme === 'dark' && r.density === 'compact' && r.name === 'ink');
    expect(ink).toEqual({
      theme: 'dark',
      density: 'compact',
      name: 'ink',
      css: '--focsd-ink',
      value: expect.stringMatching(/^oklch\(/),
      hex: '#ececee',
    });
    expect(rows.find((r) => r.theme === 'light' && r.density === 'compact' && r.name === 'control-height').value).toBe('32px');
  });
});

describe('index.js', () => {
  it('exports cssVar and tokenNames, and rejects unknown names', async () => {
    const mod = await import('../dist/index.js');
    expect(mod.cssVar('ink')).toBe('var(--focsd-ink)');
    expect(mod.tokenNames).toContain('focus-outer');
    expect(Object.isFrozen(mod.tokenNames)).toBe(true);
    expect(() => mod.cssVar('not-a-token')).toThrow('Unknown Focsd token "not-a-token"');
  });
});

/** A minimal element stand-in: the index helpers only use the attribute API. */
const fakeRoot = () => {
  const attrs = new Map();

  return {
    attrs,
    setAttribute: (k, v) => attrs.set(k, v),
    removeAttribute: (k) => attrs.delete(k),
  };
};

describe('index.js theme API (R9)', () => {
  it('setBrand sets, removes for null, and throws for an unknown name', async () => {
    const mod = await import('../dist/index.js');
    const root = fakeRoot();
    expect(mod.brands).toEqual(['harbor', 'signal', 'mineral', 'prismatic']);
    expect(Object.isFrozen(mod.brands)).toBe(true);
    mod.setBrand('harbor', root);
    expect(root.attrs.get('data-focsd-brand')).toBe('harbor');
    mod.setBrand(null, root);
    expect(root.attrs.has('data-focsd-brand')).toBe(false);
    expect(() => mod.setBrand('violet', root)).toThrow('Unknown Focsd brand "violet"');
    expect(() => mod.setBrand('harbor', undefined)).toThrow(/no document here/);
  });

  it('clearTheme removes data-focsd-theme (back to system)', async () => {
    const mod = await import('../dist/index.js');
    const root = fakeRoot();
    mod.setTheme('dark', root);
    mod.clearTheme(root);
    expect(root.attrs.has('data-focsd-theme')).toBe(false);
    expect(() => mod.clearTheme(undefined)).toThrow(/no document here/);
  });

  it('presetSwatches gives frozen hex swatches per preset and theme', async () => {
    const mod = await import('../dist/index.js');
    expect(Object.keys(mod.presetSwatches)).toEqual(mod.brands);
    expect(mod.presetSwatches.harbor.dark.action).toMatch(/^#[0-9a-f]{6}$/);
    expect(Object.isFrozen(mod.presetSwatches.harbor.light)).toBe(true);
    expect(mod.defaultSwatches.light.action).toBe('#141a18');
  });
});

describe('index.js no-flash snippet (R9)', () => {
  it('noFlashScript is small, guarded, and noFlashHash is its CSP sha256', async () => {
    const mod = await import('../dist/index.js');
    expect(mod.noFlashScript.length).toBeLessThanOrEqual(400);
    expect(mod.noFlashScript).toContain('try{');
    expect(mod.noFlashScript).toContain('focsd-theme');
    expect(mod.noFlashScript).toContain('focsd-brand');
    expect(mod.noFlashHash).toBe(`sha256-${createHash('sha256').update(mod.noFlashScript).digest('base64')}`);
  });

  it('noFlashScript sets stored, known values and survives throwing storage', async () => {
    const { noFlashScript } = await import('../dist/index.js');

    const run = (storage) => {
      const root = fakeRoot();
      new Function('document', 'localStorage', noFlashScript)({ documentElement: root }, storage);

      return Object.fromEntries(root.attrs);
    };

    const store = (values) => ({ getItem: (k) => values[k] ?? null });

    expect(run(store({ 'focsd-theme': 'dark', 'focsd-brand': 'signal' }))).toEqual({
      'data-focsd-theme': 'dark',
      'data-focsd-brand': 'signal',
    });
    expect(run(store({ 'focsd-theme': 'system', 'focsd-brand': 'x"><' }))).toEqual({});
    expect(
      run({
        getItem: () => {
          throw new Error('SecurityError');
        },
      }),
    ).toEqual({});
  });
});

/** Type-check one file with the package's strict settings; throws with tsc's output on errors. */
const typeCheck = (file) =>
  execFileSync(
    'pnpm',
    ['exec', 'tsc', '--noEmit', '--strict', '--module', 'nodenext', '--moduleResolution', 'nodenext', '--target', 'es2022', file],
    { cwd: pkgRoot, stdio: 'pipe', encoding: 'utf8' },
  );

/** tsc's error code and rejected argument for each error in a file that must not type-check. */
const typeErrors = (file) => {
  try {
    typeCheck(file);
  } catch (error) {
    return [...String(error.stdout).matchAll(/error (TS\d+): Argument of type '"([^"]+)"'/g)].map((m) => `${m[1]} ${m[2]}`);
  }

  return [];
};

describe('index.d.ts', () => {
  it('type-checks valid names (and the @ts-expect-error lines really are errors)', () => {
    expect(() => typeCheck('test/types-check.ts')).not.toThrow();
  });

  it('rejects an unknown token, theme, density and brand', () => {
    expect(typeErrors('test/fixtures/types-reject.ts')).toEqual(['TS2345 not-a-token', 'TS2345 sepia', 'TS2345 cosy', 'TS2345 violet']);
  });
});
