// Server rendering: every element renders to Declarative Shadow DOM under @lit-labs/ssr without
// touching browser-only APIs. Runs in Node with Lit's DOM shim.
import '@lit-labs/ssr/lib/install-global-dom-shim.js';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@lit-labs/ssr';
import { collectResult } from '@lit-labs/ssr/lib/render-result.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import { DECLARATIVE_SHADOW_ROOT, manifestTags, renderTag } from '../../../scripts/lib/ssr-sweep.mjs';

await import('../src/index.js');

const tags = manifestTags(new URL('../custom-elements.json', import.meta.url));

describe('server rendering', () => {
  it('finds the elements to render', () => {
    expect(tags.length).toBeGreaterThan(50);
    // A stale manifest would drop elements from the sweep below without failing it.
    expect(tags).toEqual(expect.arrayContaining(['focsd-stat', 'focsd-animated-number', 'focsd-status-dot']));
  });

  it.each(tags)('<%s> renders declarative shadow DOM', async (tag) => {
    const out = await renderTag({ render, collectResult, html, unsafeStatic }, tag);
    expect(out).toContain(`<${tag}`);
    expect(out).toMatch(DECLARATIVE_SHADOW_ROOT);
  });
});

/** @param {import('lit').TemplateResult} template */
const ssr = (template) => collectResult(render(template));

// 14b-10 (14b-5 review hand-off): a real value renders its code on the server.
describe('focsd-qr-code on the server', () => {
  it('draws a version 2 code (25 modules + quiet zone) for a short URL', async () => {
    const out = await ssr(html`<focsd-qr-code value="https://focsd.dev" label="Focsd website"></focsd-qr-code>`);

    expect(out).toContain('viewBox="0 0 33 33"');
    expect(out).toMatch(/<path[^>]*\sd="M[^"]+"/);
  });
});

// 14b-10 (14b-8 review hand-off): values that are not numbers and options Intl rejects.
describe('focsd-format-number on the server', () => {
  /** An empty `<data>`, allowing Lit's part markers inside it. */
  const EMPTY = /<data part="data"( value="5")?>(<!--[^>]*-->)*<\/data>/;

  it('NaN and an empty string render an empty <data> and warn once between them', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const outs = [
      await ssr(html`<focsd-format-number value="NaN"></focsd-format-number>`),
      await ssr(html`<focsd-format-number value="NaN"></focsd-format-number>`),
      await ssr(html`<focsd-format-number .value=${''}></focsd-format-number>`),
    ];

    const calls = warn.mock.calls.filter(([m]) => String(m).includes('`value` is not a number'));
    warn.mockRestore();

    for (const out of outs) {
      expect(out).toMatch(EMPTY);
      expect(out).not.toContain('NaN<');
    }

    expect(calls).toHaveLength(1);
  });

  it('a currency without a code renders an empty <data> instead of throwing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const out = await ssr(html`<focsd-format-number value="5" type="currency"></focsd-format-number>`);
    const calls = warn.mock.calls.map(([m]) => String(m));
    warn.mockRestore();

    expect(out).toMatch(EMPTY);
    expect(out).toContain('value="5"');
    expect(calls.some((m) => m.includes('focsd-format-number could not format the value'))).toBe(true);
  });
});

