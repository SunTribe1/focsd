/**
 * Logical-properties guard (part of `pnpm check`, wave 20). Component CSS must follow the writing
 * direction, so this flags physical properties in `css` templates and `.css` files under
 * `packages/*\/src`:
 *
 * - `margin-left|right`, `padding-left|right`, `border-left|right` (and `-width|-style|-color`), `inset-left|right`;
 * - `left:` and `right:`;
 * - `border-top|bottom-left|right-radius`, and a `border-radius` whose left and right corners differ;
 * - `scroll-margin|padding-left|right`;
 * - `text-align`, `float` and `clear` with `left` or `right`;
 * - `transform-origin`, `perspective-origin`, `background-position` and `object-position` with `left` or `right`;
 * - four-value `margin`, `padding`, `inset`, `border-width|style|color` and `scroll-margin|padding`
 *   whose second and fourth values differ (`inset: 0 auto auto 0`).
 *
 * Allowed: a comment `/* physical: <reason> *\/` on the line of the finding or the line before it.
 * SVG coordinate attributes are not CSS and are never scanned. Corner values of `border-radius`
 * shorthands are not detected.
 */
import { readFileSync } from 'node:fs';

import process from 'node:process';
import { relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { extractTemplates } from './lib/templates.mjs';
import { walk } from './lib/walk.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const MARKER = /\/\*\s*physical:\s*[^\s*]/;

const PHYSICAL = [
  /(?<![\w-])(?:scroll-margin|scroll-padding|margin|padding|border|inset)-(?:left|right)(?:-(?:width|style|color))?\s*:/,
  /(?<![\w-])border-(?:top|bottom)-(?:left|right)-radius\s*:/,
  /(?<![\w-])(?:left|right)\s*:/,
  /(?<![\w-])(?:text-align|float|clear)\s*:\s*(?:left|right)\b/,
  /(?<![\w-])(?:transform-origin|perspective-origin|background-position(?:-x)?|object-position)\s*:[^;}]*\b(?:left|right)\b/,
];

const SHORTHAND = /(?<![\w-])(?:scroll-margin|scroll-padding|margin|padding|inset|border-width|border-style|border-color)\s*:\s*([^;}]+)/g;

/**
 * The space-separated values of a declaration, keeping `var(--a, 1px)` and `calc((a - b) / 2)` whole.
 * @param {string} value
 * @returns {string[]}
 */
function splitValues(value) {
  /** @type {string[]} */
  const values = [];
  let depth = 0;
  let current = '';

  for (const char of `${value.trim().replace(/\s*!important$/, '')} `) {
    depth += char === '(' ? 1 : char === ')' ? -1 : 0;

    if (/\s/.test(char) && depth === 0) {
      if (current) values.push(current);
      current = '';
    } else current += char;
  }

  return values;
}

/**
 * Whether a line has a four-value box shorthand whose left and right values differ.
 * @param {string} text
 * @returns {boolean}
 */
function asymmetricShorthand(text) {
  return [...text.matchAll(SHORTHAND)].some(([, value]) => {
    const values = splitValues(value);

    return values.length === 4 && values[1] !== values[3];
  });
}

const RADIUS = /(?<![\w-])border-radius\s*:\s*([^;}]+)/g;

/**
 * Whether a line has a `border-radius` whose left and right corners differ (it does not mirror in
 * right-to-left text). Corners: top-left, top-right, bottom-right, bottom-left; with fewer values,
 * the missing ones copy their opposites. Only the horizontal radii (before `/`) are compared.
 * @param {string} text
 * @returns {boolean}
 */
function asymmetricRadius(text) {
  return [...text.matchAll(RADIUS)].some(([, value]) => {
    const [a, b = a, c = a, d = b] = splitValues(value.split('/')[0] ?? '');

    return a !== b || c !== d;
  });
}

/**
 * @param {string} css CSS text (a template body or a stylesheet).
 * @param {number} [firstLine] Line number of the first line of `css`.
 * @returns {{ line: number, text: string }[]} Findings not covered by a marker.
 */
export function findPhysical(css, firstLine = 1) {
  const lines = css.split('\n');

  return lines.flatMap((text, index) => {
    if (!PHYSICAL.some((pattern) => pattern.test(text)) && !asymmetricShorthand(text) && !asymmetricRadius(text)) return [];

    if (MARKER.test(text) || (index > 0 && MARKER.test(lines[index - 1]))) return [];

    return [{ line: firstLine + index, text: text.trim() }];
  });
}

/**
 * @param {string} source JavaScript source: every `css` template is scanned.
 * @returns {{ line: number, text: string }[]}
 */
export function findPhysicalInScript(source) {
  return extractTemplates(source, ['css']).templates.flatMap((template) => findPhysical(template.text, template.line));
}

/**
 * @param {string} base Repository root.
 * @returns {string[]} One `file:line` message per finding.
 */
export function checkRepository(base = root) {
  const dirs = ['primitives', 'components', 'charts', 'data-grid', 'editor', 'ai', 'tokens'].map((name) => `${base}packages/${name}/src`);

  return dirs.flatMap((dir) =>
    walk(dir, ['.js', '.css']).flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      const found = file.endsWith('.css') ? findPhysical(source) : findPhysicalInScript(source);

      return found.map(({ line, text }) => `${relative(base, file)}:${line} physical property: ${text}`);
    }),
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
      `Physical CSS properties (use logical ones, or mark with \`/* physical: <reason> */\`):\n${problems.map((p) => `  - ${p}`).join('\n')}`,
    );
    process.exitCode = 1;
  } else {
    console.log('✓ no physical CSS properties');
  }
}
