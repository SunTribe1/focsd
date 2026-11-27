/**
 * The release notes for the changelog page, read from every published package's CHANGELOG.md
 * (written by Changesets at each release). All packages share one version, so entries are merged by
 * version and change type, and a note shared by several packages appears once with all their names.
 */
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** @typedef {'Major' | 'Minor' | 'Patch'} Kind */
/** @typedef {{ text: string, packages: string[] }} Note */
/** @typedef {{ version: string, groups: { kind: Kind, notes: Note[] }[] }} Release */

const KINDS = /** @type {const} */ (['Major', 'Minor', 'Patch']);

/**
 * One package's changelog as `{ version, kind, text }` entries. Dependency-bump notes are dropped:
 * every package moves in lockstep, so they say nothing.
 * @param {string} markdown
 * @returns {{ version: string, kind: Kind, text: string }[]}
 */
export function parseChangelog(markdown) {
  /** @type {{ version: string, kind: Kind, text: string }[]} */
  const entries = [];
  let version = '';
  /** @type {Kind | ''} */
  let kind = '';
  /** @type {string[] | null} */
  let item = null;

  const flush = () => {
    if (item && version && kind) {
      const text = item.join('\n').trim();

      if (text && !text.startsWith('Updated dependencies')) entries.push({ version, kind, text });
    }

    item = null;
  };

  for (const line of markdown.split('\n')) {
    const heading = /^(#{2,3}) (.+)$/.exec(line);

    if (heading) {
      flush();

      if (heading[1] === '##') version = heading[2].trim();
      else kind = /** @type {Kind | ''} */ (KINDS.find((k) => heading[2].startsWith(k)) ?? '');
      continue;
    }

    if (line.startsWith('- ')) {
      flush();
      item = [line.slice(2)];
    } else if (item) item.push(line.replace(/^ {2}/, ''));
  }

  flush();

  return entries;
}

/**
 * Newest first, by Semantic Versioning precedence: numbers compare numerically, and a release
 * (`1.0.0`) ranks above its pre-releases (`1.0.0-beta.2`).
 * @param {string} a
 * @param {string} b
 */
function byVersionDesc(a, b) {
  const [coreA = '', preA = ''] = a.split('-', 2);
  const [coreB = '', preB = ''] = b.split('-', 2);
  const core = coreB.localeCompare(coreA, 'en', { numeric: true });

  if (core || preA === preB) return core;

  if (!preA) return -1;

  if (!preB) return 1;

  return preB.localeCompare(preA, 'en', { numeric: true });
}

/**
 * Merges the packages' entries by version, newest first.
 * @param {{ name: string, markdown: string }[]} changelogs
 * @returns {Release[]}
 */
export function mergeChangelogs(changelogs) {
  /** @type {Map<string, Map<Kind, Map<string, string[]>>>} */
  const versions = new Map();

  for (const { name, markdown } of changelogs) {
    for (const { version, kind, text } of parseChangelog(markdown)) {
      const kinds = versions.get(version) ?? new Map();
      const notes = kinds.get(kind) ?? new Map();

      notes.set(text, [...(notes.get(text) ?? []), name]);
      kinds.set(kind, notes);
      versions.set(version, kinds);
    }
  }

  return [...versions.keys()].toSorted(byVersionDesc).map((version) => {
    const kinds = versions.get(version) ?? new Map();

    return {
      version,
      groups: KINDS.flatMap((kind) => {
        const notes = kinds.get(kind);

        return notes ? [{ kind, notes: [...notes].map(([text, packages]) => ({ text, packages: packages.toSorted() })) }] : [];
      }),
    };
  });
}

/**
 * Every published package's changelog under `packagesDir`.
 * @param {string} packagesDir
 * @returns {{ name: string, markdown: string }[]}
 */
export function readChangelogs(packagesDir) {
  return readdirSync(packagesDir)
    .map((dir) => join(packagesDir, dir))
    .filter((dir) => existsSync(join(dir, 'CHANGELOG.md')) && existsSync(join(dir, 'package.json')))
    .map((dir) => ({
      name: JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).name,
      markdown: readFileSync(join(dir, 'CHANGELOG.md'), 'utf8'),
    }));
}

/** @param {string} text */
const escapeHtml = (text) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

/**
 * A changeset note's inline Markdown (code, bold, links, nested bullets) as HTML. Notes are written by
 * this repository's contributors, and the text is escaped before any markup is added.
 * @param {string} text
 * @returns {string}
 */
export function noteHtml(text) {
  const inline = (/** @type {string} */ line) =>
    escapeHtml(line)
      .replaceAll(/`([^`]+)`/g, '<code>$1</code>')
      .replaceAll(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replaceAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/(?!\/)[^)\s]*)\)/g, '<a href="$2">$1</a>');

  const [first = '', ...rest] = text.split('\n');
  const bullets = rest.filter((line) => /^\s*- /.test(line)).map((line) => `<li>${inline(line.replace(/^\s*- /, ''))}</li>`);
  const prose = rest.filter((line) => line.trim() && !/^\s*- /.test(line)).map((line) => ` ${inline(line.trim())}`);

  return `${inline(first)}${prose.join('')}${bullets.length ? `<ul>${bullets.join('')}</ul>` : ''}`;
}
