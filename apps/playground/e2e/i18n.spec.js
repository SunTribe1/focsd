// cspell:ignore anad eine hier ablegen
// German test strings. cspell:ignore Betrag eine Kompakte nachm Nein Tageszeit vorm Zahl Zahlen Zeilen
import { expect, settle, test } from './fixtures/test.js';
import { mountFormInMain as mount, openFromMinorsInputs } from './fixtures/pages.js';

const GERMAN = {
  $code: 'de',
  $name: 'Deutsch',
  previousPage: 'Vorherige Seite',
  chooseDate: 'Datum wählen',
  selectedCount: (n) => `${n} ausgewählt`,
  exportCsv: 'CSV exportieren',
  dateMin: (date) => `Wähle ein Datum ab ${date}.`,
  chooseFileButton: 'Datei wählen',
};

test.beforeEach(async ({ page }) => {
  await page.goto('/i18n.html');
  await page.waitForFunction(() => Boolean(window.focsd && customElements.get('focsd-data-grid')));
});

test('English by default', async ({ page }) => {
  await expect(page.locator('#l-pages').getByRole('button', { name: 'Previous page' })).toBeVisible();
  await expect(page.locator('#l-langs [part~="value"]')).toHaveText('3 selected');
});

test('a registered table and <html lang> translate labels, names and messages', async ({ page }) => {
  await page.evaluate(
    (de) => {
      const table = { ...de };

      // Functions cannot cross the page boundary: rebuild them in the page.
      for (const [k, v] of Object.entries(table)) if (v.includes('=>')) table[k] = (0, eval)(v);
      window.focsd.registerTranslation(table);
      document.documentElement.lang = 'de';
    },
    Object.fromEntries(Object.entries(GERMAN).map(([k, v]) => [k, String(v)])),
  );
  await expect(page.locator('#l-pages').getByRole('button', { name: 'Vorherige Seite' })).toBeVisible();
  await expect(page.locator('#l-date [part~="trigger"]')).toHaveAccessibleName('Datum wählen');
  await expect(page.locator('#l-langs [part~="value"]')).toHaveText('3 ausgewählt');
  await expect(page.locator('#l-grid').getByRole('button', { name: 'CSV exportieren' })).toBeVisible();
  await expect(page.locator('#l-file [part~="trigger"]')).toContainText('Datei wählen');

  const message = await page.evaluate(async () => {
    const el = document.getElementById('l-date');
    el.value = '2026-01-01';
    await el.updateComplete;

    return el.validationMessage;
  });

  expect(message).toBe('Wähle ein Datum ab 2026-01-10.');
  // Keys the table leaves out fall back to English.
  await expect(page.locator('#l-pages').getByRole('button', { name: 'Next page' })).toBeVisible();
});

test('lang on an ancestor overrides <html lang>', async ({ page }) => {
  await page.evaluate(() => window.focsd.registerTranslation({ $code: 'de', previousPage: 'Vorherige Seite' }));
  await expect(page.locator('#l-pages-de').getByRole('button', { name: 'Vorherige Seite' })).toBeVisible();
  await expect(page.locator('#l-pages').getByRole('button', { name: 'Previous page' })).toBeVisible();
});

test('the English table is exported for translators', async ({ page }) => {
  const r = await page.evaluate(() => [window.focsd.en.previousPage, window.focsd.en.selectedCount(3)]);
  expect(r).toEqual(['Previous page', '3 selected']);
});

// Re-homed from review-fixes-10.spec.js (Q48).

async function german(page) {
  await page.evaluate((src) => {
    window.focsd.registerTranslation((0, eval)(src));
    document.documentElement.lang = 'de';
  }, DE);
}

const DE = `({
  $code: 'de',
  compactRows: 'Kompakte Zeilen',
  enterNumber: 'Gib eine Zahl ein.',
  emptyGroup: '(leer)',
  yes: 'Ja',
  no: 'Nein',
  slide: 'Folie',
  empty: 'Leer',
  dayPeriod: 'Tageszeit',
})`;

const openLocalizationFromReviewFixes10 = async (page) => {
  await page.clock.install();
  await page.goto('/i18n.html');
  await page.waitForFunction(() => Boolean(window.focsd && customElements.get('focsd-data-grid')));
};

