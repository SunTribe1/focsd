/**
 * Fails when end-to-end coverage of the packages' source drops below the floor, in total or for any
 * one package. Raise a floor when coverage rises; never lower it to make a change pass.
 *   pnpm coverage   (runs the Chromium suite with COVERAGE=1, then this check)
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SOURCE_KEY } from '../e2e/fixtures/coverage-options.js';

const METRICS = ['lines', 'statements', 'functions', 'branches'];

const FLOOR = { lines: 94, statements: 91, functions: 91, branches: 75 };

/**
 * Per-package floors (OD2): the coverage measured on 2026-10-21 minus 1.0 point, to one decimal, to
 * ratchet upwards. Every package with coverage needs a row, so a new package cannot slip past.
 */
const PACKAGE_FLOOR = {
  // Measured on CI on 2026-11-28 (its first coverage run), minus 1.0 point.
  ai: { lines: 81.4, statements: 78.7, functions: 72.9, branches: 62.3 },
  charts: { lines: 95.9, statements: 92.6, functions: 83.7, branches: 79.6 },
  components: { lines: 99.0, statements: 99.0, functions: 99.0, branches: 50.6 },
  'data-grid': { lines: 93.4, statements: 90.2, functions: 86.1, branches: 76.5 },
  editor: { lines: 92.9, statements: 90.9, functions: 78.2, branches: 79.9 },
  primitives: { lines: 93.5, statements: 90.2, functions: 92.5, branches: 78.9 },
  react: { lines: 99.0, statements: 99.0, functions: 99.0, branches: 54.5 },
  webmcp: { lines: 87.9, statements: 82.1, functions: 85.0, branches: 70.8 },
};

const SUMMARY = fileURLToPath(new URL('../coverage/coverage-summary.json', import.meta.url));

/** @returns {Record<string, Record<string, { total: number, covered: number, pct: number }>>} */
function readSummary() {
  try {
    return JSON.parse(readFileSync(SUMMARY, 'utf8'));
  } catch (error) {
    const reason = error.code === 'ENOENT' ? 'it does not exist' : error.message;

    console.error(`Cannot read ${SUMMARY}: ${reason}.\nRun \`pnpm --filter @focsd-dev/playground coverage\` to produce it.`);

    return process.exit(1);
  }
}

/** Sums each package's file entries into one total per metric. */
function packageTotals(files) {
  const totals = {};

  for (const [key, entry] of files) {
    const name = key.split('/')[1];
    const sums = totals[name] ?? Object.fromEntries(METRICS.map((metric) => [metric, { total: 0, covered: 0 }]));

    totals[name] = Object.fromEntries(
      METRICS.map((metric) => [
        metric,
        { total: sums[metric].total + entry[metric].total, covered: sums[metric].covered + entry[metric].covered },
      ]),
    );
  }

  return totals;
}

const pct = ({ total, covered }) => (total ? (covered / total) * 100 : 100);

/** Each metric that is below its floor, as a message. */
const below = (label, values, floor) =>
  METRICS.flatMap((metric) =>
    values[metric] < floor[metric] ? [`${label} ${metric} ${values[metric].toFixed(2)}% < ${floor[metric]}%`] : [],
  );

/** Keys are repository paths; a basename key means two files were merged into one (see coverage-options.js). */
function checkKeys(files) {
  const badKeys = files.flatMap(([key]) => (SOURCE_KEY.test(key) ? [] : [key]));

  return badKeys.length ? [`coverage keys outside packages/<pkg>/src/: ${badKeys.join(', ')}`] : [];
}

function checkTotal(total) {
  const values = Object.fromEntries(METRICS.map((metric) => [metric, total[metric].pct]));

  for (const metric of METRICS) console.log(`${metric.padEnd(11)} ${values[metric].toFixed(2)}% (floor ${FLOOR[metric]}%)`);

  return below('total', values, FLOOR);
}

function checkPackages(files) {
  const totals = packageTotals(files.filter(([key]) => SOURCE_KEY.test(key)));

  const missingFloor = Object.keys(totals).flatMap((name) =>
    Object.hasOwn(PACKAGE_FLOOR, name) ? [] : [`${name}: has coverage but no PACKAGE_FLOOR row`],
  );

  const low = Object.entries(PACKAGE_FLOOR).flatMap(([name, floor]) => {
    if (!totals[name]) return [`${name}: no coverage recorded`];

    const values = Object.fromEntries(METRICS.map((metric) => [metric, pct(totals[name][metric])]));

    console.log(`${name.padEnd(11)} ${METRICS.map((metric) => `${metric} ${values[metric].toFixed(2)}%`).join(', ')}`);

    return below(name, values, floor);
  });

  return [...missingFloor, ...low];
}

const { total, ...rest } = readSummary();
const files = Object.entries(rest);
const failures = [...checkKeys(files), ...checkTotal(total), ...checkPackages(files)];

if (failures.length) {
  console.error(`End-to-end coverage check failed:\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
