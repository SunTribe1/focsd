import { expect, test } from './fixtures/test.js';
import { openFromReviewFixes4, mountInMain as mount, openFromMinorsPolish } from './fixtures/pages.js';

// Re-homed from review-fixes-4.spec.js (Q48).

test('collapsing a parent from code moves focus and the tab stop to it', async ({ page }) => {
  await openFromReviewFixes4(page);
  const tree = page.getByRole('tree', { name: 'Project files' });
  await tree.getByRole('treeitem', { name: 'index.js' }).click();
  await page.evaluate(() => {
    document.querySelector('#tree focsd-tree-item[value="src"]').expanded = false;
  });
  const src = tree.getByRole('treeitem', { name: 'src', exact: true });
  await expect(src).toBeFocused();
  await expect(page.locator('#tree focsd-tree-item[tabindex="0"]')).toHaveCount(1);
  await expect(src).toHaveAttribute('tabindex', '0');
  await page.evaluate(() => {
    const item = document.createElement('focsd-tree-item');
    item.label = 'late.js';
    item.value = 'late.js';
    document.querySelector('#tree focsd-tree-item[value="src/components"]').append(item);
  });
  await expect(page.locator('#tree focsd-tree-item[aria-label="late.js"]')).toHaveAttribute('aria-selected', 'false');
});

// Re-homed from minors-polish.spec.js (Q48).

test('a large tree mounts with one selection pass, not one per item', async ({ page }) => {
  await openFromMinorsPolish(page);

  const writes = await page.evaluate(async () => {
    let count = 0;

    const observer = new MutationObserver((records) => {
      count += records.filter((r) => r.attributeName === 'aria-selected').length;
    });

    const tree = document.createElement('focsd-tree');
    tree.setAttribute('label', 'Big');
    tree.innerHTML = Array.from({ length: 300 }, (_, i) => `<focsd-tree-item value="v${i}" label="Item ${i}"></focsd-tree-item>`).join('');
    observer.observe(tree, { attributes: true, subtree: true });
    document.querySelector('main').append(tree);
    await tree.updateComplete;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    observer.disconnect();

    return count;
  });

  expect(writes).toBeLessThan(3000);
});

test('the selection bar sits on the inline-start side in right-to-left pages', async ({ page }) => {
  await openFromMinorsPolish(page);
  await mount(
    page,
    '<focsd-tree id="tr" label="Files" value="a" dir="rtl"><focsd-tree-item value="a" label="A"></focsd-tree-item></focsd-tree>',
  );

  const shadow = await page
    .locator('#tr focsd-tree-item')
    .evaluate((el) => getComputedStyle(el.shadowRoot.querySelector('[part~="row"]')).boxShadow);

  expect(shadow).toMatch(/-3px 0px 0px/);
});
