import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { warnOnce } from '../src/internal/warn.js';

describe('warnOnce()', () => {
  it('warns once per key with the Focsd prefix', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    warnOnce('k1', 'first');
    warnOnce('k1', 'first again');
    warnOnce('k2', 'second');
    expect(warn.mock.calls.map((c) => c[0])).toEqual(['Focsd: first', 'Focsd: second']);
    warn.mockRestore();
  });

  it('passes details, such as the element, after the message (m37)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = { tagName: 'FOCSD-IMAGE' };
    warnOnce('k3', 'add alt text', el);
    warnOnce('k3', 'add alt text', el);
    expect(warn.mock.calls).toEqual([['Focsd: add alt text', el]]);
    warn.mockRestore();
  });
});

describe('warning messages (B14 m6)', () => {
  it('carry one prefix: warnOnce adds "Focsd: ", so no message starts with its tag and a colon', () => {
    const packages = new URL('../../', import.meta.url);

    const doubled = readdirSync(packages).flatMap((pkg) => {
      const src = new URL(`${pkg}/src/`, packages);

      if (!existsSync(src)) return [];

      const files = readdirSync(src, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.js'));

      return files.flatMap((file) =>
        [...readFileSync(new URL(file, src), 'utf8').matchAll(/warnOnce\([^,]+,\s*[`'"](focsd-[a-z-]+: )/g)].map(
          (m) => `${pkg}/${file}: ${m[1]}`,
        ),
      );
    });

    expect(doubled).toEqual([]);
  });
});
