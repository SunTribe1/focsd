/**
 * Stale typings guard. `tsc` never cleans its outDir, so a declaration whose module was renamed or
 * deleted (the pre-rename opn-* and ub-* files) stays in `types/` and would be published, where the
 * `./*.js` export resolves it although no runtime file exists.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** @param {string} path */
const posix = (path) => path.replaceAll('\\', '/');

/** Written by scripts/type-integrations.mjs, not by tsc, so they have no source module. */
const GENERATED = new Set(['elements.d.ts', 'jsx.d.ts', 'react.d.ts', 'svelte.d.ts', 'vue.d.ts']);

/**
 * Declarations in `<packageDir>/types` with no `src` module (.js or .ts) of the same path.
 * @param {string} packageDir
 * @returns {string[]} Paths relative to the package, sorted, with forward slashes.
 */
export function orphanTypings(packageDir) {
  const types = join(packageDir, 'types');

  if (!existsSync(types)) return [];

  return readdirSync(types, { recursive: true, encoding: 'utf8' })
    .map(posix)
    .filter((path) => path.endsWith('.d.ts') && !GENERATED.has(path))
    .filter((path) => {
      const module = path.slice(0, -'.d.ts'.length);

      return !['.js', '.ts'].some((ext) => existsSync(join(packageDir, 'src', `${module}${ext}`)));
    })
    .map((path) => `types/${path}`)
    .toSorted();
}

/**
 * The only characters a removed member's type may use: an explicit allow-list with no brackets,
 * quotes, comments, `,`, `;`, `:`, `?`, `=`, tabs or non-ASCII, so nothing on the member line can
 * end the member, start another or hide one (`number`, `Array<Row> | null`, `A & B`).
 */
const ALLOWED_TYPE = /^[A-Za-z0-9_$.<>|& ]+$/;

/**
 * The only member shape the post-processor removes: one line, an `_name` property whose type is
 * ALLOWED_TYPE (`_open: boolean;`, `readonly _rows?: Array<Row> | null;`). Anything else after an
 * `@internal` comment is an error, so nothing is ever deleted by guesswork.
 */
const INTERNAL_MEMBER = /^[ \t]+(?:readonly )?_\w+\??: ([A-Za-z0-9_$.<>|& ]+);$/;

/**
 * A doc comment block that holds nothing but comment text: it opens with `/**` at the start of its
 * first line, closes with its only `*\/` at the end of its last line, and opens no other comment.
 */
const COMMENT_ONLY = /^[ \t]*\/\*\*(?:(?!\*\/|\/\*)[\s\S])*\*\/[ \t]*$/;

/** `@internal` as a JSDoc tag: the first word after `/**` or a leading `*`, ending at a space or `*\/`. */
const INTERNAL_TAG = /(?:^|\n)[ \t]*(?:\/\*\*|\*)[ \t]*@internal(?=\s|\*\/)/;

/** A doc comment opening its line. */
const OPENS_DOC = /^[ \t]*\/\*\*/;

/**
 * @param {string} file
 * @param {number} line 0-based.
 * @param {string} message
 */
const fail = (file, line, message) => new Error(`${file}:${line + 1}: ${message}`);

/**
 * The line where a doc comment that starts at `start` ends.
 * @param {string[]} lines
 * @param {number} start
 * @param {string} file
 */
function commentEnd(lines, start, file) {
  for (let end = start; end < lines.length; end++) if (lines[end].includes('*/')) return end;

  throw fail(file, start, 'unterminated doc comment');
}

/**
 * Split a declaration file into lines, with CRLF read as LF. Mixed or bare-CR line endings throw,
 * because they could not be written back unchanged.
 * @param {string} source
 * @param {string} file
 */
function splitLines(source, file) {
  const crlf = source.includes('\r');
  const lines = crlf ? source.split('\r\n') : source.split('\n');
  const stray = lines.findIndex((line) => /[\r\n]/.test(line));

  if (stray !== -1) throw fail(file, stray, 'mixed line endings; emit the file with one line ending');

  return { lines, eol: crlf ? '\r\n' : '\n' };
}

