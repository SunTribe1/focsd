import { readdir, readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const distUrl = new URL('../dist/', import.meta.url);

describe('fonts.css', () => {
  it('declares variable faces for Next (normal + italic) and Mono, latin and latin-ext', async () => {
    const css = await readFile(new URL('fonts.css', distUrl), 'utf8');
    const faces = css.match(/@font-face \{/g) ?? [];
    expect(faces.length).toBe(7); // 4 Next + 2 Mono + 1 fallback
    expect(css).toContain('font-family: "Atkinson Hyperlegible Next";');
    expect(css).toContain('font-family: "Atkinson Hyperlegible Mono";');
    expect(css).toContain('font-weight: 200 800;');
    expect(css).toContain('font-display: swap;');
    expect(css).toContain('font-style: italic;');
    expect(css).toMatch(/font-family: "Atkinson Hyperlegible Next Fallback";[\s\S]*size-adjust: \d+(\.\d+)?%;/);
  });

  it('ships every referenced file plus the OFL licenses', async () => {
    const css = await readFile(new URL('fonts.css', distUrl), 'utf8');
    const files = await readdir(new URL('fonts/', distUrl));

    for (const [, file] of css.matchAll(/url\("\.\/fonts\/([^"]+)"\)/g)) expect(files).toContain(file);
    expect(files).toEqual(expect.arrayContaining(['atkinson-hyperlegible-next-OFL.txt', 'atkinson-hyperlegible-mono-OFL.txt']));
  });

  it('the fallback face name matches the font stack in ref/font.json', async () => {
    const font = JSON.parse(await readFile(new URL('../src/ref/font.json', import.meta.url), 'utf8'));
    expect(font.ref.font['atkinson-next'].$value[1]).toBe('Atkinson Hyperlegible Next Fallback');
  });
});
