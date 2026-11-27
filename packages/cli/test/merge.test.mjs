import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { add, init, readState, remove } from '../src/project.js';
import { diff, mergeFile, unifiedDiff, unusedNotice, update } from '../src/merge.js';

const shipped = fileURLToPath(new URL('../templates/', import.meta.url));
let root;
let next;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'focsd-merge-'));
  next = mkdtempSync(join(tmpdir(), 'focsd-next-'));
  cpSync(shipped, next, { recursive: true });
  const pkg = JSON.parse(readFileSync(join(next, 'components.package.json'), 'utf8'));
  writeFileSync(join(next, 'components.package.json'), JSON.stringify({ ...pkg, version: '9.9.9' }));
  init(root, { templates: shipped });
  add(root, ['badge'], { templates: shipped });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  rmSync(next, { recursive: true, force: true });
});

const mine = (rel) => join(root, 'src/focsd', rel);
const read = (path) => readFileSync(path, 'utf8');

/** Change one line of the next version's focsd-badge.js. */
const upstreamChange = () => {
  const path = join(next, 'focsd-badge.js');
  writeFileSync(path, read(path).replace('display: inline-block;', 'display: inline-block;\n        /* upstream fix */'));
};

describe('update', () => {
  it('replaces untouched files with the new version and records it', () => {
    upstreamChange();
    const result = update(root, [], { templates: next, all: true });
    expect(result.find((r) => r.file === 'focsd-badge.js').outcome).toBe('replaced');
    expect(read(mine('focsd-badge.js'))).toContain('/* upstream fix */');
    expect(read(join(root, '.focsd/pristine/focsd-badge.js.pristine'))).toContain('/* upstream fix */');
    expect(readState(root).version).toBe('9.9.9');
  });

  it('merges a local edit with an upstream change in another place', () => {
    upstreamChange();
    writeFileSync(mine('focsd-badge.js'), read(mine('focsd-badge.js')).replace(/^/, '// my brand tweaks\n'));
    const result = update(root, ['badge'], { templates: next });
    expect(result.find((r) => r.file === 'focsd-badge.js').outcome).toBe('merged');
    const merged = read(mine('focsd-badge.js'));
    expect(merged).toContain('// my brand tweaks');
    expect(merged).toContain('/* upstream fix */');
  });

  it('on a conflict keeps the local file and writes the new version beside it', () => {
    const path = join(next, 'focsd-badge.js');
    writeFileSync(path, read(path).replace('display: inline-block;', 'display: inline-flex; /* upstream */'));
    const local = read(mine('focsd-badge.js')).replace('display: inline-block;', 'display: block; /* mine */');
    writeFileSync(mine('focsd-badge.js'), local);
    const result = update(root, ['badge'], { templates: next });
    expect(result.find((r) => r.file === 'focsd-badge.js').outcome).toBe('kept-new');
    expect(read(mine('focsd-badge.js'))).toBe(local);
    expect(read(`${mine('focsd-badge.js')}.focsd-new`)).toContain('/* upstream */');
  });

  it('with merge, writes conflict markers instead', () => {
    const path = join(next, 'focsd-badge.js');
    writeFileSync(path, read(path).replace('display: inline-block;', 'display: inline-flex; /* upstream */'));
    writeFileSync(mine('focsd-badge.js'), read(mine('focsd-badge.js')).replace('display: inline-block;', 'display: block; /* mine */'));
    const result = update(root, ['badge'], { templates: next, merge: true });
    expect(result.find((r) => r.file === 'focsd-badge.js').outcome).toBe('conflict');
    expect(read(mine('focsd-badge.js'))).toMatch(/<<<<<<<[\s\S]*\/\* mine \*\/[\s\S]*=======[\s\S]*\/\* upstream \*\/[\s\S]*>>>>>>>/);
  });

  it('reports unchanged files and restores deleted ones', () => {
    add(root, ['toggle-group'], { templates: shipped });
    rmSync(mine('focsd-toggle.js'));
    const result = update(root, ['toggle-group'], { templates: next });
    expect(result.find((r) => r.file === 'focsd-toggle-group.js').outcome).toBe('unchanged');
    expect(result.find((r) => r.file === 'focsd-toggle.js').outcome).toBe('restored');
    expect(existsSync(mine('focsd-toggle.js'))).toBe(true);
  });
});

