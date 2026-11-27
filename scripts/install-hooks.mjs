/**
 * `prepare` script (audit F8): installs the husky Git hooks (.husky/pre-commit runs lint-staged).
 * It never fails an install: CI, a checkout without .git (a tarball, a Docker build) and an install
 * without devDependencies all skip it quietly.
 */
import { existsSync } from 'node:fs';
import process from 'node:process';

const root = new URL('../', import.meta.url);

if (process.env.CI || !existsSync(new URL('.git', root))) process.exit(0);

try {
  const { default: husky } = await import('husky');
  const message = husky();

  if (message) console.warn(`husky: ${message}`);
} catch (error) {
  console.warn(`husky: Git hooks not installed (${error instanceof Error ? error.message : String(error)})`);
}
