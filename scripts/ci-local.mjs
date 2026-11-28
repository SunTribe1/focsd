/**
 * `pnpm ci:local`: the CI pipeline (.github/workflows/ci.yml) on this machine, from a clean checkout.
 *
 * It runs on a fresh `git worktree` of the current commit, so build output, caches and test servers
 * left in your working copy cannot make a check pass that would fail on CI. CI=1 is set, so
 * Playwright starts its own servers instead of reusing whatever is listening on the port, and the
 * turbo cache is bypassed (TURBO_FORCE), so every task really runs.
 *
 *   pnpm ci:local                 every job CI runs, in order, stopping at the first failure
 *   pnpm ci:local --fast          lint, types, unit tests and packaging only (no browsers)
 *   pnpm ci:local --browsers=firefox,webkit   only these engines for the component suites
 *   pnpm ci:local --keep          leave the worktree in place afterwards, to inspect a failure
 *
 * Uncommitted changes are not tested (CI tests commits); commit or amend first. The visual job runs
 * only on Linux, where its baselines were recorded; on macOS it is skipped and reported.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const ENGINES = ['chromium', 'firefox', 'webkit'];

/** @typedef {{ name: string, command: string }} Step */

/**
 * The steps CI runs, in the order its jobs depend on each other.
 * @param {{ fast?: boolean, browsers?: string[], platform?: string }} [options]
 * @returns {{ steps: Step[], skipped: string[] }}
 */
export function plan({ fast = false, browsers = ENGINES, platform = process.platform } = {}) {
  const unknown = browsers.filter((browser) => !ENGINES.includes(browser));

  if (unknown.length) throw new Error(`Unknown browser: ${unknown.join(', ')}. Use ${ENGINES.join(', ')}.`);

  const steps = [
    { name: 'Install', command: 'pnpm install --frozen-lockfile' },
    { name: 'Build the packages', command: 'pnpm exec turbo run build --filter="./packages/*"' },
    { name: 'Lint, format, spelling and repository checks', command: 'pnpm check' },
    { name: 'Dependency audit', command: 'pnpm audit --prod --audit-level=low' },
    { name: 'Package unit tests', command: 'pnpm exec turbo run test --filter="./packages/*" --concurrency=2' },
    { name: 'Docs unit tests', command: 'pnpm --filter @focsd-dev/docs test' },
    { name: 'Packaging (publint, attw)', command: 'node scripts/check-packages.mjs' },
  ];

  const skipped = [];

  if (fast) return { steps, skipped: ['browser suites (--fast)'] };

  steps.push(
    { name: 'Packed install smoke test', command: 'node scripts/smoke/consumer.mjs --offline' },
    {
      name: 'SSR hydration',
      command: 'pnpm --filter @focsd-dev/playground exec playwright test --project=chromium e2e/ssr-hydrate.spec.js',
    },
  );

  if (platform === 'linux') {
    steps.push({ name: 'Visual regression', command: 'pnpm --filter @focsd-dev/playground exec playwright test --project=visual' });
  } else {
    skipped.push(`visual regression (its baselines are Linux screenshots; this is ${platform})`);
  }

  if (browsers.includes('chromium')) {
    steps.push({ name: 'Coverage (Chromium)', command: 'pnpm --filter @focsd-dev/playground coverage' });
  }

  for (const browser of browsers) {
    const projects = browser === 'chromium' ? '--project=chromium --project=chrome-webmcp' : `--project=${browser}`;

    steps.push(
      { name: `Components in ${browser}`, command: `pnpm --filter @focsd-dev/playground exec playwright test ${projects}` },
      { name: `Tokens in ${browser}`, command: `pnpm --filter @focsd-dev/tokens test:e2e --project=${browser}` },
    );
  }

  steps.push({ name: 'Docs site end to end', command: 'pnpm --filter @focsd-dev/docs test:e2e' });

  return { steps, skipped };
}

/**
 * @param {string[]} argv
 * @returns {{ fast: boolean, keep: boolean, browsers: string[] }}
 */
export function parseArgs(argv) {
  const browsersArg = argv.find((arg) => arg.startsWith('--browsers='));

  return {
    fast: argv.includes('--fast'),
    keep: argv.includes('--keep'),
    browsers: browsersArg ? browsersArg.slice('--browsers='.length).split(',').filter(Boolean) : ENGINES,
  };
}

/** @param {number} ms */
const minutes = (ms) => `${(ms / 60_000).toFixed(1)} min`;

function main() {
  const options = parseArgs(process.argv.slice(2));
  const { steps, skipped } = plan(options);
  const git = (/** @type {string[]} */ ...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
  const commit = git('rev-parse', '--short', 'HEAD');

  if (git('status', '--porcelain')) console.warn('! Uncommitted changes are not tested: ci:local checks the commit, as CI does.\n');

  const dir = join(mkdtempSync(join(tmpdir(), 'focsd-ci-')), 'repo');

  git('worktree', 'add', '--detach', dir, 'HEAD');
  console.log(`Clean checkout of ${commit} in ${dir}\n`);

  // CI has no turbo cache, so neither does this run: a cache hit replays old output and can skip work.
  const env = { ...process.env, CI: '1', TURBO_FORCE: 'true' };
  const results = [];
  let failed = null;

  for (const step of steps) {
    console.log(`\n▶ ${step.name}\n  $ ${step.command}`);
    const started = Date.now();
    const { status } = spawnSync(step.command, { cwd: dir, env, shell: true, stdio: 'inherit' });

    results.push(`${status === 0 ? '✓' : '✗'} ${step.name} (${minutes(Date.now() - started)})`);

    if (status !== 0) {
      failed = step;
      break;
    }
  }

  if (options.keep || failed) {
    console.log(`\nThe checkout is kept at ${dir}. Remove it with: git worktree remove --force ${dir}`);
  } else {
    git('worktree', 'remove', '--force', dir);
    rmSync(join(dir, '..'), { recursive: true, force: true });
  }

  console.log(`\n${results.join('\n')}`);

  for (const reason of skipped) console.log(`- skipped: ${reason}`);

  if (failed) {
    console.error(`\nci:local failed at "${failed.name}" on ${commit}.`);
    process.exitCode = 1;
  } else {
    console.log(`\nci:local passed on ${commit}: the same steps CI runs${skipped.length ? ', apart from the skips above' : ''}.`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
