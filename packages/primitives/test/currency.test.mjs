import { describe, expect, it } from 'vitest';
import { affix, formatAmount, minorUnits, parseAmount, toValue } from '../src/internal/currency.js';

describe('currency', () => {
  it('knows minor units', () => {
    expect([minorUnits('USD'), minorUnits('JPY'), minorUnits('KWD')]).toEqual([2, 0, 3]);
  });

  it('parses locale input, symbols and paste noise', () => {
    expect(parseAmount('1.234,56', 'de')).toBe(1234.56);
    expect(parseAmount('1 234,56 €', 'fr')).toBe(1234.56);
    expect(parseAmount('$1,234.5', 'en-US')).toBe(1234.5);
    expect(parseAmount('EUR 12', 'en')).toBe(12);
    expect(parseAmount('(12.00)', 'en-US')).toBe(-12);
    expect(parseAmount('-7', 'en-US')).toBe(-7);
    expect(parseAmount('١٢٣٫٤٥', 'ar-EG')).toBe(123.45);
    expect(parseAmount('12abc', 'en')).toBeNull();
    expect(parseAmount('1.2.3', 'en')).toBeNull();
    expect(parseAmount('', 'en')).toBeNull();
    expect(parseAmount('12.', 'en')).toBe(12);
  });

  it('formats and places the symbol by locale', () => {
    expect(formatAmount(1234.5, { locale: 'de', currency: 'EUR', display: 'symbol', grouping: true })).toBe('1.234,50 €');
    expect(formatAmount(1234.5, { locale: 'de', currency: 'EUR', display: 'symbol', grouping: false })).toBe('1234,50 €');
    expect(formatAmount(1234.5, { locale: 'en-US', currency: 'USD', display: 'symbol', grouping: true, symbol: false })).toBe('1,234.50');
    expect(affix('en-US', 'USD', 'symbol')).toEqual({ prefix: '$', suffix: '' });
    expect(affix('de', 'EUR', 'code').suffix.trim()).toBe('EUR');
  });

  it('serializes with exact minor units', () => {
    expect(toValue(1234.5, 'USD')).toBe('1234.50');
    expect(toValue(1234.5, 'JPY')).toBe('1235');
    expect(toValue(1.2345, 'KWD')).toBe('1.235');
    expect(toValue(-0.005, 'USD')).toBe('-0.01');
  });

  describe('pastes from other formats and locales (review I2)', () => {
    it('reads the other common format instead of producing a wrong number', () => {
      expect(parseAmount('1.234,56', 'en')).toBe(1234.56);
      expect(parseAmount('€1.234,56', 'en')).toBe(1234.56);
      expect(parseAmount('$1,234.56', 'de')).toBe(1234.56);
      expect(parseAmount("1'234.50", 'de-CH')).toBe(1234.5);
      expect(parseAmount('1,23,456.50', 'en-IN')).toBe(123456.5);
    });

    it('rejects an ambiguous number rather than guessing wrong', () => {
      expect(parseAmount('1.5', 'de')).toBeNull();
      expect(parseAmount('12,5', 'en')).toBeNull();
      expect(parseAmount('1,2,3', 'en')).toBeNull();
    });

    it("accepts the field's own formatted text in every display and multi-letter symbols", () => {
      expect(parseAmount('CA$1,234.50', 'en', 'CAD')).toBe(1234.5);
      expect(parseAmount('US$1,234.50', 'en-CA', 'USD')).toBe(1234.5);
      expect(parseAmount('1.234,50 Euro', 'de', 'EUR')).toBe(1234.5);
      expect(parseAmount('1,234.50 US dollars', 'en', 'USD')).toBe(1234.5);
      expect(parseAmount('12,50 zł', 'pl', 'PLN')).toBe(12.5);
      expect(parseAmount('12,50 Kč', 'cs', 'CZK')).toBe(12.5);
      expect(parseAmount('eur 12', 'en')).toBe(12);

      for (const [locale, currency] of [
        ['ar', 'SAR'],
        ['he', 'ILS'],
        ['fa', 'IRR'],
        ['ja', 'JPY'],
        ['ar-EG', 'EGP'],
        ['en-IN', 'INR'],
      ])
        for (const n of [1234.5, -1234.5, 0.5]) {
          for (const display of ['symbol', 'code', 'name']) {
            const text = formatAmount(n, { locale, currency, display, grouping: true });
            const digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits;
            expect(parseAmount(text, locale, currency), `${locale} ${display} ${text}`).toBeCloseTo(Number(n.toFixed(digits)), 3);
          }

          const plain = formatAmount(n, { locale, currency, grouping: false, symbol: false });
          expect(parseAmount(plain, locale, currency), `${locale} plain ${plain}`).toBeCloseTo(Number(n.toFixed(minorUnits(currency))), 3);
        }
    });

    it('ignores bidi marks and reads native digits in any locale', () => {
      expect(parseAmount('\u061c-١٬٢٣٤٫٥٠', 'ar-EG')).toBe(-1234.5);
      expect(parseAmount('١٬٢٣٤٫٥٦', 'ar')).toBe(1234.56);
      expect(parseAmount('\u200e-12.50', 'he')).toBe(-12.5);
      expect(parseAmount('１２３．５', 'ja')).toBe(123.5);
    });

    it('still rejects junk', () => {
      expect(parseAmount('12abc', 'en', 'USD')).toBeNull();
      expect(parseAmount('ten', 'en', 'USD')).toBeNull();
    });
  });
});
