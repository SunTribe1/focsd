import { expect, test } from './fixtures/test.js';
import { expectAxeClean } from './fixtures/axe.js';

// Wave 18d: focsd-stat, focsd-animated-number and focsd-status-dot on stat.html.

/** @param {import('@playwright/test').Page} page */
const open = async (page) => {
  await page.goto('/stat.html');
  await page.waitForFunction(() => window.__ready);
};

/**
 * The shadow text of a part inside the element with this id.
 * @param {import('@playwright/test').Page} page
 * @param {string} id
 * @param {string} part
 */
const partText = (page, id, part) =>
  page.evaluate(([i, p]) => document.getElementById(i)?.shadowRoot?.querySelector(`[part~="${p}"]`)?.textContent?.trim() ?? '', [id, part]);

test.describe('stat', () => {
  test('each tile is a group named by its label, with the change in words', async ({ page }) => {
    await open(page);
    const revenue = page.getByRole('group', { name: 'Revenue' });

    await expect(revenue).toBeVisible();
    await expect(revenue).toContainText('$48,200');
    await expect(revenue).toContainText('Up 12% from last period, good');
    await expect(page.getByRole('group', { name: 'Churn' })).toContainText('Up 40% from last month, bad');
    await expect(page.getByRole('group', { name: 'Open tickets' })).toContainText('No change from yesterday');
    await expect(page.getByRole('group', { name: 'Status' })).toContainText('All systems normal');
  });

  test('the delta announces its words, not only the arrow', async ({ page }) => {
    await open(page);

    await expect(page.locator('#orders')).toMatchAriaSnapshot(`
      - group "Orders":
        - link "Orders"
        - text: 1,240 Down 3.1% from last period, bad
    `);
    expect(
      await page.evaluate(() =>
        document.querySelector('#orders')?.shadowRoot?.querySelector('[part~="delta-icon"]')?.getAttribute('aria-hidden'),
      ),
    ).toBe('true');
  });

  test('good="down" colors a rise as bad news: good and bad changes differ in color', async ({ page }) => {
    await open(page);
    /** @param {string} id */

    const deltaColor = (id) =>
      page.evaluate((i) => {
        const delta = document.getElementById(i)?.shadowRoot?.querySelector('[part~="delta"]');

        return delta ? getComputedStyle(delta).color : '';
      }, id);

    expect(await deltaColor('churn')).toBe(await deltaColor('orders'));
    expect(await deltaColor('revenue')).not.toBe(await deltaColor('churn'));
    expect(await deltaColor('tickets')).not.toBe(await deltaColor('revenue'));
  });
});

test.describe('stat parts', () => {
  test('with href the label is a link', async ({ page }) => {
    await open(page);
    await expect(page.locator('#orders').getByRole('link', { name: 'Orders' })).toHaveAttribute('href', '#stats-heading');
  });

  test('the chart and footer slots show only when filled', async ({ page }) => {
    await open(page);

    const hidden = (/** @type {string} */ id, /** @type {string} */ part) =>
      page.evaluate(
        ([i, p]) => document.getElementById(i)?.shadowRoot?.querySelector(`[part~="${p}"]`)?.hasAttribute('hidden'),
        [id, part],
      );

    expect(await hidden('revenue', 'chart')).toBe(false);
    expect(await hidden('revenue', 'footer')).toBe(false);
    expect(await hidden('churn', 'chart')).toBe(true);
    expect(await hidden('churn', 'footer')).toBe(true);
  });

  test('right to left: the arrow and words sit in reading order', async ({ page }) => {
    await open(page);

    const [icon, words] = await page.evaluate(() => {
      const root = document.querySelector('#rtl-stat')?.shadowRoot;

      return ['[part~="delta-icon"]', '[part~="delta"] span'].map((s) => root?.querySelector(s)?.getBoundingClientRect().x ?? 0);
    });

    expect(icon).toBeGreaterThan(words);
  });
});

