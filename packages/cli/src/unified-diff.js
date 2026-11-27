/**
 * A unified diff (the format of `diff -u` and `git diff`) of two texts, line by line, with three
 * lines of context and `@@ -start,count +start,count @@` hunk headers.
 */

const CONTEXT = 3;
const NO_EOL = '\\ No newline at end of file';

/**
 * @typedef {{ text: string, eol: boolean }} Line
 * @typedef {{ op: '+' | '-' | ' ', line: Line }} Op
 */

/**
 * The lines of a text; the last one records whether it ends with a newline.
 * @param {string} text
 * @returns {Line[]}
 */
function linesOf(text) {
  if (text === '') return [];
  const eol = text.endsWith('\n');
  const parts = (eol ? text.slice(0, -1) : text).split('\n');

  return parts.map((part, k) => ({ text: part, eol: eol || k < parts.length - 1 }));
}

/**
 * @param {Line} x
 * @param {Line} y
 */
const same = (x, y) => x.text === y.text && x.eol === y.eol;

/**
 * Longest-common-subsequence lengths of every pair of suffixes, `a[i..]` and `b[j..]`; 0 past
 * either end, where nothing is left in common.
 * @param {Line[]} a
 * @param {Line[]} b
 * @returns {(i: number, j: number) => number}
 */
function lcsTable(a, b) {
  const table = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  /** @type {(i: number, j: number) => number} */
  const cell = (i, j) => table[i]?.[j] ?? 0;

  // From the ends backwards: each cell reads the ones below and to the right of it.
  for (let i = a.length - 1; i >= 0; i -= 1) {
    const [x, row] = [a[i], table[i]];

    if (!x || !row) continue;

    for (let j = b.length - 1; j >= 0; j -= 1) {
      const y = b[j];

      if (y) row[j] = same(x, y) ? cell(i + 1, j + 1) + 1 : Math.max(cell(i + 1, j), cell(i, j + 1));
    }
  }

  return cell;
}

/**
 * Edit script from `a` to `b` (longest common subsequence), removals before additions.
 * @param {Line[]} a
 * @param {Line[]} b
 * @returns {Op[]}
 */
function edits(a, b) {
  const lcs = lcsTable(a, b);
  /** @type {Op[]} */
  const ops = [];
  let i = 0;
  let j = 0;

  while (i < a.length || j < b.length) {
    const [x, y] = [a[i], b[j]];

    if (x && y && same(x, y)) {
      ops.push({ op: ' ', line: x });
      i += 1;
      j += 1;
    } else if (x && (!y || lcs(i + 1, j) >= lcs(i, j + 1))) {
      ops.push({ op: '-', line: x });
      i += 1;
    } else if (y) {
      ops.push({ op: '+', line: y });
      j += 1;
    } else {
      // Both sides are holes (never so for lines split from text): step past them so the loop ends.
      i += 1;
      j += 1;
    }
  }

  return ops;
}

/**
 * `start,count` as diff writes it: `start` alone for one line, the line before for none.
 * @param {number} before lines of this side before the hunk
 * @param {number} count lines of this side in the hunk
 */
const range = (before, count) => {
  if (count === 1) return `${before + 1}`;

  return `${count ? before + 1 : before},${count}`;
};

/**
 * Groups of op indexes to show: every change with up to CONTEXT lines around it; groups closer
 * than that merge.
 * @param {Op[]} ops
 * @returns {[from: number, to: number][]}
 */
function hunks(ops) {
  const changed = ops.flatMap(({ op }, k) => (op === ' ' ? [] : [k]));
  /** @type {[from: number, to: number][]} */
  const groups = [];

  for (const k of changed) {
    const from = Math.max(0, k - CONTEXT);
    const to = Math.min(ops.length - 1, k + CONTEXT);
    const last = groups.at(-1);

    if (last && from <= last[1] + 1) last[1] = Math.max(last[1], to);
    else groups.push([from, to]);
  }

  return groups;
}

/**
 * Line diff as a unified diff with three lines of context; '' when equal.
 * @param {string} before
 * @param {string} after
 * @param {string} fromName
 * @param {string} toName
 */
export function unifiedDiff(before, after, fromName, toName) {
  if (before === after) return '';
  const ops = edits(linesOf(before), linesOf(after));
  /** @param {number} end @param {'+' | '-'} skip */
  const countBefore = (end, skip) => ops.slice(0, end).filter(({ op }) => op !== skip).length;
  const out = [`--- ${fromName}`, `+++ ${toName}`];

  for (const [from, to] of hunks(ops)) {
    const hunk = ops.slice(from, to + 1);
    const oldCount = hunk.filter(({ op }) => op !== '+').length;
    const newCount = hunk.filter(({ op }) => op !== '-').length;
    out.push(`@@ -${range(countBefore(from, '+'), oldCount)} +${range(countBefore(from, '-'), newCount)} @@`);

    for (const { op, line } of hunk) out.push(`${op}${line.text}`, ...(line.eol ? [] : [NO_EOL]));
  }

  return `${out.join('\n')}\n`;
}
