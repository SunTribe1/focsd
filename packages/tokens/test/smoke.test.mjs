import { describe, expect, it } from 'vitest';

describe('toolchain', () => {
  it('runs on Node 22 or newer', () => {
    const major = Number(process.versions.node.split('.')[0]);
    expect(major).toBeGreaterThanOrEqual(22);
  });

  it('can import Style Dictionary and culori', async () => {
    const { default: StyleDictionary } = await import('style-dictionary');
    const culori = await import('culori');
    expect(StyleDictionary).toBeTypeOf('function');
    expect(culori.wcagContrast).toBeTypeOf('function');
  });
});
