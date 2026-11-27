import { expect, ready, test } from './fixtures/test.js';

// Re-homed from final-minors.spec.js (Q48).

test('a closed popover never takes pointer events, even where interactivity: inert is unsupported', async ({ page }) => {
  await page.goto('/overlays.html');
  await ready(page, 'focsd-popover');

  const pointerEvents = () =>
    page.locator('#pop').evaluate((el) => getComputedStyle(el.shadowRoot.querySelector('[part~="panel"]')).pointerEvents);

  expect(await pointerEvents()).toBe('none');
  await page.locator('#pop').evaluate((el) => el.show());
  await expect.poll(pointerEvents).not.toBe('none');
});

test('a popover moved while open resets to closed, and its trigger says so (B14 m2)', async ({ page }) => {
  await page.goto('/overlays.html');
  await ready(page, 'focsd-popover');
  const trigger = page.locator('#pop-trigger').getByRole('button');
  const dialog = page.getByRole('dialog', { name: 'Filter members' });
  await trigger.click();
  await expect(dialog).toBeVisible();
  // A framework move: removal hides the popover without toggle events.
  await page.evaluate(() => {
    const pop = document.getElementById('pop');
    pop.parentElement.append(pop);
  });
  await expect(dialog).toBeHidden();
  expect(await page.locator('#pop').evaluate((el) => el.open)).toBe(false);
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  await expect(dialog).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
});
