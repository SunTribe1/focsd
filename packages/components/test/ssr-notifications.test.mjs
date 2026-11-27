// Server rendering of the wave 21d elements (notification center and notification). They also join
// ssr.test.mjs's manifest sweep.
import '@lit-labs/ssr/lib/install-global-dom-shim.js';
import { describe, expect, it } from 'vitest';
import { render } from '@lit-labs/ssr';
import { collectResult } from '@lit-labs/ssr/lib/render-result.js';
import { html } from 'lit';

await import('../src/index.js');

/** @param {import('lit').TemplateResult} template */
const ssr = (template) => collectResult(render(template));

const LIST = [
  { id: 'a', title: 'Build done', body: 'main is green', time: '2026-11-25T10:00:00Z', href: '/b/1' },
  { id: 'b', title: 'Comment', read: true },
];

describe('wave 21d on the server', () => {
  it('a center renders the named bell, the badge and a closed panel with the list', async () => {
    const out = await ssr(html`<focsd-notification-center .notifications=${LIST}></focsd-notification-center>`);

    expect(out).toMatch(/<template shadowroot(mode)?="open"/);
    expect(out).toContain('label="Notifications, 1 unread"');
    expect(out).toMatch(/part="badge"[^>]*>(<!--[^>]*-->)*1/);
    expect(out).toContain('role="dialog"');
    expect(out).toContain('popover="auto"');
    expect(out).toContain('Dismiss Build done');
    expect(out).toContain('<focsd-relative-time');
  });

  it('an empty center renders the empty state, and slotted notifications wait for the browser', async () => {
    const out = await ssr(
      html`<focsd-notification-center label="Alerts"><focsd-notification id="x" title="X"></focsd-notification></focsd-notification-center>`,
    );

    expect(out).toContain('label="Alerts"');
    expect(out).toMatch(/You(&#39;|')re all caught up/);
    // Slotted notifications are read once the center upgrades in the browser; on the server the child renders as itself.
    expect(out).toMatch(/<focsd-notification[^>]*\stitle="X"/);
  });
});
