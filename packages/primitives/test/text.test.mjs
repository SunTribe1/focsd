// cspell:ignore ÉCOLE precomposed brûlée brulee
import { describe, expect, it } from 'vitest';
import { fold, matchesQuery, queryMatcher } from '../src/internal/text.js';

describe('fold', () => {
  it('lower-cases and strips accents', () => {
    expect(fold('Café')).toBe('cafe');
    expect(fold('ÉCOLE')).toBe('ecole');
    expect(fold('Ångström')).toBe('angstrom');
    expect(fold('Señor Müller')).toBe('senor muller');
  });
  it('keeps ASCII punctuation that Unicode also calls a diacritic', () => {
    expect(fold('a^b`c')).toBe('a^b`c');
    expect(fold('é^')).toBe('e^');
  });
  it('treats precomposed and decomposed text alike', () => {
    expect(fold('é')).toBe(fold('é'));
  });
  it('turns null and undefined into an empty string and other values into text', () => {
    expect(fold(null)).toBe('');
    expect(fold(undefined)).toBe('');
    expect(fold(42)).toBe('42');
  });
});

describe('matchesQuery', () => {
  it('finds accented text from an unaccented query ("e" finds "é")', () => {
    expect(matchesQuery('é', 'e')).toBe(true);
    expect(matchesQuery('Crème brûlée', 'creme')).toBe(true);
    expect(matchesQuery('Crème brûlée', 'brulee')).toBe(true);
  });
  it('finds unaccented text from an accented query', () => {
    expect(matchesQuery('Cafe', 'café')).toBe(true);
  });
  it('is case-insensitive and matches anywhere in the text', () => {
    expect(matchesQuery('Open settings', 'SETT')).toBe(true);
    expect(matchesQuery('Open settings', 'close')).toBe(false);
  });
  it('ignores surrounding white space in the query, and an empty query matches everything', () => {
    expect(matchesQuery('Copy', '  co ')).toBe(true);
    expect(matchesQuery('Copy', '')).toBe(true);
    expect(matchesQuery('Copy', '   ')).toBe(true);
  });
});

describe('fix round 1', () => {
  it('matchesQuery accepts any query value', () => {
    expect(matchesQuery('42 items', 42)).toBe(true);
    expect(matchesQuery('Copy', null)).toBe(true);
    expect(matchesQuery('Copy', undefined)).toBe(true);
  });
  it('queryMatcher folds the query once and matches like matchesQuery', () => {
    const matches = queryMatcher(' CAFÉ ');
    expect(matches('Café settings')).toBe(true);
    expect(matches('cafe')).toBe(true);
    expect(matches('Tea')).toBe(false);
    expect(queryMatcher('')('anything')).toBe(true);
  });
});
