import { expect, test } from '@playwright/test';

// Runs against a docs build with FOCSD_SANDBOXES=1 (the buttons otherwise appear only once the
// packages are published). Requests are intercepted: nothing is sent to CodePen or StackBlitz.

test('examples offer CodePen and StackBlitz with named, keyboard-reachable buttons', async ({ page }) => {
  await page.goto('/components/select/');
  const pen = page.getByRole('button', { name: /^Open in CodePen: Select example/ }).first();
  const blitz = page.getByRole('button', { name: /^Open in StackBlitz: Select example/ }).first();
  await expect(pen).toBeVisible();
  await expect(blitz).toBeVisible();
  // They submit to a new tab, and say so.
  await expect(pen).toHaveAccessibleName(/\(opens in a new tab\)$/);
  await expect(blitz).toHaveAccessibleName(/\(opens in a new tab\)$/);
  // Reached with Tab, not focus(): start just before the buttons and walk forward.
  await pen.evaluate((el) => {
    const start = document.createElement('button');
    start.id = 'tab-start';
    start.textContent = 'start';
    el.closest('.focsd-example-sandboxes').before(start);
  });
  await page.locator('#tab-start').focus();
  await page.keyboard.press('Tab');
  await expect(pen).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(blitz).toBeFocused();
});

for (const [name, origin, field] of [
  ['CodePen', 'https://codepen.io/pen/define', 'data'],
  ['StackBlitz', 'https://stackblitz.com/run', 'project[files][package.json]'],
]) {
  test(`${name} receives a POST with the example`, async ({ page, context }) => {
    let request;
    await context.route(`${origin}**`, (route) => {
      request = route.request();

      return route.abort();
    });
    await page.goto('/components/select/');
    await page
      .getByRole('button', { name: new RegExp(`^Open in ${name}`) })
      .first()
      .click();
    await expect.poll(() => request, { timeout: 10_000 }).toBeTruthy();
    expect(request.method()).toBe('POST');
    const body = new URLSearchParams(request.postData());
    expect(body.get(field)).toContain('@focsd-dev/components');
  });
}
