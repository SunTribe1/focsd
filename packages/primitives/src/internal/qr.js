// cspell:ignore qrcode
import { qrcode } from './qr-upstream.js';

/** Byte-mode capacity of version 40 per error-correction level (ISO/IEC 18004 table 7). */
const MAX_BYTES = new Map([
  ['L', 2953],
  ['M', 2331],
  ['Q', 1663],
  ['H', 1273],
]);

const encoder = new TextEncoder();

/**
 * QR matrix for `text` (UTF-8, byte mode, smallest version that fits).
 * @param {string} text
 * @param {'L' | 'M' | 'Q' | 'H'} level
 * @returns {boolean[][]}
 * @throws {TypeError} when `level` is not L, M, Q or H.
 * @throws {RangeError} when the value does not fit in version 40.
 */
export function encodeQr(text, level) {
  const max = MAX_BYTES.get(level);

  if (max === undefined) throw new TypeError('Unknown QR error-correction level');

  // Fail fast: upstream make() writes the whole value once per version 1-39 before it gives up.
  // UTF-8 never takes fewer bytes than UTF-16 units, so `text.length` alone rejects huge values unencoded.
  if (text.length > max || encoder.encode(text).length > max) throw new RangeError('QR value too long');

  const code = qrcode(0, level);
  code.addData(text, 'Byte');

  try {
    code.make();
  } catch (error) {
    throw new RangeError('QR value too long', { cause: error });
  }

  const n = code.getModuleCount();

  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (__, c) => code.isDark(r, c)));
}
