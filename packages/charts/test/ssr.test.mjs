// Server rendering: every element renders to Declarative Shadow DOM under @lit-labs/ssr without
// touching browser-only APIs. Runs in Node with Lit's DOM shim.
import '@lit-labs/ssr/lib/install-global-dom-shim.js';
import { describe, expect, it } from 'vitest';
import { render } from '@lit-labs/ssr';
import { collectResult } from '@lit-labs/ssr/lib/render-result.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import { DECLARATIVE_SHADOW_ROOT, manifestTags, renderTag } from '../../../scripts/lib/ssr-sweep.mjs';

await import('../src/index.js');

const tags = manifestTags(new URL('../custom-elements.json', import.meta.url));

describe('server rendering', () => {
  it('finds the elements to render', () => {
    expect(tags.length).toBeGreaterThan(0);
    // A stale manifest would drop elements from the sweep below without failing it.
    expect(tags).toEqual(expect.arrayContaining(['focsd-chart', 'focsd-sparkline', 'focsd-gauge']));
  });

  it.each(tags)('<%s> renders declarative shadow DOM', async (tag) => {
    const out = await renderTag({ render, collectResult, html, unsafeStatic }, tag);
    expect(out).toContain(`<${tag}`);
    expect(out).toMatch(DECLARATIVE_SHADOW_ROOT);
  });
});
