/** The named category colors, in hue order: `color="violet"` is hue 2. */
const HUE_NAMES = Object.freeze(['blue', 'violet', 'pink', 'red', 'orange', 'amber', 'green', 'teal']);

/**
 * A stable hue (1–8) for a text such as a person's name: the same name always gets the same color.
 * @param {string} text
 * @returns {number}
 */
export function hueOf(text) {
  let hash = 0;

  for (const char of String(text ?? '')
    .trim()
    .toLowerCase())
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;

  return (hash % HUE_NAMES.length) + 1;
}

/**
 * The hue (1–8) of a color name, or of a number 1–8; 0 for anything else.
 * @param {string | number | null | undefined} color
 * @returns {number}
 */
export function hueNamed(color) {
  const index = HUE_NAMES.indexOf(String(color ?? '').toLowerCase());

  if (index >= 0) return index + 1;

  const n = Number(color);

  return Number.isInteger(n) && n >= 1 && n <= HUE_NAMES.length ? n : 0;
}

/**
 * Mirror a hue on the host's `data-hue`, which the shared hue styles read; 0 removes it.
 * @param {HTMLElement} host
 * @param {number} hue 1–8, or 0 for none
 */
export function syncHue(host, hue) {
  if (hue) host.dataset.hue = String(hue);
  else delete host.dataset.hue;
}