describe('diff', () => {
  it('shows local edits and upstream changes against the delivered copy', () => {
    upstreamChange();
    writeFileSync(mine('focsd-badge.js'), read(mine('focsd-badge.js')).replace(/^/, '// my brand tweaks\n'));
    const entry = diff(root, ['badge'], { templates: next }).find((d) => d.file === 'focsd-badge.js');
    expect(entry.local).toContain('+// my brand tweaks');
    expect(entry.upstream).toContain('+        /* upstream fix */');
  });

  it('unifiedDiff marks removed and added lines with context', () => {
    const out = unifiedDiff('a\nb\nc\nd\n', 'a\nB\nc\nd\n', 'old', 'new');
    expect(out).toContain('--- old');
    expect(out).toContain('+++ new');
    expect(out).toContain('-b');
    expect(out).toContain('+B');
    expect(out).toContain(' a');
    expect(unifiedDiff('x\n', 'x\n', 'a', 'b')).toBe('');
  });
});

describe('update keeps edits safe (review fixes)', () => {
  it('C1: an edited file with no delivered copy is kept, the new version written beside it', () => {
    upstreamChange();
    writeFileSync(mine('focsd-badge.js'), `${read(mine('focsd-badge.js'))}// MY EDIT\n`);
    rmSync(join(root, '.focsd'), { recursive: true, force: true });
    const result = update(root, ['badge'], { templates: next });
    expect(result.find((r) => r.file === 'focsd-badge.js').outcome).toBe('kept-new');
    expect(read(mine('focsd-badge.js'))).toContain('// MY EDIT');
    expect(read(`${mine('focsd-badge.js')}.focsd-new`)).toContain('/* upstream fix */');
  });

  it('C1: a file the new version adds that you already have (not ours) is never replaced', () => {
    const path = join(next, 'focsd-badge.js');
    writeFileSync(path, `import './extra.js';\n${read(path)}`);
    writeFileSync(join(next, 'extra.js'), 'export const extra = 1;\n');
    writeFileSync(mine('extra.js'), '// my own file\n');
    const result = update(root, ['badge'], { templates: next });
    expect(result.find((r) => r.file === 'extra.js').outcome).toBe('kept-new');
    expect(read(mine('extra.js'))).toBe('// my own file\n');
  });

  it('I3: CRLF checkouts merge line by line and keep their line endings', () => {
    upstreamChange();
    const crlf = (p) => writeFileSync(p, read(p).replaceAll(/\r?\n/g, '\r\n'));
    crlf(mine('focsd-badge.js'));
    crlf(join(root, '.focsd/pristine/focsd-badge.js.pristine'));
    writeFileSync(mine('focsd-badge.js'), `// my tweak\r\n${read(mine('focsd-badge.js'))}`);
    const result = update(root, ['badge'], { templates: next });
    expect(result.find((r) => r.file === 'focsd-badge.js').outcome).toBe('merged');
    const merged = read(mine('focsd-badge.js'));
    expect(merged).toContain('// my tweak\r\n');
    expect(merged).toContain('/* upstream fix */');
    expect(merged.replaceAll('\r\n', '')).not.toContain('\n');
    const entry = diff(root, ['badge'], { templates: shipped }).find((d) => d.file === 'focsd-badge.js');
    expect(entry.local.split('\n').length).toBeLessThan(20);
  });

  it('I5: an older CLI refuses to downgrade unless forced', () => {
    update(root, [], { templates: next, all: true });
    expect(() => update(root, [], { templates: shipped, all: true })).toThrow(
      /older than the version your components came from \(9\.9\.9\)/,
    );
    expect(() => update(root, [], { templates: shipped, all: true, force: true })).not.toThrow();
  });

  it('I6: a module the new version no longer ships is reported and kept, nothing half-written', () => {
    add(root, ['kbd'], { templates: shipped });
    upstreamChange();
    rmSync(join(next, 'focsd-kbd.js'));
    const result = update(root, [], { templates: next, all: true });
    expect(result.find((r) => r.file === 'focsd-kbd.js').outcome).toBe('no-longer-shipped');
    expect(result.find((r) => r.file === 'focsd-badge.js').outcome).toBe('replaced');
    expect(readState(root).components['focsd-kbd.js']).toBeTruthy();
  });
});

