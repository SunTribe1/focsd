import { expect, test } from './fixtures/test.js';
import { openFromReviewFixes4, openFromMinorsMisc } from './fixtures/pages.js';

// Re-homed from review-fixes-4.spec.js (Q48).

test('live region is polite while rotation is paused by focus', async ({ page }) => {
  await openFromReviewFixes4(page);
  await page.evaluate(() => {
    const car = document.createElement('focsd-carousel');
    car.id = 'auto';
    car.label = 'Auto';
    car.setAttribute('autoplay', '5000');
    car.innerHTML = '<focsd-carousel-slide><p>One</p></focsd-carousel-slide><focsd-carousel-slide><p>Two</p></focsd-carousel-slide>';
    document.getElementById('pg-main').prepend(car);
  });
  const region = page.getByRole('region', { name: 'Auto' });
  const live = () => page.locator('#auto').evaluate((el) => el.shadowRoot.querySelector('[part~="slides"]').getAttribute('aria-live'));
  expect(await live()).toBe('off');
  await region.getByRole('button', { name: 'Next slide' }).focus();
  await expect.poll(live).toBe('polite');
  await page.mouse.move(0, 0);
  await page.locator('#auto').dispatchEvent('pointerleave');
  await expect.poll(live).toBe('polite');
  await page.getByRole('region', { name: 'Release notes' }).focus();
  await expect.poll(live).toBe('off');
});

// Re-homed from minors-misc.spec.js (Q48).

test('a carousel index set before its slides exist (or not a number) lands on a real slide', async ({ page }) => {
  await openFromMinorsMisc(page);

  const shown = await page.evaluate(async () => {
    const c = document.createElement('focsd-carousel');
    c.setAttribute('label', 'Tips');
    c.index = 5;
    document.body.append(c);
    await c.updateComplete;
    c.innerHTML = '<focsd-carousel-slide>One</focsd-carousel-slide><focsd-carousel-slide>Two</focsd-carousel-slide>';
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await c.updateComplete;
    const first = [...c.children].findIndex((s) => !s.hidden);
    c.index = NaN;
    await c.updateComplete;
    const second = [...c.children].findIndex((s) => !s.hidden);

    return [first, second, c.index];
  });

  expect(shown).toEqual([1, 0, 0]);
});
