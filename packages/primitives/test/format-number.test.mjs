import { describe, expect, it } from 'vitest';
import { formatByteSize, formatNumber } from '../src/internal/format-number.js';

/** What ICU prints for 0 bytes in en-US ("0 byte" or "0 B", depending on the ICU build). */
const zeroBytes = new Intl.NumberFormat('en-US', { style: 'unit', unit: 'byte' }).format(0);

describe('formatNumber', () => {
  it('follows the locale', () => {
    expect(formatNumber(1234.5, { locale: 'en-US' })).toBe('1,234.5');
    // ICU puts a no-break space before the euro sign.
    expect(formatNumber(1234.5, { type: 'currency', currency: 'EUR', locale: 'de' })).toBe('1.234,50 €');
    expect(formatNumber(0.256, { type: 'percent', locale: 'en-US' })).toBe('26%');
    expect(formatNumber(50, { type: 'unit', unit: 'kilometer-per-hour', locale: 'en-US' })).toBe('50 km/h');
    expect(formatNumber(1234567, { notation: 'compact', locale: 'en-US' })).toBe('1.2M');
    expect(formatNumber(2, { minimumFractionDigits: 2, locale: 'en-US' })).toBe('2.00');
  });

  it('caps fraction digits', () => {
    expect(formatNumber(3.14159, { maximumFractionDigits: 2, locale: 'en-US' })).toBe('3.14');
  });

  it('formats bytes through formatByteSize', () => {
    expect(formatNumber(1536, { type: 'bytes', binary: true, locale: 'en-US' })).toBe('1.5 KiB');
    expect(formatNumber(1500, { type: 'bytes', locale: 'en-US' })).toBe('1.5 kB');
  });
});

describe('formatByteSize', () => {
  it('uses 1000-based units by default', () => {
    expect(formatByteSize(0, { locale: 'en-US' })).toBe(zeroBytes);
    expect(formatByteSize(1500, { locale: 'en-US' })).toBe('1.5 kB');
    expect(formatByteSize(3_200_000_000, { locale: 'en-US' })).toBe('3.2 GB');
    expect(formatByteSize(1e12, { locale: 'en-US' })).toBe('1 TB');
  });

  it('stops at petabytes', () => {
    expect(formatByteSize(2e18, { locale: 'en-US' })).toBe('2,000 PB');
  });

  it('switches to KiB, MiB with binary', () => {
    expect(formatByteSize(1536, { locale: 'en-US', binary: true })).toBe('1.5 KiB');
    expect(formatByteSize(1536, { locale: 'de', binary: true })).toBe('1,5 KiB');
    expect(formatByteSize(5 * 1024 ** 2, { locale: 'en-US', binary: true })).toBe('5 MiB');
    expect(formatByteSize(512, { locale: 'en-US', binary: true })).toBe('512 B');
  });

  it('keeps the sign of negative sizes', () => {
    expect(formatByteSize(-1500, { locale: 'en-US' })).toBe('-1.5 kB');
    expect(formatByteSize(-1536, { locale: 'en-US', binary: true })).toBe('-1.5 KiB');
  });

  it('takes maximumFractionDigits and notation', () => {
    expect(formatByteSize(1234, { locale: 'en-US', maximumFractionDigits: 2 })).toBe('1.23 kB');
    expect(formatByteSize(1536, { locale: 'en-US', binary: true, maximumFractionDigits: 0 })).toBe('2 KiB');
  });
});
