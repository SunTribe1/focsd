import { expect, ready, test } from './fixtures/test.js';
import { record, recorded } from './fixtures/dom.js';
import { openNavigationPageFromReviewFixes3 } from './fixtures/pages.js';
import { expectFloorFocusRing } from './fixtures/focus-ring.js';
import { pressTab } from './fixtures/keys.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/navigation.html');
  await page.waitForFunction(() =>
    [
      'focsd-breadcrumb',
      'focsd-pagination',
      'focsd-nav-menu',
      'focsd-sidebar',
      'focsd-menubar',
      'focsd-stepper',
      'focsd-header',
      'focsd-toolbar',
      'focsd-list',
      'focsd-description-list',
    ].every((t) => customElements.get(t)),
  );
});

test('header is a banner landmark', async ({ page }) => {
  await expect(page.getByRole('banner')).toMatchAriaSnapshot(`
    - banner:
      - strong: Northwind
      - button "Sign in"
      - navigation "Main":
        - list:
          - listitem:
            - link "Overview"
          - listitem:
            - button "Products"
          - listitem:
            - button "Company"
  `);
});

test('header: changing collapse-below at runtime switches to compact without a resize (B14)', async ({ page }) => {
  const header = page.locator('#hdr');
  const toggle = header.getByRole('button', { name: 'Menu' });
  await expect(toggle).toHaveCount(0);
  await header.evaluate((h) => h.setAttribute('collapse-below', '5000'));
  await expect(header).toHaveAttribute('compact', '');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await header.evaluate((h) => h.setAttribute('collapse-below', '0'));
  await expect(toggle).toHaveCount(0);
  await expect(header.getByRole('navigation', { name: 'Main' })).toBeVisible();
});

test('header: the runtime collapse-below and the resize observer measure the same content box (B14 m3)', async ({ page }) => {
  const header = page.locator('#hdr');

  // Padding makes the border box 200px wider than the content box the observer reports.
  const { border, content } = await header.evaluate(async (h) => {
    h.style.setProperty('padding-inline', '100px');
    h.style.setProperty('border', '0');
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const style = getComputedStyle(h);
    const width = h.getBoundingClientRect().width;

    return { border: width, content: width - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight) };
  });

  // A threshold between the two: the content box is narrower, so both paths agree on compact.
  const threshold = Math.round((border + content) / 2);
  await header.evaluate((h, value) => h.setAttribute('collapse-below', String(value)), threshold);
  await expect(header).toHaveAttribute('compact', '');
  // A resize the observer reports keeps it compact (it measured the same box).
  await page.setViewportSize({ width: page.viewportSize().width - 1, height: page.viewportSize().height });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await expect(header).toHaveAttribute('compact', '');
});

test('breadcrumb: named navigation with a list and the current page', async ({ page }) => {
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toMatchAriaSnapshot(`
    - navigation "Breadcrumb":
      - list:
        - listitem:
          - link "Home"
        - listitem:
          - link "Projects"
        - listitem: Atlas
  `);
  await expect(page.locator('#bc focsd-breadcrumb-item[current]')).toHaveAttribute('aria-current', 'page');
});

test('pagination: named nav, current page marked, previous/next and page buttons fire focsd-page-change', async ({ page }) => {
  const nav = page.getByRole('navigation', { name: 'Pagination' });
  await expect(nav.getByRole('button', { name: 'Page 5' })).toHaveAttribute('aria-current', 'page');
  await nav.getByRole('button', { name: 'Next page' }).click();
  await expect(page.locator('#pg-result')).toHaveText('6');
  await nav.getByRole('button', { name: 'Page 12' }).click();
  await expect(page.locator('#pg-result')).toHaveText('12');
  await expect(nav.getByRole('button', { name: 'Next page' })).toBeDisabled();
});

test('nav menu: link items mark current; group items are disclosure buttons; Escape closes', async ({ page }) => {
  await expect(page.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
  const products = page.getByRole('button', { name: 'Products' });
  await expect(products).toHaveAttribute('aria-expanded', 'false');
  await products.click();
  await expect(products).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('link', { name: 'Analytics' })).toBeVisible();
  await page.getByRole('button', { name: 'Company' }).click();
  await expect(products).toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('link', { name: 'About' }).focus();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Company' })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', { name: 'Company' })).toBeFocused();
});