/**
 * @param {string} text
 * @param {number} index
 * @returns {number} The 0-based line of the character at `index`.
 */
const lineAt = (text, index) => text.slice(0, index).split('\n').length - 1;

const BACKTICK = 'a backtick outside a doc comment (a template literal type?) in a file with @internal; the stripper cannot read it';

/**
 * Throw at what a line-based reader cannot see through: U+2028/U+2029 (JS line terminators that
 * are not lines here) and a plain block comment (`/*` that is not `/**`), anywhere in the file.
 * @param {string} text The file with LF line endings.
 * @param {string} file
 */
function assertReadable(text, file) {
  const checks = [
    [/[\u2028\u2029]/, 'a U+2028/U+2029 line terminator in a file with @internal; remove it'],
    [/\/\*(?!\*)/, 'a plain /* comment in a file with @internal; use /** or //'],
  ];

  for (const [pattern, message] of /** @type {[RegExp, string][]} */ (checks)) {
    const match = pattern.exec(text);

    if (match) throw fail(file, lineAt(text, match.index), message);
  }
}

/**
 * Skip a '…' or "…" string or a `//` comment that starts at `start`, throwing at a backtick in it,
 * at a string that is unterminated or continued onto the next line.
 * @param {string} text
 * @param {number} start
 * @param {string} file
 * @returns {number} The index after it.
 */
function skipQuoted(text, start, file) {
  const comment = text[start] === '/';
  const stop = comment ? '\n' : text[start];

  for (let k = start + (comment ? 2 : 1); k < text.length; k++) {
    if (text[k] === stop) return k + 1;

    if (text[k] === '`') throw fail(file, lineAt(text, k), BACKTICK);

    if (!comment && text[k] === '\n') break;

    if (!comment && text[k] === '\\') {
      if (text[k + 1] === '\n') throw fail(file, lineAt(text, k), 'a string continued onto the next line in a file with @internal');
      k++;
    }
  }

  if (comment) return text.length;

  throw fail(file, lineAt(text, start), 'unterminated string');
}

/**
 * Offsets where doc comments start, from a left-to-right scan of the only tokens a declaration
 * file has that hide text: `/** … *\/` comments, `//` comments and '…'/"…" strings. A backtick
 * outside a doc comment throws (a template literal type can span lines and hold anything), and so
 * does an unterminated comment or string. Run after assertReadable, so every `/*` opens a doc comment.
 * @param {string} text The file with LF line endings.
 * @param {string} file
 * @returns {Set<number>}
 */
function docCommentStarts(text, file) {
  const starts = new Set();

  for (let i = 0; i < text.length;) {
    const two = text.slice(i, i + 2);

    if (two === '/*') {
      const close = text.indexOf('*/', i + 2);

      if (close === -1) throw fail(file, lineAt(text, i), 'unterminated doc comment');
      starts.add(i);
      i = close + 2;
    } else if (two === '//' || text[i] === "'" || text[i] === '"') {
      i = skipQuoted(text, i, file);
    } else if (text[i] === '`') {
      throw fail(file, lineAt(text, i), BACKTICK);
    } else {
      i++;
    }
  }

  return starts;
}

/**
 * Check an `@internal` comment (lines start..end) and the line after it, or throw with file:line.
 * @param {string[]} lines
 * @param {number} start
 * @param {number} end
 * @param {string} file
 */
function assertRemovable(lines, start, end, file) {
  const comment = lines.slice(start, end + 1).join('\n');

  if (!COMMENT_ONLY.test(comment)) {
    throw fail(file, end, `an @internal doc comment must stand on its own line(s), found: ${lines[end].trim()}`);
  }

  if (!INTERNAL_TAG.test(comment)) {
    throw fail(file, start, '@internal appears in a doc comment but not as a tag; reword it or tag the member');
  }

  const member = lines[end + 1];

  if (member === undefined || !INTERNAL_MEMBER.test(member)) {
    throw fail(
      file,
      end + (member === undefined ? 0 : 1),
      'an @internal comment must be followed by one single-line `_name: Type;` property whose type uses ' +
        `only [A-Za-z0-9_$.<>|& ] (give the type a named @typedef), found: ${member?.trim() ?? 'end of file'}`,
    );
  }
}

