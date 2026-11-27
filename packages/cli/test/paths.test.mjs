import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CliError, add, init, readState, remove } from '../src/project.js';
import { diff, update } from '../src/merge.js';
import { findUp } from '../src/paths.js';

const templates = fileURLToPath(new URL('../templates/', import.meta.url));
let sandbox;
let root;
let outside;

beforeEach(() => {
  sandbox = mkdtempSync(join(tmpdir(), 'focsd-paths-'));
  root = join(sandbox, 'project');
  outside = join(sandbox, 'outside');
  mkdirSync(root);
  mkdirSync(outside);
});

afterEach(() => rmSync(sandbox, { recursive: true, force: true }));

const file = (...p) => join(root, ...p);
const json = () => JSON.parse(readFileSync(file('focsd.json'), 'utf8'));
const tamper = (change) => writeFileSync(file('focsd.json'), JSON.stringify(change(json())));

describe('paths in focsd.json stay inside the project (security)', () => {
  beforeEach(() => {
    init(root, { templates });
    add(root, ['button'], { templates });
  });

  it('rejects a dir that escapes with ..', () => {
    writeFileSync(join(outside, 'focsd-button.js'), '// not yours to delete\n');
    tamper((s) => ({ ...s, dir: '../outside' }));
    expect(() => readState(root)).toThrow(CliError);
    expect(() => remove(root, ['button'])).toThrow(/outside the project/);
    expect(() => update(root, [], { templates, all: true })).toThrow(/outside the project/);
    expect(existsSync(join(outside, 'focsd-button.js'))).toBe(true);
  });

  it('rejects an absolute dir', () => {
    tamper((s) => ({ ...s, dir: outside }));
    expect(() => remove(root, ['button'])).toThrow(/outside the project/);
  });

  it('rejects a tracked file that escapes the copy folder and the project', () => {
    const victim = join(outside, 'victim.js');
    writeFileSync(victim, '// keep me\n');
    tamper((s) => {
      const entry = s.components['focsd-button.js'];

      return {
        ...s,
        components: { 'focsd-button.js': { ...entry, files: { ...entry.files, '../../../outside/victim.js': 'x'.repeat(64) } } },
      };
    });
    expect(() => remove(root, ['button'])).toThrow(/outside the project/);
    expect(existsSync(victim)).toBe(true);
  });

  it('rejects a module name that escapes', () => {
    tamper((s) => ({ ...s, components: { ...s.components, '../../outside/x.js': { tags: ['focsd-x'], files: {} } } }));
    expect(() => diff(root, [], { templates, all: true })).toThrow(/outside the project/);
  });

  it('rejects a copy folder reached through a symlink that leaves the project', () => {
    rmSync(file('src'), { recursive: true, force: true });
    symlinkSync(outside, file('src'));
    expect(() => add(root, ['badge'], { templates })).toThrow(/outside the project/);
    expect(existsSync(join(outside, 'focsd/focsd-badge.js'))).toBe(false);
  });

  it('remove checks every path before deleting anything (no partial removal)', () => {
    add(root, ['badge'], { templates });
    const before = readFileSync(file('focsd.json'), 'utf8');
    const victim = join(outside, 'focsd-badge.js');
    writeFileSync(victim, '// keep me\n');
    rmSync(file('src/focsd/focsd-badge.js'));
    symlinkSync(victim, file('src/focsd/focsd-badge.js'));
    expect(() => remove(root, ['button', 'badge'])).toThrow(/outside the project/);
    expect(existsSync(file('src/focsd/focsd-button.js'))).toBe(true);
    expect(existsSync(file('.focsd/pristine/focsd-button.js.pristine'))).toBe(true);
    expect(readFileSync(file('focsd.json'), 'utf8')).toBe(before);
    expect(existsSync(victim)).toBe(true);
  });

  it('update checks every path before writing anything (no partial update)', () => {
    add(root, ['badge'], { templates });
    const victim = join(outside, 'focsd-badge.js');
    writeFileSync(victim, '// keep me\n');
    rmSync(file('src/focsd/focsd-button.js'));
    rmSync(file('src/focsd/focsd-badge.js'));
    symlinkSync(victim, file('src/focsd/focsd-badge.js'));
    expect(() => update(root, ['button', 'badge'], { templates })).toThrow(/outside the project/);
    expect(existsSync(file('src/focsd/focsd-button.js'))).toBe(false);
    expect(readFileSync(victim, 'utf8')).toBe('// keep me\n');
  });

  it('reports malformed focsd.json as a CliError', () => {
    writeFileSync(file('focsd.json'), '{ not json');
    expect(() => readState(root)).toThrow(/focsd\.json/);
    expect(() => readState(root)).toThrow(CliError);
  });
});

