import { expect, test } from './fixtures/test.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/parity.html');
  await page.waitForFunction(() => Boolean(customElements.get('focsd-button')));
});

test('submit button form* overrides apply through a native submitter', async ({ page }) => {
  await page.locator('#pt2-save').click();
  await expect(page.locator('#pt2-result')).toHaveText(
    JSON.stringify({ action: '/drafts', method: 'post', noValidate: true, target: '_self', data: { req: '', op: 'draft' } }),
  );
  await expect(page.locator('#pf2 button[hidden]')).toHaveCount(0);
});

test('popovertarget toggles a popover and the trigger reports aria-expanded', async ({ page }) => {
  const control = page.locator('#pt-pop-btn [part~="control"]');
  await expect(control).toHaveAttribute('aria-expanded', 'false');
  await page.locator('#pt-pop-btn').click();
  await expect(page.locator('#pt-pop')).toBeVisible();
  await expect(control).toHaveAttribute('aria-expanded', 'true');
  await page.locator('#pt-pop-btn').click();
  await expect(page.locator('#pt-pop')).toBeHidden();
  await expect(control).toHaveAttribute('aria-expanded', 'false');
});

test('commandfor: built-in popover and dialog commands, custom commands fire a command event', async ({ page }) => {
  await page.locator('#pt-pop-btn').click();
  await expect(page.locator('#pt-pop')).toBeVisible();
  await page.locator('#pt-cmd-pop').click();
  await expect(page.locator('#pt-pop')).toBeHidden();

  await page.evaluate(() => {
    window.__cmd = null;
    document.getElementById('pt-cmd-target').addEventListener('focsd-command', (e) => {
      window.__cmd = { command: e.command, source: e.source?.id };
    });
  });
  await page.locator('#pt-cmd-custom').click();
  expect(await page.evaluate(() => window.__cmd)).toEqual({ command: '--refresh', source: 'pt-cmd-custom' });

  await page.locator('#pt-cmd-show').click();
  await expect(page.locator('#pt-dlg')).toBeVisible();
  await page.locator('#pt-dlg-close').click();
  await expect(page.locator('#pt-dlg')).toBeHidden();
  expect(await page.evaluate(() => document.getElementById('pt-dlg').returnValue)).toBe('done');
});

test('link forwards target, rel (with noopener), download, hreflang, type, referrerpolicy, ping', async ({ page }) => {
  const a = page.locator('#pt-link a');

  for (const [attr, value] of [
    ['target', '_blank'],
    ['download', 'report.pdf'],
    ['hreflang', 'en'],
    ['type', 'application/pdf'],
    ['referrerpolicy', 'no-referrer'],
    ['ping', '/ping'],
  ]) {
    await expect(a, attr).toHaveAttribute(attr, value);
  }

  await expect(a).toHaveAttribute('rel', /noopener/);
  await expect(a).toContainText('opens in new tab');
});

test('image forwards loading attributes and exposes complete, natural size and decode()', async ({ page }) => {
  const img = page.locator('#pt-img img');

  for (const [attr, value] of [
    ['sizes', '40px'],
    ['width', '40'],
    ['height', '20'],
    ['loading', 'lazy'],
    ['decoding', 'sync'],
    ['fetchpriority', 'high'],
    ['crossorigin', 'anonymous'],
    ['referrerpolicy', 'no-referrer'],
  ]) {
    await expect(img, attr).toHaveAttribute(attr, value);
  }

  await expect(img).toHaveAttribute('srcset', /1x$/);

  const r = await page.evaluate(async () => {
    const el = document.getElementById('pt-img');
    el.scrollIntoView();
    await el.decode();

    return {
      complete: el.complete,
      size: [el.naturalWidth, el.naturalHeight],
      ratio: getComputedStyle(el.shadowRoot.querySelector('[part~="frame"]')).aspectRatio,
    };
  });

  expect(r).toEqual({ complete: true, size: [40, 20], ratio: '40 / 20' });
});
