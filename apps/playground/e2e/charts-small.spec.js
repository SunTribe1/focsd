import { expect, test } from './fixtures/test.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/charts-small.html');
  await page.waitForFunction(() => customElements.get('focsd-sparkline') && customElements.get('focsd-gauge'));
  await page.evaluate(() => Promise.all([...document.querySelectorAll('focsd-sparkline, focsd-gauge')].map((e) => e.updateComplete)));
});

test('a sparkline is an image named by its label and a sentence', async ({ page }) => {
  await expect(page.getByRole('img', { name: 'Signups per day: 6 values, from 4 to 19, last 17, up 325% from the first' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Errors per hour: 2 values, from 5 to 10, last 5, down 50% from the first' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Visits: No data' })).toBeVisible();
  await expect(page.getByRole('img', { name: /Revenue per day: .*from \$120 to \$310, last \$290/ })).toBeVisible();
});

test('a sparkline has no tab stops and draws each type', async ({ page }) => {
  const info = await page.evaluate(() => {
    const parts = (id, p) => document.getElementById(id).shadowRoot.querySelectorAll(`[part="${p}"]`).length;

    return {
      line: parts('line', 'line'),
      last: parts('line', 'last'),
      area: parts('area', 'area'),
      bars: parts('bar', 'bar'),
      focusable: document.getElementById('line').shadowRoot.querySelectorAll('[tabindex]').length,
    };
  });

  expect(info).toEqual({ line: 1, last: 1, area: 1, bars: 6, focusable: 0 });
});

test('the last-value dot is a round-capped point that keeps its shape when the graphic stretches', async ({ page }) => {
  const style = await page.locator('#line').evaluate((el) => {
    const s = getComputedStyle(el.shadowRoot.querySelector('[part="last"]'));

    return { cap: s.strokeLinecap, effect: s.vectorEffect, width: s.strokeWidth };
  });

  expect(style).toEqual({ cap: 'round', effect: 'non-scaling-stroke', width: '5px' });
});

test('the sparkline follows the line height', async ({ page }) => {
  const [height, lh] = await page
    .locator('#line')
    .evaluate((el) => [el.getBoundingClientRect().height, Number.parseFloat(getComputedStyle(el).lineHeight)]);

  expect(Math.abs(height - lh)).toBeLessThanOrEqual(1);
});

test('a gauge is a meter with a name, bounds and value text that includes the band', async ({ page }) => {
  const meter = page.getByRole('meter', { name: 'CPU load' });

  await expect(meter).toHaveAttribute('aria-valuemin', '0');
  await expect(meter).toHaveAttribute('aria-valuemax', '100');
  await expect(meter).toHaveAttribute('aria-valuenow', '72');
  await expect(meter).toHaveAttribute('aria-valuetext', '72%, Warning');
});

test('bands are named in text and the current one is marked, not only colored', async ({ page }) => {
  const items = page.locator('#cpu').locator('[part="legend"] li');

  await expect(items).toHaveText(['Normal, up to 60%', 'Warning, up to 85%', 'Critical, up to 100%']);
  await expect(items.nth(1)).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('#cpu').locator('[part="tick"]')).toHaveCount(2);
  await expect(page.locator('#cpu').locator('[part="value"]')).toHaveText('72%');
});

test('changing the value updates the meter and its band', async ({ page }) => {
  await page.evaluate(() => {
    document.getElementById('cpu').value = 95;

    return document.getElementById('cpu').updateComplete;
  });
  await expect(page.getByRole('meter', { name: 'CPU load' })).toHaveAttribute('aria-valuetext', '95%, Critical');
});

test('a gauge without bands has no legend and plain value text', async ({ page }) => {
  await expect(page.getByRole('meter', { name: 'Disk used' })).toHaveAttribute('aria-valuetext', '35');
  await expect(page.locator('#plain').locator('[part="legend"]')).toHaveCount(0);
});

test('forced colors draw the marks in system colors', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'WebKit does not emulate forced colors');
  await page.emulateMedia({ forcedColors: 'active' });
  const text = await page.evaluate(() => getComputedStyle(document.body).color);
  const stroke = await page.locator('#line').evaluate((el) => getComputedStyle(el.shadowRoot.querySelector('[part="line"]')).stroke);
  const needle = await page.locator('#cpu').evaluate((el) => getComputedStyle(el.shadowRoot.querySelector('[part="needle"]')).stroke);

  expect(stroke).toBe(text);
  expect(needle).toBe(text);
});

test('forced colors: the gauge arc is Highlight and the band ring stays text color, so they do not merge', async ({
  page,
  browserName,
}) => {
  test.skip(browserName === 'webkit', 'WebKit does not emulate forced colors');
  await page.emulateMedia({ forcedColors: 'active' });

  const { arc, band, highlight, text } = await page.locator('#cpu').evaluate((el) => {
    const probe = document.createElement('span');
    probe.style.color = 'Highlight';
    document.body.append(probe);
    const picked = getComputedStyle(probe).color;
    probe.remove();
    const fill = (part) => getComputedStyle(el.shadowRoot.querySelector(`[part~="${part}"]`)).fill;

    return { arc: fill('arc'), band: fill('band'), highlight: picked, text: getComputedStyle(document.body).color };
  });

  expect(arc).toBe(highlight);
  expect(band).toBe(text);
  expect(arc).not.toBe(band);
});

test('the gauge does not animate, so reduced motion needs no special case', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });

  const durations = await page.locator('#cpu').evaluate((el) =>
    [...el.shadowRoot.querySelectorAll('*')].flatMap((n) => {
      const duration = getComputedStyle(n).transitionDuration;

      return Number.parseFloat(duration) > 0.001 ? [duration] : [];
    }),
  );

  expect(durations).toEqual([]);
});