// 14c-1 review: the app shell creates its ResizeObserver only when connected, so a server without one renders it.
describe('focsd-app-shell on the server', () => {
  it('renders main and the skip link without a ResizeObserver', async () => {
    vi.stubGlobal('ResizeObserver', undefined);

    try {
      const out = await ssr(html`<focsd-app-shell nav-label="Workspace"><p>Body</p></focsd-app-shell>`);
      expect(out).toContain('part="skip-link"');
      expect(out).toMatch(/<main[^>]*part="main"/);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

// B14: the header and the table also create their ResizeObservers only when connected or first rendered.
describe('ResizeObserver users on the server', () => {
  it.each([
    ['focsd-header', html`<focsd-header><a slot="brand" href="/">Brand</a><nav>Links</nav></focsd-header>`, 'part="header"'],
    ['focsd-table', html`<focsd-table label="People"></focsd-table>`, 'part="viewport"'],
  ])('<%s> renders without a ResizeObserver', async (_tag, template, part) => {
    vi.stubGlobal('ResizeObserver', undefined);

    try {
      expect(await ssr(template)).toContain(part);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

// 18d: the KPI elements render their words and final values on the server.
describe('stat, animated number and status dot on the server', () => {
  it('a stat renders its group, formatted value and the delta in words', async () => {
    const out = await ssr(
      html`<focsd-stat label="Revenue" value="48200" format='{"style":"currency","currency":"USD","maximumFractionDigits":0}' delta="-0.031" good="up"></focsd-stat>`,
    );

    expect(out).toContain('role="group"');
    expect(out).toContain('$48,200');
    expect(out).toContain('Down 3.1% from last period, bad');
  });

  it('an animated number renders its final value at once (no frames on the server)', async () => {
    const out = await ssr(html`<focsd-animated-number value="1234" from="0"></focsd-animated-number>`);

    expect(out.match(/1,234/g)).toHaveLength(2);
  });

  it('a status dot renders a named image with its shape', async () => {
    const out = await ssr(html`<focsd-status-dot status="warning"></focsd-status-dot>`);

    expect(out).toContain('role="img"');
    expect(out).toContain('aria-label="Warning"');
    expect(out).toMatch(/<path[^>]*\sd="M5 \.5l4\.8 9H\.2z"/);
  });
});

// 21a: the segmented control and bottom nav render on the server.
describe('segmented control and bottom nav on the server', () => {
  it('a segmented control renders its radiogroup and checked segment', async () => {
    const out = await ssr(
      html`<focsd-segmented-control label="View" value="week"
        ><focsd-segment value="day">Day</focsd-segment><focsd-segment value="week" icon="calendar">Week</focsd-segment></focsd-segmented-control
      >`,
    );

    expect(out).toContain('role="radiogroup"');
    expect(out).toContain('>View<');
    expect(out.match(/<template shadowroot(mode)?="open"/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('a bottom nav renders its named landmark and real links', async () => {
    const out = await ssr(
      html`<focsd-bottom-nav
        ><focsd-bottom-nav-item href="/home" label="Home" current></focsd-bottom-nav-item
        ><focsd-bottom-nav-item href="/inbox" label="Inbox" badge="3"></focsd-bottom-nav-item
        ><focsd-bottom-nav-item href="/me" label="Profile"></focsd-bottom-nav-item
      ></focsd-bottom-nav>`,
    );

    expect(out).toContain('aria-label="Main"');
    expect(out).toContain('href="/home"');
    expect(out).toContain('aria-current="page"');
    expect(out).toContain('aria-label="Inbox, 3 new"');
    expect(out.match(/<focsd-bottom-nav-item[^>]*role="listitem"/g)).toHaveLength(3);
  });
});

// 21c: the signature pad touches no canvas, matchMedia or ResizeObserver on the server.
describe('focsd-signature-pad on the server', () => {
  it('renders the empty pad, named, with its buttons', async () => {
    const out = await ssr(html`<focsd-signature-pad label="Signature" name="sig"></focsd-signature-pad>`);

    expect(out).toMatch(/<canvas part="canvas" role="img" aria-label="Signature, empty"/);
    expect(out).toContain('Type instead');
    expect(out).toContain('>Undo<');
    expect(out).not.toContain('part="typed-field"');
  });

  it('renders the typed mode as a named text field', async () => {
    const out = await ssr(html`<focsd-signature-pad label="Signature" typed typed-name="Ada Lovelace"></focsd-signature-pad>`);

    expect(out).toMatch(/<input part="typed-field" type="text"[^>]*aria-label="Type your name for Signature"/);
    expect(out).toContain('aria-label="Signature, signed"');
    expect(out).toContain('Draw instead');
    expect(out).not.toContain('>Undo<');
  });
});
