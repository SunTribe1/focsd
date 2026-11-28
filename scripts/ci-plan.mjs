/**
 * Decides how much of CI runs (.github/workflows/ci.yml, job "What to run"). Prints GitHub Actions
 * outputs: `full`, `browsers` and `docs` (`true` or `false`) and `engines`, the JSON matrix of browser
 * engines for the component suites (Chromium on a pull request, all three on a full run).
 *
 * - full: nightly, on demand, and on the "Version packages" pull request (branch changeset-release/*):
 *   every job in every engine, with coverage, so nothing is published without the whole suite.
 * - push to main: no browser jobs. The pull request ran them on the same tree.
 * - pull request: browser jobs only when a changed file is something they test; docs jobs likewise.
 *   When the changed files cannot be listed, everything runs.
 */
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

/** Files every browser and docs job depends on: dependencies, build and CI configuration. */
const SHARED = [
  /^pnpm-lock\.yaml$/,
  /^pnpm-workspace\.yaml$/,
  /^package\.json$/,
  /^turbo\.json$/,
  /^\.nvmrc$/,
  /^\.github\/workflows\/ci\.yml$/,
];

const BROWSERS = [...SHARED, /^packages\//, /^apps\/playground\//, /^scripts\/smoke\//, /^scripts\/check-packages\.mjs$/];

const DOCS = [...SHARED, /^packages\//, /^apps\/docs\//, /^docs\/components-catalogue\.md$/, /^scripts\/agent\//];

const CHROMIUM = { browser: 'chromium', label: 'Chromium', projects: '--project=chromium --project=chrome-webmcp' };

const ENGINES = [
  CHROMIUM,
  { browser: 'firefox', label: 'Firefox', projects: '--project=firefox' },
  { browser: 'webkit', label: 'WebKit', projects: '--project=webkit' },
];

/** @typedef {{ browser: string, label: string, projects: string }} Engine */

/**
 * @param {{ event: string, headRef?: string, changed: string[] | null }} input `changed` is null when
 *   the changed files could not be listed.
 * @returns {{ full: boolean, browsers: boolean, docs: boolean, engines: Engine[] }}
 */
export function plan({ event, headRef = '', changed }) {
  const full =
    event === 'schedule' || event === 'workflow_dispatch' || (event === 'pull_request' && headRef.startsWith('changeset-release/'));

  if (full) return { full, browsers: true, docs: true, engines: ENGINES };

  if (event !== 'pull_request') return { full, browsers: false, docs: false, engines: [CHROMIUM] };

  if (!changed) return { full, browsers: true, docs: true, engines: [CHROMIUM] };

  const touches = (/** @type {RegExp[]} */ patterns) => changed.some((file) => patterns.some((pattern) => pattern.test(file)));

  return { full, browsers: touches(BROWSERS), docs: touches(DOCS), engines: [CHROMIUM] };
}

/**
 * The files a pull request changes, or null when git cannot tell (a shallow clone, a missing base).
 * @param {string | undefined} base
 * @param {string | undefined} head
 * @returns {string[] | null}
 */
function changedFiles(base, head) {
  if (!base || !head) return null;

  try {
    return execFileSync('git', ['diff', '--name-only', `${base}...${head}`], { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
  } catch {
    return null;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { EVENT = '', HEAD_REF = '', BASE, HEAD } = process.env;
  const changed = EVENT === 'pull_request' ? changedFiles(BASE, HEAD) : [];
  const result = plan({ event: EVENT, headRef: HEAD_REF, changed });

  for (const [key, value] of Object.entries(result)) console.log(`${key}=${Array.isArray(value) ? JSON.stringify(value) : value}`);

  console.error(
    `CI plan for ${EVENT}: ${JSON.stringify(result)}${changed ? ` (${changed.length} changed files)` : ' (changed files unknown: running everything)'}`,
  );
}
