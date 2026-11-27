/**
 * Formats an example's markup for its code block, at build time: Prettier's HTML printer, so long
 * tags break one attribute per line and every example reads the same way. On any failure the markup
 * is returned as written; the live preview always renders the original.
 */
import { format } from 'prettier';

/**
 * @param {string} html
 * @returns {Promise<string>}
 */
export async function formatExampleHtml(html) {
  try {
    const out = await format(html, { parser: 'html', printWidth: 90, htmlWhitespaceSensitivity: 'css', bracketSameLine: true });

    return out.trimEnd();
  } catch {
    return html;
  }
}
