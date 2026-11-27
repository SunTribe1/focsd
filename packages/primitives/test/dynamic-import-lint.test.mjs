// Size budgets count only what a page loads up front, so a dynamic import() would move code out of
// every budget unseen. Lint allows it in one place, the icon registry's sanitizer loader
// (quality B11 fix round 1, I2).
import { ESLint } from 'eslint';
import { expect, it } from 'vitest';

// The first lintText call loads the whole repo config (typed plugins included): seconds under load.
const LINT_TIMEOUT = 30_000;

const eslint = new ESLint({ cwd: new URL('../../../', import.meta.url).pathname });
const planted = "export const load = () => import('./elsewhere.js');\n";

/** @param {string} filePath */
const dynamicImportErrors = async (filePath) => {
  const [result] = await eslint.lintText(planted, { filePath });

  return result.messages.filter((m) => m.ruleId === 'no-restricted-syntax');
};

it.each(['packages/primitives/src/internal/planted.js', 'packages/components/src/focsd-planted.js', 'packages/data-grid/src/planted.js'])(
  'a dynamic import in %s fails lint',
  async (file) => {
    expect(await dynamicImportErrors(file)).toHaveLength(1);
  },
  LINT_TIMEOUT,
);

it(
  'the icon registry may load its sanitizer lazily',
  async () => {
    expect(await dynamicImportErrors('packages/primitives/src/internal/icons.js')).toEqual([]);
  },
  LINT_TIMEOUT,
);
