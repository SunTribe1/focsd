import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { plan } from '../../ci-plan.mjs';

const pr = (/** @type {string[] | null} */ changed, headRef = 'feat/x') => {
  const { full, browsers, docs } = plan({ event: 'pull_request', headRef, changed });

  return { full, browsers, docs };
};

const engines = (/** @type {Parameters<typeof plan>[0]} */ input) => plan(input).engines.map((e) => e.browser);

describe('ci plan', () => {
  it('runs everything nightly, on demand and on the Version packages pull request', () => {
    const all = { full: true, browsers: true, docs: true };

    assert.deepEqual(pr(['README.md'], 'changeset-release/main'), all);
    assert.deepEqual(engines({ event: 'schedule', changed: [] }), ['chromium', 'firefox', 'webkit']);
    assert.deepEqual(engines({ event: 'workflow_dispatch', changed: [] }), ['chromium', 'firefox', 'webkit']);
  });

  it('runs no browser or docs jobs on a push to main (the pull request ran them)', () => {
    const { full, browsers, docs } = plan({ event: 'push', changed: [] });

    assert.deepEqual({ full, browsers, docs }, { full: false, browsers: false, docs: false });
  });

  it('runs the browser jobs for package or test bench changes, not for docs-only ones', () => {
    assert.equal(pr(['packages/primitives/src/button.js']).browsers, true);
    assert.equal(pr(['apps/playground/e2e/links.spec.js']).browsers, true);
    assert.equal(pr(['apps/docs/src/content/docs/index.mdx']).browsers, false);
    assert.equal(pr(['CONTRIBUTING.md']).browsers, false);
  });

  it('runs the docs jobs for docs or package changes', () => {
    assert.equal(pr(['apps/docs/src/content/docs/index.mdx']).docs, true);
    assert.equal(pr(['packages/charts/src/chart.js']).docs, true);
    assert.equal(pr(['apps/playground/e2e/links.spec.js']).docs, false);
  });

  it('runs everything when dependencies or CI change, or the changed files are unknown', () => {
    for (const file of ['pnpm-lock.yaml', '.github/workflows/ci.yml', 'turbo.json']) {
      assert.deepEqual(pr([file]), { full: false, browsers: true, docs: true }, file);
    }

    assert.deepEqual(pr(null), { full: false, browsers: true, docs: true });
  });

  it('tests a pull request in Chromium only', () => {
    assert.deepEqual(engines({ event: 'pull_request', headRef: 'feat/x', changed: ['packages/a.js'] }), ['chromium']);
  });
});
