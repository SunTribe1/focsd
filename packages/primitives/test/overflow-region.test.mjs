// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { syncOverflowRegion } from '../src/internal/overflow-region.js';

/** A block whose sizes are set by hand (happy-dom does no layout). */
function block({ scroll, client }) {
  const el = document.createElement('pre');

  el.setAttribute('aria-label', 'js code');
  Object.defineProperty(el, 'scrollWidth', { value: scroll, configurable: true });
  Object.defineProperty(el, 'clientWidth', { value: client, configurable: true });

  return el;
}

describe('syncOverflowRegion (review item 90)', () => {
  it('makes an overflowing block a named, focusable region', () => {
    const el = block({ scroll: 800, client: 300 });

    syncOverflowRegion(el);
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('tabindex')).toBe('0');
    expect(el.getAttribute('aria-label')).toBe('js code');
  });

  it('leaves a block that fits as plain content, its name set aside', () => {
    const el = block({ scroll: 300, client: 300 });

    syncOverflowRegion(el);
    expect(el.hasAttribute('role')).toBe(false);
    expect(el.hasAttribute('tabindex')).toBe(false);
    expect(el.hasAttribute('aria-label')).toBe(false);
    expect(el.getAttribute('data-aria-label')).toBe('js code');
  });

  it('restores the name when the block starts to overflow', () => {
    const el = block({ scroll: 300, client: 300 });

    syncOverflowRegion(el);
    Object.defineProperty(el, 'scrollWidth', { value: 900, configurable: true });
    syncOverflowRegion(el);
    expect(el.getAttribute('aria-label')).toBe('js code');
    expect(el.hasAttribute('data-aria-label')).toBe(false);
    expect(el.getAttribute('role')).toBe('region');
  });
});
