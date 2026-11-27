import { describe, expect, it } from 'vitest';
import { gzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { COUNTRIES, countryName, flag, formatNational, isValidPhone, parsePhone, regionOf } from '../src/internal/phone.js';

describe('phone', () => {
  it('has ~240 countries, each with a dial code, a length range and a valid example', () => {
    expect(COUNTRIES.length).toBeGreaterThan(200);

    for (const c of COUNTRIES) {
      expect(c.dial, c.code).toMatch(/^\d{1,4}$/);
      expect(c.min, c.code).toBeLessThanOrEqual(c.max);
      expect(isValidPhone({ national: c.example, country: c.code }), c.code).toBe(true);
    }
  });

  it('keeps the generated table small', () => {
    const bytes = gzipSync(readFileSync(new URL('../src/internal/phone-data.js', import.meta.url))).length;
    expect(bytes).toBeLessThanOrEqual(8 * 1024);
  });

  it('normalizes national, +, 00 and punctuated input to E.164', () => {
    expect(parsePhone('020 7183 8750', 'GB')).toEqual({ country: 'GB', national: '2071838750', e164: '+442071838750' });
    expect(parsePhone('+44 (0)20 7183-8750', 'US')).toMatchObject({ country: 'GB', e164: '+442071838750' });
    expect(parsePhone('0044 20 7183 8750', 'DE')).toMatchObject({ country: 'GB' });
    expect(parsePhone('(415) 555.0132', 'US')).toMatchObject({ e164: '+14155550132' });
    expect(parsePhone('+1 415 555 0132', 'GB').country).toBe('US');
    expect(parsePhone('abc', 'US')).toBeNull();
    expect(parsePhone('', 'US')).toBeNull();
  });

  it('keeps the current country when it shares the dial code', () => {
    expect(parsePhone('+1 604 555 0199', 'CA').country).toBe('CA');
    expect(parsePhone('+7 701 000 9998', 'KZ').country).toBe('KZ');
    expect(parsePhone('+7 912 345 6789', 'GB').country).toBe('RU');
  });

  it('validates the national length', () => {
    expect(isValidPhone({ national: '41555', country: 'US' })).toBe(false);
    expect(isValidPhone({ national: '4155550132', country: 'US' })).toBe(true);
    expect(isValidPhone({ national: '4155550132', country: 'ZZ' })).toBe(false);
  });

  it('groups digits like the country example when the length matches', () => {
    expect(formatNational('7400123456', 'GB')).toBe('7400 123456');
    expect(formatNational('4155550132', 'US')).toBe('415 555 0132');
    expect(formatNational('41555', 'US')).toBe('41555');
  });

  it('names countries, draws flags and reads the region from a locale', () => {
    expect(countryName('DE', 'en')).toBe('Germany');
    expect(countryName('DE', 'de')).toBe('Deutschland');
    expect(flag('GB')).toBe('🇬🇧');
    expect(regionOf('en-GB')).toBe('GB');
    expect(regionOf('fr')).toBeUndefined();
  });

  it('reads common clipboard formats (review I3)', () => {
    expect(parsePhone('\u202a+44 20 7183 8750\u202c', 'US')).toMatchObject({ country: 'GB', e164: '+442071838750' });
    expect(parsePhone('+1 (416) 555\u20110123', 'GB')).toMatchObject({ e164: '+14165550123' });
    expect(parsePhone('+1 416 555–0123', 'GB')).toMatchObject({ e164: '+14165550123' });
    expect(parsePhone('＋４４ ２０ ７１８３ ８７５０', 'US')).toMatchObject({ e164: '+442071838750' });
    expect(parsePhone('tel:+44-20-7183-8750', 'US')).toMatchObject({ e164: '+442071838750' });
    expect(parsePhone('+44 020 7183 8750', 'US')).toMatchObject({ national: '2071838750', e164: '+442071838750' });
  });

  it('reads digits typed in other scripts', () => {
    expect(parsePhone('٠٥٠ ١٢٣ ٤٥٦٧', 'SA')).toMatchObject({ e164: '+966501234567' });
    expect(parsePhone('۰۹۱۲ ۳۴۵ ۶۷۸۹', 'IR')).toMatchObject({ e164: '+989123456789' });
  });
});
