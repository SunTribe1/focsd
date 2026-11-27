// @vitest-environment happy-dom
// focsd-source-chip: a numbered link to a source, kept only for the R2 schemes.
import { afterEach, expect, it } from 'vitest';
import '../src/source-chip.js';

afterEach(() => document.body.replaceChildren());

/** @param {Record<string, unknown>} props */
async function chip(props) {
  const el = Object.assign(document.createElement('focsd-source-chip'), props);
  document.body.append(el);
  await el.updateComplete;

  return el;
}

it('renders a link with the index, title and host', async () => {
  const el = await chip({ href: 'https://www.example.com/a?b', label: 'Example docs', index: 2 });
  const a = el.shadowRoot.querySelector('a[part="link"]');

  expect(a.getAttribute('href')).toBe('https://www.example.com/a?b');
  expect(a.getAttribute('rel')).toBe('noopener noreferrer nofollow');
  expect(a.hasAttribute('target')).toBe(false);
  expect(a.querySelector('[part="index"]').textContent).toBe('[2]');
  expect(a.querySelector('[part="host"]').textContent).toBe('www.example.com');
  expect(a.textContent.replaceAll(/\s+/g, ' ').trim()).toBe('[2] Example docs www.example.com');
});

it.each(['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,x', '//evil.example', 'vbscript:x'])(
  'an unsafe href (%s) renders text, never a link',
  async (href) => {
    const el = await chip({ href, label: 'Bad', index: 1 });

    expect(el.shadowRoot.querySelector('a')).toBeNull();
    expect(el.shadowRoot.querySelector('[part="link"]').textContent).toContain('Bad');
  },
);

it('falls back to the host, then the href, for the title; no index without one', async () => {
  const el = await chip({ href: 'https://focsd.dev/docs' });
  const a = el.shadowRoot.querySelector('a');

  expect(a.querySelector('[part="index"]')).toBeNull();
  expect(a.textContent.trim()).toBe('focsd.dev');

  const rel = await chip({ href: '/guide' });

  expect(rel.shadowRoot.querySelector('a').textContent.trim()).toBe('/guide');
  expect(rel.shadowRoot.querySelector('[part="host"]')).toBeNull();
});

it('reads its attributes', async () => {
  document.body.innerHTML = '<focsd-source-chip href="https://a.example" label="A" index="3"></focsd-source-chip>';
  const el = document.querySelector('focsd-source-chip');
  await el.updateComplete;

  expect(el.index).toBe(3);
  expect(el.shadowRoot.querySelector('[part="index"]').textContent).toBe('[3]');
});
