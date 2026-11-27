// Server rendering of the input elements (composer, attachment tile, prompt suggestions): each
// renders declarative shadow DOM under @lit-labs/ssr without touching browser-only APIs.
import '@lit-labs/ssr/lib/install-global-dom-shim.js';
import { describe, expect, it } from 'vitest';
import { render } from '@lit-labs/ssr';
import { collectResult } from '@lit-labs/ssr/lib/render-result.js';
import { html } from 'lit';

await Promise.all([import('../src/composer.js'), import('../src/attachment-tile.js'), import('../src/prompt-suggestions.js')]);

const ssr = async (/** @type {import('lit').TemplateResult} */ template) => collectResult(render(template));

describe('server rendering of the input elements', () => {
  it('<focsd-composer> renders its textarea and buttons', async () => {
    const out = await ssr(html`<focsd-composer label="Ask" placeholder="Ask anything" busy></focsd-composer>`);

    expect(out).toMatch(/<template shadowroot(mode)?="open"/);
    expect(out).toContain('part="textarea"');
    expect(out).toContain('part="attach"');
    expect(out).toContain('part="stop"');
    expect(out).toMatch(/<label[^>]*>(<!--[^>]*-->)*Ask(<!--[^>]*-->)*<\/label>/);
  });

  it('<focsd-attachment-tile> renders name, size and remove', async () => {
    const out = await ssr(
      html`<focsd-attachment-tile name="a.pdf" size="2048" media-type="application/pdf" removable></focsd-attachment-tile>`,
    );

    expect(out).toMatch(/<template shadowroot(mode)?="open"/);
    expect(out).toContain('a.pdf');
    expect(out).toContain('2 kB');
    expect(out).toContain('aria-label="Remove a.pdf"');
  });

  it('<focsd-prompt-suggestions> renders its buttons', async () => {
    const out = await ssr(html`<focsd-prompt-suggestions .suggestions=${['One', 'Two']}></focsd-prompt-suggestions>`);

    expect(out).toMatch(/<template shadowroot(mode)?="open"/);
    expect(out).toContain('part="suggestion"');
    expect(out).toContain('Two');
  });
});