/**
 * Throw unless the removed lines are exactly the validated comment blocks and their member lines:
 * the counts add up, no line is both kept and removed, and every removed line is re-checked here
 * (each block is still COMMENT_ONLY with an INTERNAL_TAG and starts where the token scan found a
 * doc comment; each member is still an INTERNAL_MEMBER whose type passes ALLOWED_TYPE).
 * @param {string[]} lines
 * @param {{ kept: number[], removed: number[] }} split Indexes of the kept and the removed lines.
 * @param {{ start: number, member: number }[]} removals
 * @param {{ file: string, docStarts: Set<number> }} context
 */
function assertRemovedOnlyValidated(lines, { kept, removed }, removals, { file, docStarts }) {
  const allowed = new Set(removals.flatMap(({ start, member }) => Array.from({ length: member - start + 1 }, (_, k) => start + k)));
  /** @param {{ start: number, member: number }} removal */
  const block = ({ start, member }) => lines.slice(start, member).join('\n');
  /** @param {number} line */
  const docAt = (line) => docStarts.has(lines.slice(0, line).reduce((sum, text) => sum + text.length + 1, 0) + lines[line].indexOf('/**'));
  /** @param {string} line */
  const allowedType = (line) => ALLOWED_TYPE.test(INTERNAL_MEMBER.exec(line)?.[1] ?? '');

  const invalid = removals.find(
    (removal) =>
      !COMMENT_ONLY.test(block(removal)) ||
      !INTERNAL_TAG.test(block(removal)) ||
      !docAt(removal.start) ||
      !allowedType(lines[removal.member]),
  );

  const stray = removed.find((index) => !allowed.has(index));

  const counted =
    removed.length === allowed.size && new Set(removed).size === removed.length && kept.length + removed.length === lines.length;

  if (!counted || kept.some((index) => allowed.has(index)) || stray !== undefined || invalid) {
    throw fail(file, stray ?? invalid?.start ?? 0, 'internal error: the @internal stripper removed a line it did not validate');
  }
}

/**
 * Remove the properties tagged `@internal` that `tsc --stripInternal` keeps: the ones a JS
 * constructor assigns (`/** @internal *\/ this._open = false`), where Lit keeps its reactive state.
 * Only an `@internal` doc comment on its own line(s) followed by one INTERNAL_MEMBER line is
 * removed; any other `@internal` throws with file:line, and so does any `@internal` text left in
 * the result. A file with `@internal` also throws, at the offending character, when it holds a
 * backtick outside a doc comment (a template literal type), U+2028/U+2029 or a plain `/*` comment.
 * Give a tagged property a named `@typedef` whenever its type would emit on several lines or with
 * any character outside [A-Za-z0-9_$.<>|& ] (a comma, bracket, quote, `?:`, tab or non-ASCII
 * letter). CRLF files are read as LF and written back as CRLF.
 * @param {string} source A declaration file.
 * @param {string} [file] Its path, for error messages.
 * @returns {string}
 */
