import { html } from 'lit';
import '@focsd-dev/components/focsd-tag.js';
import '@focsd-dev/components/focsd-avatar.js';

/**
 * Built-in cell displays, chosen by the column:
 *
 * - An enum column whose options set `tone`, `color` or `icon` shows each value as a status chip
 *   (a small pill `focsd-tag`). `tone` works in every preset; `color` is a category hue colorful
 *   presets such as Prismatic show.
 * - A column with `display: 'avatar'` shows the value as a name with an avatar (initials, colored by
 *   name in Prismatic).
 *
 * The chip and avatar are decorative wrappers around the same text, so sorting, filtering, search
 * and CSV export still use the plain value.
 *
 * @typedef {import('../engine/model.js').Column} Column
 * @typedef {import('../engine/model.js').ColumnOption} ColumnOption
 */

/**
 * Whether an enum column styles its values as chips.
 * @param {Column} column
 */
const hasChips = (column) => column.type === 'enum' && (column.options ?? []).some((o) => o.tone || o.color || o.icon);

/**
 * A status chip for an enum value.
 * @param {ColumnOption | undefined} option
 * @param {string} text the formatted value
 */
function chipCell(option, text) {
  if (!text) return text;

  return html`<focsd-tag part="chip" size="s" shape="pill" tone=${option?.tone ?? 'neutral'} color=${option?.color ?? ''} icon=${option?.icon ?? ''}
    >${text}</focsd-tag
  >`;
}

/**
 * A person: avatar plus name.
 * @param {string} text the formatted value
 */
function avatarCell(text) {
  if (!text) return text;

  return html`<span part="person"><focsd-avatar size="s" name=${text} decorative></focsd-avatar>${text}</span>`;
}

/**
 * The built-in display for a cell, or undefined to show the plain text.
 * @param {Column} column
 * @param {unknown} value the raw value
 * @param {string} text the formatted value
 */
export function builtInCell(column, value, text) {
  if (column.display === 'avatar') return avatarCell(text);

  if (hasChips(column))
    return chipCell(
      column.options?.find((o) => o.value === value),
      text,
    );

  return undefined;
}
