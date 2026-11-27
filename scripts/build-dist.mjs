/**
 * Copies a package's src/ to dist/, file for file. Nothing is bundled or minified, as open-wc ("Do not
 * minify") and Lit ("Don't bundle, minify, or optimize") ask of published component packages: the
 * application's build optimizes the JavaScript (audit F5). The one change: comments inside `css`
 * templates are removed, since no application build can (they are string content), and every page
 * that loads a component would parse them (size pass, 2026-11-26).
 *
 * dist/ stays as its own folder so the published layout does not change: `exports` maps `default` (and
 * `main`/`module`) to dist/ and `development` to src/.
 *
 *   node ../../scripts/build-dist.mjs        (run from a package directory)
 */
import { cpSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import process from 'node:process';
import { stripCssComments } from './lib/strip-css-comments.mjs';

const root = process.cwd();
const dist = join(root, 'dist');

rmSync(dist, { recursive: true, force: true });

cpSync(join(root, 'src'), dist, { recursive: true });

for (const file of readdirSync(dist, { recursive: true }).map(String)) {
  if (!file.endsWith('.js')) continue;

  const path = join(dist, file);
  const code = readFileSync(path, 'utf8');
  const stripped = stripCssComments(code);

  if (stripped !== code) writeFileSync(path, stripped);
}

console.log(`✓ dist/ written for ${relative(join(root, '../..'), root)}`);
