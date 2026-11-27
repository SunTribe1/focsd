import { expect, test } from './fixtures/test.js';
import { THEMES, expectAxeClean, gotoInTheme } from './fixtures/axe.js';
import { pressTab } from './fixtures/keys.js';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

test.beforeEach(async ({ page }) => {
  await page.goto('/toc.html');
  await page.waitForFunction(() => customElements.get('focsd-table-of-contents'));
});

const nav = (page, id = 'toc') => page.locator(`#${id}`).getByRole('navigation', { name: 'On this page' });

test('a named nav with links for h2 and nested h3', async ({ page }) => {
  await expect(nav(page).getByRole('link')).toHaveText(['Install', 'With npm', 'With a CDN', 'Usage', 'Keyboard']);
  await expect(nav(page).getByRole('list').first().getByRole('list')).toHaveCount(1);
  await expect(nav(page, 'toc2').getByRole('link')).toHaveText(['Install', 'Usage', 'Keyboard']);
  await expect(page.locator('main h2').first()).toHaveAttribute('id', 'install');
});

test('the current section is marked as it scrolls', async ({ page }) => {
  await expect(nav(page).getByRole('link', { name: 'Install' })).toHaveAttribute('aria-current', 'location');
  await page.locator('main h2', { hasText: 'Usage' }).scrollIntoViewIfNeeded();
  await expect(nav(page).getByRole('link', { name: 'Usage' })).toHaveAttribute('aria-current', 'location');
  await expect(nav(page).locator('[aria-current]')).toHaveCount(1);
});

test('clicking scrolls, focuses the heading and updates the hash', async ({ page }) => {
  await nav(page).getByRole('link', { name: 'Keyboard' }).click();
  await expect(page.getByRole('heading', { name: 'Keyboard' })).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Keyboard' })).toBeInViewport();
  expect(new URL(page.url()).hash).toBe('#keyboard');
});

test('headings added or removed rebuild the list', async ({ page }) => {
  await page.locator('main h2', { hasText: 'Usage' }).evaluate((h) => h.remove());
  await expect(nav(page).getByRole('link')).toHaveText(['Install', 'With npm', 'With a CDN', 'Keyboard']);
  await page.locator('main').evaluate((m) => m.insertAdjacentHTML('beforeend', '<h2>Theming</h2>'));
  await expect(nav(page).getByRole('link').last()).toHaveText('Theming');
});

test('slotted links replace the generated list and track their targets', async ({ page }) => {
  await page.locator('aside').evaluate((aside) =>
    aside.insertAdjacentHTML(
      'beforeend',
      `<focsd-table-of-contents id="toc3" label="Sections"><ul>
        <li><a href="#npm">Install with npm</a></li><li><a href="#usage">Usage</a></li>
      </ul></focsd-table-of-contents>`,
    ),
  );
  // Slotted links sit in the light DOM: in the flat tree they are inside the nav named "Sections".
  await expect(page.locator('#toc3').getByRole('navigation', { name: 'Sections' })).toBeVisible();
  await expect(page.locator('#toc3').getByRole('list')).toHaveCount(1);
  const sections = page.locator('#toc3');
  await expect(sections.getByRole('link')).toHaveText(['Install with npm', 'Usage']);
  await page.locator('main h2', { hasText: 'Usage' }).scrollIntoViewIfNeeded();
  await expect(sections.getByRole('link', { name: 'Usage' })).toHaveAttribute('aria-current', 'location');
  await sections.getByRole('link', { name: 'Install with npm' }).click();
  await expect(page.getByRole('heading', { name: 'With npm' })).toBeFocused();
  await expect(sections.getByRole('link', { name: 'Install with npm' })).toHaveAttribute('aria-current', 'location');
  await expect(sections.locator('[aria-current]')).toHaveCount(1);
});

test('links meet the target size and show a focus ring', async ({ page }) => {
  const install = nav(page).getByRole('link', { name: 'Install' });

  expect((await install.boundingBox()).height).toBeGreaterThanOrEqual(24);
  await install.focus();
  await pressTab(page);
  await pressTab(page, { shift: true });
  await expect(install).toBeFocused();
  expect(await install.evaluate((a) => getComputedStyle(a).boxShadow)).not.toBe('none');
});

