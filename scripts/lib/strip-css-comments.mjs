/**
 * Removes the comments inside Lit `css` tagged templates, and nothing else. A comment in a CSS
 * string is text the browser parses and every bundler keeps (minifiers do not look inside template
 * strings), so it costs every page that loads the component. The JavaScript stays as written:
 * its comments, names and layout are untouched, and the application's build minifies it (audit F5).
 */
import { parse } from 'acorn';
import { full } from 'acorn-walk';

const COMMENT = /\/\*[\s\S]*?\*\//g;

/**
 * @param {string} code A JavaScript module.
 * @returns {string} The same module with the comments in its `css` templates removed.
 */
export function stripCssComments(code) {
  if (!code.includes('css`')) return code;

  /** @type {{ start: number, end: number }[]} */
  const spans = [];

  full(parse(code, { ecmaVersion: 'latest', sourceType: 'module' }), (node) => {
    if (node.type !== 'TaggedTemplateExpression') return;

    const { tag, quasi } = /** @type {any} */ (node);

    if (tag.type === 'Identifier' && tag.name === 'css') for (const part of quasi.quasis) spans.push({ start: part.start, end: part.end });
  });

  // From the end, so earlier offsets stay valid. A comment never spans an interpolation, so each
  // static part is cleaned on its own; a line left holding only a comment is removed with it.
  return spans
    .toSorted((a, b) => b.start - a.start)
    .reduce((out, { start, end }) => {
      const text = out
        .slice(start, end)
        .replaceAll(/^[ \t]*\/\*[\s\S]*?\*\/[ \t]*\n/gm, '')
        .replaceAll(COMMENT, '');

      return out.slice(0, start) + text + out.slice(end);
    }, code);
}