test.describe('animated number', () => {
  test('under reduced motion the text equals the final value in the same frame', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);

    // A long duration token, so the 0 ms token under reduced motion cannot be what makes this pass:
    // only the media query branch can.
    const result = await page.evaluate(async () => {
      const el = /** @type {HTMLElement & { value: number, updateComplete: Promise<boolean> }} */ (document.querySelector('#balance'));
      el.style.setProperty('--focsd-duration-slow', '4000ms');
      let frames = 0;
      requestAnimationFrame(() => frames++);
      el.value = 9876.5;
      await el.updateComplete;

      return { text: el.shadowRoot?.querySelector('[part~="number"]')?.textContent, frames };
    });

    expect(result).toEqual({ text: '€9,876.50', frames: 0 });
  });

  test('it counts to the new value while screen readers only get the final one', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await open(page);
    // A long count, so the test sees it mid-way.
    await page.evaluate(() => {
      const el = /** @type {HTMLElement & { duration: number, value: number }} */ (document.querySelector('#balance'));
      el.duration = 4000;
      el.value = 9000;
    });
    await page.waitForFunction(() => {
      const text = document.querySelector('#balance')?.shadowRoot?.querySelector('[part~="number"]')?.textContent ?? '';

      return text !== '€1,250.50' && text !== '€9,000.00';
    });

    // Mid-count, the accessibility tree already holds the final value, and only it.
    expect(await page.locator('#balance').ariaSnapshot()).toBe('- text: €9,000.00');
    expect(await partText(page, 'balance', 'number')).not.toBe('€9,000.00');
    await expect.poll(() => partText(page, 'balance', 'number'), { timeout: 8000 }).toBe('€9,000.00');
  });

  test('the stat with animate counts to its new value after a click', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await open(page);
    await page.getByRole('button', { name: 'Add 500 visitors' }).click();
    await expect(page.getByRole('group', { name: 'Visitors today' })).toMatchAriaSnapshot(`
      - group "Visitors today":
        - text: Visitors today 1,480 Up 5% from last period, good
    `);
  });
});

test.describe('status dot', () => {
  const STATUSES = ['online', 'offline', 'busy', 'warning', 'error', 'neutral'];

  test('each dot is an image named by its status, with its label shown', async ({ page }) => {
    await open(page);
    const dots = page.locator('#dots');

    for (const name of ['Online', 'Offline', 'Busy', 'Warning', 'Error', 'Unknown'])
      await expect(dots.getByRole('img', { name })).toBeVisible();
    await expect(dots).toContainText('Online');
    await expect(page.getByRole('img', { name: 'Ada Okafor is online' })).toBeVisible();
  });

  test('the shapes differ per status (path data), not only the color', async ({ page }) => {
    await open(page);

    const paths = await page.evaluate(
      (statuses) =>
        statuses.map((s) =>
          document
            .querySelector(`#dots focsd-status-dot[status="${s}"]`)
            ?.shadowRoot?.querySelector('[part~="dot"] path')
            ?.getAttribute('d'),
        ),
      STATUSES,
    );

    expect(paths.every(Boolean)).toBe(true);
    expect(new Set(paths).size).toBe(STATUSES.length);
  });
});

test.describe('status dot pulse and forced colors', () => {
  test('the pulse animates transform and opacity only, and is gone under reduced motion', async ({ page }) => {
    await open(page);

    const halo = () =>
      page.evaluate(() => {
        const el = document.querySelector('#pulse')?.shadowRoot?.querySelector('.halo');

        if (!el) return null;
        const style = getComputedStyle(el);

        return {
          display: style.display,
          keyframes: el.getAnimations().flatMap((a) => /** @type {KeyframeEffect} */ (a.effect).getKeyframes()),
        };
      });

    const moving = await halo();
    expect(moving?.display).not.toBe('none');

    const props = new Set(
      moving?.keyframes.flatMap((k) => Object.keys(k).filter((key) => !['offset', 'easing', 'composite', 'computedOffset'].includes(key))),
    );

    expect([...props].toSorted()).toEqual(['opacity', 'transform']);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect((await halo())?.display).toBe('none');
  });

  test('the pulse stops by itself within 5 seconds (WCAG 2.2.2)', async ({ page }) => {
    await open(page);

    const timing = await page.evaluate(() => {
      const halo = document.querySelector('#pulse')?.shadowRoot?.querySelector('.halo');
      const [animation] = halo?.getAnimations() ?? [];
      const { iterations, duration } = /** @type {Animation} */ (animation).effect.getComputedTiming();

      return { iterations, total: Number(iterations) * Number(duration) };
    });

    expect(Number.isFinite(timing.iterations)).toBe(true);
    expect(timing.total).toBeLessThanOrEqual(5000);
  });

  test('forced colors draw the dot in CanvasText', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit does not emulate forced colors');
    await page.emulateMedia({ forcedColors: 'active' });
    await open(page);

    const [dot, text] = await page.evaluate(() => {
      const el = document.querySelector('#dots focsd-status-dot[status="online"]');
      const fill = getComputedStyle(/** @type {Element} */ (el?.shadowRoot?.querySelector('[part~="dot"]'))).fill;

      return [fill, getComputedStyle(document.body).color];
    });

    expect(dot).toBe(text);
  });
});

test('stat.html has no axe violations', async ({ page }) => {
  await open(page);
  await expectAxeClean(page);
});
