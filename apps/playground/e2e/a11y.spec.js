import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures/test.js';
import { addThemeInitScript, expectTheme } from './fixtures/axe.js';

// Scan the settled state: transitions would let axe sample colors mid-animation. Motion is tested in wave8.spec.js.
test.use({ contextOptions: { reducedMotion: 'reduce' } });

for (const [path, ready] of [
  ['/', 'focsd-button'],
  ['/display.html', 'focsd-badge'],
  ['/forms.html', 'focsd-radio-group'],
  ['/overlays.html', 'focsd-accordion'],
  ['/navigation.html', 'focsd-menubar'],
  ['/data.html', 'focsd-data-grid'],
  ['/inputs.html', 'focsd-combobox'],
  ['/color.html', 'focsd-color-picker'],
  ['/tags.html', 'focsd-tag-input'],
  ['/phone.html', 'focsd-phone-field'],
  ['/currency.html', 'focsd-currency-field'],
  ['/hover-card.html', 'focsd-hover-card'],
  ['/sheet.html', 'focsd-bottom-sheet'],
  ['/virtual-list.html', 'focsd-virtual-list'],
  ['/masonry.html', 'focsd-masonry'],
])
  for (const theme of ['light', 'dark', 'contrast']) {
    test(`${path}: no WCAG 2.2 AA violations in ${theme} theme`, async ({ page }) => {
      // Theme before load: switching later would transition colors under the reduced-motion floor.
      await addThemeInitScript(page, theme);
      await page.goto(path);
      await expectTheme(page, theme);
      await page.waitForFunction((tag) => customElements.get(tag), ready);
      await page.evaluate(() => document.fonts.ready);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      const summary = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
      expect(summary).toEqual([]);
    });
  }

for (const theme of ['light', 'dark', 'contrast']) {
  test(`open dialog has no WCAG 2.2 AA violations in ${theme} theme`, async ({ page }) => {
    // Theme before load: switching later would transition colors under the reduced-motion floor.
    await addThemeInitScript(page, theme);
    await page.goto('/');
    await expectTheme(page, theme);
    await page.waitForFunction(() => customElements.get('focsd-dialog'));
    await page.locator('#dlg-open').click();
    await page.getByRole('dialog').waitFor();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  });
}

for (const theme of ['light', 'dark', 'contrast']) {
  test(`open select has no WCAG 2.2 AA violations in ${theme} theme`, async ({ page }) => {
    // Theme before load: switching later would transition colors under the reduced-motion floor.
    await addThemeInitScript(page, theme);
    await page.goto('/');
    await expectTheme(page, theme);
    await page.waitForFunction(() => customElements.get('focsd-select'));
    await page.getByRole('button', { name: /^Data region/ }).click();
    await page.getByRole('listbox', { name: 'Data region' }).waitFor();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  });
}

const openOverlays = {
  popover: async (page) => {
    await page.getByRole('button', { name: 'Filters' }).click();
    await page.getByRole('dialog', { name: 'Filter members' }).waitFor();
  },
  menu: async (page) => {
    await page.getByRole('button', { name: 'Actions' }).click();
    await page.getByRole('menu', { name: 'Project actions' }).waitFor();
  },
  'alert dialog': async (page) => {
    await page.getByRole('button', { name: 'Delete project' }).click();
    await page.getByRole('alertdialog').waitFor();
  },
  drawer: async (page) => {
    await page.getByRole('button', { name: 'Open settings' }).click();
    await page.getByRole('dialog', { name: 'Workspace settings' }).waitFor();
  },
  toast: async (page) => {
    await page.getByRole('button', { name: 'Save draft' }).click();
    await page.getByText('Draft saved').waitFor();
  },
};

for (const [name, open] of Object.entries(openOverlays))
  for (const theme of ['light', 'dark', 'contrast']) {
    test(`open ${name} has no WCAG 2.2 AA violations in ${theme} theme`, async ({ page }) => {
      // Theme before load: switching later would transition colors under the reduced-motion floor.
      await addThemeInitScript(page, theme);
      await page.goto('/overlays.html');
      await expectTheme(page, theme);
      await page.waitForFunction(() => customElements.get('focsd-toaster'));
      await open(page);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    });
  }

for (const theme of ['light', 'dark', 'contrast']) {
  test(`open combobox and command palette have no WCAG 2.2 AA violations in ${theme} theme`, async ({ page }) => {
    // Theme before load: switching later would transition colors under the reduced-motion floor.
    await addThemeInitScript(page, theme);
    await page.goto('/inputs.html');
    await expectTheme(page, theme);
    await page.waitForFunction(() => customElements.get('focsd-command'));
    await page.getByRole('combobox', { name: 'Country' }).fill('d');
    await page.getByRole('listbox', { name: 'Country' }).waitFor();
    let results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Open command palette' }).click();
    await page.getByRole('dialog', { name: 'Command palette' }).waitFor();
    results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  });
}

for (const theme of ['light', 'dark', 'contrast']) {
  test(`open date picker, range picker and file errors have no WCAG 2.2 AA violations in ${theme} theme`, async ({ page }) => {
    const scan = async () => {
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    };

    // Theme before load: switching later would transition colors under the reduced-motion floor.
    await addThemeInitScript(page, theme);
    await page.goto('/inputs.html');
    await expectTheme(page, theme);
    await page.waitForFunction(() => customElements.get('focsd-file-upload'));
    await page.locator('#dp').getByRole('button', { name: 'Choose date', exact: true }).click();
    await page.getByRole('dialog', { name: 'Choose date' }).waitFor();
    await scan();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Choose dates' }).click();
    await page.getByRole('dialog', { name: 'Choose dates' }).waitFor();
    await scan();
    await page.keyboard.press('Escape');
    await page.getByRole('textbox', { name: 'Departure' }).fill('bad');
    await page.locator('#fu').evaluate((el) => {
      const data = new DataTransfer();
      data.items.add(new File(['a'], 'a.pdf', { type: 'application/pdf' }));
      data.items.add(new File(['c'], 'c.txt', { type: 'text/plain' }));
      el.shadowRoot
        .querySelector('[part~="dropzone"]')
        .dispatchEvent(new DragEvent('drop', { dataTransfer: data, bubbles: true, cancelable: true }));
    });
    await page.locator('#inputs-submit').click();
    await scan();
  });
}

for (const theme of ['light', 'dark', 'contrast']) {
  test(`open hover card has no WCAG 2.2 AA violations in ${theme} theme`, async ({ page }) => {
    await addThemeInitScript(page, theme);
    await page.goto('/hover-card.html');
    await expectTheme(page, theme);
    await page.waitForFunction(() => customElements.get('focsd-hover-card'));
    await page.locator('#hc').evaluate((el) => el.show());
    await page.locator('#hc [part~="card"]').waitFor();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  });
}

for (const theme of ['light', 'dark', 'contrast']) {
  test(`open bottom sheet has no WCAG 2.2 AA violations in ${theme} theme`, async ({ page }) => {
    await addThemeInitScript(page, theme);
    await page.goto('/sheet.html');
    await expectTheme(page, theme);
    await page.waitForFunction(() => customElements.get('focsd-bottom-sheet'));
    await page.locator('#open-sheet').click();
    await page.getByRole('dialog', { name: 'Filters' }).waitFor();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  });
}
