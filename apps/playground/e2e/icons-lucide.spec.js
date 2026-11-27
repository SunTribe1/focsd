import { expect, test } from './fixtures/test.js';
import * as lucide from 'lucide';
import { generateLucidePaths, LUCIDE_NAMES } from '../../../packages/primitives/scripts/build-icons.mjs';

const ATTRS =
  'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

const toMarkup = ([tag, attrs]) =>
  `<${tag} ${Object.entries(attrs)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ')}/>`;

test('default icons draw exactly what Lucide draws', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Geometry check: one engine is enough');
  const paths = await generateLucidePaths();

  const pairs = Object.entries(LUCIDE_NAMES).map(([name, lucideName]) => {
    const node = lucide[lucideName][0] === 'svg' ? lucide[lucideName][2] : lucide[lucideName];

    return { name, ours: `<svg ${ATTRS}><path d="${paths[name]}"/></svg>`, theirs: `<svg ${ATTRS}>${node.map(toMarkup).join('')}</svg>` };
  });

  await page.goto('/icons.html');

  const diffs = await page.evaluate(async (list) => {
    const size = 96;

    const pixels = async (markup) => {
      const img = new Image(size, size);
      img.src = `data:image/svg+xml,${encodeURIComponent(markup)}`;
      await img.decode();
      const canvas = new OffscreenCanvas(size, size);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, size, size);

      return ctx.getImageData(0, 0, size, size).data;
    };

    const out = {};

    for (const { name, ours, theirs } of list) {
      const [a, b] = await Promise.all([pixels(ours), pixels(theirs)]);
      let differing = 0;

      for (let i = 3; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) > 64) differing += 1;
      out[name] = differing;
    }

    return out;
  }, pairs);

  // Anti-aliasing where overlapping strokes merge may differ on a handful of edge pixels.
  for (const [name, differing] of Object.entries(diffs)) expect(differing, name).toBeLessThanOrEqual(12);
});
