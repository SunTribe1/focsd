import { expect, test } from './fixtures/test.js';

test('a toggle group placed inline stays on the line with its text by default', async ({ page }) => {
  await page.goto('/consistent-inputs.html');
  await page.waitForFunction(() => window.__ready === true);

  const display = await page.evaluate(async () => {
    const p = document.createElement('p');
    p.innerHTML =
      'Align: <focsd-toggle-group id="inline-tg" label="Alignment" value="left"><focsd-toggle value="left">L</focsd-toggle><focsd-toggle value="right">R</focsd-toggle></focsd-toggle-group> now';
    document.body.append(p);
    const tg = document.getElementById('inline-tg');
    await tg.updateComplete;

    const top = getComputedStyle(tg).display;

    tg.setAttribute('label-position', 'start');
    await tg.updateComplete;

    return [top, getComputedStyle(tg).display];
  });

  expect(display).toEqual(['inline-block', 'block']);
});
