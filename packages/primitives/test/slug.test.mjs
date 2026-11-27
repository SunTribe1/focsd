// cspell:ignore Überblick überblick готово
import { expect, it } from 'vitest';
import { slugify } from '../src/internal/slug.js';

it('makes unique, readable ids', () => {
  const taken = new Set(['install']);
  expect(slugify('Install', taken)).toBe('install-2');
  expect(slugify('  Keyboard & focus  ', taken)).toBe('keyboard-focus');
  expect(slugify('Überblick', taken)).toBe('überblick');
  expect(slugify('Keyboard & focus', taken)).toBe('keyboard-focus-2');
});

it('counts on past taken suffixes and keeps digits in any script', () => {
  const taken = new Set(['usage', 'usage-2']);
  expect(slugify('Usage', taken)).toBe('usage-3');
  expect(slugify('Шаг ٣: готово!', taken)).toBe('шаг-٣-готово');
  expect(slugify('概要', taken)).toBe('概要');
});

it('falls back to "section" when the text has no letters or digits', () => {
  const taken = new Set();
  expect(slugify(' — ', taken)).toBe('section');
  expect(slugify('', taken)).toBe('section-2');
});
