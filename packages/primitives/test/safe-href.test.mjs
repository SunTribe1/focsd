// cspell:ignore avascript ascript msgbox
import { describe, expect, it } from 'vitest';
import { safeHref } from '../src/internal/safe-href.js';
import { cleanNotifications } from '../src/overlays/notification-model.js';

describe('safeHref', () => {
  it.each([
    'https://example.com/a?b=1#c',
    'http://example.com',
    'HTTPS://EXAMPLE.COM',
    'mailto:a@b.co',
    '/builds/1',
    '#top',
    '?page=2',
    'builds/1',
    './builds',
    '../up',
    'path/with:colon',
  ])('lets %s through', (url) => {
    expect(safeHref(url)).toBe(url);
  });

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    '  javascript:alert(1)',
    'java\tscript:alert(1)',
    'java\nscript:alert(1)',
    'java script:alert(1)',
    '\u0001javascript:alert(1)',
    '\u0000javascript:alert(1)',
    '​javascript:alert(1)',
    '&#106;avascript:alert(1)',
    '&#x6A;avascript:alert(1)',
    'jav&Tab;ascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'DATA:text/html;base64,AAAA',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'tel:+123',
    '//evil.example/x',
    '/\\evil.example/x',
    '\\\\evil.example',
  ])('refuses %j', (url) => {
    expect(safeHref(url)).toBeNull();
  });

  it('refuses non-strings', () => {
    expect(safeHref(/** @type {any} */ (undefined))).toBeNull();
    expect(safeHref(/** @type {any} */ ({ toString: () => 'javascript:1' }))).toBeNull();
    expect(safeHref('')).toBeNull();
  });
});

describe('notification hrefs', () => {
  it('keeps safe hrefs and drops unsafe ones, keeping the notification', () => {
    const out = cleanNotifications([
      { id: 'a', title: 'A', href: '/ok' },
      { id: 'b', title: 'B', href: 'javascript:alert(1)' },
      { id: 'c', title: 'C', href: 'data:text/html,x' },
      { id: 'd', title: 'D', href: 'vbscript:x' },
      { id: 'e', title: 'E', href: ' JaVa\tScRiPt:alert(1)' },
      { id: 'f', title: 'F', href: '&#106;avascript:alert(1)' },
      { id: 'g', title: 'G', href: 'https://example.com/x' },
    ]);

    expect(out.map((n) => [n.id, n.href])).toEqual([
      ['a', '/ok'],
      ['b', undefined],
      ['c', undefined],
      ['d', undefined],
      ['e', undefined],
      ['f', undefined],
      ['g', 'https://example.com/x'],
    ]);
    expect('href' in /** @type {object} */ (out[1])).toBe(false);
  });

  it('does not change the input and leaves titles as plain strings', () => {
    const input = [{ id: 'a', title: '<img src=x onerror=alert(1)>', href: 'javascript:1' }];
    const copy = structuredClone(input);
    const out = cleanNotifications(input);

    expect(input).toEqual(copy);
    expect(out[0]?.title).toBe('<img src=x onerror=alert(1)>');
  });
});
