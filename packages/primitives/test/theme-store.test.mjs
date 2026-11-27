// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readStored, resolveTarget, schemeOf, writeStored } from '../src/internal/theme-store.js';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  document.documentElement.removeAttribute('data-focsd-theme');
});

describe('theme storage', () => {
  it('reads and writes under the prefix, and removes the key for null', () => {
    writeStored('focsd-', 'theme', 'dark');
    expect(localStorage.getItem('focsd-theme')).toBe('dark');
    expect(readStored('focsd-', 'theme')).toBe('dark');
    writeStored('focsd-', 'theme', null);
    expect(localStorage.getItem('focsd-theme')).toBeNull();
    writeStored('app-', 'brand', 'signal');
    expect(localStorage.getItem('app-brand')).toBe('signal');
  });

  it('survives a storage that throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    expect(readStored('focsd-', 'theme')).toBeNull();
    expect(() => writeStored('focsd-', 'theme', 'dark')).not.toThrow();
  });
});

describe('resolveTarget', () => {
  it('is <html> without a selector, the first match with one, and null without a match', () => {
    expect(resolveTarget('')).toBe(document.documentElement);
    document.body.innerHTML = '<section id="s"></section>';
    expect(resolveTarget('#s')).toBe(document.getElementById('s'));
    expect(resolveTarget('#missing')).toBeNull();
    expect(resolveTarget('[')).toBeNull();
  });
});

describe('schemeOf', () => {
  it('follows the theme attribute, then the color scheme preference', () => {
    const root = document.documentElement;
    root.setAttribute('data-focsd-theme', 'dark');
    expect(schemeOf(root)).toBe('dark');
    root.setAttribute('data-focsd-theme', 'contrast');
    expect(schemeOf(root)).toBe('light');
    root.removeAttribute('data-focsd-theme');
    vi.spyOn(globalThis, 'matchMedia').mockReturnValue(/** @type {MediaQueryList} */ ({ matches: true }));
    expect(schemeOf(root)).toBe('dark');
  });
});
