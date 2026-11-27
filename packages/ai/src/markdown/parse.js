// Block markdown: paragraphs, headings, fenced code, blockquotes and lists (R2). Lines are read
// once per nesting level, and nesting is capped (quotes 3 deep, lists 2 deep), so a 1,000-level
// input cannot overflow the stack: past the cap the markers stay as paragraph text.
import { parseInline } from './inline.js';

/**
 * @typedef {import('./inline.js').Inline} Inline
 * @typedef {{ type: 'paragraph', children: Inline[] }
 *   | { type: 'heading', level: number, children: Inline[] }
 *   | { type: 'codeBlock', lang: string, text: string }
 *   | { type: 'blockquote', children: Block[] }
 *   | { type: 'list', ordered: boolean, start: number, items: Block[][] }} Block
 * @typedef {Block & { from: number, to: number }} TopBlock A top-level block with its source range.
 * @typedef {{ quote: number, list: number }} Depth
 */

const MAX_QUOTE = 3;
const MAX_LIST = 2;

const FENCE = /^ {0,3}(`{3,}|~{3,})[ \t]*([^\s`]*)/;

// Linear: the closing `#` sequence is stripped in code (`headingText`), not by the regex. A lazy
// body followed by optional trailing groups backtracks quadratically on a long run of spaces.
const HEADING = /^ {0,3}(#{1,6})(?:[ \t]+([\s\S]*))?$/;

const QUOTE = /^ {0,3}> ?/;
const ITEM = /^ {0,3}(?:([-*+])|(\d{1,9})[.)])(?:[ \t]+|$)/;
const BLANK = /^[ \t]*$/;
const LANG = /^[\w#+.-]{1,32}$/;

/**
 * A heading's text without trailing spaces and the optional closing run of `#` (which must
 * follow a space, or be the whole text), found by scanning back once.
 * @param {string} body
 */
function headingText(body) {
  const text = body.trimEnd();
  let end = text.length;

  while (text[end - 1] === '#') end--;

  return (end && !/[ \t]/.test(text[end - 1] ?? '') ? text : text.slice(0, end)).trimEnd();
}

/** @param {string} line */
const indentOf = (line) => /** @type {RegExpMatchArray} */ (line.match(/^ */))[0].length;

/**
 * @param {string} line
 * @param {Depth} depth
 */
function startsBlock(line, depth) {
  return (
    FENCE.test(line) || HEADING.test(line) || (depth.quote < MAX_QUOTE && QUOTE.test(line)) || (depth.list < MAX_LIST && ITEM.test(line))
  );
}

/**
 * @param {string[]} lines
 * @param {number} i
 * @returns {[Block, number]}
 */
function fenced(lines, i) {
  const [, fence = '', info = ''] = /** @type {RegExpMatchArray} */ (FENCE.exec(lines[i] ?? ''));
  const close = new RegExp(`^ {0,3}${fence[0] === '`' ? '`' : '~'}{${fence.length},}[ \\t]*$`);
  let end = i + 1;

  while (end < lines.length && !close.test(lines[end] ?? '')) end++;

  const text = lines.slice(i + 1, end).join('\n');

  // An unterminated fence runs to the end, so a streaming code block renders as code at once.
  return [{ type: 'codeBlock', lang: LANG.test(info) ? info : '', text }, Math.min(end + 1, lines.length)];
}

/**
 * @param {string[]} lines
 * @param {number} i
 * @param {Depth} depth
 * @returns {[Block, number]}
 */
function quote(lines, i, depth) {
  const inner = [];
  let end = i;

  for (; end < lines.length && QUOTE.test(lines[end] ?? ''); end++) inner.push((lines[end] ?? '').replace(QUOTE, ''));

  return [{ type: 'blockquote', children: parseBlocks(inner, { ...depth, quote: depth.quote + 1 }) }, end];
}

/**
 * @param {string[]} lines
 * @param {number} i
 * @param {Depth} depth
 * @returns {[Block, number]}
 */
function paragraph(lines, i, depth) {
  const text = [lines[i] ?? ''];
  let end = i + 1;

  for (; end < lines.length && !BLANK.test(lines[end] ?? '') && !startsBlock(lines[end] ?? '', depth); end++) {
    text.push((lines[end] ?? '').replace(/^[ \t]+/, ''));
  }

  return [{ type: 'paragraph', children: parseInline(text.join('\n').trim()) }, end];
}

/**
 * @param {string[]} lines
 * @param {number} i
 * @param {Depth} depth
 * @returns {[Block, number]}
 */
function blockAt(lines, i, depth) {
  const line = lines[i] ?? '';
  const heading = HEADING.exec(line);

  if (FENCE.test(line)) return fenced(lines, i);

  if (heading) return [{ type: 'heading', level: (heading[1] ?? '#').length, children: parseInline(headingText(heading[2] ?? '')) }, i + 1];

  if (depth.quote < MAX_QUOTE && QUOTE.test(line)) return quote(lines, i, depth);

  if (depth.list < MAX_LIST && ITEM.test(line)) return list(lines, i, depth);

  return paragraph(lines, i, depth);
}

/**
 * Parses lines into blocks; each block records the line range it came from.
 * @param {string[]} lines
 * @param {Depth} depth
 * @returns {(Block & { first: number, last: number })[]}
 */
function parseRanges(lines, depth) {
  const blocks = [];

  for (let i = 0; i < lines.length;) {
    if (BLANK.test(lines[i] ?? '')) {
      i++;
      continue;
    }

    const [block, next] = blockAt(lines, i, depth);

    blocks.push({ ...block, first: i, last: next - 1 });
    i = next;
  }

  return blocks;
}

/**
 * @param {string[]} lines
 * @param {Depth} depth
 * @returns {Block[]}
 */
export function parseBlocks(lines, depth) {
  return parseRanges(lines, depth).map(({ first: _first, last: _last, ...block }) => /** @type {Block} */ (block));
}

/**
 * Collects one list item's lines (indent removed) starting at `i`.
 * @param {string[]} lines
 * @param {number} i
 * @param {Depth} depth
 * @returns {[string[], number]}
 */
function itemLines(lines, i, depth) {
  const first = lines[i] ?? '';
  const marker = /** @type {RegExpMatchArray} */ (ITEM.exec(first))[0];
  const own = [first.slice(marker.length)];
  let end = i + 1;

  for (; end < lines.length; end++) {
    const line = lines[end] ?? '';
    const indent = indentOf(line);
    const lazy = !BLANK.test(line) && !BLANK.test(lines[end - 1] ?? '') && !startsBlock(line, depth);

    if (BLANK.test(line) && indentOf(lines[end + 1] ?? '') < 2) break;

    if (!BLANK.test(line) && indent < 2 && !lazy) break;
    own.push(line.slice(Math.min(indent, marker.length)));
  }

  return [own, end];
}

/**
 * @param {string[]} lines
 * @param {number} i
 * @param {Depth} depth
 * @returns {[Block, number]}
 */
function list(lines, i, depth) {
  const head = /** @type {RegExpMatchArray} */ (ITEM.exec(lines[i] ?? ''));
  const ordered = head[1] === undefined;
  const items = [];
  const inner = { ...depth, list: depth.list + 1 };
  let end = i;

  for (;;) {
    const [own, next] = itemLines(lines, end, depth);

    items.push(parseBlocks(own, inner));
    end = next;

    // A blank line between items keeps the list going.
    const after = BLANK.test(lines[end] ?? 'x') ? end + 1 : end;
    const match = ITEM.exec(lines[after] ?? '');

    if (!match || (match[1] === undefined) !== ordered) break;
    end = after;
  }

  return [{ type: 'list', ordered, start: ordered ? Number(head[2]) : 1, items }, end];
}

/**
 * Line endings as `\n`: the source ranges of `parse` count characters of this form.
 * @param {string} text
 */
export const normalize = (text) => String(text).replaceAll(/\r\n?/g, '\n');

/**
 * Parses markdown into top-level blocks, each with the `from`/`to` character range of its source,
 * so a streaming renderer can keep blocks whose source did not change.
 * @param {string} text
 * @returns {TopBlock[]}
 */
export function parse(text) {
  const lines = normalize(text).split('\n');
  /** @type {number[]} */
  const starts = [];
  let offset = 0;

  for (const line of lines) {
    starts.push(offset);
    offset += line.length + 1;
  }

  return parseRanges(lines, { quote: 0, list: 0 }).map(({ first, last, ...block }) => ({
    .../** @type {Block} */ (block),
    from: starts[first] ?? 0,
    to: (starts[last] ?? 0) + (lines[last] ?? '').length,
  }));
}
