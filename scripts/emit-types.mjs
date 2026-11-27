/**
 * Emit a package's declaration files. Usage (from the package directory):
 *   node ../../scripts/emit-types.mjs
 *
 * 1. Delete `types/`: tsc never cleans its outDir, so a renamed module's old declaration (the
 *    pre-rename opn-* and ub-* files) would otherwise be published.
 * 2. Run `tsc -p tsconfig.types.json` (strict, so `| null` survives, and stripInternal).
 * 3. Drop the constructor-assigned properties tagged `@internal`, which stripInternal keeps. Only
 *    the strict single-line `_name: Type;` shape is removed; any other `@internal` fails the build.
 */
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { stripInternalMembers } from './lib/typings.mjs';

const require = createRequire(import.meta.url);

// TypeScript 7 is installed as @typescript/native; `typescript` is the 6.0 API that typescript-eslint needs.
const tsc = join(dirname(require.resolve('@typescript/native/package.json')), 'bin', 'tsc');

if (!existsSync('tsconfig.types.json')) {
  console.error(`tsconfig.types.json not found in ${process.cwd()}: run this from a package directory.`);
  process.exit(1);
}

rmSync('types', { recursive: true, force: true });

execFileSync(process.execPath, [tsc, '-p', 'tsconfig.types.json'], { stdio: 'inherit' });

for (const path of readdirSync('types', { recursive: true, encoding: 'utf8' })) {
  if (!path.endsWith('.d.ts')) continue;
  const file = join('types', path);
  const source = readFileSync(file, 'utf8');
  const stripped = stripInternalMembers(source, file);

  if (stripped !== source) writeFileSync(file, stripped);
}