export function stripInternalMembers(source, file = 'declaration file') {
  if (!source.includes('@internal')) return source;
  const { lines, eol } = splitLines(source, file);
  const text = lines.join('\n');

  assertReadable(text, file);
  const docStarts = docCommentStarts(text, file);
  /** @type {number[]} */
  const kept = [];
  /** @type {number[]} */
  const removed = [];
  /** @type {{ start: number, member: number }[]} */
  const removals = [];

  for (let i = 0; i < lines.length; i++) {
    const opens = OPENS_DOC.test(lines[i]);
    const end = opens ? commentEnd(lines, i, file) : i;

    if (
      !opens ||
      !lines
        .slice(i, end + 1)
        .join('\n')
        .includes('@internal')
    ) {
      for (let k = i; k <= end; k++) kept.push(k);
      i = end;
      continue;
    }

    assertRemovable(lines, i, end, file);
    removals.push({ start: i, member: end + 1 });

    for (let k = i; k <= end + 1; k++) removed.push(k);
    i = end + 1;
  }

  assertRemovedOnlyValidated(lines, { kept, removed }, removals, { file, docStarts });
  const leftover = kept.find((index) => lines[index].includes('@internal'));

  if (leftover !== undefined) {
    throw fail(file, leftover, `@internal is left after stripping (a tag that does not start its line?): ${lines[leftover].trim()}`);
  }

  return kept.map((index) => lines[index]).join(eol);
}

const MODIFIERS = String.raw`^\s+(?:readonly |static |private |protected |get |set )*`;
const UNDERSCORE = new RegExp(`${MODIFIERS}_\\w+[(:?;]`, 'gm');
const IDS = new RegExp(`${MODIFIERS}ids\\??[:;]`, 'gm');

/** An exported object type (`export type X = {` … `};`): its keys are data shapes, such as an event detail. */
const TYPE_LITERAL = /^export type \w+ = \{$[\s\S]*?^\};$/gm;

/**
 * `_name` members and public `ids` fields in a declaration file.
 * @param {string} text
 */
function memberCounts(text) {
  const underscore = (text.match(UNDERSCORE) ?? []).length;
  const ids = (text.replaceAll(TYPE_LITERAL, '').match(IDS) ?? []).length;

  return { underscore, ids, total: underscore + ids };
}

/**
 * Members that look internal (`_name`, also untyped or `private`/`protected`) and public `ids`
 * fields in a package's typings, counted per file, for the ratchet
 * tests: each should be tagged `@internal` (or be a `#private` field).
 * @param {string} packageDir
 * @returns {Record<string, number>}
 */
export function underscoreMembers(packageDir) {
  const types = join(packageDir, 'types');

  if (!existsSync(types)) return {};

  return Object.fromEntries(
    readdirSync(types, { recursive: true, encoding: 'utf8' })
      .filter((path) => path.endsWith('.d.ts') && !GENERATED.has(posix(path)))
      .map((path) => [`types/${posix(path)}`, memberCounts(readFileSync(join(types, path), 'utf8')).total])
      .filter(([, count]) => count > 0),
  );
}

/**
 * Everything wrong with a package's built typings: stale declarations, `@internal` members that
 * survived, and more `_name` members in a file than its recorded debt allows.
 * @param {string} packageDir
 * @param {Record<string, number>} [debt] Allowed `_name` members per file (shrinks, never grows).
 * @returns {string[]}
 */
export function typingsProblems(packageDir, debt = {}) {
  const types = join(packageDir, 'types');

  if (!existsSync(types)) return ['types/ is missing: run `pnpm build` first'];

  const internal = readdirSync(types, { recursive: true, encoding: 'utf8' })
    .filter((path) => path.endsWith('.d.ts') && readFileSync(join(types, path), 'utf8').includes('@internal'))
    .map((path) => `types/${posix(path)} still declares a member tagged @internal`);

  const underscored = Object.entries(underscoreMembers(packageDir))
    .filter(([file, count]) => count > (debt[file] ?? 0))
    .map(([file, count]) => {
      const kinds = memberCounts(readFileSync(join(packageDir, file), 'utf8'));

      const advice = [
        ...(kinds.underscore ? ['tag `_name` members @internal'] : []),
        ...(kinds.ids ? ['make `ids` fields private'] : []),
      ].join(', ');

      return `${file} declares ${count} internal-looking member${count === 1 ? '' : 's'} (allowed: ${debt[file] ?? 0}): ${advice}`;
    });

  return [...orphanTypings(packageDir).map((file) => `${file} has no source module`), ...internal, ...underscored].toSorted();
}
