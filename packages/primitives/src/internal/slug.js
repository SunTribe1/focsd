/**
 * An id made from heading text: lower case, letters, marks and digits of any script kept, every
 * other run of characters turned into one `-`, trimmed. A repeat gets `-2`, `-3`, … and the result
 * is added to `taken`, so the next call sees it.
 *
 * @param {string} text
 * @param {Set<string>} taken Ids already in use; the returned id is added to it.
 * @returns {string}
 */
export function slugify(text, taken) {
  const base =
    text
      .toLowerCase()
      .replaceAll(/[^\p{L}\p{M}\p{N}]+/gu, '-')
      .replaceAll(/^-|-$/g, '') || 'section';

  let id = base;

  for (let n = 2; taken.has(id); n += 1) id = `${base}-${n}`;
  taken.add(id);

  return id;
}
