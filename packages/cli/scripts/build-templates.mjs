/**
 * Copies the styled component sources and their manifest into templates/, so the published CLI
 * carries the exact files of its own version (the CLI and @focsd-dev/components are released together).
 *   node scripts/build-templates.mjs
 */
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { consumerFiles } from '../../../scripts/agent/consumer.mjs';

const components = new URL('../../components/', import.meta.url);
const templates = new URL('../templates/', import.meta.url);

rmSync(templates, { recursive: true, force: true });

mkdirSync(templates, { recursive: true });

cpSync(new URL('src/', components), templates, {
  recursive: true,
  filter: (src) => !src.endsWith('index.js') || !src.endsWith('/src/index.js'),
});

// `focsd add block <name>` is parsed before component names, so no component may be called "block".
const manifest = JSON.parse(readFileSync(new URL('custom-elements.json', components), 'utf8'));

const reserved = manifest.modules
  .flatMap((m) => (m.declarations ?? []).map((d) => d.tagName).filter(Boolean))
  .filter((tag) => tag === 'focsd-block');

if (reserved.length) throw new Error('"block" is a reserved word of `focsd add block`: rename the component focsd-block.');

cpSync(new URL('custom-elements.json', components), new URL('custom-elements.json', templates));

cpSync(new URL('package.json', components), new URL('components.package.json', templates));

// The `init --agent` sources, generated from the same manifest the docs site serves at /AGENTS.md.
const { agents, skill } = consumerFiles(components);

writeFileSync(new URL('AGENTS.md', templates), agents);

writeFileSync(new URL('SKILL.md', templates), skill);

console.log('✓ focsd templates copied from @focsd-dev/components');