test('sidebar: navigation landmark with current link; collapse keeps accessible names', async ({ page }) => {
  await expect(page.getByRole('navigation', { name: 'Workspace' })).toBeVisible();
  await expect(page.locator('#side').getByRole('link', { name: 'Projects' })).toHaveAttribute('aria-current', 'page');
  const toggle = page.getByRole('button', { name: 'Collapse sidebar' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('link', { name: 'Members' })).toBeVisible();
});

test('menubar: roving between items, Down opens, Right moves to next menu, Enter selects', async ({ page }) => {
  await expect(page.getByRole('menubar', { name: 'Editor' })).toBeVisible();
  const file = page.getByRole('menuitem', { name: 'File' });
  await file.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('menuitem', { name: 'Edit' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Undo' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('menuitem', { name: 'Zoom' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#mb-result')).toHaveText('zoom');
  await expect(page.getByRole('menuitem', { name: 'View' })).toBeFocused();
});

test('toolbar: one tab stop, arrows move between controls', async ({ page }) => {
  await expect(page.getByRole('toolbar', { name: 'Formatting' })).toBeVisible();
  await page.getByRole('button', { name: 'Bold' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('button', { name: 'Italic' })).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.getByRole('button', { name: 'Clear' })).toBeFocused();
  const stops = await page.locator('#tb').evaluate((el) => [...el.children].map((e) => e.getAttribute('tabindex')));
  expect(stops).toEqual(['-1', '-1', '0']);
});

test('stepper: list with the current step and textual status', async ({ page }) => {
  await expect(page.getByRole('list', { name: 'Checkout progress' })).toBeVisible();
  await expect(page.locator('#st focsd-step').nth(1)).toHaveAttribute('aria-current', 'step');
  await expect(page.locator('#st focsd-step').first()).toContainText('Completed');
  await expect(page.locator('#st focsd-step').last()).toContainText('Not started');
});

test('lists: static list and selectable listbox with roving selection', async ({ page }) => {
  await expect(page.getByRole('list', { name: 'Recent files' }).getByRole('listitem')).toHaveCount(2);
  await expect(page.locator('#ls')).toMatchAriaSnapshot(`
    - list "Recent files":
      - listitem: report-q3.pdf
      - listitem: roadmap.key
  `);
  const amara = page.getByRole('option', { name: 'Amara Okafor' });
  await expect(amara).toHaveAttribute('aria-selected', 'true');
  await amara.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('option', { name: 'Tomás Herrera' })).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.getByRole('option', { name: 'Tomás Herrera' })).toHaveAttribute('aria-selected', 'true');
  expect(await page.locator('#lsel').evaluate((el) => el.value)).toBe('tomas');
});

test('description list: each item is a term with its description', async ({ page }) => {
  await expect(page.locator('#dl')).toMatchAriaSnapshot(`
    - term: Plan
    - definition: Team
    - term: Seats
    - definition: 9 of 10
  `);
});

// Re-homed from review-fixes-3.spec.js (Q48).

test('pagination, sidebar toggle and menubar triggers use the floor focus ring', async ({ page }) => {
  await openNavigationPageFromReviewFixes3(page);

  for (const name of ['Page 5', 'Collapse sidebar']) {
    const el = page.getByRole('button', { name });
    await el.focus();
    await pressTab(page, { shift: true });
    await pressTab(page);
    await expectFloorFocusRing(el);
  }

  await page.getByRole('menuitem', { name: 'File' }).focus();
  await page.keyboard.press('ArrowRight');
  await expectFloorFocusRing(page.getByRole('menuitem', { name: 'Edit' }));
});