describe('#6 update and diff need names or --all', () => {
  it('bare update and diff throw a helpful error and change nothing', () => {
    upstreamChange();
    expect(() => update(root, [], { templates: next })).toThrow(/Name the components to update, or pass --all/);
    expect(() => diff(root, [], { templates: next })).toThrow(/Name the components to diff, or pass --all/);
    expect(read(mine('focsd-badge.js'))).not.toContain('/* upstream fix */');
    expect(readState(root).version).not.toBe('9.9.9');
  });
});

describe('#7 focsd.json version advances only when every file landed', () => {
  const conflicting = () => {
    const path = join(next, 'focsd-badge.js');
    writeFileSync(path, read(path).replace('display: inline-block;', 'display: inline-flex; /* upstream */'));
    writeFileSync(mine('focsd-badge.js'), read(mine('focsd-badge.js')).replace('display: inline-block;', 'display: block; /* mine */'));
  };

  it('stays at the old version when a file was kept beside (.focsd-new)', () => {
    const before = readState(root).version;
    conflicting();
    update(root, [], { templates: next, all: true });
    expect(readState(root).version).toBe(before);
  });

  it('stays at the old version when conflict markers were written', () => {
    const before = readState(root).version;
    conflicting();
    update(root, [], { templates: next, all: true, merge: true });
    expect(readState(root).version).toBe(before);
  });

  it('stays at the old version when only some components were updated', () => {
    add(root, ['kbd'], { templates: shipped });
    const before = readState(root).version;
    upstreamChange();
    update(root, ['badge'], { templates: next });
    expect(readState(root).version).toBe(before);
    expect(readState(root).components['focsd-badge.js'].version).toBe('9.9.9');
    update(root, ['kbd'], { templates: next });
    expect(readState(root).version).toBe('9.9.9');
  });
});

describe('#8 files a new version no longer uses', () => {
  /** The next combobox stops importing focsd-option-group.js (only combobox uses it in this project). */
  const dropGroup = () => {
    const path = join(next, 'focsd-combobox.js');
    writeFileSync(path, read(path).replace("import './focsd-option-group.js';\n", ''));
  };

  beforeEach(() => add(root, ['combobox', 'toggle-group'], { templates: shipped }));

  it('deletes an unedited dropped file and its delivered copy, and stops tracking it', () => {
    dropGroup();
    const result = update(root, ['combobox'], { templates: next });
    expect(result.find((r) => r.file === 'focsd-option-group.js')).toMatchObject({ module: 'focsd-combobox.js', outcome: 'removed' });
    expect(existsSync(mine('focsd-option-group.js'))).toBe(false);
    expect(existsSync(join(root, '.focsd/pristine/focsd-option-group.js.pristine'))).toBe(false);
    expect(readState(root).components['focsd-combobox.js'].files['focsd-option-group.js']).toBeUndefined();
  });

  it('keeps an edited dropped file, untracked, and says so', () => {
    dropGroup();
    writeFileSync(mine('focsd-option-group.js'), `${read(mine('focsd-option-group.js'))}// mine\n`);
    const result = update(root, ['combobox'], { templates: next });
    expect(result.find((r) => r.file === 'focsd-option-group.js').outcome).toBe('kept-unused');
    expect(read(mine('focsd-option-group.js'))).toContain('// mine');
    expect(existsSync(join(root, '.focsd/pristine/focsd-option-group.js.pristine'))).toBe(false);
    expect(readState(root).components['focsd-combobox.js'].files['focsd-option-group.js']).toBeUndefined();
  });

  it('says a kept file no longer applies, and how to own it again (B7 I2)', () => {
    dropGroup();
    writeFileSync(mine('focsd-option-group.js'), `${read(mine('focsd-option-group.js'))}// mine\n`);
    const notice = unusedNotice(update(root, ['combobox'], { templates: next }));
    expect(notice).toContain('focsd-option-group.js');
    expect(notice).toContain('no longer apply');
    expect(notice).toMatch(/import/);
    expect(notice).toContain('@focsd-dev/primitives/styles/');
    expect(unusedNotice([{ file: 'focsd-badge.js', outcome: 'unchanged' }])).toBe('');
  });

  it('leaves a dropped file another component still uses', () => {
    add(root, ['toggle'], { templates: shipped });
    const path = join(next, 'focsd-toggle-group.js');
    writeFileSync(path, read(path).replace("import './focsd-toggle.js';\n", ''));
    const result = update(root, ['toggle-group'], { templates: next });
    expect(result.find((r) => r.file === 'focsd-toggle.js')).toBeUndefined();
    expect(existsSync(mine('focsd-toggle.js'))).toBe(true);
    expect(readState(root).components['focsd-toggle.js'].files['focsd-toggle.js']).toBeTruthy();
  });
});

