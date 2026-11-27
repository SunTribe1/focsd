import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse } from 'acorn';
import { simple } from 'acorn-walk';
import { describe, expect, it } from 'vitest';

const repo = new URL('../../../', import.meta.url);
const stylesDir = new URL('packages/primitives/src/styles/', repo);

/** Every package whose source carries Focsd styles (Q24: not only components). */
const STYLED = ['components/src', 'primitives/src/styles', 'data-grid/src', 'charts/src', 'editor/src'].map(
  (dir) => new URL(`packages/${dir}/`, repo),
);

async function sourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  const nested = await Promise.all(
    entries.map((e) => (e.isDirectory() ? sourceFiles(new URL(`${e.name}/`, dir)) : [new URL(e.name, dir)])),
  );

  return nested.flat().filter((u) => u.pathname.endsWith('.js'));
}

/** A hex color or a CSS color function; a JS call such as `this.#color(i)` is not one. */
const RAW_COLOR = /#[0-9a-fA-F]{3,8}\b|(?<![\w#.$-])(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb|color)\(/g;

/** Raw color literals found in a source string (comments excluded). */
export function rawColors(source) {
  const withoutComments = source.replaceAll(/\/\*[\s\S]*?\*\//g, '').replaceAll(/^\s*\/\/.*$/gm, '');

  return withoutComments.match(RAW_COLOR) ?? [];
}

describe('component styles use tokens only', () => {
  it('detects raw colors', () => {
    expect(rawColors('a { color: #fff; background: rgb(0 0 0); border-color: oklch(50% 0 0); }')).toEqual(['#fff', 'rgb(', 'oklch(']);
    expect(rawColors('a { color: var(--focsd-ink); } /* #fff */')).toEqual([]);
    expect(rawColors('stroke=${this.#color(i)} fill=${color(i)}')).toEqual(['color(']);
  });

  it.each(STYLED.map((dir) => [dir.pathname.split('/packages/')[1], dir]))(
    'no %s source file contains a raw color literal',
    async (_name, dir) => {
      const files = await sourceFiles(dir);
      expect(files.length).toBeGreaterThan(0);
      const offenders = [];

      for (const file of files) {
        const found = rawColors(await readFile(file, 'utf8'));

        if (found.length) offenders.push(`${join(file.pathname)}: ${found.join(', ')}`);
      }

      expect(offenders).toEqual([]);
    },
  );
});

/** A hand-built ring: a focus color in a box-shadow or outline declaration, or after a length (`0 0 0 2px var(--focsd-focus-inner)`). */
const LITERAL_RING =
  /(?:box-shadow|outline(?:-color)?)\s*:[^;{}]*?var\(--focsd-focus-(?:inner|outer)|\d+px\s+(?:solid\s+)?var\(--focsd-focus-(?:inner|outer)/g;

describe('the two-tone focus ring comes from tokens (Q12)', () => {
  it('detects a hand-built ring', () => {
    expect('box-shadow: 0 0 0 2px var(--focsd-focus-inner), 0 0 0 5px var(--focsd-focus-outer);'.match(LITERAL_RING)).toHaveLength(2);
    expect('outline: 2px solid var(--focsd-focus-outer);'.match(LITERAL_RING)).toHaveLength(1);
    expect('box-shadow: var(--focsd-focus-ring);'.match(LITERAL_RING)).toBeNull();
  });

  it('detects a focus color used in any ring declaration (B7 m3)', () => {
    expect('outline-color: var(--focsd-focus-outer);'.match(LITERAL_RING)).toHaveLength(1);
    expect('box-shadow: inset var(--_inline-bar) 0 0 var(--focsd-focus-inner);'.match(LITERAL_RING)).toHaveLength(1);
    expect('outline: var(--focsd-focus-outer) solid 2px;'.match(LITERAL_RING)).toHaveLength(1);
    expect("stroke: 'var(--focsd-focus-outer)'".match(LITERAL_RING)).toBeNull();
  });

  it('no styled source outside @focsd-dev/tokens builds the ring by hand', async () => {
    const docs = new URL('apps/docs/src/styles/', repo);
    const files = [...(await Promise.all([...STYLED, docs].map(sourceFiles))).flat(), new URL('docs.css', docs)];
    const offenders = [];

    for (const file of files) {
      const found = (await readFile(file, 'utf8')).match(LITERAL_RING);

      if (found) offenders.push(`${file.pathname.split('/packages/').pop()}: ${found.length}`);
    }

    expect(files.length).toBeGreaterThan(40);
    expect(offenders).toEqual([]);
  });
});

describe('message state styles', () => {
  it('pair every :state() rule with an attribute fallback for engines without plain-name custom states', async () => {
    const layout = await readFile(new URL('field-layout.js', stylesDir), 'utf8');
    const field = await readFile(new URL('field.js', stylesDir), 'utf8');

    // Separate rules: a selector list holding an unsupported :state() would drop the fallback too.
    for (const kind of ['error', 'warning', 'success']) {
      expect(layout).toMatch(new RegExp(`:host\\(\\[${kind}\\]:not\\(\\[${kind}=''\\]\\)\\) \\{`));
      expect(layout).toMatch(new RegExp(`:host\\(:state\\(${kind}\\)\\) \\{`));
    }

    expect(field).toMatch(/:host\(\[error\]:not\(\[error=''\]\)\) \[part~='control'\] \{/);
    expect(field).toMatch(/:host\(:state\(error\)\) \[part~='control'\] \{/);
  });
});

describe('layer reads keep their token value as a fallback (B7 m4)', () => {
  it('the sticky header and the sheet still stack correctly without tokens.css', async () => {
    const rows = JSON.parse(await readFile(new URL('packages/tokens/dist/tokens.resolved.json', repo), 'utf8'));
    const layer = (name) => rows.find((r) => r.name === `layer-${name}`).value;
    const source = (name) => readFile(new URL(`packages/components/src/${name}`, repo), 'utf8');

    expect(await source('focsd-header.js')).toContain(`z-index: var(--focsd-layer-sticky, ${layer('sticky')});`);
    expect(await source('focsd-bottom-sheet.js')).toContain(
      `z-index: var(--focsd-bottom-sheet-z, var(--focsd-layer-dialog, ${layer('dialog')}));`,
    );
  });
});

describe('public style exports keep their types (B7 m5)', () => {
  it('buttonStyles stays a single CSSResult', async () => {
    const typings = await readFile(new URL('packages/primitives/types/styles/button.d.ts', repo), 'utf8');
    expect(typings).toMatch(/export declare const buttonStyles: import\(['"]lit['"]\)\.CSSResult;/);
  });
});

/** A spinner part rule that animates. */
const SPINNER_ANIMATION = /\[part~=['"]spinner['"]\][^{]*\{[^}]*animation/;

/**
 * Whether a source that animates a spinner part also gives it its own reduced-motion rule. The
 * floor's reduced-motion clamp skips `[part~="spinner"]` (Q18), so nothing else would stop it.
 * @param {string} source
 */
export function spinnerHasReducedMotion(source) {
  if (!SPINNER_ANIMATION.test(source)) return true;

  return source
    .split('@media (prefers-reduced-motion: reduce)')
    .slice(1)
    .some((block) => SPINNER_ANIMATION.test(block.split('@')[0]));
}

describe('the spinner is exempt from the floor clamp, so it brings its own reduced-motion rule (B7 m7)', () => {
  it('detects a spinner without one', () => {
    const spin = "[part~='spinner'] { animation: spin 1s infinite; }";
    expect(spinnerHasReducedMotion(spin)).toBe(false);
    expect(
      spinnerHasReducedMotion(`${spin}\n@media (prefers-reduced-motion: reduce) { [part~='spinner'] { animation: pulse 2s infinite; } }`),
    ).toBe(true);
    expect(spinnerHasReducedMotion(`${spin}\n@media (prefers-reduced-motion: reduce) { [part~='skeleton'] { animation: none; } }`)).toBe(
      false,
    );
  });

  it('every styled spinner part ships its own reduced-motion rule', async () => {
    const files = (await Promise.all(STYLED.map(sourceFiles))).flat();
    const offenders = [];

    for (const file of files) if (!spinnerHasReducedMotion(await readFile(file, 'utf8'))) offenders.push(file.pathname);

    expect(offenders).toEqual([]);
  });
});

describe('CSS templates stay readable (m20)', () => {
  const WIDTH = 140;

  /** `file:line` of every line inside a css`` template longer than the Prettier print width. */
  const longLines = (/** @type {string} */ name, /** @type {string} */ code) => {
    /** @type {[number, number][]} */
    const ranges = [];

    simple(parse(code, { ecmaVersion: 'latest', sourceType: 'module' }), {
      TaggedTemplateExpression(node) {
        if (node.tag.type === 'Identifier' && node.tag.name === 'css') ranges.push([node.quasi.start, node.quasi.end]);
      },
    });

    let offset = 0;

    return code.split('\n').flatMap((line, i) => {
      const start = offset;
      offset += line.length + 1;

      return line.length > WIDTH && ranges.some(([a, b]) => start + line.length > a && start < b) ? [`${name}:${i + 1}`] : [];
    });
  };

  it('no line of a css`` template is wider than 140 columns (Prettier leaves embedded CSS alone)', async () => {
    const dirs = [...STYLED, new URL('packages/primitives/src/', repo)];
    const files = [...new Set((await Promise.all(dirs.map(sourceFiles))).flat().map(String))];
    const texts = await Promise.all(files.map(async (f) => [f.replace(repo.href, ''), await readFile(new URL(f), 'utf8')]));

    expect(texts.flatMap(([name, code]) => longLines(name, code))).toEqual([]);
  });
});
