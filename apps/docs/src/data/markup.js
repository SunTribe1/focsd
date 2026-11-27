/**
 * Escape text for HTML.
 * @param {unknown} text
 * @returns {string}
 */
const escapeHtml = (text) =>
  String(text).replaceAll(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * Inline code (`x`) and site-internal links ([text](/path/)) in short notes; everything else is text.
 * @param {string} text
 * @returns {string} HTML
 */
export const inline = (text) =>
  escapeHtml(text)
    .replaceAll(/`([^`]+)`/g, '<code>$1</code>')
    .replaceAll(/\[([^\]]+)\]\((\/[\w/#-]*)\)/g, '<a class="focsd-docs-link" href="$2">$1</a>');

/**
 * The first opening tag of `tag` in an example, with children elided: `<focsd-select label="…">…</focsd-select>`.
 * @param {string} html
 * @param {string} tag
 * @returns {string}
 */
export function primaryElement(html, tag) {
  const open = new RegExp(`<${tag}(\\s[^>]*)?>`).exec(html);

  if (!open) return `<${tag}></${tag}>`;

  const attrs = (open[1] ?? '')
    .replaceAll(/\s+style="[^"]*"/g, '')
    .replaceAll(/\s+id="[^"]*"/g, '')
    .replaceAll(/\s+/g, ' ')
    .trimEnd();

  const after = html.slice(open.index + open[0].length);
  const close = after.indexOf(`</${tag}>`);
  const inner = close > 0 ? after.slice(0, close).trim() : '';
  const body = !inner ? '' : inner.includes('<') ? '…' : inner;

  return `<${tag}${attrs}>${body}</${tag}>`;
}

/**
 * A script element cannot be written in a page's frontmatter or inside another script without
 * closing it, so examples build the tags from two halves.
 */
export const SCRIPT_OPEN = '<' + 'script';
export const SCRIPT_CLOSE = '</' + 'script>';