test('grid toolbar, filter errors, empty groups and boolean search use the table', async ({ page }) => {
  await openLocalizationFromReviewFixes10(page);
  await german(page);
  const grid = page.locator('#l-grid');
  await expect(grid.getByRole('button', { name: 'Kompakte Zeilen' })).toBeVisible();

  const r = await page.evaluate(async () => {
    const g = document.getElementById('l-grid');
    g.setGroupBy(['active']);
    await g.updateComplete;
    const groups = [...g.shadowRoot.querySelectorAll('[part~="group-row"]')].map((n) => n.textContent);
    g.setGroupBy([]);
    g.setSearch('Ja');
    await g.updateComplete;

    return { groups: groups.join(' | '), matched: g.counts.matched };
  });

  expect(r.groups).toContain('(leer)');
  expect(r.groups).toContain('Ja');
  expect(r.matched).toBe(1);
  await page.evaluate(async () => {
    const g = document.getElementById('l-grid');
    g.setSearch('');
    g.openFilter('amount');
    await g.updateComplete;
  });

  const error = await page.evaluate(async () => {
    const g = document.getElementById('l-grid');
    g.updateFilterDraft({ op: 'eq', value: 'abc' });
    g.applyFilterDraft();
    await g.updateComplete;

    return g._filterDraft?.error;
  });

  expect(error).toBe('Gib eine Zahl ein.');
});

test('carousel slide role description and time day period are translated', async ({ page }) => {
  await openLocalizationFromReviewFixes10(page);
  await german(page);
  await expect(page.locator('#l-car focsd-carousel-slide').first()).toHaveAttribute('aria-roledescription', 'Folie');

  const name = await page
    .locator('#l-time')
    .evaluate((el) => [...el.shadowRoot.querySelectorAll('[role="spinbutton"]')].at(-1).getAttribute('aria-label'));

  expect(name).toBe('Tageszeit');
});

test('translated empty time segments keep the placeholder style', async ({ page }) => {
  await openLocalizationFromReviewFixes10(page);
  const color = () => page.locator('#l-time').evaluate((el) => getComputedStyle(el.shadowRoot.querySelector('[role="spinbutton"]')).color);

  const english = await color();
  await german(page);
  await expect(page.locator('#l-time [role="spinbutton"]').first()).toHaveAttribute('aria-valuetext', 'Leer');
  expect(await color()).toBe(english);
});

test('numbers follow the resolved language when no locale is set', async ({ page }) => {
  await openLocalizationFromReviewFixes10(page);
  await expect(page.locator('#l-grid-de [role="gridcell"]').first()).toHaveText('1.234,5');
});

test('a textarea that starts with text does not announce its count on load', async ({ page }) => {
  await openLocalizationFromReviewFixes10(page);
  await page.clock.runFor(1200);
  await settle(page);
  const announced = () => page.evaluate(() => document.querySelector('[data-focsd-announcer="polite"]')?.textContent ?? '');
  expect(await announced()).not.toContain('characters');
  await expect(page.locator('#l-notes [part~="counter-live"]')).toHaveText('');
});

// Re-homed from minors-inputs.spec.js (Q48).

test('the calendar and the time field follow the nearest lang', async ({ page }) => {
  await openFromMinorsInputs(page);
  await mount(
    page,
    '<div lang="de"><focsd-calendar id="cal" value="2026-03-14"></focsd-calendar><focsd-time-field id="tde" label="Zeit" value="13:00"></focsd-time-field></div>',
  );
  await expect(page.locator('#cal').getByRole('grid')).toHaveAccessibleName(/M\u00e4rz 2026/);
  expect(await page.locator('#tde').evaluate((el) => el.cycle)).toBe('h23');
});

// Re-homed from deferred-minors.spec.js (Q48).

test('file upload drop text is localized', async ({ page }) => {
  await page.goto('/i18n.html');
  await page.waitForFunction(() => Boolean(window.focsd && customElements.get('focsd-file-upload')));
  const drop = page.locator('#l-file [part~="drop-text"]');
  await expect(drop).toHaveText('or drop a file here');
  await page.evaluate(() => {
    window.focsd.registerTranslation({ $code: 'de', dropFile: 'oder eine Datei hier ablegen' });
    document.documentElement.lang = 'de';
  });
  await expect(drop).toHaveText('oder eine Datei hier ablegen');
  expect(await page.evaluate(() => [window.focsd.en.dropFile, window.focsd.en.dropFiles])).toEqual([
    'or drop a file here',
    'or drop files here',
  ]);
});

test('a lang change on an ancestor other than <html> re-translates (B14 hand-off)', async ({ page }) => {
  await page.goto('/i18n.html');
  await page.waitForFunction(() => Boolean(window.focsd && customElements.get('focsd-file-upload')));
  const drop = page.locator('#l-file [part~="drop-text"]');
  await expect(drop).toHaveText('or drop a file here');
  await page.evaluate(() => window.focsd.registerTranslation({ $code: 'de', dropFile: 'oder eine Datei hier ablegen' }));
  await expect(drop).toHaveText('or drop a file here');
  await page.evaluate(() => (document.getElementById('l-file').parentElement.lang = 'de'));
  await expect(drop).toHaveText('oder eine Datei hier ablegen');
  await page.evaluate(() => document.getElementById('l-file').parentElement.removeAttribute('lang'));
  await expect(drop).toHaveText('or drop a file here');
});
