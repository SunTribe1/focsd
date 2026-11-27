// cspell:ignore qrcode Ünïcödé
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { encodeQr } from '../src/internal/qr.js';

const hash = (m) =>
  createHash('sha256')
    .update(m.map((r) => r.map((d) => (d ? '1' : '0')).join('')).join(''))
    .digest('hex');

describe('encodeQr (vendored qrcode-generator 2.0.4)', () => {
  it.each([
    ['https://focsd.dev', 'M', 25, 'f02cbe1bd0f942ff9f902f58de8e9eea6299eb2ab3f1c456326d9c2f1b8e38c5'],
    ['Ünïcödé ✓ 日本 🙂', 'Q', 29, '8fd1ef8c290c931d5b4423c73213aedb43006422d69c55e02ff478c5493d73ba'],
    ['', 'L', 21, '44934d4144a7c03c573b3aaf37e646aae8c6f9749b7d5ac940425c701b289ea3'],
    ['A'.repeat(1000), 'H', 161, '1d7f9ec2dfed12f2c86b78be26edb2998fe960f62afb34d3e9f36e6aa96213f0'],
  ])('%s at %s matches upstream', (text, level, size, sha) => {
    const m = encodeQr(text, level);
    expect(m.length).toBe(size);
    expect(m.every((row) => row.length === size)).toBe(true);
    expect(hash(m)).toBe(sha);
  });
  it('starts every code with the finder pattern', () => {
    expect(
      encodeQr('https://focsd.dev', 'M')[0]
        .map((d) => (d ? 1 : 0))
        .join(''),
    ).toBe('1111111000101101001111111');
  });
  it('fits 1273 bytes at H in version 40 (177 modules)', () => {
    expect(encodeQr('A'.repeat(1273), 'H')).toHaveLength(177);
  });
  it('throws a RangeError one byte past the version-40 capacity', () => {
    expect(() => encodeQr('A'.repeat(1274), 'H')).toThrow(new RangeError('QR value too long'));
  });
  it('throws a RangeError when the value does not fit', () => {
    expect(() => encodeQr('A'.repeat(3000), 'H')).toThrow(new RangeError('QR value too long'));
  });
  it.each([
    ['L', 2953],
    ['M', 2331],
    ['Q', 1663],
    ['H', 1273],
  ])('at %s fits %i UTF-8 bytes and rejects one more', (level, max) => {
    expect(encodeQr('A'.repeat(max), /** @type {any} */ (level))).toHaveLength(177);
    expect(() => encodeQr('A'.repeat(max + 1), /** @type {any} */ (level))).toThrow(new RangeError('QR value too long'));
  });
  it('counts UTF-8 bytes, not UTF-16 units, against the capacity', () => {
    expect(() => encodeQr('é'.repeat(637), 'H')).toThrow(new RangeError('QR value too long'));
  });
  it('rejects a 1 MB value fast, before encoding', () => {
    const start = performance.now();
    expect(() => encodeQr('A'.repeat(1_000_000), 'L')).toThrow(new RangeError('QR value too long'));
    expect(performance.now() - start).toBeLessThan(50);
  });
  it.each(['X', '', 'h', undefined])('rejects the error-correction level %s', (level) => {
    expect(() => encodeQr('x', /** @type {any} */ (level))).toThrow(new TypeError('Unknown QR error-correction level'));
  });
});
