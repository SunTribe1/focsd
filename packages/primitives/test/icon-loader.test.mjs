// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { retryingLoader } from '../src/internal/icons.js';

// B14 m5: icons requested while the source loader was failing re-render once it loads. Browsers
// keep a failed module fetch, so this is tested on the loader itself (no module mocking).
describe('retryingLoader', () => {
  it('loads once and shares the result', async () => {
    const importer = vi.fn(async () => 'module');
    const recovered = vi.fn();
    const load = retryingLoader(importer, recovered);

    expect(await load()).toBe('module');
    expect(await load()).toBe('module');
    expect(importer).toHaveBeenCalledTimes(1);
    expect(recovered).not.toHaveBeenCalled();
  });

  it('forgets a failed load, and reports the recovery once', async () => {
    const importer = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue('module');
    const recovered = vi.fn();
    const load = retryingLoader(importer, recovered);

    await expect(load()).rejects.toThrow('offline');
    expect(recovered).not.toHaveBeenCalled();
    expect(await load()).toBe('module');
    expect(await load()).toBe('module');
    expect(importer).toHaveBeenCalledTimes(2);
    expect(recovered).toHaveBeenCalledTimes(1);
  });
});
