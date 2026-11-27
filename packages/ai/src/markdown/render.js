// Builds DOM from the markdown AST with createElement, createTextNode and setAttribute only (R2):
// no innerHTML, insertAdjacentHTML, DOMParser or unsafeHTML, so it runs under a strict CSP with
// `require-trusted-types-for 'script'` and markup in the source can only ever become text.
import { normalize, parse } from './parse.js';

/**
 * @typedef {import('./parse.js').Block} Block
 * @typedef {import('./parse.js').TopBlock} TopBlock
 * @typedef {import('./inline.js').Inline} Inline
 * @typedef {{ text: string, blocks: { from: number, to: number, node: Node }[] }} RenderState
 */

/** Headings sit inside a message, so `#` is an h3 and nothing is ever an h1 or h2. */
const HEADING_OFFSET = 2;

const REL = 'noopener noreferrer nofollow';

/**
 * @param {Document} doc
 * @param {string} tag
 * @param {(Node | string)[]} children
 */
function el(doc, tag, children) {
  const node = doc.createElement(tag);

  for (const child of children) node.append(child);

  return node;
}

/**
 * @param {Inline[]} nodes
 * @param {Document} doc
 * @returns {(Node | string)[]}
 */
function inline(nodes, doc) {
  return nodes.map((n) => {
    if (n.type === 'text') return n.text;

    if (n.type === 'br') return doc.createElement('br');

    if (n.type === 'inlineCode') return el(doc, 'code', [n.text]);

    if (n.type === 'link') {
      const a = el(doc, 'a', inline(n.children, doc));

      a.setAttribute('href', n.href);
      a.setAttribute('rel', REL);

      return a;
    }

    return el(doc, n.type, inline(n.children, doc));
  });
}

/**
 * List items: a single paragraph renders inline (a tight item), anything else as blocks.
 * @param {Block[]} item
 * @param {Document} doc
 */
function listItem(item, doc) {
  const [only] = item;

  return el(doc, 'li', item.length === 1 && only?.type === 'paragraph' ? inline(only.children, doc) : item.map((b) => renderBlock(b, doc)));
}

/**
 * @param {{ lang: string, text: string }} block
 * @param {Document} doc
 */
function codeBlock(block, doc) {
  const pre = el(doc, 'pre', [el(doc, 'code', [block.text])]);

  pre.setAttribute('part', 'code');

  if (block.lang) pre.setAttribute('data-language', block.lang);

  return pre;
}

/**
 * Builds one block's element.
 * @param {Block} block
 * @param {Document} [doc]
 * @returns {HTMLElement}
 */
export function renderBlock(block, doc = document) {
  switch (block.type) {
    case 'heading':
      return el(doc, `h${Math.min(block.level + HEADING_OFFSET, 6)}`, inline(block.children, doc));
    case 'codeBlock':
      return codeBlock(block, doc);
    case 'blockquote':
      return el(
        doc,
        'blockquote',
        block.children.map((b) => renderBlock(b, doc)),
      );
    case 'list': {
      const list = el(
        doc,
        block.ordered ? 'ol' : 'ul',
        block.items.map((item) => listItem(item, doc)),
      );

      if (block.ordered && block.start !== 1) list.setAttribute('start', String(block.start));

      return list;
    }

    default:
      return el(doc, 'p', inline(block.children, doc));
  }
}

/**
 * Builds a fragment for parsed blocks.
 * @param {Block[]} blocks
 * @param {Document} [doc]
 * @returns {DocumentFragment}
 */
export function render(blocks, doc = document) {
  const fragment = doc.createDocumentFragment();

  for (const b of blocks) fragment.append(renderBlock(b, doc));

  return fragment;
}

/**
 * Updates a code block's node in place when `next` is the same code block, grown (same start and
 * language): only its code text changes. Returns whether it did.
 * @param {RenderState['blocks'][number]} was
 * @param {TopBlock} next
 */
function grows(was, next) {
  const pre = /** @type {Element} */ (was.node);

  if (
    next.type !== 'codeBlock' ||
    was.from !== next.from ||
    pre.nodeName !== 'PRE' ||
    (pre.getAttribute('data-language') ?? '') !== next.lang
  )
    return false;

  // The block's own `code` (decorations beside it hold none).
  const code = pre.querySelector('code');

  if (code) code.textContent = next.text;

  return Boolean(code);
}

/**
 * The old blocks (from the restart point) whose nodes the new parse can keep, in order: those
 * whose range is unchanged, except the old last one, then a code block that grew in place.
 * @param {RenderState['blocks']} open
 * @param {TopBlock[]} blocks
 * @returns {RenderState['blocks']}
 */
function reusable(open, blocks) {
  let i = 0;

  while (i < open.length - 1 && open[i]?.from === blocks[i]?.from && open[i]?.to === blocks[i]?.to) i++;

  const kept = open.slice(0, i);
  const was = open[i];
  const next = blocks[i];

  return was && next && grows(was, next) ? [...kept, { from: next.from, to: next.to, node: was.node }] : kept;
}

/**
 * Renders markdown into `container`, streaming-safe: pass the state from the previous call. When
 * the new text extends the old one:
 * - Parsing restarts at the second-to-last old block. Appending can change only the last block
 *   and, through that block's first line, where the one before it ends; every earlier block is
 *   final, so a frame costs the size of the tail, not of the whole text.
 * - Every block except the old last one whose source range is unchanged keeps its node
 *   (selection and focus inside it survive).
 * - A code block that is still growing keeps its `pre` and only its code text changes, so
 *   anything added to it (a copy button) is not rebuilt each frame.
 * Otherwise the container is rebuilt. The container's children are owned by this function.
 * @param {Element | DocumentFragment} container
 * @param {string} text
 * @param {RenderState} [prev]
 * @returns {RenderState}
 */
export function renderMarkdown(container, text, prev) {
  const source = normalize(text);
  const doc = container.ownerDocument ?? document;
  const old = prev && source.startsWith(prev.text) ? prev.blocks : [];
  const fixed = Math.max(0, old.length - 2);
  const base = fixed ? (old[fixed]?.from ?? 0) : 0;
  const blocks = parse(source.slice(base)).map((b) => ({ ...b, from: b.from + base, to: b.to + base }));
  const kept = [...old.slice(0, fixed), ...reusable(old.slice(fixed), blocks)];
  // Kept nodes are a prefix of the children: drop everything after the last one.
  const last = kept.at(-1)?.node ?? null;

  while (container.lastChild && container.lastChild !== last) container.lastChild.remove();

  const fresh = blocks.slice(kept.length - fixed).map((b) => ({ from: b.from, to: b.to, node: renderBlock(b, doc) }));

  for (const b of fresh) container.append(b.node);

  return { text: source, blocks: [...kept, ...fresh] };
}

/**
 * @param {Inline[]} nodes
 * @returns {string}
 */
const inlineText = (nodes) => nodes.map((n) => ('children' in n ? inlineText(n.children) : n.type === 'br' ? '\n' : n.text)).join('');

/**
 * @param {Block} block
 * @returns {string}
 */
function blockText(block) {
  if (block.type === 'codeBlock') return block.text;

  if (block.type === 'blockquote') return block.children.map(blockText).join('\n');

  if (block.type === 'list') return block.items.map((item) => item.map(blockText).join('\n')).join('\n');

  return inlineText(block.children);
}

/**
 * The plain text of markdown (no markup characters), for announcements and copy.
 * @param {string} text
 * @returns {string}
 */
export const plainText = (text) => parse(text).map(blockText).join('\n');
