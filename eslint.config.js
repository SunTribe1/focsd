import js from '@eslint/js';
import globals from 'globals';
import lit from 'eslint-plugin-lit';
import litA11y from 'eslint-plugin-lit-a11y';
import wc from 'eslint-plugin-wc';
import astro from 'eslint-plugin-astro';
import prettier from 'eslint-config-prettier';
import unicorn from 'eslint-plugin-unicorn';
import importX from 'eslint-plugin-import-x';
import playwright from 'eslint-plugin-playwright';
import vitest from '@vitest/eslint-plugin';
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import tseslint from 'typescript-eslint';

/**
 * Lint debt (OD4, Q46, Q47). Each row is a file that breaks a ratchet rule today, held at its current
 * worst value so it cannot get worse. Lower a number, or delete the row, when the file is fixed; never
 * raise one. `props` means the file may still write to a parameter's properties: unlike the numeric
 * rows, a `props` row opens the whole file (ESLint has no per-file count for no-param-reassign), so new
 * property writes there are not caught here. A count ratchet for those files is planned in B16.
 */
const DEBT = {
  'apps/docs/e2e/theme-builder.spec.js': { 'no-param-reassign': 'props' }, // debt: Q47
  'apps/playground/e2e/consistent-inputs.spec.js': { 'max-lines-per-function': 102 }, // debt: Q46
  'apps/playground/e2e/fixtures/announcements.js': { 'max-lines-per-function': 85 }, // debt: Q46
  'apps/playground/e2e/parity-select.spec.js': { 'no-param-reassign': 'props' }, // debt: Q47
  'apps/playground/e2e/polish-select.spec.js': { 'no-param-reassign': 'props' }, // debt: Q47
  'apps/playground/e2e/select-family.spec.js': { 'max-lines-per-function': 67 }, // debt: Q46
  'apps/playground/src/react-main.jsx': { 'max-lines-per-function': 97 }, // debt: Q46
  'packages/charts/src/chart.js': { 'max-lines-per-function': 54 }, // debt: Q46
  'packages/charts/src/scale.js': { 'max-params': 6 }, // debt: Q46
  'packages/cli/src/project.js': { complexity: 16 }, // debt: Q46
  'packages/cli/test/cli.test.mjs': { 'max-lines-per-function': 103 }, // debt: Q46
  'packages/cli/test/merge.test.mjs': { 'max-lines-per-function': 51 }, // debt: Q46
  'packages/cli/test/paths.test.mjs': { 'max-lines-per-function': 70 }, // debt: Q46
  'packages/cli/test/project.test.mjs': { 'max-lines-per-function': 67 }, // debt: Q46
  'packages/components/test/manifest.test.mjs': { 'max-lines-per-function': 131 }, // debt: Q46
  'packages/components/test/typings.test.mjs': { 'max-lines-per-function': 152 }, // debt: Q46
  'packages/data-grid/src/engine/edit.js': { complexity: 16, 'max-params': 5 }, // debt: Q46
  'packages/data-grid/src/engine/pipeline.js': { 'max-lines-per-function': 58, 'max-params': 6 }, // debt: Q46
  'packages/data-grid/src/engine/state.js': { 'max-lines-per-function': 58, complexity: 18 }, // debt: Q46
  'packages/data-grid/src/grid.js': { complexity: 16 }, // debt: Q46
  'packages/data-grid/src/mixins/api.js': { 'max-lines-per-function': 106 }, // debt: Q46
  'packages/data-grid/src/mixins/columns.js': { 'max-lines-per-function': 119 }, // debt: Q46
  'packages/data-grid/src/mixins/editing.js': { 'max-lines-per-function': 175, complexity: 16 }, // debt: Q46
  'packages/data-grid/src/mixins/filters.js': { 'max-lines-per-function': 168 }, // debt: Q46
  'packages/data-grid/src/mixins/grouping.js': { 'max-lines-per-function': 77 }, // debt: Q46
  'packages/data-grid/src/view/filter-popover.js': { 'max-params': 5 }, // debt: Q46
  'packages/data-grid/src/view/header.js': { 'no-param-reassign': 'props' }, // debt: Q47
  'packages/data-grid/src/view/toolbar.js': { 'max-lines-per-function': 60 }, // debt: Q46
  'packages/data-grid/test/perf.test.mjs': { 'max-lines-per-function': 73 }, // debt: Q46
  'packages/data-grid/test/review-fixes.test.mjs': { 'max-lines-per-function': 90 }, // debt: Q46
  'packages/mcp/scripts/build-data.mjs': { 'max-params': 6 }, // debt: Q46
  'packages/mcp/src/core.js': { 'max-lines-per-function': 321, complexity: 18 }, // debt: Q46
  'packages/mcp/src/server.js': { 'max-lines-per-function': 146 }, // debt: Q46
  'packages/mcp/test/catalog.test.mjs': { 'max-lines-per-function': 79 }, // debt: Q46
  'packages/mcp/test/server.test.mjs': { 'max-lines-per-function': 68 }, // debt: Q46
  'packages/primitives/src/data/carousel-base.js': { 'no-param-reassign': 'props' }, // debt: Q47
  'packages/primitives/src/data/image-base.js': { complexity: 19 }, // debt: Q46
  'packages/primitives/src/data/tree-base.js': { complexity: 18 }, // debt: Q46
  'packages/primitives/src/data/virtual-list-base.js': { complexity: 18 }, // debt: Q46
  'packages/primitives/src/display/avatar-group-base.js': { 'no-param-reassign': 'props' }, // debt: Q47
  'packages/primitives/src/forms/toggle-group-base.js': { 'no-param-reassign': 'props' }, // debt: Q47
  'packages/primitives/src/inputs/calendar-base.js': { complexity: 16 }, // debt: Q46
  'packages/primitives/src/inputs/color-picker-base.js': { 'max-params': 6, 'max-lines-per-function': 81 }, // debt: Q46
  'packages/primitives/src/inputs/combobox-base.js': { complexity: 20 }, // debt: Q46
  'packages/primitives/src/inputs/date-picker-base.js': { 'no-param-reassign': 'props' }, // debt: Q47
  'packages/primitives/src/inputs/date-range-picker-base.js': { 'no-param-reassign': 'props' }, // debt: Q47
  'packages/primitives/src/inputs/phone-field-base.js': { complexity: 17, 'max-lines-per-function': 57 }, // debt: Q46
  'packages/primitives/src/inputs/tag-input-base.js': { complexity: 19, 'max-lines-per-function': 61 }, // debt: Q46
  'packages/primitives/src/inputs/time-field-base.js': { complexity: 18 }, // debt: Q46
  'packages/primitives/src/internal/form-control.js': { 'max-lines-per-function': 219 }, // debt: Q46
  'packages/primitives/src/internal/phone.js': { complexity: 20 }, // debt: Q46
  'packages/primitives/src/internal/popup.js': { 'no-param-reassign': 'props' }, // debt: Q47
  'packages/primitives/src/nav/menubar-base.js': { 'no-param-reassign': 'props' }, // debt: Q47
  'packages/primitives/src/nav/stepper-base.js': { 'no-param-reassign': 'props' }, // debt: Q47
  'packages/primitives/src/select/select-base.js': { complexity: 16, 'max-lines-per-function': 73 }, // debt: Q46
  'packages/primitives/src/tabs/tabs-base.js': { 'no-param-reassign': 'props' }, // debt: Q47
  'packages/primitives/test/currency.test.mjs': { 'max-lines-per-function': 81 }, // debt: Q46
  'packages/primitives/test/phone.test.mjs': { 'max-lines-per-function': 57 }, // debt: Q46
  'packages/primitives/test/popup.test.mjs': { 'max-lines-per-function': 91 }, // debt: Q46
  'packages/tokens/test/assemble.test.mjs': { 'max-lines-per-function': 52 }, // debt: Q46
  'packages/tokens/test/figma.test.mjs': { 'max-params': 5 }, // debt: Q46
  'packages/tokens/test/sys.test.mjs': { 'max-params': 6 }, // debt: Q46
  'packages/webmcp/src/fill.js': { complexity: 20 }, // debt: Q46
  'packages/webmcp/src/index.js': { 'max-lines-per-function': 84, complexity: 16 }, // debt: Q46
  'packages/webmcp/src/schema.js': { complexity: 17 }, // debt: Q46
  'packages/webmcp/test/check.test.mjs': { 'max-lines-per-function': 63 }, // debt: Q46
  'packages/webmcp/test/controls.test.mjs': { 'max-lines-per-function': 104 }, // debt: Q46
  'packages/webmcp/test/lifecycle.test.mjs': { 'max-lines-per-function': 242 }, // debt: Q46
};

