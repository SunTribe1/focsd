/**
 * Keyboard helpers that hold in every engine.
 * WebKit (like Safari's default setting) moves Tab only between text fields and lists; Alt+Tab
 * reaches buttons and links too, which is what a keyboard user with "Press Tab to highlight each
 * item" gets.
 */

/**
 * Press Tab (or Shift+Tab) so it reaches every focusable control in this engine.
 * @param {import('@playwright/test').Page} page
 * @param {{ shift?: boolean }} [options]
 */
export async function pressTab(page, { shift = false } = {}) {
  const webkit = page.context().browser()?.browserType().name() === 'webkit';
  const key = `${webkit ? 'Alt+' : ''}${shift ? 'Shift+' : ''}Tab`;

  await page.keyboard.press(key);
}
