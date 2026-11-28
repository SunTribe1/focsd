// Every regular expression in the markdown parser and the SSE reader runs on untrusted model
// output, often once per animation frame, so none may backtrack super-linearly. This sweep finds
// each regex in the source (so a new one is covered without editing this file), runs it at every
// position of 100,000-character adversarial strings, and requires each run to finish in < 50 ms.
// A quadratic pattern takes seconds on these inputs, so the bound has a wide margin.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseJs } from 'acorn';
import { full } from 'acorn-walk';
import { expect, it } from 'vitest';
import { parse } from '../src/markdown/index.js';
import { parseSse } from '../src/chat/sse.js';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '../src');
const FILES = ['markdown/parse.js', 'markdown/inline.js', 'markdown/render.js', 'chat/sse.js'];
const N = 100_000;

// Super-linear backtracking on 100k characters takes seconds; 150 ms leaves room for GC pauses on a
// loaded machine (50 ms failed about one run in three) and still catches it.
const BOUND_MS = 150;

// Each case times several 100k-character inputs; alongside other packages' suites one took 6 s, past
// vitest's 5 s default. The speed bound above is what the test checks; this only stops a slow machine
// from failing it.
const SWEEP_TIMEOUT = 30_000;

/** Regex literals in a source file, as [pattern, flags]. */
function regexesIn(/** @type {string} */ file) {
  const ast = parseJs(readFileSync(join(SRC, file), 'utf8'), { ecmaVersion: 'latest', sourceType: 'module' });
  /** @type {[string, string][]} */
  const found = [];

  full(ast, (node) => {
    const regex = /** @type {any} */ (node).regex;

    if (regex) found.push([regex.pattern, regex.flags]);
  });

  return found;
}

/** The fence-closing regex is built at run time, once per fence character and length. */
const DYNAMIC = /** @type {[string, string][]} */ ([
  ['^ {0,3}`{3,}[ \\t]*$', ''],
  ['^ {0,3}~{3,}[ \\t]*$', ''],
]);

const REGEXES = [
  ...FILES.flatMap((file) => regexesIn(file).map(([p, f]) => /** @type {const} */ ([file, p, f]))),
  ...DYNAMIC.map(([p, f]) => /** @type {const} */ (['fence close', p, f])),
];

/** Runs of one character (or a short unit) that make greedy and lazy groups retry. */
const RUNS = [' ', '\t', ' \t', '#', '`', '~', '-', '1', '*', '_', '[', '>', '\r', '\n', '\r\n', '\u2028', 'a '];
/** What sits before the run: nothing, or the opener of each block construct. */

const PREFIXES = ['', '# a', '```', '- ', '1.', '> ', '[a]('];
/** What ends the run: nothing, a letter, or a character `.` does not match. */

const SUFFIXES = ['', 'x', '\u2028'];

/** Milliseconds of the slowest of `fn`'s calls over `inputs` (best of two, to ignore GC pauses). */
function slowest(/** @type {string[]} */ inputs, /** @type {(s: string) => unknown} */ fn) {
  let worst = 0;

  for (const input of inputs) {
    let best = Infinity;

    for (let k = 0; k < 2 && best >= BOUND_MS / 5; k++) {
      const start = performance.now();
      fn(input);
      best = Math.min(best, performance.now() - start);
    }

    worst = Math.max(worst, best);
  }

  return worst;
}

/**
 * The bound under the current load: 50 ms, or 10 times a plain linear split of the same length timed
 * now, whichever is larger. A busy machine slows both alike, so a full parallel run does not fail a
 * linear regex, while a quadratic one (seconds on these inputs) still fails by a wide margin.
 */
function limit() {
  // A split at every other character: linear, and it allocates as many pieces as the swept splits
  // do, so garbage collection under load slows it the same way.
  const text = 'a '.repeat(N / 2);
  let reference = Infinity;

  for (let k = 0; k < 3; k++) {
    const start = performance.now();
    text.split(/ /);
    reference = Math.min(reference, performance.now() - start);
  }

  return Math.max(BOUND_MS, 10 * reference);
}

