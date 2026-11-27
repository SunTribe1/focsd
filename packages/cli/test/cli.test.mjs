import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const bin = fileURLToPath(new URL('../src/cli.js', import.meta.url));

const templatesVersion = JSON.parse(
  readFileSync(fileURLToPath(new URL('../templates/components.package.json', import.meta.url)), 'utf8'),
).version;

let root;
const run = (...args) => spawnSync(process.execPath, [bin, ...args], { cwd: root, encoding: 'utf8' });

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'focsd-bin-'));
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('focsd command', () => {
  it('init, add and list work end to end', () => {
    expect(run('init', '--dir', 'src/ui').status).toBe(0);
    const added = run('add', 'button');
    expect(added.status).toBe(0);
    expect(added.stdout).toContain("import './src/ui/focsd-button.js';");
    expect(existsSync(join(root, 'src/ui/focsd-button.js'))).toBe(true);
    expect(added.stdout).toMatch(/npm install lit @focsd\/primitives@[\d.]+ @focsd\/tokens@[\d.]+/);
    expect(added.stdout).toMatch(/Import your copies before @focsd\/components/);
    const listed = run('list');
    expect(listed.stdout).toMatch(/✓ focsd-button/);
  });

  it('update and diff report per file', () => {
    run('init');
    run('add', 'button');
    const updated = run('update', '--all');
    expect(updated.status).toBe(0);
    expect(updated.stdout).toMatch(/focsd-button\.js: unchanged/);
    expect(run('diff', 'button').stdout).toMatch(/No differences/);
  });

  it('unknown components and commands fail with a message', () => {
    run('init');
    const bad = run('add', 'sparkle-widget');
    expect(bad.status).toBe(1);
    expect(bad.stderr).toContain('Unknown component "sparkle-widget"');
    const nope = run('deploy-everything');
    expect(nope.status).toBe(1);
    expect(nope.stderr).toContain('Unknown command "deploy-everything"');
  });

  it('--help lists every command and --version prints the version', () => {
    const help = run('--help');

    for (const cmd of ['init', 'add', 'list', 'diff', 'update', 'remove']) expect(help.stdout).toContain(cmd);
    expect(run('--version').stdout).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('#4 init pins the runtime to the templates version, even when focsd.json is older', () => {
    run('init');
    run('add', 'button');
    const state = JSON.parse(readFileSync(join(root, 'focsd.json'), 'utf8'));
    writeFileSync(join(root, 'focsd.json'), JSON.stringify({ ...state, version: '0.0.1' }));
    const again = run('init');
    expect(again.stdout).toContain(`@focsd/primitives@${templatesVersion} @focsd/tokens@${templatesVersion}`);
    expect(again.stdout).not.toContain('@0.0.1');
  });

  it('#5 commands run from a subfolder use the focsd.json above it; init stays where it is run', () => {
    run('init');
    // A repository: outside one (and outside home, like this temp folder) the CLI does not climb.
    mkdirSync(join(root, '.git'));
    mkdirSync(join(root, 'src/app'), { recursive: true });
    const sub = (...args) => spawnSync(process.execPath, [bin, ...args], { cwd: join(root, 'src/app'), encoding: 'utf8' });
    const added = sub('add', 'button');
    expect(added.status).toBe(0);
    expect(existsSync(join(root, 'src/focsd/focsd-button.js'))).toBe(true);
    expect(existsSync(join(root, 'src/app/src'))).toBe(false);
    expect(sub('list').stdout).toMatch(/✓ focsd-button/);
  });

  it('#6 bare update, diff and remove fail with a message', () => {
    run('init');
    run('add', 'button');

    for (const cmd of ['update', 'diff', 'remove']) {
      const bare = run(cmd);
      expect(bare.status, cmd).toBe(1);
      expect(bare.stderr, cmd).toMatch(/Name the components to/);
    }
  });

  it('#10 list shows a module copied with another one as added', () => {
    run('init');
    run('add', 'combobox');
    expect(run('list').stdout).toMatch(/✓ focsd-option\s+focsd-option\.js \(with focsd-combobox\.js\)/);
  });

  it('stays quiet when the reader of its output stops early (focsd list | head)', () => {
    const piped = spawnSync('sh', ['-c', `"${process.execPath}" "${bin}" list | true`], { cwd: root, encoding: 'utf8' });
    expect(piped.stderr).not.toMatch(/EPIPE|Error/);
  });

  it('m45 a flag the command does not use fails, and nothing is changed', () => {
    run('init');
    const merged = run('add', 'button', '--merge');
    expect(merged.status).toBe(1);
    expect(merged.stderr).toMatch(/--merge is not an option of "add"/);
    expect(existsSync(join(root, 'src/focsd/focsd-button.js'))).toBe(false);
    const dir = run('list', '--dir', 'y');
    expect(dir.status).toBe(1);
    expect(dir.stderr).toMatch(/--dir is not an option of "list"/);
    expect(run('update', '--all', '--overwrite').status).toBe(1);
  });

  it('m45 the flags each command documents still work', () => {
    expect(run('init', '--dir', 'ui', '--install=false').status).toBe(1); // a boolean flag takes no value
    expect(run('init', '--dir', 'ui').status).toBe(0);
    expect(run('add', 'button', '--overwrite').status).toBe(0);
    expect(run('update', '--all', '--merge', '--force').status).toBe(0);
    expect(run('diff', '--all').status).toBe(0);
  });

  it('Q31 remove, diff and update accept <tag> and <tag>.js', () => {
    run('init');
    run('add', 'button');
    expect(run('diff', 'focsd-button.js').status).toBe(0);
    expect(run('update', 'focsd-button.js').status).toBe(0);
    expect(run('remove', 'focsd-button.js').status).toBe(0);
  });

  it('m46 remove without focsd.json still says to run init', () => {
    const bare = run('remove', 'button');
    expect(bare.status).toBe(1);
    expect(bare.stderr).toMatch(/No focsd\.json here/);
  });
});

describe('focsd init --agent', () => {
  const files = ['AGENTS.md', '.claude/skills/focsd/SKILL.md'];

  it('writes both files, prints the MCP connect lines and leaves focsd.json alone', () => {
    const result = run('init', '--agent');
    expect(result.status).toBe(0);

    for (const file of files) expect(existsSync(join(root, file))).toBe(true);
    expect(existsSync(join(root, 'focsd.json'))).toBe(false);
    expect(result.stdout).toContain('npx -y @focsd/mcp --http --port 3333');
    expect(result.stdout).toContain('claude mcp add --transport http focsd http://127.0.0.1:3333/mcp');
    expect(readFileSync(join(root, '.claude/skills/focsd/SKILL.md'), 'utf8')).toMatch(/^---\nname: focsd\n/);
  });

  it('a second run is a byte-identical no-op that says what it skipped', () => {
    run('init', '--agent');
    const before = files.map((f) => readFileSync(join(root, f), 'utf8'));
    const again = run('init', '--agent');
    expect(again.status).toBe(0);
    expect(again.stdout).toContain('skipped AGENTS.md (exists)');
    expect(again.stdout).toContain('skipped .claude/skills/focsd/SKILL.md (exists)');
    expect(files.map((f) => readFileSync(join(root, f), 'utf8'))).toEqual(before);
  });

  it('never overwrites a file that exists, and writes the other one', () => {
    writeFileSync(join(root, 'AGENTS.md'), 'mine\n');
    const result = run('init', '--agent');
    expect(result.stdout).toContain('skipped AGENTS.md (exists)');
    expect(readFileSync(join(root, 'AGENTS.md'), 'utf8')).toBe('mine\n');
    expect(existsSync(join(root, '.claude/skills/focsd/SKILL.md'))).toBe(true);
  });

  it('works next to an existing focsd.json without changing it', () => {
    run('init');
    const state = readFileSync(join(root, 'focsd.json'), 'utf8');
    expect(run('init', '--agent').status).toBe(0);
    expect(readFileSync(join(root, 'focsd.json'), 'utf8')).toBe(state);
  });

  it('refuses --dir and --install with --agent, and lists the flag in --help', () => {
    expect(run('init', '--agent', '--dir', 'x').status).toBe(1);
    expect(run('init', '--agent', '--install').stderr).toContain('--agent');
    expect(run('--help').stdout).toContain('--agent');
  });
});

describe('shipped agent files', () => {
  it('match the generator (drift)', async () => {
    const { consumerFiles } = await import('../../../scripts/agent/consumer.mjs');
    const { agents, skill } = consumerFiles(new URL('../../components/', import.meta.url));
    const templates = fileURLToPath(new URL('../templates/', import.meta.url));
    expect(readFileSync(join(templates, 'AGENTS.md'), 'utf8')).toBe(agents);
    expect(readFileSync(join(templates, 'SKILL.md'), 'utf8')).toBe(skill);
  });
});
