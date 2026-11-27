/**
 * Opening a demo page and mounting markup into it: the helpers the specs re-homed in Q48 had each
 * copied from their old spec. The `openFrom*` names say which old spec a group of tests came from;
 * each waits for the elements those tests use.
 */
import { ready } from './test.js';

/** @typedef {import('@playwright/test').Page} Page */

/**
 * Go to `path` and wait until every named custom element is defined.
 * @param {Page} page
 * @param {string} path
 * @param {...string} tags
 */
export const openPage = async (page, path, ...tags) => {
  await page.goto(path);
  await ready(page, ...tags);
};

/** @param {Page} page */
export const openFromReviewFixes = (page) =>
  openPage(page, '/', 'focsd-button', 'focsd-text-field', 'focsd-select', 'focsd-dialog', 'focsd-tabs');

/** @param {Page} page */
export const openFromReviewFixes2 = (page) =>
  openPage(page, '/forms.html', 'focsd-otp-field', 'focsd-error-summary', 'focsd-slider', 'focsd-toggle-group', 'focsd-radio-group');

/** @param {Page} page */
export const openOverlaysPageFromReviewFixes3 = (page) =>
  openPage(page, '/overlays.html', 'focsd-tooltip', 'focsd-toaster', 'focsd-context-menu', 'focsd-accordion');

/** @param {Page} page */
export const openNavigationPageFromReviewFixes3 = (page) =>
  openPage(page, '/navigation.html', 'focsd-pagination', 'focsd-sidebar', 'focsd-menubar', 'focsd-stepper', 'focsd-list');

/** @param {Page} page */
export const openFromReviewFixes4 = (page) =>
  openPage(page, '/data.html', 'focsd-data-grid', 'focsd-tree', 'focsd-carousel', 'focsd-scroll-area');

/** @param {Page} page */
export const openFromReviewFixes5 = (page) =>
  openPage(page, '/inputs.html', 'focsd-combobox', 'focsd-multi-select', 'focsd-command', 'focsd-time-field', 'focsd-file-upload');

/** @param {Page} page */
export const openFromMinorsForms = (page) =>
  openPage(
    page,
    '/selects.html',
    'focsd-button',
    'focsd-text-field',
    'focsd-dialog',
    'focsd-time-field',
    'focsd-file-upload',
    'focsd-disclosure',
  );

/** @param {Page} page */
export const openFromMinorsInputs = (page) =>
  openPage(
    page,
    '/selects.html',
    'focsd-combobox',
    'focsd-command',
    'focsd-date-picker',
    'focsd-date-range-picker',
    'focsd-time-field',
    'focsd-calendar',
  );

/** @param {Page} page */
export const openFromMinorsPolish = (page) =>
  openPage(page, '/selects.html', 'focsd-slider', 'focsd-splitter', 'focsd-code', 'focsd-image', 'focsd-tree');

/** @param {Page} page */
export const openFromMinorsMisc = (page) => openPage(page, '/grid.html', 'focsd-icon', 'focsd-carousel', 'focsd-slider', 'focsd-data-grid');

/** @param {Page} page */
export const openFromParityReviewFixes = (page) => openPage(page, '/parity.html', 'focsd-select');

/** @param {Page} page */
export const openFromGridReviewFixes = (page) => openPage(page, '/grid.html', 'focsd-data-grid');

/**
 * Append `html` to `<main>` in a new `tag` (a `div`, or a `form` for form-associated tests) and wait
 * for every element in it to finish its first update.
 * @param {Page} page
 * @param {string} html
 * @param {'div' | 'form'} [tag]
 */
const mountIn = (page, html, tag) =>
  page.evaluate(
    async ([markup, name]) => {
      const box = document.createElement(name);
      box.innerHTML = markup;
      document.querySelector('main').append(box);
      await Promise.all([...box.querySelectorAll('*')].map((el) => el.updateComplete));
    },
    [html, tag],
  );

/**
 * Append `html` to `<main>` in a new `div` and wait for its elements' first update.
 * @param {Page} page
 * @param {string} html
 */
export const mountInMain = (page, html) => mountIn(page, html, 'div');

/**
 * Append `html` to `<main>` in a new `form` and wait for its elements' first update.
 * @param {Page} page
 * @param {string} html
 */
export const mountFormInMain = (page, html) => mountIn(page, html, 'form');

/**
 * Append `html` to `<body>` in a new `div` and wait for its elements' first update.
 * @param {Page} page
 * @param {string} html
 */
export const mountInBody = (page, html) =>
  page.evaluate(async (markup) => {
    const box = document.createElement('div');
    box.innerHTML = markup;
    document.body.append(box);
    await Promise.all([...box.querySelectorAll('*')].map((el) => el.updateComplete));
  }, html);

/**
 * Put `html` in a `div#fixture` at the start of `<body>` (no wait: the caller waits on what it needs).
 * @param {Page} page
 * @param {string} html
 */
export const mountFixture = (page, html) =>
  page.evaluate((markup) => {
    const host = document.createElement('div');
    host.id = 'fixture';
    host.innerHTML = markup;
    document.body.prepend(host);
  }, html);

/**
 * Wait `n` animation frames.
 * @param {Page} page
 * @param {number} [n]
 */
export const frames = (page, n = 4) =>
  page.evaluate(async (count) => {
    for (let i = 0; i < count; i++) await new Promise((r) => requestAnimationFrame(r));
  }, n);

/**
 * Wait until the page is fully rendered for a screenshot: fonts loaded, every Focsd element on it
 * defined, and every element's pending update done.
 * @param {Page} page
 */
export const renderComplete = (page) =>
  page.evaluate(async () => {
    await document.fonts.ready;

    const tags = new Set([...document.querySelectorAll('*')].flatMap((el) => (el.localName.startsWith('focsd-') ? [el.localName] : [])));

    await Promise.all([...tags].map((t) => customElements.whenDefined(t)));
    await Promise.all([...document.querySelectorAll('*')].flatMap((el) => (el.updateComplete ? [el.updateComplete] : [])));
  });