describe('focsd.json itself stays inside the project (security)', () => {
  it('refuses a focsd.json symlink to a missing file outside, and creates nothing there', () => {
    const pwned = join(outside, 'pwned.json');
    symlinkSync('../outside/pwned.json', file('focsd.json'));
    expect(() => init(root, { templates })).toThrow(/outside the project/);
    expect(() => add(root, ['button'], { templates })).toThrow(/outside the project/);
    expect(() => readState(root)).toThrow(CliError);
    expect(existsSync(pwned)).toBe(false);
  });

  it('refuses a focsd.json symlink to a valid state file outside, and leaves it unchanged', () => {
    init(root, { templates });
    add(root, ['button'], { templates });
    const target = join(outside, 'state.json');
    const original = readFileSync(file('focsd.json'), 'utf8');
    writeFileSync(target, original);
    rmSync(file('focsd.json'));
    symlinkSync(target, file('focsd.json'));
    expect(() => readState(root)).toThrow(/outside the project/);
    expect(() => init(root, { templates })).toThrow(/outside the project/);
    expect(() => add(root, ['badge'], { templates })).toThrow(/outside the project/);
    expect(() => remove(root, ['button'])).toThrow(/outside the project/);
    expect(() => update(root, [], { templates, all: true })).toThrow(/outside the project/);
    expect(readFileSync(target, 'utf8')).toBe(original);
  });
});

describe('init --dir', () => {
  it('rejects a dir outside the project', () => {
    expect(() => init(root, { templates, dir: '../outside' })).toThrow(/outside the project/);
    expect(() => init(root, { templates, dir: outside })).toThrow(/outside the project/);
    expect(existsSync(file('focsd.json'))).toBe(false);
  });
});

describe('#5 finding focsd.json from a subfolder', () => {
  it('searches upwards and returns the folder that holds it', () => {
    init(root, { templates });
    mkdirSync(file('src/app/deep'), { recursive: true });
    expect(findUp(file('src/app/deep'), 'focsd.json', sandbox)).toBe(root);
    expect(findUp(root, 'focsd.json', sandbox)).toBe(root);
  });

  it('stops at the repository root (.git), not at package.json', () => {
    init(root, { templates });
    mkdirSync(file('packages/app/.git'), { recursive: true });
    expect(findUp(file('packages/app'), 'focsd.json', sandbox)).toBeNull();
    rmSync(file('packages/app/.git'), { recursive: true });
    writeFileSync(file('packages/app/package.json'), '{}');
    expect(findUp(file('packages/app'), 'focsd.json', sandbox)).toBe(root);
  });

  it('never uses a focsd.json in the home folder or above it, from a subfolder', () => {
    // sandbox/home is the home folder; sandbox/focsd.json is above it; home/focsd.json is home's own.
    const home = join(sandbox, 'home');
    mkdirSync(join(home, 'code/app'), { recursive: true });
    writeFileSync(join(sandbox, 'focsd.json'), '{}');
    writeFileSync(join(home, 'focsd.json'), '{}');
    expect(findUp(join(home, 'code/app'), 'focsd.json', home)).toBeNull();
    expect(findUp(join(home, 'code'), 'focsd.json', home)).toBeNull();
    // Running in the home folder itself uses its own focsd.json, as `init` there would.
    expect(findUp(home, 'focsd.json', home)).toBe(home);
    // A project inside home is still found from its subfolders.
    writeFileSync(join(home, 'code/focsd.json'), '{}');
    expect(findUp(join(home, 'code/app'), 'focsd.json', home)).toBe(join(home, 'code'));
  });

  it('outside a repository and outside home, never climbs to a planted focsd.json (like /tmp/focsd.json)', () => {
    // Home is elsewhere; sandbox stands in for /tmp, with a focsd.json planted in it.
    const home = join(sandbox, 'users/me');
    mkdirSync(home, { recursive: true });
    writeFileSync(join(sandbox, 'focsd.json'), '{}');
    mkdirSync(file('src'), { recursive: true });
    expect(findUp(file('src'), 'focsd.json', home)).toBeNull();
    expect(findUp(root, 'focsd.json', home)).toBeNull();
  });

  it('outside home, climbs within a repository up to its root', () => {
    const home = join(sandbox, 'users/me');
    mkdirSync(home, { recursive: true });
    writeFileSync(join(sandbox, 'focsd.json'), '{}');
    mkdirSync(file('.git'));
    mkdirSync(file('src/app'), { recursive: true });
    init(root, { templates });
    expect(findUp(file('src/app'), 'focsd.json', home)).toBe(root);
    rmSync(file('focsd.json'));
    expect(findUp(file('src/app'), 'focsd.json', home)).toBeNull();
  });

  it('defaults to the real home folder', () => {
    expect(findUp(homedir(), 'focsd.json')).toBe(existsSync(join(homedir(), 'focsd.json')) ? homedir() : null);
  });
});
