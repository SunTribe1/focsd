/**
 * Visible-string guard (part of `pnpm check`, wave 20). Every string a component shows or announces
 * must come from a translation table, so this flags literal text in Lit `html`/`svg` templates:
 *
 * - text nodes that contain a letter outside `${…}`, and a string literal (or a `? :` / `||` branch
 *   of one) that is the whole of a `${…}` in text;
 * - the visible attributes (`aria-label`, `aria-description`, `aria-placeholder`, `aria-roledescription`,
 *   `aria-valuetext`, `title`, `placeholder`, `alt`, `label`, `summary`), quoted or not, and their
 *   `.property` bindings (`.placeholder`, `.ariaLabel`), whose value has a letter or a lettered literal hole;
 * - `setAttribute()` of one of those attributes with a lettered string literal, anywhere in the code;
 * - an assignment of a lettered string literal to one of their properties (`el.ariaLabel = 'Close'`,
 *   `el.title = …`) or to `textContent` / `innerText` (review item 130).
 *
 * Allowed files: `internal/localize.js`, `terms.js` in `@focsd-dev/ai` and `lucide-paths.js`.
 * Allowed lines: a comment `visible-string: <reason>` (a reason of four or more characters) on the
 * line of the finding or the line before it. Inside a template, use a hole:
 * `${/* visible-string: <reason> *\/ ''}`.
 *
 * Not detected: literals built by calls or held in variables first.
 */
import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { simple } from 'acorn-walk';
import { HOLE, extractTemplates, lineAt } from './lib/templates.mjs';
import { walk } from './lib/walk.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const PACKAGES = ['primitives', 'components', 'charts', 'data-grid', 'editor', 'ai'];
const ALLOWED_FILES = [/\/internal\/localize\.js$/, /\/packages\/ai\/src\/terms\.js$/, /\/lucide-paths\.js$/];
const MARKER = /visible-string:\s*(\S.*)$/;
const NAMES = 'aria-label|aria-description|aria-placeholder|aria-roledescription|aria-valuetext|title|placeholder|alt|label|summary';
const VISIBLE = new RegExp(`^(?:${NAMES})$`);

/** Properties that show or announce what is assigned to them. */
const VISIBLE_PROPERTIES = new Set([
  'ariaLabel',
  'ariaDescription',
  'ariaPlaceholder',
  'ariaRoleDescription',
  'ariaValueText',
  'title',
  'placeholder',
  'alt',
  'label',
  'summary',
  'textContent',
  'innerText',
]);

// A quoted value may contain `>`, so a tag is matched quote by quote.
const TAG = /<\/?[A-Za-z](?:"[^"]*"|'[^']*'|[^"'>])*>|<!--[\s\S]*?-->/g;

const ATTRIBUTE = new RegExp(
  `(?:^|\\s)(\\.?)(${NAMES}|aria(?:Label|Description|Placeholder|RoleDescription|ValueText))\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`,
  'g',
);

