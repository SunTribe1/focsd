/** Tagged-template extraction shared by the static guards (acorn, so strings and comments are never confused). */
import { parse } from 'acorn';
import { simple } from 'acorn-walk';

/** Stands in for a `${…}` expression while the template text is scanned. */
export const HOLE = '\u0000';

/**
 * @typedef {{ text: string, line: number, expressions: import('acorn').Expression[] }} Template
 * `text` has one HOLE per `${…}`; `expressions[i]` is the i-th hole's expression.
 */

/**
 * @param {string} source
 * @param {string[]} tags Tag names to collect, for example `['html', 'svg']`.
 * @returns {{ templates: Template[], comments: { line: number, text: string }[], ast: import('acorn').Program }}
 */
export function extractTemplates(source, tags) {
  /** @type {import('acorn').Comment[]} */
  const raw = [];
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module', onComment: raw });
  const comments = raw.map((comment) => ({ line: lineAt(source, comment.start), text: comment.value }));
  /** @type {Template[]} */
  const templates = [];

  simple(ast, {
    TaggedTemplateExpression(node) {
      const tag = node.tag.type === 'Identifier' ? node.tag.name : '';

      if (!tags.includes(tag)) return;
      const { quasis } = node.quasi;

      // Each `${…}` becomes one HOLE plus its own newlines, so line numbers inside the text stay true.
      const text = quasis
        .map((quasi, index) => {
          const next = quasis[index + 1];
          const gap = next ? source.slice(quasi.end, next.start).replaceAll(/[^\n]/g, '') : '';

          return quasi.value.raw + (next ? HOLE + gap : '');
        })
        .join('');

      templates.push({ text, line: lineAt(source, quasis[0].start), expressions: node.quasi.expressions });
    },
  });

  return { templates, comments, ast };
}

/**
 * 1-based line of `offset` in `source`.
 * @param {string} source
 * @param {number} offset
 * @returns {number}
 */
export const lineAt = (source, offset) => source.slice(0, offset).split('\n').length;
