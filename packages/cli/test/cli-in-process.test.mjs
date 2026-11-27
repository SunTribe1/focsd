import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Runs src/cli.js in this process (so coverage sees it) with a fake argv and cwd. */
let root;
let stdout;
let stderr;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'focsd-process-'));
  stdout = [];
  stderr = [];
  vi.spyOn(process, 'cwd').mockReturnValue(root);
  vi.spyOn(process.stdout, 'write').mockImplementation((text) => Boolean(stdout.push(String(text))));
  vi.spyOn(process.stderr, 'write').mockImplementation((text) => Boolean(stderr.push(String(text))));
  process.exitCode = undefined;
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
  rmSync(root, { recursive: true, force: true });
});

async function run(...args) {
  const argv = process.argv;
  process.argv = [argv[0], 'focsd', ...args];

  try {
    await import('../src/cli.js');
  } finally {
    process.argv = argv;
  }

  return { out: stdout.join(''), err: stderr.join(''), code: process.exitCode ?? 0 };
}

describe('focsd init --agent (in process)', () => {
  it('writes the files, prints the connect lines, and skips them on a second run', async () => {
    const first = await run('init', '--agent');
    expect(first.code).toBe(0);
    expect(first.out).toContain('✓ wrote AGENTS.md');
    expect(first.out).toContain('claude mcp add --transport http focsd');
    expect(existsSync(join(root, '.claude/skills/focsd/SKILL.md'))).toBe(true);
    expect(existsSync(join(root, 'focsd.json'))).toBe(false);
    const text = readFileSync(join(root, 'AGENTS.md'), 'utf8');

    stdout.length = 0;
    vi.resetModules();
    const second = await run('init', '--agent');
    expect(second.out).toContain('skipped AGENTS.md (exists)');
    expect(readFileSync(join(root, 'AGENTS.md'), 'utf8')).toBe(text);
  });

  it('refuses --dir and --install with --agent', async () => {
    const result = await run('init', '--agent', '--dir', 'x');
    expect(result.code).toBe(1);
    expect(result.err).toContain('--agent cannot be combined');
  });
});

describe('focsd command errors and flags (in process)', () => {
  it('prints help and the version', async () => {
    expect((await run('--help')).out).toContain('--agent');
    vi.resetModules();
    expect((await run('--version')).out).toMatch(/\d+\.\d+\.\d+/);
  });

  it('fails on an unknown command, a stray flag, and an unparsable flag', async () => {
    expect((await run('nope')).err).toContain('Unknown command "nope"');
    vi.resetModules();
    process.exitCode = undefined;
    expect((await run('list', '--dir', 'y')).err).toContain('not an option of "list"');
    vi.resetModules();
    process.exitCode = undefined;
    expect((await run('init', '--bogus')).code).toBe(1);
  });

  it('runs init, add, list, diff, update and remove', async () => {
    expect((await run('init')).out).toContain('focsd.json created');

    for (const args of [['add', 'button'], ['list'], ['diff', 'button'], ['update', 'button'], ['remove', 'button']]) {
      vi.resetModules();
      stdout.length = 0;
      const result = await run(...args);
      expect(result.code, `${args.join(' ')}: ${result.err}`).toBe(0);
    }

    expect(stdout.join('')).toContain('Removed');
    vi.resetModules();
    expect((await run('add')).err).toContain('Name at least one component');
  });
});
