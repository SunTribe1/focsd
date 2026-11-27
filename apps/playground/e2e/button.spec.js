import { expect, test } from './fixtures/test.js';
import { clickInert } from './fixtures/dom.js';
import {
  mountFixture as mount,
  openFromReviewFixes,
  mountInMain as mountFromMinorsForms,
  openFromMinorsForms,
  openFromParityReviewFixes,
} from './fixtures/pages.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => customElements.get('focsd-button'));
});

test('exposes buttons with names and disabled state', async ({ page }) => {
  await expect(page.locator('#button-row')).toMatchAriaSnapshot(`
    - button "Save changes"
    - button "Cancel"
    - button "Preview email"
    - button "Delete workspace"
    - button "Export (no data yet)" [disabled]
  `);
});

test('activates with click, Enter and Space', async ({ page }) => {
  await page.locator('#btn-action').click();
  await page.locator('#btn-action').focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await expect(page.locator('#btn-count')).toHaveText('3');
});

test('disabled stays focusable but does not activate', async ({ page }) => {
  await page.locator('#btn-disabled').focus();
  const focused = await page.evaluate(() => document.activeElement?.id);
  expect(focused).toBe('btn-disabled');
  await page.keyboard.press('Enter');
  await clickInert(page.locator('#btn-disabled'));
  await expect(page.locator('#btn-count')).toHaveText('0');
});

test('type=submit submits its form', async ({ page }) => {
  await page.locator('#btn-submit').click();
  await expect(page.locator('#btn-form-result')).toHaveText('submitted');
});

test('action variant uses the action token colors', async ({ page }) => {
  const [bg, fg] = await page.evaluate(() => {
    const control = document.getElementById('btn-action').shadowRoot.querySelector('[part~="control"]');
    const style = getComputedStyle(control);

    return [style.backgroundColor, style.color];
  });

  expect(bg).not.toBe(fg);
  expect(bg).not.toBe('rgba(0, 0, 0, 0)');
});

// Re-homed from review-fixes.spec.js (Q48).

test('focsd-button name/value submit with the form and become the dialog returnValue', async ({ page }) => {
  await openFromReviewFixes(page);
  await mount(page, `<form id="f5"><focsd-button id="b5" type="submit" name="intent" value="save">Save</focsd-button></form>`);
  await page.evaluate(() => {
    window.f5 = null;
    document.getElementById('f5').addEventListener('submit', (e) => {
      e.preventDefault();
      window.f5 = Object.fromEntries(new FormData(e.target));
    });
  });
  await page.locator('#b5').click();
  expect(await page.evaluate(() => window.f5)).toEqual({ intent: 'save' });
  await mount(
    page,
    `<focsd-dialog id="d5" headline="Pick"><form method="dialog"><focsd-button type="submit" value="yes">Yes</focsd-button></form></focsd-dialog>`,
  );
  await page.evaluate(() => document.getElementById('d5').show());
  await page.getByRole('button', { name: 'Yes', exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.getElementById('d5').returnValue)).toBe('yes');
});

test('focsd-button in a disabled fieldset does not submit', async ({ page }) => {
  await openFromReviewFixes(page);
  await mount(page, `<form id="f6"><fieldset disabled><focsd-button id="b6" type="submit">Go</focsd-button></fieldset></form>`);
  await page.evaluate(() => {
    window.f6 = false;
    document.getElementById('f6').addEventListener('submit', (e) => {
      e.preventDefault();
      window.f6 = true;
    });
  });
  await clickInert(page.locator('#b6'));
  expect(await page.evaluate(() => window.f6)).toBe(false);
  await expect(page.getByRole('button', { name: 'Go' })).toBeDisabled();
});

// Re-homed from minors-forms.spec.js (Q48).

test('popovertarget: aria-expanded clears when the target is removed and rebinds after a move', async ({ page }) => {
  await openFromMinorsForms(page);
  await mountFromMinorsForms(page, '<div id="pp" popover>Panel</div><focsd-button id="pb" popovertarget="pp">Panel</focsd-button>');
  const inner = page.locator('#pb [part~="control"]');
  await page.locator('#pb').click();
  await expect(inner).toHaveAttribute('aria-expanded', 'true');
  await page.evaluate(() => document.getElementById('pp').hidePopover());
  await page.locator('#pb').evaluate((el) => el.removeAttribute('popovertarget'));
  await expect(inner).not.toHaveAttribute('aria-expanded', /.*/);
  await page.locator('#pb').evaluate((el) => {
    el.setAttribute('popovertarget', 'pp');
    document.querySelector('main').append(el);
  });
  await page.locator('#pb').click();
  await expect(inner).toHaveAttribute('aria-expanded', 'true');
});

test('the submitter can still be read after an async gap in the submit handler', async ({ page }) => {
  await openFromMinorsForms(page);
  await mountFromMinorsForms(
    page,
    '<form id="sbf"><input name="q" value="x"><focsd-button id="sbb" type="submit" name="go" value="1" formmethod="post">Go</focsd-button></form>',
  );
  await page.evaluate(() => {
    window.__sub = new Promise((resolve) => {
      document.getElementById('sbf').addEventListener('submit', async (e) => {
        e.preventDefault();
        await new Promise((r) => setTimeout(r, 0));

        try {
          resolve(Object.fromEntries(new FormData(e.target, e.submitter)));
        } catch (err) {
          resolve({ error: err.name });
        }
      });
    });
  });
  await page.locator('#sbb').click();
  expect(await page.evaluate(() => window.__sub)).toEqual({ q: 'x', go: '1' });
});

// Re-homed from parity-review-fixes.spec.js (Q48).

test('formmethod="dialog" on a focsd-button closes the focsd-dialog with its value', async ({ page }) => {
  await openFromParityReviewFixes(page);
  await page.locator('#pt-dialog-open').click();
  await page.locator('#pt-dialog-save').click();
  await expect(page.locator('#pt-dialog dialog')).toBeHidden();
  expect(await page.evaluate(() => document.getElementById('pt-dialog').returnValue)).toBe('saved');
});
