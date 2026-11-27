// Server rendering of the wave 21b elements (lightbox, image compare). They also join ssr.test.mjs's
// manifest sweep.
import '@lit-labs/ssr/lib/install-global-dom-shim.js';
import { describe, expect, it } from 'vitest';
import { render } from '@lit-labs/ssr';
import { collectResult } from '@lit-labs/ssr/lib/render-result.js';
import { html } from 'lit';

await import('../src/index.js');

/** @param {import('lit').TemplateResult} template */
const ssr = (template) => collectResult(render(template));

describe('wave 21b on the server', () => {
  it('a lightbox renders its thumbnails slot and a closed, named dialog', async () => {
    const out = await ssr(html`<focsd-lightbox><a href="/a.jpg"><img src="/a-thumb.jpg" alt="A lake" /></a></focsd-lightbox>`);

    expect(out).toMatch(/<template shadowroot(mode)?="open"/);
    expect(out).toContain('part="thumbs"');
    expect(out).toContain('aria-label="Image viewer"');
    expect(out).not.toMatch(/<dialog[^>]*\sopen/);
    expect(out).toContain('<a href="/a.jpg">');
  });

  it('an image compare renders its slider with the value text and the clip position', async () => {
    const out = await ssr(
      html`<focsd-image-compare position="30"><img slot="before" alt="Before" /><img slot="after" alt="After" /></focsd-image-compare>`,
    );

    expect(out).toContain('role="slider"');
    expect(out).toContain('aria-valuenow="30"');
    expect(out).toContain('aria-valuetext="30% before image"');
    expect(out).toContain('--_position:30%');
  });
});
