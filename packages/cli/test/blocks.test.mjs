import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addBlock, listBlocks, planBlock } from '../src/blocks.js';

// Fails the Nth write of a test, to prove a failed block is rolled back. Passed in as the writer.
const failure = { after: Infinity, count: 0 };

const failingWrite = (...args) => {
  if (++failure.count > failure.after) throw Object.assign(new Error('ENOSPC: no space left on device'), { code: 'ENOSPC' });

  return writeFileSync(...args);
};

const blocksDir = fileURLToPath(new URL('./fixtures/blocks/', import.meta.url));
const realBlocks = fileURLToPath(new URL('../blocks/', import.meta.url));
let root;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'focsd-blocks-'));
});

afterEach(() => {
  failure.after = Infinity;
  failure.count = 0;
  vi.restoreAllMocks();
  process.exitCode = undefined;
  rmSync(root, { recursive: true, force: true });
});

const opts = (extra = {}) => ({ blocksDir, ...extra });
const failing = (extra = {}) => opts({ writeFile: failingWrite, ...extra });

describe('listBlocks', () => {
  it('lists blocks sorted, and nothing for a missing folder', () => {
    expect(listBlocks(blocksDir).map((b) => b.name)).toEqual(['demo', 'solo']);
    expect(listBlocks(join(root, 'nope'))).toEqual([]);
  });
});

