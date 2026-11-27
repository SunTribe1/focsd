/** Digits typed in any script, as Latin digits: for parsing numbers people type or paste. */

/** Zero of every decimal digit set Intl formats with (Arabic-Indic, Persian, Devanagari, Bengali…). */
const ZEROS = [
  0x660, 0x6f0, 0x7c0, 0x966, 0x9e6, 0xa66, 0xae6, 0xb66, 0xbe6, 0xc66, 0xce6, 0xd66, 0xe50, 0xed0, 0xf20, 0x1040, 0x17e0, 0x1810,
];

/**
 * Latin digits for any native digits.
 * @param {string} text
 * @returns {string}
 */
export function latinDigits(text) {
  return text.replaceAll(/\p{Nd}/gu, (d) => {
    const code = /** @type {number} */ (d.codePointAt(0));
    const zero = ZEROS.find((z) => code >= z && code <= z + 9);

    return zero === undefined ? d : String(code - zero);
  });
}
