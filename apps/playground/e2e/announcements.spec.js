import { expect, ready, settle, test } from './fixtures/test.js';
import { announcements, expectAnnounced, recordAnnouncements } from './fixtures/announcements.js';

// What a screen reader hears from live regions, recorded through shadow roots.
test.beforeEach(async ({ page }) => {
  await recordAnnouncements(page);
});

test('a toast is announced politely and nothing is announced on load', async ({ page }) => {
  await page.clock.install();
  await page.goto('/overlays.html');
  await ready(page, 'focsd-toaster');
  await page.clock.runFor(300);
  await settle(page);
  expect(await announcements(page)).toEqual([]);
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expectAnnounced(page, 'Draft saved');
});

test('typing in a textarea with maxlength announces the count after a pause, a prefilled value does not', async ({ page }) => {
  await page.clock.install();
  await page.goto('/i18n.html');
  await ready(page, 'focsd-textarea');
  await page.clock.runFor(1500);
  await settle(page);
  expect((await announcements(page)).some((a) => /characters/.test(a.text))).toBe(false);
  await page.locator('#l-notes').getByRole('textbox').pressSequentially(' more');
  await expectAnnounced(page, /\d+ of 50 characters/);
});

// Fixture self-tests: each would have been a false pass (or a false miss) before.
const blank = async (page) => {
  await page.goto('/sheet.html');
  await ready(page, 'focsd-bottom-sheet');
  await settle(page);
};

test('fixture: a live region inserted already holding text is recorded', async ({ page }) => {
  await blank(page);
  await page.evaluate(() => {
    const wrap = document.createElement('section');
    wrap.innerHTML = '<div role="alert">Payment failed</div>';
    document.body.append(wrap);
  });
  await expectAnnounced(page, 'Payment failed', 'assertive');
});

test('fixture: slotted text in a shadow live region is recorded', async ({ page }) => {
  await blank(page);
  await page.evaluate(() => {
    customElements.define(
      'pg-slot-live',
      class extends HTMLElement {
        constructor() {
          super();
          this.attachShadow({ mode: 'closed' }).innerHTML = '<div aria-live="polite"><slot></slot></div>';
        }
      },
    );
    const el = document.createElement('pg-slot-live');
    document.body.append(el);
  });
  await settle(page);
  await page.evaluate(() => (document.querySelector('pg-slot-live').textContent = '3 results'));
  await expectAnnounced(page, '3 results');
});

test('fixture: clearing a region then setting the same text announces it again', async ({ page }) => {
  await blank(page);
  await page.evaluate(() => {
    const el = document.createElement('div');
    el.id = 'pg-live';
    el.setAttribute('role', 'status');
    document.body.append(el);
  });
  await settle(page);
  const set = (text) => page.evaluate((t) => (document.getElementById('pg-live').textContent = t), text);
  await set('Copied');
  await expectAnnounced(page, 'Copied');
  await set('');
  await settle(page);
  await set('Copied');
  await expect.poll(async () => (await announcements(page)).filter((a) => a.text === 'Copied').length).toBe(2);
});

test('fixture: hidden, role and aria-live changes are observed', async ({ page }) => {
  await blank(page);
  await page.evaluate(() => {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div id="pg-hidden" aria-live="polite" hidden></div><div id="pg-role">Connection lost</div><div id="pg-late">Saving</div>',
    );
  });
  await settle(page);
  // Text set while hidden is not heard; showing the region is.
  await page.evaluate(() => (document.getElementById('pg-hidden').textContent = 'Upload complete'));
  await settle(page);
  expect((await announcements(page)).some((a) => a.text === 'Upload complete')).toBe(false);
  await page.evaluate(() => document.getElementById('pg-hidden').removeAttribute('hidden'));
  await expectAnnounced(page, 'Upload complete');
  // An alert role added to content announces it.
  await page.evaluate(() => document.getElementById('pg-role').setAttribute('role', 'alert'));
  await expectAnnounced(page, 'Connection lost', 'assertive');
  // aria-live added later: the existing text is not announced, the next change is.
  await page.evaluate(() => document.getElementById('pg-late').setAttribute('aria-live', 'polite'));
  await settle(page);
  expect((await announcements(page)).some((a) => a.text === 'Saving')).toBe(false);
  await page.evaluate(() => (document.getElementById('pg-late').textContent = 'Saved'));
  await expectAnnounced(page, 'Saved');
});