/** Sources of every package that ships custom elements: the lit, wc and lit-a11y rules apply here. */
const ELEMENT_SOURCES = ['ai', 'charts', 'components', 'data-grid', 'editor', 'primitives'].map((pkg) => `packages/${pkg}/src/**/*.js`);

/**
 * A preset's warnings as errors: bulk suppressions (eslint-suppressions.json, the count ratchet for
 * the test-lint debt) only hold errors, and the lint already fails on any warning.
 */
const asErrors = (rules) => Object.fromEntries(Object.entries(rules).map(([rule, level]) => [rule, level === 'warn' ? 'error' : level]));

/** Playwright rules beyond the preset, or tightened from its warnings (the lint runs --max-warnings=0). */
const PLAYWRIGHT_RULES = {
  'playwright/no-wait-for-timeout': 'error',
  // The same sleep inside page.evaluate: setTimeout with a delay (Q42). A zero delay (one task) is fine.
  'no-restricted-syntax': [
    'error',
    {
      selector: "CallExpression[callee.name='setTimeout'][arguments.1.type='Literal'][arguments.1.value>0]",
      message: 'No sleeps in tests: use page.clock for timers, expect.poll for outcomes, or wait for a frame (Q42).',
    },
  ],
  // Shared assertion helpers (expectAxeClean, expectFloorFocusRing, ...) count as assertions.
  'playwright/expect-expect': ['error', { assertFunctionPatterns: ['^expect[A-Z]'] }],
  // test.skip(condition, reason) is how a spec opts out of one engine; a bare skip is still caught.
  'playwright/no-skipped-test': ['error', { allowConditional: true }],
};

