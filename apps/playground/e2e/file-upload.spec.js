import { expect, test } from './fixtures/test.js';
import { mountInMain as mount, openFromMinorsForms } from './fixtures/pages.js';

// Re-homed from minors-forms.spec.js (Q48).

test('showPicker without a user gesture throws NotAllowedError, like native', async ({ page, browserName }) => {
  await openFromMinorsForms(page);
  test.skip(browserName === 'firefox', 'Firefox has no navigator.userActivation');
  await mount(page, '<focsd-file-upload id="fu" label="Files"></focsd-file-upload>');

  // Playwright's evaluate counts as a user gesture: call once transient activation (about 5 s) has expired.
  const error = await page.locator('#fu').evaluate(
    (el) =>
      new Promise((resolve) => {
        const attempt = () => {
          if (navigator.userActivation.isActive) {
            requestAnimationFrame(attempt);

            return;
          }

          try {
            el.showPicker();
            resolve('');
          } catch (e) {
            resolve(e.name);
          }
        };

        attempt();
      }),
  );

  expect(error).toBe('NotAllowedError');
});
