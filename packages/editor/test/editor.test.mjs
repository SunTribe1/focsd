import { describe, expect, it } from 'vitest';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { gzipSizes } from '../../../scripts/lib/initial-size.mjs';
import { isSafeLink } from '../src/toolbar.js';

describe('isSafeLink', () => {
  it.each(['https://example.com', 'http://a.b', 'mailto:a@b.c', 'tel:+15551234', '/docs', '#top', '?q=1'])('allows %s', (url) => {
    expect(isSafeLink(url)).toBe(true);
  });
  it.each([
    'javascript:alert(1)',
    ' JavaScript:alert(1)',
    'data:text/html,x',
    'vbscript:x',
    'ftp://x',
    'example.com',
    '//evil.example',
    '/\\evil.example',
    '//evil.example/path',
  ])('rejects %s', (url) => {
    expect(isSafeLink(url)).toBe(false);
  });
});

// 140 KB plus 0.5 KB for the shared localize terms added in 21.0 (measured: 143,642 B now, 143,360 B with the old terms),
// plus 0.5 KB for the form control's built-in validation (error-message, warning-pattern) on 2026-11-26 (measured 144,034 B after the size pass).
// 2026-11-27, 1.0 review items (signature terms in the shared term table, strict index checks): 144889 B, so 141.5 KB.
const BUDGET_KB = 141.5;

it(`the editor stays under ${BUDGET_KB} KB gzip (Tiptap and ProseMirror included)`, async () => {
  const entry = fileURLToPath(new URL('../src/index.js', import.meta.url));
  const { initial, lazy } = await gzipSizes(build, entry);

  expect(initial).toBeLessThanOrEqual(BUDGET_KB * 1024);
  // Lazily loaded code (only the icon sanitizer may be, B11) stays capped, as in components.
  expect(lazy).toBeLessThanOrEqual(1.75 * 1024);
});
