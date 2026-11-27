import { describe, expect, it, vi } from 'vitest';
import { deprecated } from '../src/internal/deprecate.js';

describe('deprecated()', () => {
  it('warns once per id, naming the replacement and the removal', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    deprecated('rating.readonly', 'focsd-rating `readonly` property', 'use `readOnly`');
    deprecated('rating.readonly', 'focsd-rating `readonly` property', 'use `readOnly`');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toBe(
      'Focsd: focsd-rating `readonly` property is deprecated and will be removed in the next major version; use `readOnly`.',
    );
    warn.mockRestore();
  });
});
