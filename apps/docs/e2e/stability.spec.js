import { expect, test } from '@playwright/test';
import { components } from '../src/data/catalogue.js';

// Moving between pages must not jolt the content: examples reserve their final height and only
// appear once their elements are defined (CLS = cumulative layout shift; "good" is below 0.1).
test.use({ contextOptions: { reducedMotion: 'reduce' } });

const MAX_CLS = 0.02;

test('component pages do not shift while their examples upgrade', async ({ page }) => {
  test.setTimeout(240000);
  await page.addInitScript(() => {
    window.__cls = 0;
    window.__why = [];
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.hadRecentInput) continue;
        window.__cls += e.value;

        if (e.value > 0.01) {
          const s = e.sources[0];
          window.__why.push(
            `${e.value.toFixed(3)}@${Math.round(e.startTime)}ms ${s?.node?.nodeName}.${String(s?.node?.className || '').slice(0, 24)} y${Math.round(s?.previousRect.y)}->${Math.round(s?.currentRect.y)} x${Math.round(s?.previousRect.x)}->${Math.round(s?.currentRect.x)}`,
          );
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  const measured = [];

  const pages = [
    ...components.map((c) => ({ slug: c.slug, path: `/components/${c.slug}/`, tag: c.tag })),
    { slug: 'guide: data grid', path: '/guides/data-grid/', tag: 'focsd-data-grid' },
    { slug: 'guide: patterns', path: '/guides/patterns/', tag: 'focsd-data-grid' },
  ];

  for (const c of pages) {
    await page.goto(c.path);
    await page.waitForFunction((tag) => customElements.get(tag), c.tag);
    // Settled: fonts loaded, every component rendered, and two frames for late layout shifts.
    await page.evaluate(async () => {
      await document.fonts.ready;
      const elements = [...document.querySelectorAll('*')].filter((el) => el.localName.includes('-') && 'updateComplete' in el);
      await Promise.all(elements.map((el) => el.updateComplete));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    });
    const { cls, why } = await page.evaluate(() => ({ cls: window.__cls, why: window.__why }));

    measured.push({ cls, line: `${c.slug}: ${cls.toFixed(3)} ${why.join(' ; ')}` });
  }

  expect(measured.flatMap((m) => (m.cls > MAX_CLS ? [m.line] : []))).toEqual([]);
});