describe('addBlock', () => {
  it('writes every file under blocks/<name>/, without a focsd.json', () => {
    const { files, outDir } = addBlock(root, 'demo', opts());
    expect(outDir).toBe('blocks/demo');
    expect(files).toEqual(['blocks/demo/index.html', 'blocks/demo/demo.js', 'blocks/demo/css/demo.css']);

    for (const f of files) expect(existsSync(join(root, f))).toBe(true);
    expect(readFileSync(join(root, 'blocks/demo/demo.js'), 'utf8')).toContain('focsd-button');
  });

  it('a second run writes nothing, lists the clashes, and leaves files byte-identical', () => {
    addBlock(root, 'demo', opts());
    const file = join(root, 'blocks/demo/index.html');
    writeFileSync(file, 'my edit');
    expect(() => addBlock(root, 'demo', opts())).toThrow(/Nothing written: 3 file\(s\) already exist[\s\S]*blocks\/demo\/index\.html/);
    expect(readFileSync(file, 'utf8')).toBe('my edit');
  });

  it('one pre-existing file aborts the whole block', () => {
    mkdirSync(join(root, 'blocks/demo'), { recursive: true });
    writeFileSync(join(root, 'blocks/demo/demo.js'), 'mine');
    expect(() => addBlock(root, 'demo', opts())).toThrow(/demo\.js/);
    expect(readdirSync(join(root, 'blocks/demo'))).toEqual(['demo.js']);
    expect(readFileSync(join(root, 'blocks/demo/demo.js'), 'utf8')).toBe('mine');
  });

  it('treats a dangling symlink target as a clash and never writes through it', () => {
    mkdirSync(join(root, 'blocks/demo'), { recursive: true });
    symlinkSync(join(root, 'elsewhere.txt'), join(root, 'blocks/demo/index.html'));
    expect(() => addBlock(root, 'demo', opts())).toThrow(/index\.html/);
    expect(existsSync(join(root, 'elsewhere.txt'))).toBe(false);
  });

  it('refuses a folder that is a symlink leading outside the project', () => {
    const outside = mkdtempSync(join(tmpdir(), 'focsd-outside-'));

    try {
      symlinkSync(outside, join(root, 'link'));
      expect(() => addBlock(root, 'demo', opts({ out: 'link/x' }))).toThrow(/outside the project/);
      expect(readdirSync(outside)).toEqual([]);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it.each(['../x', '/abs/x', 'a/../../x', '..'])('refuses --out %s', (out) => {
    expect(() => addBlock(root, 'demo', opts({ out }))).toThrow(/outside the project/);
  });

  it('honours --out inside the project', () => {
    const { files } = addBlock(root, 'solo', opts({ out: 'src/pages/solo' }));
    expect(files).toEqual(['src/pages/solo/index.html', 'src/pages/solo/a.txt']);
    expect(existsSync(join(root, 'src/pages/solo/a.txt'))).toBe(true);
  });
});

describe('addBlock failures leave nothing half written', () => {
  it('refuses a file where a folder is needed, without a stack trace', () => {
    writeFileSync(join(root, 'a-file'), 'x');
    expect(() => addBlock(root, 'demo', opts({ out: 'a-file' }))).toThrow(/"a-file" is a file, not a folder/);
    expect(() => addBlock(root, 'demo', opts({ out: 'a-file/deeper' }))).toThrow(/is a file, not a folder/);
    expect(readFileSync(join(root, 'a-file'), 'utf8')).toBe('x');
  });

  it.skipIf(process.getuid?.() === 0)('refuses an unwritable target folder', () => {
    mkdirSync(join(root, 'ro'));
    chmodSync(join(root, 'ro'), 0o555);

    try {
      expect(() => addBlock(root, 'demo', opts({ out: 'ro/x' }))).toThrow(/Nothing written: .*ro.*not writable/);
      expect(readdirSync(join(root, 'ro'))).toEqual([]);
    } finally {
      chmodSync(join(root, 'ro'), 0o755);
    }
  });

  it('rolls back the files and folders it created when a write fails midway', () => {
    mkdirSync(join(root, 'src'));
    failure.after = 1; // the first file is written, the second fails
    expect(() => addBlock(root, 'demo', failing({ out: 'src/new/demo' }))).toThrow(/^Nothing written: ENOSPC/);
    expect(readdirSync(join(root, 'src'))).toEqual([]);
  });

  it('keeps folders and files that were already there when it rolls back', () => {
    mkdirSync(join(root, 'blocks/demo'), { recursive: true });
    writeFileSync(join(root, 'blocks/other.txt'), 'mine');
    failure.after = 2;
    expect(() => addBlock(root, 'demo', failing())).toThrow(/Nothing written/);
    expect(readdirSync(join(root, 'blocks')).toSorted()).toEqual(['demo', 'other.txt']);
    expect(readdirSync(join(root, 'blocks/demo'))).toEqual([]);
  });

  it('removes nested folders it created, deepest first', () => {
    failure.after = 2; // demo has css/demo.css as its third file
    expect(() => addBlock(root, 'demo', failing({ out: 'x/y' }))).toThrow(/Nothing written/);
    expect(readdirSync(root)).toEqual([]);
  });
});

describe('addBlock refuses folders nobody wants', () => {
  it.each(['.git', '.git/hooks', 'node_modules/x', './node_modules', 'a/../.git'])('refuses --out %s', (out) => {
    expect(() => addBlock(root, 'demo', opts({ out }))).toThrow(/\.git|node_modules|outside/);
  });

  it('still allows a folder that merely contains the words', () => {
    expect(() => addBlock(root, 'solo', opts({ out: 'src/node_modules_demo' }))).not.toThrow();
  });
});

describe('addBlock names and block.json', () => {
  it('refuses an empty --out', () => {
    expect(() => addBlock(root, 'demo', opts({ out: ' ' }))).toThrow(/--out needs a folder/);
  });

  it('suggests the closest name for an unknown block', () => {
    expect(() => addBlock(root, 'dmo', opts())).toThrow(/No block named "dmo"\. Did you mean "demo"\?/);
    expect(() => addBlock(root, 'zzzzzzzzzz', opts())).toThrow(/^((?!Did you mean)[\s\S])*$/);
  });

  it.each(['../demo', 'Demo', 'a/b', '', '-x'])('rejects the invalid name %j', (name) => {
    expect(() => addBlock(root, name, opts())).toThrow(/not a block name/);
  });

  it('rejects a block whose block.json lists a traversal path or a missing file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'focsd-fixture-'));

    try {
      mkdirSync(join(dir, 'bad'));
      writeFileSync(join(dir, 'bad/block.json'), JSON.stringify({ name: 'bad', files: ['../evil.txt'] }));
      expect(() => planBlock(root, 'bad', { blocksDir: dir })).toThrow(/outside the project/);
      writeFileSync(join(dir, 'bad/block.json'), JSON.stringify({ name: 'bad', files: ['missing.txt'] }));
      expect(() => planBlock(root, 'bad', { blocksDir: dir })).toThrow(/not a regular file/);
      writeFileSync(join(dir, 'bad/block.json'), JSON.stringify({ name: 'other', files: [] }));
      expect(() => listBlocks(dir)).toThrow(/block\.json names "other", not "bad"/);
      writeFileSync(join(dir, 'bad/a.txt'), 'a');
      writeFileSync(join(dir, 'bad/block.json'), JSON.stringify({ name: 'bad', files: ['a.txt', './a.txt'] }));
      expect(() => planBlock(root, 'bad', { blocksDir: dir })).toThrow(/lists a\.txt twice/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

const tagsIn = (html) =>
  [...new Set([...html.replaceAll(/<!--[\s\S]*?-->/g, '').matchAll(/<(focsd-[a-z0-9-]+)/g)].map((m) => m[1]))].toSorted();

describe('block.json matches the HTML', () => {
  for (const dir of [blocksDir, realBlocks]) {
    for (const block of listBlocks(dir)) {
      it(`${block.name}: elements equal the tags used in index.html`, () => {
        const html = readFileSync(join(dir, block.name, 'index.html'), 'utf8');
        expect(block.elements.toSorted()).toEqual(tagsIn(html));
        expect(block.files).toContain('index.html');
      });
    }
  }
});

/** Runs src/cli.js in this process. The CLI's own blocks/ folder is swapped for the fixtures. */
async function run(...args) {
  const stdout = [];
  const stderr = [];
  vi.spyOn(process, 'cwd').mockReturnValue(root);
  vi.spyOn(process.stdout, 'write').mockImplementation((t) => Boolean(stdout.push(String(t))));
  vi.spyOn(process.stderr, 'write').mockImplementation((t) => Boolean(stderr.push(String(t))));
  process.exitCode = undefined;
  vi.resetModules();
  process.env.FOCSD_BLOCKS_DIR = blocksDir;
  const argv = process.argv;
  process.argv = [argv[0], 'focsd', ...args];

  try {
    await import('../src/cli.js');
  } finally {
    process.argv = argv;
    delete process.env.FOCSD_BLOCKS_DIR;
  }

  return { out: stdout.join(''), err: stderr.join(''), code: process.exitCode ?? 0 };
}

describe('focsd add block (in process)', () => {
  it('adds a block, prints the install line, then refuses a second run', async () => {
    const a = await run('add', 'block', 'demo');
    expect(a.code).toBe(0);
    expect(a.out).toContain('✓ Added block demo in blocks/demo/ (3 files)');
    expect(a.out).toContain('Needs: npm install @focsd-dev/components');
    expect(a.out).toContain(
      'Open blocks/demo/index.html with a bundler or dev server that resolves bare imports (Vite, Parcel, webpack, or an import map).',
    );
    const b = await run('add', 'block', 'demo');
    expect(b.code).toBe(1);
    expect(b.err).toContain('Nothing written');
  });

  it('lists blocks with title and description', async () => {
    const r = await run('list', '--blocks');
    expect(r.out).toContain('demo');
    expect(r.out).toContain('Demo: A tiny block used by the CLI tests.');
  });

  it('refuses --overwrite, a missing name, and --out without block', async () => {
    expect((await run('add', 'block', 'demo', '--overwrite')).err).toContain('--overwrite is not allowed with blocks');
    expect((await run('add', 'block')).err).toContain('Name one block');
    expect((await run('add', 'button', '--out', 'x')).err).toContain('--out only works with `add block');
    expect((await run('add', 'block', 'nonesuch')).err).toContain('No block named "nonesuch"');
    expect((await run('add', 'block', 'demo', '--out', '../x')).err).toContain('outside the project');
    expect((await run('list', '--out', 'x')).code).toBe(1);
  });
});