/** Vitest rules beyond the preset. */
const VITEST_RULES = {
  // expect(value, message): Vitest's second argument labels a failure inside a loop.
  'vitest/valid-expect': ['error', { maxArgs: 2 }],
  // test(name, ...) inside a loop over packages or fixtures.
  'vitest/valid-title': ['error', { allowArguments: true }],
  // Shared assertion helpers (expectWithinLegacy, ...) count as assertions.
  'vitest/expect-expect': ['error', { assertFunctionNames: ['expect', 'expect*', 'expect*.*'] }],
};

/** The ESLint setting for one debt row. */
const debtRule = (rule, limit) => {
  if (rule === 'no-param-reassign') return ['error', { props: false }];

  if (rule === 'max-lines-per-function') return ['error', { max: limit, skipBlankLines: true, skipComments: true }];

  return ['error', limit];
};

const debtOverrides = Object.entries(DEBT).map(([file, limits]) => ({
  files: [file],
  rules: Object.fromEntries(Object.entries(limits).map(([rule, limit]) => [rule, debtRule(rule, limit)])),
}));

export default [
  {
    ignores: [
      // Third-party test fixture (GoogleChromeLabs/webmcp-tools, Apache-2.0), kept verbatim.
      'apps/playground/e2e/fixtures/webmcp-polyfill.js',
      '**/node_modules/**',
      // Claude Code harness worktrees (whole extra checkouts).
      '.claude/**',
      '**/dist/**',
      '**/dist-sandboxes/**',
      '**/coverage/**',
      '**/.astro/**',
      '**/.turbo/**',
      '**/test-results/**',
      '**/playwright-report/**',
      '**/custom-elements.json',
      'packages/primitives/src/floor.styles.js',
      // Declarations: generated (types/, packages/react) or checked by tsc; only .ts sources are linted.
      '**/*.d.ts',
      // Vendored oxlint plugin (anti-slop), linted by oxlint and kept as upstream ships it.
      'tools/oxlint/anti-slop/**',
    ],
  },
  // A stale eslint-disable comment is an error, so a fixed rule cannot stay switched off.
  { linterOptions: { reportUnusedDisableDirectives: 'error' } },
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs,jsx,ts}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { unicorn, 'import-x': importX },
    settings: { 'import-x/resolver-next': [importX.createNodeResolver()] },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      // Readability: small functions, shallow nesting, no hidden reuse of names.
      complexity: ['error', 15],
      'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
      'max-params': ['error', 4],
      'max-depth': ['error', 4],
      'max-lines': ['error', { max: 800, skipBlankLines: true, skipComments: true }],
      'no-shadow': 'error',
      'consistent-return': 'error',
      // Immutability: DOM nodes and events are written to on purpose; data passed in is not.
      'no-param-reassign': ['error', { props: true, ignorePropertyModificationsFor: ['el', 'host', 'node', 'event'] }],
      'no-else-return': 'error',
      'no-lonely-if': 'error',
      'no-useless-return': 'error',
      'no-unneeded-ternary': 'error',
      'no-implicit-coercion': 'error',
      'no-return-assign': 'error',
      'no-throw-literal': 'error',
      'prefer-promise-reject-errors': 'error',
      eqeqeq: ['error', 'smart'],
      radix: 'error',
      'dot-notation': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-const': 'error',
      'prefer-object-spread': 'error',
      'prefer-template': 'error',
      'no-var': 'error',
      // Module graph: no cycles, no duplicate or self imports. Cycles are checked within our own
      // source: following imports into node_modules parsed every dependency and ran CI's ESLint out of
      // memory (4.4 GB), and packages cannot import each other in a cycle (their dependencies are one-way).
      'import-x/no-cycle': ['error', { ignoreExternal: true }],
      'import-x/no-self-import': 'error',
      'import-x/no-duplicates': 'error',
      'import-x/no-useless-path-segments': 'error',
      'import-x/no-mutable-exports': 'error',
      'import-x/first': 'error',
      // Unicorn: modern, non-mutating built-ins and correctness checks (a chosen subset; the full
      // preset fights Lit idioms such as null attributes and getElementById in shadow roots).
      'unicorn/error-message': 'error',
      'unicorn/new-for-builtins': 'error',
      'unicorn/no-array-method-this-argument': 'error',
      'unicorn/no-array-sort': 'error',
      'unicorn/no-document-cookie': 'error',
      'unicorn/no-instanceof-builtins': 'error',
      'unicorn/no-invalid-remove-event-listener': 'error',
      'unicorn/no-new-array': 'error',
      'unicorn/no-thenable': 'error',
      'unicorn/no-typeof-undefined': 'error',
      'unicorn/no-unnecessary-await': 'error',
      'unicorn/no-unreadable-array-destructuring': 'error',
      'unicorn/no-useless-collection-argument': 'error',
      'unicorn/no-useless-fallback-in-spread': 'error',
      'unicorn/no-useless-length-check': 'error',
      'unicorn/no-useless-promise-resolve-reject': 'error',
      'unicorn/no-useless-switch-case': 'error',
      'unicorn/prefer-array-find': 'error',
      'unicorn/prefer-array-index-of': 'error',
      'unicorn/prefer-array-some': 'error',
      'unicorn/prefer-at': 'error',
      'unicorn/prefer-code-point': 'error',
      'unicorn/prefer-dom-node-text-content': 'error',
      'unicorn/prefer-export-from': ['error', { checkUsedVariables: false }],
      'unicorn/prefer-includes': 'error',
      'unicorn/prefer-logical-operator-over-ternary': 'error',
      'unicorn/prefer-math-min-max': 'error',
      'unicorn/prefer-modern-dom-apis': 'error',
      'unicorn/prefer-native-coercion-functions': 'error',
      'unicorn/prefer-node-protocol': 'error',
      'unicorn/prefer-number-properties': 'error',
      'unicorn/prefer-optional-catch-binding': 'error',
      'unicorn/prefer-regexp-test': 'error',
      'unicorn/prefer-set-has': 'error',
      'unicorn/prefer-single-call': 'error',
      'unicorn/prefer-spread': 'error',
      'unicorn/prefer-string-replace-all': 'error',
      'unicorn/prefer-string-slice': 'error',
      'unicorn/prefer-string-starts-ends-with': 'error',
      'unicorn/prefer-structured-clone': 'error',
      'unicorn/prefer-type-error': 'error',
      'unicorn/throw-new-error': 'error',
    },
  },
  // Library code never logs; scripts and tests may.
  {
    files: ['packages/*/src/**/*.js'],
    rules: { 'no-console': ['error', { allow: ['warn', 'error'] }] },
  },

  // Size budgets count what a page loads up front, so import() would move code out of them unseen.
  // Only the icon registry may load lazily: its sanitizer, capped in size.test.mjs (B11 fix I2).
  {
    files: ['packages/*/src/**/*.js'],
    ignores: ['packages/primitives/src/internal/icons.js'],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: 'ImportExpression', message: 'No dynamic import() in package sources: it escapes the size budgets (B11).' },
      ],
    },
  },
  // Node scripts, configs and build tooling.
  {
    files: ['**/*.config.{js,mjs}', '**/scripts/**', 'packages/tokens/**/*.mjs', '**/build.mjs', 'apps/docs/src/data/**'],
    languageOptions: { globals: { ...globals.node } },
  },
  // Tests run in Node (Vitest, Playwright) and evaluate code in the browser.
  {
    files: ['**/test/**', '**/e2e/**', '**/*.test.{js,mjs}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      // JSON round trips stand in for storage, and Playwright's innerText() is not the DOM property.
      'unicorn/prefer-structured-clone': 'off',
      'unicorn/prefer-dom-node-text-content': 'off',
    },
  },
  // Web components: Lit template correctness, template accessibility, custom element best practice, on
  // every package that ships elements (audit F4).
  {
    files: ELEMENT_SOURCES,
    ...lit.configs['flat/recommended'],
  },
  {
    files: ELEMENT_SOURCES,
    ...wc.configs['flat/best-practice'],
  },
  {
    files: ELEMENT_SOURCES,
    plugins: { 'lit-a11y': litA11y },
    rules: {
      ...lit.configs['flat/recommended'].rules,
      ...wc.configs['flat/recommended'].rules,
      ...wc.configs['flat/best-practice'].rules,
      ...litA11y.configs.recommended.rules,
    },
  },
  // TypeScript sources (Q45): the TS parser, then the shared rule set above plus the recommended
  // syntactic TS rules. No type information: tsc already type-checks these files.
  {
    files: ['**/*.ts'],
    languageOptions: { parser: tseslint.parser },
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      ...Object.assign({}, ...tseslint.configs.recommended.map((config) => config.rules ?? {})),
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
  // Type tests (tsc -p test/types) declare values only to read their types.
  {
    files: ['packages/*/test/types/**/*.ts'],
    rules: { '@typescript-eslint/no-unused-vars': 'off' },
  },
  // Every eslint-disable says why (m75), and none is broader than it needs to be.
  comments.recommended,
  { rules: { '@eslint-community/eslint-comments/require-description': ['error', { ignore: ['eslint-enable'] }] } },
  // Vendored, kept byte-for-byte with upstream (see its UPSTREAM.md), so its blanket disable stays.
  {
    files: ['packages/primitives/src/internal/qr-upstream.js'],
    rules: {
      '@eslint-community/eslint-comments/disable-enable-pair': 'off',
      '@eslint-community/eslint-comments/no-unlimited-disable': 'off',
      '@eslint-community/eslint-comments/require-description': 'off',
    },
  },
  // Playwright specs (Q41): awaited calls, web-first assertions, no sleeps, no focused tests.
  {
    files: ['**/e2e/**/*.{js,mjs}'],
    ...playwright.configs['flat/recommended'],
    rules: { ...asErrors(playwright.configs['flat/recommended'].rules), ...PLAYWRIGHT_RULES },
  },
  // Vitest unit tests (Q41). packages/react and apps/docs use node:test instead.
  {
    files: ['packages/*/test/**/*.{js,mjs}'],
    ignores: ['packages/react/test/**'],
    plugins: { vitest },
    rules: { ...asErrors(vitest.configs.recommended.rules), ...VITEST_RULES },
  },
  // Blocks are app code a user copies out of the CLI: they use the public package entry points only
  // (wave 19, R6). A block that reached into `internal` or `src/` would break once copied.
  {
    files: ['packages/cli/blocks/**/*.js'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@focsd-dev/*/internal', '@focsd-dev/*/internal/**'],
              message: 'Blocks import public entry points only, never @focsd-dev/*/internal.',
            },
            { group: ['**/src/**', '@focsd-dev/*/src/**'], message: 'Blocks import published package entry points, never a src/ path.' },
            {
              group: ['@focsd-dev/*/dist/**', '@focsd-dev/*/lib/**'],
              message: 'Blocks import published entry points, never dist/ or lib/.',
            },
          ],
        },
      ],
      // The same rule for import(), which no-restricted-imports does not see.
      'no-restricted-syntax': [
        'error',
        {
          selector: String.raw`ImportExpression[source.value=/(^|\/)(src|internal|dist|lib)(\/|$)/]`,
          message: 'Blocks import public package entry points only: no src/, internal, dist/ or lib/ in import().',
        },
      ],
    },
  },
  ...astro.configs['flat/recommended'],
  // Last, so a debt row wins over the rule sets above.
  ...debtOverrides,
  prettier,
];
