// Server rendering: every element renders to Declarative Shadow DOM under @lit-labs/ssr without
// touching browser-only APIs. Runs in Node with Lit's DOM shim. Batch 17b lists the display
// elements; 17d moves this to the manifest when src/index.js defines every element.
import '@lit-labs/ssr/lib/install-global-dom-shim.js';
import { describe, expect, it } from 'vitest';
import { render } from '@lit-labs/ssr';
import { collectResult } from '@lit-labs/ssr/lib/render-result.js';
import { html, unsafeStatic } from 'lit/static-html.js';

const MODULES = ['chat-thread', 'chat-message', 'streaming-text', 'tool-call', 'reasoning', 'message-actions', 'source-chip'];

for (const name of MODULES) await import(`../src/${name}.js`);

const tags = MODULES.map((name) => `focsd-${name}`);

const message = {
  id: 'm1',
  role: 'assistant',
  status: 'done',
  createdAt: Date.UTC(2026, 10, 24, 9, 5),
  parts: [
    { type: 'reasoning', text: 'Thinking' },
    { type: 'tool-call', id: 't', name: 'search', input: { q: 'x' }, status: 'done', output: [1] },
    { type: 'text', text: 'Hello **there**' },
    { type: 'source', url: 'https://example.com', title: 'Example' },
  ],
};

describe('server rendering', () => {
  it.each(tags)('<%s> renders declarative shadow DOM', async (tag) => {
    const t = unsafeStatic(tag);
    const out = await collectResult(render(html`<${t} label="Example" text="Some text" name="search" href="https://example.com"></${t}>`));

    expect(out).toContain(`<${tag}`);
    expect(out).toMatch(/<template shadowroot(mode)?="open"/);
  });

  it('a thread with a message renders its articles on the server', async () => {
    const out = await collectResult(render(html`<focsd-chat-thread .messages=${[message]}></focsd-chat-thread>`));

    expect(out).toContain('role="feed"');
    expect(out).toContain('<focsd-chat-message');
    expect(out).toContain('<article');
    expect(out).toContain('aria-posinset="1"');
    expect(out).toContain('<focsd-tool-call');
    expect(out).toContain('<focsd-source-chip');
  });

  it('streaming text puts its text in the server markup as plain text, ready before hydration', async () => {
    const out = await collectResult(render(html`<focsd-streaming-text text="Hello <b>x</b> **there**"></focsd-streaming-text>`));

    expect(out).toContain('part="text"');
    expect(out).toMatch(/<span class="ssr"><!--lit-part-->Hello &lt;b&gt;x&lt;\/b&gt; \*\*there\*\*<!--\/lit-part--><\/span>/);
    expect(out).toContain('<span class="ssr">');
    expect(out).not.toContain('style=');
  });
});
