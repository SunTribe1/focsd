import { expect, test } from './fixtures/test.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/polish.html');
  await page.waitForFunction(() => Boolean(customElements.get('focsd-slider')));
});

const run = (page, fn) => page.evaluate(fn);

test('slider, rating and toggle group restore their form state', async ({ page }) => {
  const r = await run(page, async () => {
    const vol = document.getElementById('p-vol');
    vol.formStateRestoreCallback('70');
    const range = document.getElementById('p-range');
    const data = new FormData();
    data.append('price', '10');
    data.append('price', '40');
    range.formStateRestoreCallback(data);
    const rating = document.getElementById('p-rating');
    rating.formStateRestoreCallback('5');
    const align = document.getElementById('p-align');
    const picked = new FormData();
    picked.append('align', 'l');
    picked.append('align', 'r');
    align.formStateRestoreCallback(picked);

    return [vol.value, range.valueLow, range.valueHigh, rating.value, align.value];
  });

  expect(r).toEqual([70, 10, 40, 5, 'l,r']);
});

test('a slider drag fires input while moving and change once on release', async ({ page }) => {
  await run(page, () => {
    window.__events = [];
    const vol = document.getElementById('p-vol');
    vol.addEventListener('input', () => window.__events.push('input'));
    vol.addEventListener('change', () => window.__events.push('change'));
  });
  await page.locator('#p-vol').scrollIntoViewIfNeeded();
  const track = await page.locator('#p-vol [part~="track"]').boundingBox();
  await page.mouse.move(track.x + track.width * 0.5, track.y + track.height / 2);
  await page.mouse.down();
  await page.mouse.move(track.x + track.width * 0.6, track.y + track.height / 2, { steps: 4 });
  await page.mouse.up();
  const events = await run(page, () => window.__events);
  expect(events.filter((e) => e === 'change')).toHaveLength(1);
  expect(events.filter((e) => e === 'input').length).toBeGreaterThan(1);
});

test('range slider with both thumbs at the minimum moves the upper thumb when dragged right', async ({ page }) => {
  await page.locator('#p-range').scrollIntoViewIfNeeded();
  const track = await page.locator('#p-range [part~="track"]').boundingBox();
  await page.mouse.click(track.x + track.width * 0.5, track.y + track.height / 2);
  const r = await run(page, () => [document.getElementById('p-range').valueLow, document.getElementById('p-range').valueHigh]);
  expect(r[0]).toBe(0);
  expect(r[1]).toBeGreaterThan(40);
});

test('a disabled rating leaves the tab order; star names are translated', async ({ page }) => {
  await run(page, async () => {
    const el = document.getElementById('p-rating');
    el.disabled = true;
    await el.updateComplete;
  });
  await expect(page.locator('#p-rating [role="radio"][tabindex="0"]')).toHaveCount(0);
  await run(page, () => window.focsd?.registerTranslation);
  await expect(page.locator('#p-rating [role="radio"]').first()).toHaveAccessibleName('1 star');
});

test('disabling the checked radio moves the tab stop', async ({ page }) => {
  await run(page, async () => {
    const b = document.querySelector('#p-radios focsd-radio[value="b"]');
    b.disabled = true;
    await b.updateComplete;
    await document.getElementById('p-radios').updateComplete;
  });
  await expect(page.locator('#p-radios focsd-radio[value="b"]')).toHaveAttribute('tabindex', '-1');
  await expect(page.locator('#p-radios focsd-radio[tabindex="0"]')).toHaveCount(1);
});

test('search field keeps required; number field rejects hex', async ({ page }) => {
  await expect(page.locator('#p-search [part~="control"]')).toHaveAttribute('required', '');

  const r = await run(page, async () => {
    const el = document.getElementById('p-num');
    el.value = '0x10';
    await el.updateComplete;

    return el.validity.badInput;
  });

  expect(r).toBe(true);
});

test('textarea counter announces after typing pauses, not on every key', async ({ page }) => {
  await page.locator('#p-notes [part~="control"]').pressSequentially('abc');
  // The count goes through the shared announcer (announce()), not a live region of its own (B14).
  const live = page.locator('[data-focsd-announcer="polite"]');
  expect(await page.evaluate(() => document.querySelector('[data-focsd-announcer="polite"]')?.textContent ?? '')).toBe('');
  await expect(live).toHaveText('3 of 40 characters', { timeout: 3000 });
  await expect(page.locator('#p-notes [part~="counter"]')).not.toHaveAttribute('aria-live');
  // counter-live is kept as an alias (ruling L58): it mirrors the announced count but is hidden
  // from screen readers, so the count is heard once, through the shared announcer.
  const alias = page.locator('#p-notes [part~="counter-live"]');
  await expect(alias).toHaveText('3 of 40 characters');
  await expect(alias).toHaveAttribute('aria-hidden', 'true');
  await expect(alias).not.toHaveAttribute('aria-live');
});

test('meter clamps aria-valuenow; progress with max 0 has no NaN', async ({ page }) => {
  await expect(page.locator('#p-meter')).toHaveAttribute('aria-valuenow', '100');
  const width = await page.locator('#p-progress').evaluate((el) => el.shadowRoot.innerHTML.includes('NaN'));
  expect(width).toBe(false);
});

test('clearing a button group label removes its name', async ({ page }) => {
  await run(page, async () => {
    const el = document.getElementById('p-group');
    el.label = '';
    await el.updateComplete;
  });
  await expect(page.locator('#p-group')).not.toHaveAttribute('aria-label');
});

test('a live alert has its role before its content arrives', async ({ page }) => {
  const role = await run(page, () => {
    const alert = document.createElement('focsd-alert');
    alert.setAttribute('live', 'assertive');
    document.getElementById('p-alert-host').append(alert);

    return alert.getAttribute('role');
  });

  expect(role).toBe('alert');
});
