/**
 * The notes for a version's single GitHub release (`node scripts/release-notes.mjs 1.0.0`). Every
 * package shares one version, so the release covers them all: the packages' CHANGELOG.md entries
 * for that version, merged the way the docs changelog page merges them (a note shared by several
 * packages appears once).
 */
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mergeChangelogs, readChangelogs } from '../apps/docs/src/lib/changelog.js';

const KIND_HEADINGS = { Major: 'Major changes', Minor: 'Minor changes', Patch: 'Patch changes' };

/**
 * @param {import('../apps/docs/src/lib/changelog.js').Release[]} releases
 * @param {string} version
 * @returns {string} Markdown, or '' when no package lists the version.
 */
export function releaseNotes(releases, version) {
  const release = releases.find((r) => r.version === version);

  if (!release) return '';

  const sections = release.groups.map(({ kind, notes }) => {
    const items = notes.map(({ text }) => `- ${text.replaceAll('\n', '\n  ')}`);

    return `## ${KIND_HEADINGS[kind]}\n\n${items.join('\n')}`;
  });

  return [...sections, `Install: \`npm install @focsd-dev/components\`. Full history: https://focsd.dev/changelog/`].join('\n\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const version = process.argv[2] ?? '';
  const notes = releaseNotes(mergeChangelogs(readChangelogs(fileURLToPath(new URL('../packages/', import.meta.url)))), version);

  if (notes) {
    console.log(notes);
  } else {
    console.error(`No changelog entries for version "${version}".`);
    process.exitCode = 1;
  }
}