test('at the bottom of the page the last heading is current, even after a short section', async ({ page }) => {
  // The last two sections are short: Usage and Keyboard both sit in the top half at the bottom of the page.
  await page.locator('main p').evaluateAll((ps) => ps.slice(-2).forEach((p) => p.style.setProperty('min-block-size', '0')));
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(nav(page).getByRole('link', { name: 'Keyboard' })).toHaveAttribute('aria-current', 'location');
  await expect(nav(page).locator('[aria-current]')).toHaveCount(1);
});

test('an unrelated change in the region keeps the list and the observer', async ({ page }) => {
  await page.addInitScript(() => {
    const Native = window.IntersectionObserver;

    window.__io = 0;
    window.IntersectionObserver = class extends Native {
      constructor(...args) {
        super(...args);
        window.__io += 1;
      }
    };
  });
  await page.reload();
  await expect(nav(page).getByRole('link')).toHaveCount(5);
  const before = await page.evaluate(() => ({ io: window.__io }));
  await page.evaluate(() => {
    window.__tree = document.querySelector('#toc')._tree;
    document.querySelector('main p').textContent = 'Changed copy, same headings.';
    document.querySelector('main').append(document.createElement('p'));
  });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  expect(await page.evaluate(() => window.__io)).toBe(before.io);
  expect(await page.evaluate(() => document.querySelector('#toc')._tree === window.__tree)).toBe(true);
  await page.locator('main h2', { hasText: 'Usage' }).evaluate((h) => h.replaceChildren('Using it'));
  await expect(nav(page).getByRole('link').nth(3)).toHaveText('Using it');
  expect(await page.evaluate(() => window.__io)).toBe(before.io);
});

test('hrefs are encoded and a replaced region is read again', async ({ page }) => {
  await page.locator('main').evaluate((m) => m.insertAdjacentHTML('beforeend', '<h2 id="faq &amp; help">Questions</h2>'));
  const faq = nav(page).getByRole('link', { name: 'Questions' });

  await expect(faq).toHaveAttribute('href', '#faq%20%26%20help');
  await faq.click();
  await expect(page.getByRole('heading', { name: 'Questions' })).toBeFocused();
  expect(new URL(page.url()).hash).toBe('#faq%20%26%20help');
  await page
    .locator('main')
    .evaluate((m) => m.replaceWith(Object.assign(document.createElement('main'), { innerHTML: '<h2>Changelog</h2>' })));
  await expect(nav(page).getByRole('link')).toHaveText(['Changelog']);
});

test('links added later inside a slotted list are tracked, and replaced links lose aria-current', async ({ page }) => {
  await page
    .locator('aside')
    .evaluate((aside) =>
      aside.insertAdjacentHTML(
        'beforeend',
        '<focsd-table-of-contents id="toc3" label="Sections"><ul><li><a href="#npm">With npm</a></li></ul></focsd-table-of-contents>',
      ),
    );
  const sections = page.locator('#toc3');
  const first = sections.getByRole('link', { name: 'With npm' });

  await first.click();
  await expect(first).toHaveAttribute('aria-current', 'location');
  await sections.locator('ul').evaluate((ul) => ul.insertAdjacentHTML('beforeend', '<li><a href="#keyboard">Keys</a></li>'));
  await sections.getByRole('link', { name: 'Keys' }).click();
  await expect(sections.getByRole('link', { name: 'Keys' })).toHaveAttribute('aria-current', 'location');
  const old = await first.elementHandle();

  await sections.evaluate((toc) =>
    toc.replaceChildren(Object.assign(document.createElement('ul'), { innerHTML: '<li><a href="#usage">Usage</a></li>' })),
  );
  await expect(sections.getByRole('link')).toHaveText(['Usage']);
  expect(await page.evaluate((a) => a.hasAttribute('aria-current'), old)).toBe(false);
});

test('a moved table of contents keeps watching its slotted links', async ({ page }) => {
  await page
    .locator('aside')
    .evaluate((aside) =>
      aside.insertAdjacentHTML(
        'beforeend',
        '<focsd-table-of-contents id="toc3" label="Sections"><ul><li><a href="#npm">With npm</a></li></ul></focsd-table-of-contents>',
      ),
    );
  const sections = page.locator('#toc3');

  await expect(sections.getByRole('link')).toHaveText(['With npm']);
  // Moving the element disconnects and reconnects it; no slotchange follows.
  await page.locator('aside').evaluate((aside) => aside.prepend(aside.querySelector('#toc3')));
  await sections.locator('ul').evaluate((ul) => ul.insertAdjacentHTML('beforeend', '<li><a href="#keyboard">Keys</a></li>'));
  await sections.getByRole('link', { name: 'Keys' }).click();
  await expect(sections.getByRole('link', { name: 'Keys' })).toHaveAttribute('aria-current', 'location');
});

