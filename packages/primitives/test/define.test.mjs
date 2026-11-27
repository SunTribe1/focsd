import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineElement } from '../src/internal/define.js';

/** A registry stand-in (the tests run in node, which has no customElements). */
function fakeRegistry() {
  const defined = new Map();

  return {
    get: (/** @type {string} */ tag) => defined.get(tag),
    define: vi.fn((/** @type {string} */ tag, /** @type {unknown} */ element) => {
      if (defined.has(tag)) throw new DOMException(`${tag} already defined`, 'NotSupportedError');
      defined.set(tag, element);
    }),
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('defineElement (m34)', () => {
  it('defines a free tag', () => {
    const registry = fakeRegistry();
    const First = class {};

    vi.stubGlobal('customElements', registry);
    defineElement('focsd-x', /** @type {any} */ (First));

    expect(registry.get('focsd-x')).toBe(First);
  });

  it('skips a tag a second copy of the module already defined, instead of throwing', () => {
    const registry = fakeRegistry();
    const First = class {};

    vi.stubGlobal('customElements', registry);
    defineElement('focsd-x', /** @type {any} */ (First));

    expect(() => defineElement('focsd-x', /** @type {any} */ (class {}))).not.toThrow();
    expect(registry.get('focsd-x')).toBe(First);
    expect(registry.define).toHaveBeenCalledTimes(1);
  });

  it('is exported for authors from @focsd-dev/primitives/internal', async () => {
    expect((await import('../src/internal/index.js')).defineElement).toBe(defineElement);
  });
});