test('current and selected states stay visible in forced colors', async ({ page, browserName }) => {
  await openNavigationPageFromReviewFixes3(page);
  test.skip(browserName !== 'chromium', 'forced-colors emulation is Chromium-only');
  await page.emulateMedia({ forcedColors: 'active' });

  const width = (locator) =>
    locator.evaluate((el) => Number.parseFloat(getComputedStyle(el).outlineWidth) + Number.parseFloat(getComputedStyle(el).borderTopWidth));

  expect(await width(page.getByRole('button', { name: 'Page 5' }))).toBeGreaterThanOrEqual(3);
  expect(await width(page.locator('#side').getByRole('link', { name: 'Projects' }))).toBeGreaterThanOrEqual(2);
  expect(await width(page.getByRole('option', { name: 'Amara Okafor' }))).toBeGreaterThanOrEqual(2);
  expect(
    await page
      .locator('#st focsd-step')
      .nth(1)
      .evaluate((el) => Number.parseFloat(getComputedStyle(el.shadowRoot.querySelector('[part~="marker"]')).borderTopWidth)),
  ).toBeGreaterThanOrEqual(3);
});

// Re-homed from final-minors.spec.js (Q48).

// Ruling: state events (open, close, toggle) fire whenever the element opens or closes, however it
// happened, like <details> toggle and <dialog> close. Value events (change, input,
// focsd-snap-change, select) fire only for the person's actions, like native form controls.
test('a navigation group fires toggle when Escape closes it and when set from script', async ({ page }) => {
  await page.goto('/navigation.html');
  await ready(page, 'focsd-nav-item');
  await record(page, '#nav-products', ['toggle']);
  await page.getByRole('button', { name: 'Products' }).click();
  await expect.poll(() => recorded(page)).toEqual(['toggle']);
  // WebKit does not focus a clicked button.
  await page.getByRole('button', { name: 'Products' }).focus();
  await page.keyboard.press('Escape');
  await expect(page.locator('#nav-products')).not.toHaveAttribute('open');
  await expect.poll(() => recorded(page)).toEqual(['toggle', 'toggle']);
  await page.locator('#nav-products').evaluate((el) => (el.open = true));
  await expect.poll(() => recorded(page)).toEqual(['toggle', 'toggle', 'toggle']);
});

// Re-homed from wave8.spec.js (Q48).

const headerReady = (page) => ready(page, 'focsd-header', 'focsd-footer', 'focsd-footer-section', 'focsd-nav-menu');

test('footer: contentinfo landmark with named link sections and a legal row', async ({ page }) => {
  await page.goto('/navigation.html');
  await headerReady(page);
  await expect(page.getByRole('contentinfo')).toBeVisible();
  const footer = page.locator('#ftr');
  const product = footer.locator('focsd-footer-section').first();
  await expect(product.getByRole('navigation', { name: 'Product' })).toBeVisible();
  await expect(product.getByRole('heading', { name: 'Product', level: 2 })).toBeVisible();
  await expect(product.getByRole('link')).toHaveText(['Features', 'Pricing']);
  await expect(footer.locator('focsd-footer-section').nth(1).getByRole('navigation', { name: 'Company' })).toBeVisible();
  await expect(footer.getByRole('link', { name: 'Privacy' })).toBeVisible();
});

test('header: sticky pins it to the top', async ({ page }) => {
  await page.goto('/navigation.html');
  await headerReady(page);
  const position = await page.locator('#hdr').evaluate((el) => getComputedStyle(el).position);
  expect(position).toBe('sticky');
});

test('header: wide screens show the navigation and no menu button', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/navigation.html');
  await headerReady(page);
  const banner = page.locator('#hdr');
  await expect(banner.getByRole('navigation', { name: 'Main' })).toBeVisible();
  await expect(banner.getByRole('button', { name: 'Menu' })).toHaveCount(0);
});

test('header: narrow screens collapse navigation behind a menu button', async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 800 });
  await page.goto('/navigation.html');
  await headerReady(page);
  const banner = page.locator('#hdr');
  const toggle = banner.getByRole('button', { name: 'Menu' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(banner.getByRole('navigation', { name: 'Main' })).toBeHidden();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const nav = banner.getByRole('navigation', { name: 'Main' });
  await expect(nav).toBeVisible();
  await expect(page.locator('#nav')).toHaveAttribute('orientation', 'vertical');
  await banner.getByRole('link', { name: 'Overview' }).focus();
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
  await toggle.click();
  await banner.getByRole('link', { name: 'Overview' }).click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(banner.getByRole('button', { name: 'Menu' })).toHaveCount(0);
  await expect(page.locator('#nav')).toHaveAttribute('orientation', 'horizontal');
});
