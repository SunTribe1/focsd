import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { addBlock, listBlocks } from '../src/blocks.js';

// The tests that run over the REAL blocks shipped in packages/cli/blocks (the fixtures prove the
// mechanics; these prove the content a user actually receives).

const blocksDir = fileURLToPath(new URL('../blocks/', import.meta.url));
const resolvedPath = fileURLToPath(new URL('../../tokens/lib/resolved.mjs', import.meta.url));
const BLOCKS = listBlocks(blocksDir);
const read = (...parts) => readFileSync(join(blocksDir, ...parts), 'utf8');
const stripHtmlComments = (html) => html.replaceAll(/<!--[\s\S]*?-->/g, '');

/** Elements a package entry point defines, for imports that are not one file per element. */
const BUNDLES = {
  '@focsd-dev/charts': ['focsd-chart', 'focsd-sparkline', 'focsd-gauge'],
  '@focsd-dev/data-grid': ['focsd-data-grid'],
};

/** Element tags in markup (comments removed) and the ones a script creates itself. */
function tagsUsed(block) {
  const html = stripHtmlComments(read(block.name, 'index.html')).matchAll(/<(focsd-[a-z0-9-]+)/g);
  const scripts = block.files.filter((f) => f.endsWith('.js')).map((f) => read(block.name, f));
  const created = scripts.flatMap((js) => [...js.matchAll(/(?:createElement\(\s*|<)['"`]?(focsd-[a-z0-9-]+)/g)]);

  return [...new Set([...html, ...created].map((m) => m[1]))].toSorted();
}

/** Every module a block script imports, static or dynamic. */
const importsOf = (js) => [...js.matchAll(/import\s*(?:[^'"()]*?from\s*)?\(?\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
const importsOfBlock = (block) => block.files.filter((f) => f.endsWith('.js')).flatMap((f) => importsOf(read(block.name, f)));
const COMPONENT = /^@focsd-dev\/components\/(focsd-[a-z0-9-]+)\.js$/;

/** Elements no import defines. */
function undefinedElements(block) {
  const imports = new Set(importsOfBlock(block));

  return block.elements.filter(
    (tag) =>
      !imports.has(`@focsd-dev/components/${tag}.js`) &&
      !Object.entries(BUNDLES).some(([entry, tags]) => imports.has(entry) && tags.includes(tag)),
  );
}

/** Imports that are not a used component and not a known bundle. */
function strayImports(block) {
  return importsOfBlock(block).filter((spec) => {
    const tag = COMPONENT.exec(spec)?.[1];

    return tag ? !block.elements.includes(tag) : !(spec in BUNDLES);
  });
}

/** Script and stylesheet references that leave the block. */
function strayRefs(block) {
  const html = stripHtmlComments(read(block.name, 'index.html'));
  const refs = [...html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
  const tokens = /^\/node_modules\/@focsd-dev\/tokens\/dist\/(fonts|tokens)\.css$/;

  return refs.filter((ref) => (ref.startsWith('./') ? !block.files.includes(ref.slice(2)) : !tokens.test(ref)));
}

/** The files on disk in a block folder, relative to it, without block.json. */
function filesOnDisk(name) {
  const base = join(blocksDir, name);

  return readdirSync(base, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && e.name !== 'block.json')
    .map((e) => join(e.parentPath, e.name).slice(base.length + 1))
    .toSorted();
}

describe('the real blocks', () => {
  it('ships the four blocks', () => {
    expect(BLOCKS.map((b) => b.name)).toEqual(['dashboard', 'empty-app', 'settings', 'sign-in']);
  });

  describe.each(BLOCKS.map((b) => [b.name, b]))('%s', (name, block) => {
    let root;
    beforeEach(() => {
      root = mkdtempSync(join(tmpdir(), 'focsd-real-'));
    });
    afterEach(() => rmSync(root, { recursive: true, force: true }));

    it('copies every block.json file, and nothing else, into a clean project', () => {
      const { files } = addBlock(root, name, { blocksDir });

      expect(files.filter((rel) => !existsSync(join(root, rel)))).toEqual([]);
      // The folder holds exactly the listed files: none left out of block.json, none renamed.
      expect(block.files.toSorted()).toEqual(filesOnDisk(name));
      expect(files).toHaveLength(block.files.length);
    });

    it('lists exactly the elements its markup and script use, without counting comments', () => {
      expect(block.elements.toSorted()).toEqual(tagsUsed(block));
    });

    it('imports every element it lists', () => {
      expect(undefinedElements(block)).toEqual([]);
    });

    it('imports only elements it uses, and only from public package entry points', () => {
      expect(strayImports(block)).toEqual([]);
    });

    it('keeps its script and style references inside the block', () => {
      expect(strayRefs(block)).toEqual([]);
      expect(block.files.filter((f) => f.endsWith('.css') && /@import/.test(read(name, f)))).toEqual([]);
    });

    it('has a script of at most 6 KB gzipped (the spec limit is 6 KB minified)', () => {
      const sizes = block.files.filter((f) => f.endsWith('.js')).map((f) => gzipSync(read(name, f)).length);

      expect(Math.max(...sizes)).toBeLessThanOrEqual(6 * 1024);
    });

    it('carries the no-flash snippet from @focsd-dev/tokens, byte for byte', async () => {
      const { NO_FLASH_SCRIPT } = await import(resolvedPath);
      const inline = [...read(name, 'index.html').matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);

      expect(inline).toEqual([NO_FLASH_SCRIPT]);
    });

    it('quotes the CSP hash the same way in its comment', () => {
      expect(read(name, 'index.html')).toMatch(/CSP script-src hash: 'sha256-[A-Za-z0-9+/]+='/);
    });
  });
});