describe('#9 git merge-file failures', () => {
  const fake =
    (status, stdout = 'half-written output') =>
    () => ({ status, stdout, error: undefined });

  it('classes exit 0 as clean and 1..127 as conflicts', () => {
    expect(mergeFile('a', 'b', 'c', fake(0, 'ok')).status).toBe('clean');
    expect(mergeFile('a', 'b', 'c', fake(3)).status).toBe('conflict');
    expect(mergeFile('a', 'b', 'c', fake(127)).status).toBe('conflict');
  });

  it('classes exit 128 and above (git errors) as failures, never as conflicts', () => {
    for (const status of [128, 255]) expect(mergeFile('a', 'b', 'c', fake(status)), String(status)).toEqual({ status: 'failed', text: '' });
  });

  it('a failed merge keeps your file and writes the new version beside it, even with merge', () => {
    const path = join(next, 'focsd-badge.js');
    writeFileSync(path, read(path).replace('display: inline-block;', 'display: inline-flex; /* upstream */'));
    const local = read(mine('focsd-badge.js')).replace('color', '/* mine */ color');
    writeFileSync(mine('focsd-badge.js'), local);
    const result = update(root, ['badge'], { templates: next, merge: true, git: fake(255) });
    expect(result.find((r) => r.file === 'focsd-badge.js').outcome).toBe('kept-new');
    expect(read(mine('focsd-badge.js'))).toBe(local);
  });
});

describe('#11 unifiedDiff hunk ranges', () => {
  const lines = (n, change = {}) => `${Array.from({ length: n }, (_, k) => change[k + 1] ?? `line ${k + 1}`).join('\n')}\n`;

  it('writes an @@ -a,b +c,d @@ header for a single hunk', () => {
    expect(unifiedDiff('a\nb\nc\nd\n', 'a\nB\nc\nd\n', 'old', 'new')).toBe(
      ['--- old', '+++ new', '@@ -1,4 +1,4 @@', ' a', '-b', '+B', ' c', ' d', ''].join('\n'),
    );
  });

  it('splits distant changes into hunks with their own ranges', () => {
    const out = unifiedDiff(lines(20), lines(20, { 2: 'two', 18: 'eighteen' }), 'old', 'new');
    expect(out.split('\n').filter((l) => l.startsWith('@@'))).toEqual(['@@ -1,5 +1,5 @@', '@@ -15,6 +15,6 @@']);
  });

  it('counts added and removed lines, and pure insertions', () => {
    expect(unifiedDiff(lines(3), `${lines(3)}four\nfive\n`, 'o', 'n')).toContain('@@ -1,3 +1,5 @@');
    expect(unifiedDiff('', 'x\n', 'o', 'n')).toContain('@@ -0,0 +1 @@');
    expect(unifiedDiff('x\n', '', 'o', 'n')).toContain('@@ -1 +0,0 @@');
  });

  it('marks a missing newline at the end of the file', () => {
    expect(unifiedDiff('a\n', 'a', 'o', 'n')).toBe(
      ['--- o', '+++ n', '@@ -1 +1 @@', '-a', '+a', '\\ No newline at end of file', ''].join('\n'),
    );
  });
});

describe('Q31 diff, update and remove resolve names the same way', () => {
  it('accept a tag, a module file name and the bare name', () => {
    for (const name of ['focsd-badge', 'badge', 'focsd-badge.js']) {
      expect(() => diff(root, [name], { templates: shipped }), `diff ${name}`).not.toThrow();
      expect(update(root, [name], { templates: shipped }).length, `update ${name}`).toBeGreaterThan(0);
    }
  });

  it('refuse a name that was never added, naming the fix for that verb', () => {
    expect(() => diff(root, ['card'], { templates: shipped })).toThrow(/"card" is not added\. Add it first: npx focsd add card/);
    expect(() => update(root, ['card'], { templates: shipped })).toThrow(/"card" is not added\. Add it first: npx focsd add card/);
    expect(() => remove(root, ['card'])).toThrow(/"card" is not added\. Run `npx focsd list`/);
  });
});
