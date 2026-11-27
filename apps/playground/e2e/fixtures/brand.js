import { readFileSync } from 'node:fs';
import { addThemeInitScript } from './axe.js';

export const BRANDS = ['harbor', 'signal', 'mineral'];

const presetsCss = readFileSync(new URL('../../../../packages/tokens/dist/presets.css', import.meta.url), 'utf8');

/**
 * Set the theme and the preset before first paint. Pages that do not load presets.css themselves
 * get it as an inline style sheet once the document exists.
 */
export async function addBrandInitScript(page, theme, brand) {
  await addThemeInitScript(page, theme);
  await page.addInitScript((b) => {
    const apply = () => document.documentElement?.setAttribute('data-focsd-brand', b);

    if (document.documentElement) {
      apply();

      return;
    }

    const observer = new MutationObserver(() => {
      if (!document.documentElement) return;
      apply();
      observer.disconnect();
    });

    observer.observe(document, { childList: true });
  }, brand);
}

/** Add the preset sheets to a page that does not load them (a no-op look on pages that do). */
export const addPresetSheets = (page) => page.addStyleTag({ content: presetsCss });
