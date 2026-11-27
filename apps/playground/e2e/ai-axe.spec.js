import { expect, test } from './fixtures/test.js';
import { THEMES, expectAxeClean, gotoInTheme } from './fixtures/axe.js';

// Axe on ai.html in each theme, with a finished reply on the page (markdown, code, a tool call and
// its sources). Run in the final regression, not per batch.

test.use({ contextOptions: { reducedMotion: 'reduce' } });

for (const theme of THEMES) {
  test(`ai.html has no axe violations in the ${theme} theme`, async ({ page }) => {
    await gotoInTheme(page, '/ai.html?delay=1', theme, 'focsd-composer');
    await page.waitForFunction(() => window.__ready);

    await page.getByRole('button', { name: 'Explain streaming markdown' }).click();
    await expect(page.locator('focsd-chat-message[from="assistant"] article[aria-busy="true"]')).toHaveCount(0);
    await expect(page.locator('focsd-chat-message[from="assistant"]')).toHaveCount(1);
    await page.getByRole('button', { name: 'Show a tool call' }).click();
    await expect(page.locator('focsd-chat-message[from="assistant"]')).toHaveCount(2);
    await expect(page.locator('focsd-chat-message article[aria-busy="true"]')).toHaveCount(0);
    await page.getByRole('button', { name: 'search_docs, done' }).click();
    await expectAxeClean(page);
  });
}