test.describe('with smooth scrolling', () => {
  test.use({ contextOptions: { reducedMotion: 'no-preference' } });

  test('following a link marks only that link while the page scrolls', async ({ page }) => {
    await page.locator('#toc').evaluate((toc) => {
      window.__marks = [];
      new MutationObserver((records) => {
        for (const r of records) if (r.target.getAttribute('aria-current')) window.__marks.push(r.target.textContent);
      }).observe(toc.shadowRoot, { subtree: true, attributeFilter: ['aria-current'] });
    });
    await nav(page).getByRole('link', { name: 'Keyboard' }).click();
    await expect(page.getByRole('heading', { name: 'Keyboard' })).toBeInViewport();
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);

    const settled = () =>
      page.evaluate(
        () =>
          new Promise((r) => {
            const y = scrollY;
            let left = 12; // the position holds for 12 frames, about 200 ms at 60 Hz

            const tick = () => {
              left -= 1;

              if (scrollY !== y || left === 0) r(scrollY === y);
              else requestAnimationFrame(tick);
            };

            requestAnimationFrame(tick);
          }),
      );

    await expect.poll(settled).toBe(true);
    expect(await page.evaluate(() => window.__marks)).toEqual(['Keyboard']);
    await expect(nav(page).getByRole('link', { name: 'Keyboard' })).toHaveAttribute('aria-current', 'location');
  });
});

for (const theme of THEMES)
  test(`axe-clean in the ${theme} theme`, async ({ page }) => {
    await gotoInTheme(page, '/toc.html', theme, 'focsd-table-of-contents');
    await expectAxeClean(page);
  });

test.describe('inside an app shell, where main is the scroller', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/toc-shell.html');
    await page.waitForFunction(() => customElements.get('focsd-app-shell') && customElements.get('focsd-table-of-contents'));
  });

  /** Scroll the shell's main region (the window does not scroll). */
  const scrollMain = (page, to) =>
    page.locator('#shell').evaluate((shell, top) => {
      const main = shell.shadowRoot.querySelector('main');

      main.scrollTo({ top: top === 'end' ? main.scrollHeight : top, behavior: 'instant' });
    }, to);

  test('lists the main content only, not the header, sidebar or footer slots', async ({ page }) => {
    await expect(nav(page).getByRole('link')).toHaveText(['Install', 'Usage', 'Theming', 'Keyboard']);
  });

  test('at the end of main the last heading is current, even after a short section', async ({ page }) => {
    await expect(nav(page).getByRole('link', { name: 'Install' })).toHaveAttribute('aria-current', 'location');
    await scrollMain(page, 'end');
    expect(await page.evaluate(() => scrollY)).toBe(0);
    await expect(nav(page).getByRole('link', { name: 'Keyboard' })).toHaveAttribute('aria-current', 'location');
    await expect(nav(page).locator('[aria-current]')).toHaveCount(1);
  });

  test.describe('with smooth scrolling', () => {
    test.use({ contextOptions: { reducedMotion: 'no-preference' } });

    test('the click lock ends when main stops scrolling, not at the fallback', async ({ page }) => {
      await page.evaluate(() => (window.__t0 = performance.now()));
      await nav(page).getByRole('link', { name: 'Usage' }).click();
      await expect(nav(page).getByRole('link', { name: 'Usage' })).toHaveAttribute('aria-current', 'location');

      const settled = () =>
        page.locator('#shell').evaluate(
          (shell) =>
            new Promise((r) => {
              const main = shell.shadowRoot.querySelector('main');
              const y = main.scrollTop;
              let left = 12; // the position holds for 12 frames, about 200 ms at 60 Hz

              const tick = () => {
                left -= 1;

                if (main.scrollTop !== y || left === 0) r(y > 0 && main.scrollTop === y);
                else requestAnimationFrame(tick);
              };

              requestAnimationFrame(tick);
            }),
        );

      await expect.poll(settled).toBe(true);
      await scrollMain(page, 0);
      await expect(nav(page).getByRole('link', { name: 'Install' })).toHaveAttribute('aria-current', 'location');
      // The fallback releases the lock 3 s after the click; scrollend on main must release it first.
      expect(await page.evaluate(() => performance.now() - window.__t0)).toBeLessThan(2500);
    });
  });
});