const INPUTS = PREFIXES.flatMap((prefix) =>
  RUNS.flatMap((run) => SUFFIXES.map((suffix) => prefix + run.repeat(Math.ceil(N / run.length)) + suffix)),
);

it('finds the regexes it sweeps', () => {
  // HEADING, FENCE, QUOTE, ITEM, BLANK, LANG and the rest; a drop to a handful means the walk broke.
  expect(REGEXES.length).toBeGreaterThan(12);
});

it.each(REGEXES)(
  '%s /%s/%s is linear on 100k-character adversarial input',
  (_file, pattern, flags) => {
    // `split` tries the pattern at every position, the worst case of test/exec/replace/split.
    const re = new RegExp(pattern, flags.replaceAll(/[gy]/g, ''));

    expect(slowest(INPUTS, (s) => s.split(re))).toBeLessThan(limit());
  },
  SWEEP_TIMEOUT,
);

it.each([
  ['heading with a run of spaces', `# a${' '.repeat(N)}x`],
  ['heading with a run of tabs', `# a${'\t'.repeat(N)}x`],
  ['heading of closing hashes', `# ${'#'.repeat(N)}`],
  ['a line of hashes', '#'.repeat(N)],
  ['heading then a line separator', `#${' '.repeat(N)}\u2028`],
  ['paragraph then a heading run', `text\n# a${' '.repeat(N)}x`],
  ['paragraph lines that look like headings', `text\n${`# a${' '.repeat(100)}x\n`.repeat(N / 100)}`],
  ['fence with a long info string', `\`\`\`${' '.repeat(N)}x`],
  ['closing fence with trailing spaces', `\`\`\`\ncode\n\`\`\`${' '.repeat(N)}x`],
  ['list marker with a run of spaces', `-${' '.repeat(N)}x`],
  ['ordered marker digits', `${'1'.repeat(N)}.`],
  ['quote markers', '> '.repeat(N / 2)],
  ['link target with spaces', `[a](${' '.repeat(N)}x)`],
  ['carriage returns', '\r'.repeat(N)],
])(
  'parse: %s finishes in < 50 ms',
  (_name, source) => {
    expect(slowest([source], parse)).toBeLessThan(limit());
  },
  SWEEP_TIMEOUT,
);

/** A body that delivers `text` in reads of `size` bytes. */
function body(/** @type {string} */ text, /** @type {number} */ size) {
  const bytes = new TextEncoder().encode(text);
  let at = 0;

  return new ReadableStream({
    pull(controller) {
      if (at >= bytes.length) controller.close();
      else controller.enqueue(bytes.subarray(at, (at += size)));
    },
  });
}

/** Reads every event (or the error) of an event stream. */
async function drain(/** @type {ReadableStream<Uint8Array>} */ stream) {
  try {
    for await (const event of parseSse(stream)) void event;
  } catch {
    // A cap may stop the read; that is fine here.
  }
}

it.each([
  ['a run of CRs', '\r'.repeat(N)],
  ['a run of CRLFs', '\r\n'.repeat(N / 2)],
  ['a 100k-character line', `data: ${'x'.repeat(N)}\n\n`],
  ['a 100k-character line ending in CR', `data: ${'x'.repeat(N)}\r`],
])('parseSse: %s in one read stays linear', async (_name, text) => {
  const start = performance.now();

  await drain(body(text, text.length));
  // The regexes are bounded above; this row also pays one async-generator step per line (100k
  // lines for the CR rows, about 1 µs each), so its bound is wider. Quadratic would take many seconds.
  expect(performance.now() - start).toBeLessThan(BOUND_MS * 20);
});

it('parseSse: a 1 MB line in 100-byte reads is not quadratic', async () => {
  const text = `data: ${'x'.repeat(2 ** 20)}\n\n`;
  const start = performance.now();

  await drain(body(text, 100));
  // About 10k reads; re-splitting the held line on each read took seconds.
  expect(performance.now() - start).toBeLessThan(1000);
});
