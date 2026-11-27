import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CliError } from '../src/errors.js';
import * as project from '../src/project.js';
import { add, init, list, readState, remove, sha256 } from '../src/project.js';

const templates = fileURLToPath(new URL('../templates/', import.meta.url));
let root;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'focsd-cli-'));
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

const file = (...p) => join(root, ...p);

describe('project', () => {
  it('init writes focsd.json with the directory and version', () => {
    init(root, { dir: 'src/ui', templates });
    const state = readState(root);
    expect(state).toMatchObject({ dir: 'src/ui', components: {} });
    expect(state.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('add copies the module and its local files, with pristine copies and hashes', () => {
    init(root, { templates });
    const result = add(root, ['toggle-group'], { templates });
    expect(result.importLines).toEqual(["import './src/focsd/focsd-toggle-group.js';"]);
    expect(existsSync(file('src/focsd/focsd-toggle-group.js'))).toBe(true);
    expect(existsSync(file('src/focsd/focsd-toggle.js'))).toBe(true);
    expect(readFileSync(file('.focsd/pristine/focsd-toggle-group.js.pristine'), 'utf8')).toBe(
      readFileSync(join(templates, 'focsd-toggle-group.js'), 'utf8'),
    );
    const entry = readState(root).components['focsd-toggle-group.js'];
    expect(entry.tags).toEqual(['focsd-toggle-group']);
    expect(entry.files['focsd-toggle.js']).toMatch(/^[0-9a-f]{64}$/);
  });

  it('add records one module per element, and shares a part copied with its parent (B11)', () => {
    init(root, { templates });
    add(root, ['option'], { templates });
    add(root, ['select'], { templates });
    const state = readState(root);
    expect(Object.keys(state.components).toSorted()).toEqual(['focsd-option.js', 'focsd-select.js']);
    expect(state.components['focsd-select.js'].files['focsd-option.js']).toBe(state.components['focsd-option.js'].files['focsd-option.js']);
  });

  it("refuses to overwrite a file that is not Focsd's unless asked, and writes nothing on refusal", () => {
    init(root, { templates });
    mkdirSync(file('src/focsd'), { recursive: true });
    writeFileSync(file('src/focsd/focsd-toggle-group.js'), '// mine\n');
    expect(() => add(root, ['toggle-group'], { templates })).toThrow(/src\/focsd\/focsd-toggle-group\.js/);
    expect(existsSync(file('src/focsd/focsd-toggle.js'))).toBe(false);
    add(root, ['toggle-group'], { templates, overwrite: true });
    expect(readFileSync(file('src/focsd/focsd-toggle-group.js'), 'utf8')).not.toBe('// mine\n');
  });

  it('rejects unknown components and a missing init', () => {
    expect(() => add(root, ['button'], { templates })).toThrow(/npx focsd init/);
    init(root, { templates });
    expect(() => add(root, ['sparkle-widget'], { templates })).toThrow(/Unknown component "sparkle-widget"/);
  });

  it('remove keeps shared files other components use, and edited files', () => {
    init(root, { templates });
    add(root, ['button', 'select'], { templates });
    writeFileSync(file('src/focsd/focsd-select.js'), '// edited\n');
    const result = remove(root, ['button', 'select']);
    expect(existsSync(file('src/focsd/focsd-button.js'))).toBe(false);
    expect(existsSync(file('src/focsd/focsd-select.js'))).toBe(true);
    expect(result.kept).toContain('focsd-select.js');
    expect(readState(root).components).toEqual({});
  });

  it('remove keeps a shared part while another component still uses it', () => {
    init(root, { templates });
    add(root, ['date-picker', 'date-range-picker'], { templates });
    remove(root, ['date-picker']);
    expect(existsSync(file('src/focsd/focsd-calendar.js'))).toBe(true);
    expect(existsSync(file('src/focsd/focsd-date-picker.js'))).toBe(false);
  });

  it('list marks added components', () => {
    init(root, { templates });
    add(root, ['button'], { templates });
    const rows = list(root, { templates });
    expect(rows.find((r) => r.tag === 'focsd-button')).toMatchObject({ added: true, module: 'focsd-button.js' });
    expect(rows.find((r) => r.tag === 'focsd-select')).toMatchObject({ added: false });
  });
});

describe('add next to shared files (review I4)', () => {
  it('keeps an edited shared file, records it for the new component, and says so', () => {
    init(root, { templates });
    add(root, ['date-picker'], { templates });
    writeFileSync(file('src/focsd/focsd-calendar.js'), `${readFileSync(file('src/focsd/focsd-calendar.js'), 'utf8')}// mine\n`);
    const result = add(root, ['date-range-picker'], { templates });
    expect(result.warnings.join('\n')).toContain('focsd-calendar.js');
    expect(readFileSync(file('src/focsd/focsd-calendar.js'), 'utf8')).toContain('// mine');
    expect(readState(root).components['focsd-date-range-picker.js'].files['focsd-calendar.js']).toBe(
      readState(root).components['focsd-date-picker.js'].files['focsd-calendar.js'],
    );
  });

  it('brings an unedited shared file from an older version up to date instead of refusing', () => {
    init(root, { templates });
    add(root, ['date-picker'], { templates });
    const older = '// shared calendar from an older version\n';
    writeFileSync(file('src/focsd/focsd-calendar.js'), older);
    writeFileSync(file('.focsd/pristine/focsd-calendar.js.pristine'), older);
    const state = readState(root);
    state.components['focsd-date-picker.js'].files['focsd-calendar.js'] = sha256(older);
    writeFileSync(file('focsd.json'), JSON.stringify(state));
    expect(() => add(root, ['date-range-picker'], { templates })).not.toThrow();
    expect(readFileSync(file('src/focsd/focsd-calendar.js'), 'utf8')).toBe(readFileSync(join(templates, 'focsd-calendar.js'), 'utf8'));
  });
});

describe('init --install (review I10)', () => {
  it('installs the runtime with the detected package manager', () => {
    writeFileSync(file('pnpm-lock.yaml'), '');
    const calls = [];
    init(root, {
      templates,
      install: true,
      run: (cmd, args) => {
        calls.push([cmd, ...args]);

        return { status: 0 };
      },
    });
    const { version } = readState(root);
    expect(calls).toEqual([['pnpm', 'add', `lit`, `@focsd-dev/primitives@${version}`, `@focsd-dev/tokens@${version}`]]);
  });

  it('reports a failed install', () => {
    expect(() => init(root, { templates, install: true, run: () => ({ status: 1 }) })).toThrow(/install failed/);
  });
});

describe('init options (review minor findings)', () => {
  it('#2 stores a Windows-style --dir with forward slashes and prints imports with them', () => {
    init(root, { dir: 'src\\ui\\focsd\\', templates });
    expect(readState(root).dir).toBe('src/ui/focsd');
    expect(add(root, ['button'], { templates }).importLines).toEqual(["import './src/ui/focsd/focsd-button.js';"]);
    expect(existsSync(file('src/ui/focsd/focsd-button.js'))).toBe(true);
  });

  it('#3 re-running init without --dir keeps the existing dir and components', () => {
    init(root, { dir: 'src/ui', templates });
    add(root, ['button'], { templates });
    const before = readState(root);
    init(root, { templates });
    expect(readState(root)).toEqual(before);
    init(root, { dir: 'lib/ui', templates });
    expect(readState(root).dir).toBe('lib/ui');
  });

  it('#3 re-running init keeps the version the copied components came from', () => {
    init(root, { templates });
    add(root, ['button'], { templates });
    writeFileSync(file('focsd.json'), JSON.stringify({ ...readState(root), version: '0.0.1' }));
    init(root, { templates });
    expect(readState(root).version).toBe('0.0.1');
  });
});

describe('#6 remove needs names', () => {
  it('bare remove throws instead of reporting "Removed 0"', () => {
    init(root, { templates });
    add(root, ['button'], { templates });
    expect(() => remove(root, [])).toThrow(/Name the components to remove: npx focsd remove button/);
    expect(existsSync(file('src/focsd/focsd-button.js'))).toBe(true);
  });
});

describe('#8 remove cleans up delivered copies', () => {
  it('drops the delivered copy of an edited file it keeps (no longer tracked)', () => {
    init(root, { templates });
    add(root, ['combobox'], { templates });
    writeFileSync(file('src/focsd/focsd-combobox.js'), '// edited\n');
    const result = remove(root, ['combobox']);
    expect(result.kept).toContain('focsd-combobox.js');
    expect(existsSync(file('src/focsd/focsd-combobox.js'))).toBe(true);
    expect(existsSync(file('.focsd/pristine/focsd-combobox.js.pristine'))).toBe(false);
    expect(existsSync(file('.focsd/pristine/focsd-option.js.pristine'))).toBe(false);
  });
});

describe('#10 list recognizes modules copied with another component', () => {
  it('marks the option module copied by combobox as added, and says by what', () => {
    init(root, { templates });
    add(root, ['combobox'], { templates });
    const rows = list(root, { templates });
    expect(rows.find((r) => r.tag === 'focsd-combobox')).toMatchObject({ added: true, via: undefined });
    expect(rows.find((r) => r.tag === 'focsd-option')).toMatchObject({ added: true, via: 'focsd-combobox.js' });
    expect(rows.find((r) => r.tag === 'focsd-button')).toMatchObject({ added: false });
  });
});

describe('#13 delivered copies stay out of your tools', () => {
  it('stores them without a .js extension and explains the folder', () => {
    init(root, { templates });
    add(root, ['toggle-group'], { templates });
    expect(existsSync(file('.focsd/pristine/focsd-toggle-group.js'))).toBe(false);
    expect(readFileSync(file('.focsd/pristine/focsd-toggle-group.js.pristine'), 'utf8')).toBe(
      readFileSync(join(templates, 'focsd-toggle-group.js'), 'utf8'),
    );
    expect(existsSync(file('.focsd/pristine/focsd-toggle.js.pristine'))).toBe(true);
    const readme = readFileSync(file('.focsd/README.md'), 'utf8');
    expect(readme).toMatch(/Commit this folder/);
    expect(readme).toContain('.focsd/');
  });

  it('does not overwrite a README you changed', () => {
    init(root, { templates });
    mkdirSync(file('.focsd'), { recursive: true });
    writeFileSync(file('.focsd/README.md'), '# ours\n');
    add(root, ['button'], { templates });
    expect(readFileSync(file('.focsd/README.md'), 'utf8')).toBe('# ours\n');
  });
});

describe('m47 module-private helpers are not exported', () => {
  it('keeps the public surface of project.js to what other modules use', () => {
    for (const name of ['PRISTINE', 'PRISTINE_EXT', 'packageManager', 'runtimePackages']) expect(project, name).not.toHaveProperty(name);
  });
});

describe('entryOf', () => {
  it('entryOf names a module that focsd.json has no entry for', () => {
    const state = { version: '1.0.0', dir: 'src/focsd', components: {} };
    expect(() => project.entryOf(state, 'focsd-button.js')).toThrow(CliError);
    expect(() => project.entryOf(state, 'focsd-button.js')).toThrow('focsd.json has no entry for focsd-button.js.');
  });
});

describe('initAgent', () => {
  it('writes the agent files once and reports skips', () => {
    const first = project.initAgent(root, { templates });
    expect(first.map((f) => f.written)).toEqual([true, true]);
    const text = readFileSync(file('AGENTS.md'), 'utf8');
    expect(project.initAgent(root, { templates }).map((f) => f.written)).toEqual([false, false]);
    expect(readFileSync(file('AGENTS.md'), 'utf8')).toBe(text);
  });

  it('refuses to write through a parent folder symlinked outside the project', async () => {
    const { symlinkSync } = await import('node:fs');
    const outside = mkdtempSync(join(tmpdir(), 'focsd-out-'));
    symlinkSync(outside, file('.claude'));
    expect(() => project.initAgent(root, { templates })).toThrow(CliError);
    expect(existsSync(join(outside, 'skills'))).toBe(false);
    rmSync(outside, { recursive: true, force: true });
  });
});

describe('initAgent, existing paths', () => {
  it('skips and reports a dangling symlink inside the project without writing through it', async () => {
    const { symlinkSync, lstatSync } = await import('node:fs');
    symlinkSync('missing-target.md', file('AGENTS.md'));
    const result = project.initAgent(root, { templates });
    expect(result[0]).toEqual({ path: 'AGENTS.md', written: false });
    expect(result[1].written).toBe(true);
    expect(existsSync(file('missing-target.md'))).toBe(false);
    expect(lstatSync(file('AGENTS.md')).isSymbolicLink()).toBe(true);
  });

  it('skips a directory sitting at the path', () => {
    mkdirSync(file('AGENTS.md'));
    expect(project.initAgent(root, { templates })[0]).toEqual({ path: 'AGENTS.md', written: false });
  });

  it('skips a symlink to an existing file and leaves the target alone', async () => {
    const { symlinkSync } = await import('node:fs');
    writeFileSync(file('real.md'), 'mine');
    symlinkSync('real.md', file('AGENTS.md'));
    expect(project.initAgent(root, { templates })[0].written).toBe(false);
    expect(readFileSync(file('real.md'), 'utf8')).toBe('mine');
  });
});

describe('agentInit', () => {
  it('reports writes, then skips, then the MCP lines; refuses --dir and --install', () => {
    const first = project.agentInit(root, { templates });
    expect(first.slice(0, 2)).toEqual(['✓ wrote AGENTS.md', '✓ wrote .claude/skills/focsd/SKILL.md']);
    expect(first.join('\n')).toContain('claude mcp add --transport http focsd http://127.0.0.1:3333/mcp');
    expect(project.agentInit(root, { templates })[0]).toBe('skipped AGENTS.md (exists)');
    expect(() => project.agentInit(root, { templates, dir: 'x' })).toThrow(CliError);
    expect(() => project.agentInit(root, { templates, install: true })).toThrow(CliError);
  });
});