/** @param {string} text */
const hasLetter = (text) => /\p{L}/u.test(text.replaceAll(HOLE, '').replaceAll(/&#?\w+;/g, ''));

/**
 * The string literals an expression can evaluate to directly (a literal, or a branch of `? :`, `||`, `??`).
 * @param {any} node
 * @returns {string[]}
 */
function literalsOf(node) {
  if (!node) return [];

  if (node.type === 'Literal') return String(node.value) === node.value ? [node.value] : [];

  if (node.type === 'TemplateLiteral' && !node.expressions.length) return [node.quasis[0].value.cooked ?? ''];

  if (node.type === 'ConditionalExpression') return [...literalsOf(node.consequent), ...literalsOf(node.alternate)];

  if (node.type === 'LogicalExpression') return [...literalsOf(node.left), ...literalsOf(node.right)];

  return [];
}

/**
 * @typedef {{ line: number, kind: 'text' | 'attribute' | 'property', text: string }} Finding
 */

/**
 * Literal visible text in one template, with lines relative to the template start.
 * @param {string} text
 * @param {import('acorn').Expression[]} [expressions] The holes' expressions, in order.
 * @returns {Finding[]}
 */
function scanTemplate(text, expressions = []) {
  /** @type {Finding[]} */
  const found = [];
  /** @param {number} offset */
  const lineOf = (offset) => text.slice(0, offset).split('\n').length - 1;

  /** The lettered literals of each hole in `text.slice(from, to)`. @param {number} from @param {number} to */
  const holeLiterals = (from, to) => {
    const first = text.slice(0, from).split(HOLE).length - 1;
    const count = text.slice(from, to).split(HOLE).length - 1;

    return expressions.slice(first, first + count).flatMap((expression) => literalsOf(expression).filter((value) => hasLetter(value)));
  };

  let last = 0;

  /** @param {string} chunk @param {number} from */
  const addText = (chunk, from) => {
    const trimmed = chunk.trim();

    if (hasLetter(trimmed))
      found.push({ line: lineOf(from + chunk.indexOf(trimmed)), kind: 'text', text: trimmed.replaceAll(HOLE, '${…}') });

    for (const value of holeLiterals(from, from + chunk.length))
      found.push({ line: lineOf(from + chunk.indexOf(HOLE)), kind: 'text', text: `\${'${value}'}` });
  };

  for (const tag of text.matchAll(TAG)) {
    addText(text.slice(last, tag.index), last);
    last = tag.index + tag[0].length;

    if (tag[0].startsWith('<!--')) continue;

    for (const attribute of tag[0].matchAll(ATTRIBUTE)) {
      const [, dot, name] = attribute;
      const value = attribute[3] ?? attribute[4] ?? attribute[5];
      const from = tag.index + attribute.index;
      const line = lineOf(from);

      if (hasLetter(value)) found.push({ line, kind: 'attribute', text: `${dot}${name}="${value.replaceAll(HOLE, '${…}')}"` });

      for (const literal of holeLiterals(from, from + attribute[0].length))
        found.push({ line, kind: 'attribute', text: `${dot}${name}=\${'${literal}'}` });
    }
  }

  addText(text.slice(last), last);

  return found;
}

/**
 * `setAttribute('<visible attribute>', '<lettered literal>')` calls and lettered literals assigned to
 * visible properties.
 * @param {import('acorn').Program} ast
 * @param {string} source
 * @returns {Finding[]}
 */
function scanCalls(ast, source) {
  /** @type {Finding[]} */
  const found = [];

  simple(ast, {
    CallExpression(/** @type {any} */ node) {
      const [name, value] = node.arguments;

      if (node.callee.type !== 'MemberExpression' || node.callee.property.name !== 'setAttribute') return;

      if (name?.type !== 'Literal' || !VISIBLE.test(String(name.value))) return;

      for (const literal of literalsOf(value).filter((text) => hasLetter(text)))
        found.push({ line: lineAt(source, node.start), kind: 'attribute', text: `setAttribute('${name.value}', '${literal}')` });
    },
    AssignmentExpression(/** @type {any} */ node) {
      const { left, right } = node;

      if (left.type !== 'MemberExpression' || left.computed || !VISIBLE_PROPERTIES.has(left.property.name)) return;

      for (const literal of literalsOf(right).filter((text) => hasLetter(text)))
        found.push({ line: lineAt(source, node.start), kind: 'property', text: `.${left.property.name} = '${literal}'` });
    },
  });

  return found;
}

/**
 * @param {string} source
 * @returns {Finding[]} Findings not covered by a marker.
 */
export function findVisibleStrings(source) {
  const { templates, comments, ast } = extractTemplates(source, ['html', 'svg']);

  // A marker covers its own line and the next one, and needs a real reason.
  const marked = new Set(
    comments
      .filter(
        (comment) =>
          (MARKER.exec(comment.text)?.[1]
            .replace(/\*\/?$/, '')
            .trim().length ?? 0) >= 4,
      )
      .map((comment) => comment.line),
  );

  return [
    ...templates.flatMap((template) =>
      scanTemplate(template.text, template.expressions).map((finding) => ({ ...finding, line: template.line + finding.line })),
    ),
    ...scanCalls(ast, source),
  ]
    .filter(({ line }) => !marked.has(line) && !marked.has(line - 1))
    .toSorted((a, b) => a.line - b.line);
}

/**
 * @param {string} base Repository root.
 * @returns {string[]} One `file:line` message per finding.
 */
export function checkRepository(base = root) {
  return PACKAGES.flatMap((name) =>
    walk(`${base}packages/${name}/src`, ['.js'])
      .filter((file) => !ALLOWED_FILES.some((allowed) => allowed.test(file)))
      .flatMap((file) =>
        findVisibleStrings(readFileSync(file, 'utf8')).map(
          ({ line, kind, text }) => `${relative(base, file)}:${line} literal visible ${kind}: ${text}`,
        ),
      ),
  );
}

/** `--root <dir>` checks another tree (the CLI tests use a temporary one). */
const rootArgument = () => {
  const index = process.argv.indexOf('--root');

  return index > 0 ? `${resolve(process.argv[index + 1])}/` : root;
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const problems = checkRepository(rootArgument());

  if (problems.length) {
    console.error(
      `Literal visible strings (use a localize term, or mark with \`// visible-string: <reason>\`):\n${problems.map((p) => `  - ${p}`).join('\n')}`,
    );
    process.exitCode = 1;
  } else {
    console.log('✓ no literal visible strings in templates');
  }
}
