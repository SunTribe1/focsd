import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { internalExportProblems } from '../../../scripts/lib/internal-exports.mjs';

const pkg = (exports) => ({ name: '@focsd-dev/x', exports });

describe('internalExportProblems (check-release)', () => {
  it('refuses any ./internal/* subpath export', () => {
    expect(internalExportProblems(pkg({ '.': {}, './internal/focus.js': {} }))).toEqual([
      '@focsd-dev/x exports "./internal/focus.js": internals stay private (curate a public entry instead)',
    ]);
    expect(internalExportProblems(pkg({ './internal/*': {} }))).toHaveLength(1);
  });

  it('has no named exceptions left: style.js and warn.js live in the curated ./internal entry (B10)', () => {
    expect(internalExportProblems({ name: '@focsd-dev/primitives', exports: { '.': {}, './internal/style.js': {} } })).toHaveLength(1);
    expect(internalExportProblems({ name: '@focsd-dev/primitives', exports: { '.': {}, './internal/warn.js': {} } })).toHaveLength(1);
    expect(internalExportProblems({ name: '@focsd-dev/primitives', exports: { '.': {}, './internal': {}, './utils': {} } })).toEqual([]);
  });

  it('passes every package in the repository', () => {
    const root = new URL('../../', import.meta.url);

    const problems = readdirSync(root).flatMap((dir) =>
      internalExportProblems(JSON.parse(readFileSync(new URL(`${dir}/package.json`, root), 'utf8'))),
    );

    expect(problems).toEqual([]);
  });
});
