import { beforeAll, describe, expect, it } from 'vitest';
import { ESLint } from 'eslint';

// The restricted-imports rule for packages/cli/blocks/** (wave 19, R6). Each case lints a planted
// import under a block path; without the rule in eslint.config.js the forbidden ones report nothing.

const eslint = new ESLint({ cwd: new URL('../../..', import.meta.url).pathname });

/** @param {string} code */
async function ruleIds(code) {
  const [result] = await eslint.lintText(code, { filePath: 'packages/cli/blocks/demo/demo.js' });

  return result.messages.map((m) => m.ruleId);
}

// ESLint loads the whole repository config (TypeScript, Astro and the rest) on its first lint, which
// can take longer than the default 5 s on a busy machine. Load it once up front, with room to do so.
beforeAll(() => eslint.lintText('', { filePath: 'packages/cli/blocks/demo/demo.js' }), 60_000);

describe('blocks import only public entry points', { timeout: 30_000 }, () => {
  it.each([
    "import '@focsd-dev/primitives/internal/icons.js';\n",
    "import '@focsd-dev/components/internal';\n",
    "import '../../../components/src/focsd-button.js';\n",
    "import '@focsd-dev/charts/src/chart.js';\n",
    "import '@focsd-dev/components/dist/x.js';\n",
    "import '@focsd-dev/tokens/lib/resolved.mjs';\n",
    "await import('@focsd-dev/primitives/internal/icons.js');\n",
    "await import('../../../components/src/focsd-button.js');\n",
    "await import('@focsd-dev/charts/dist/chart.js');\n",
  ])('refuses %s', async (line) => {
    expect((await ruleIds(line)).some((id) => id === 'no-restricted-imports' || id === 'no-restricted-syntax')).toBe(true);
  });

  it.each([
    "import '@focsd-dev/components/focsd-button.js';\n",
    "await import('@focsd-dev/components/focsd-button.js');\n",
    "import '@focsd-dev/charts';\n",
    "import '@focsd-dev/data-grid';\n",
  ])('allows %s', async (line) => {
    expect(await ruleIds(line)).not.toEqual(expect.arrayContaining(['no-restricted-imports']));
    expect(await ruleIds(line)).not.toContain('no-restricted-syntax');
  });

  it('does not restrict code outside the blocks folder', async () => {
    const [result] = await eslint.lintText("import '../src/cli.js';\n", { filePath: 'packages/cli/test/x.test.mjs' });

    expect(result.messages.map((m) => m.ruleId)).not.toContain('no-restricted-imports');
  });
});
