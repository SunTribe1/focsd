import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createFontStack } from '@capsizecss/core';
import arial from '@capsizecss/metrics/arial';
import { fromFile } from '@capsizecss/unpack/fs';
import { pkgRoot } from './paths.mjs';

export const FACES = [
  {
    family: 'Atkinson Hyperlegible Next',
    pkg: '@fontsource-variable/atkinson-hyperlegible-next',
    stem: 'atkinson-hyperlegible-next',
    styles: ['normal', 'italic'],
  },
  {
    family: 'Atkinson Hyperlegible Mono',
    pkg: '@fontsource-variable/atkinson-hyperlegible-mono',
    stem: 'atkinson-hyperlegible-mono',
    styles: ['normal'],
  },
];

const SUBSETS = ['latin-ext', 'latin'];
const pkgDir = (pkg) => join(pkgRoot, 'node_modules', pkg);

const fontFace = ({ family, style, file, range }) => `@font-face {
  font-family: "${family}";
  font-style: ${style};
  font-weight: 200 800;
  font-display: swap;
  src: url("./fonts/${file}") format("woff2");
  unicode-range: ${range};
}`;

/** Copy font files into distDir/fonts and return fonts.css (faces + a metric-matched Arial fallback for Next). */
export async function buildFonts(distDir) {
  await mkdir(join(distDir, 'fonts'), { recursive: true });
  const blocks = [];

  for (const face of FACES) {
    const ranges = JSON.parse(await readFile(join(pkgDir(face.pkg), 'unicode.json'), 'utf8'));

    for (const style of face.styles) {
      for (const subset of SUBSETS) {
        const file = `${face.stem}-${subset}-wght-${style}.woff2`;
        await copyFile(join(pkgDir(face.pkg), 'files', file), join(distDir, 'fonts', file));
        blocks.push(fontFace({ family: face.family, style, file, range: ranges[subset] }));
      }
    }

    await copyFile(join(pkgDir(face.pkg), 'LICENSE'), join(distDir, 'fonts', `${face.stem}-OFL.txt`));
  }

  const next = FACES[0];
  const metrics = await fromFile(join(pkgDir(next.pkg), 'files', `${next.stem}-latin-wght-normal.woff2`));
  const { fontFaces } = createFontStack([metrics, arial]);

  return `/* @focsd/tokens fonts: Atkinson Hyperlegible Next and Mono, SIL Open Font License 1.1 (fonts/*-OFL.txt) */\n${blocks.join('\n\n')}\n\n${fontFaces.trim()}\n`;
}
