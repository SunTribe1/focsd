import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { parseArgs, plan } from '../../ci-local.mjs';

const names = (/** @type {{ name: string }[]} */ steps) => steps.map((s) => s.name);
const ciYaml = readFileSync(new URL('../../../.github/workflows/ci.yml', import.meta.url), 'utf8');

describe('ci:local plan', () => {
  it('runs install, build and the check job first, as CI does', () => {
    const { steps } = plan({ platform: 'darwin' });

    assert.deepEqual(names(steps).slice(0, 3), ['Install', 'Build the packages', 'Lint, format, spelling and repository checks']);
  });

  it('--fast stops before any browser', () => {
    const { steps, skipped } = plan({ fast: true, platform: 'linux' });

    assert.equal(
      steps.some((s) => s.command.includes('playwright')),
      false,
    );
    assert.deepEqual(skipped, ['browser suites (--fast)']);
  });

  it('skips the visual job off Linux and runs it on Linux', () => {
    assert.match(plan({ platform: 'darwin' }).skipped.join(), /visual regression/);
    assert.ok(names(plan({ platform: 'linux' }).steps).includes('Visual regression'));
  });

  it('runs only the browsers asked for, and rejects unknown ones', () => {
    const steps = names(plan({ browsers: ['webkit'], platform: 'darwin' }).steps);

    assert.ok(steps.includes('Components in webkit'));
    assert.equal(
      steps.some((s) => /chromium|firefox/i.test(s)),
      false,
    );
    assert.throws(() => plan({ browsers: ['edge'] }), /Unknown browser: edge/);
  });

  it('runs every command CI runs for checks and tests', () => {
    const commands = new Set(plan({ platform: 'linux' }).steps.map((s) => s.command));

    for (const ci of [
      'pnpm check',
      'pnpm audit --prod --audit-level=low',
      'pnpm --filter @focsd-dev/docs test',
      'node scripts/check-packages.mjs',
      'pnpm --filter @focsd-dev/playground coverage',
      'pnpm --filter @focsd-dev/docs test:e2e',
    ]) {
      assert.ok(ciYaml.includes(ci), `ci.yml no longer runs "${ci}"; update scripts/ci-local.mjs`);
      assert.ok(commands.has(ci), `ci:local does not run "${ci}"`);
    }
  });

  it('reads its flags', () => {
    assert.deepEqual(parseArgs(['--fast', '--keep', '--browsers=firefox,webkit']), {
      fast: true,
      keep: true,
      browsers: ['firefox', 'webkit'],
    });
    assert.deepEqual(parseArgs([]).browsers, ['chromium', 'firefox', 'webkit']);
  });
});
