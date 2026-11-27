// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { cutAtWord } from '../src/chat-thread.js';

describe('cutAtWord (review item 84)', () => {
  it('keeps short text whole', () => {
    expect(cutAtWord('Hello there', 300)).toBe('Hello there');
  });

  it('cuts at the last space at or before the limit', () => {
    expect(cutAtWord('one two three four', 9)).toBe('one two');
    expect(cutAtWord('one two three four', 7)).toBe('one two');
    expect(cutAtWord('one two three', 8)).toBe('one two');
  });

  it('cuts mid-word only when the first word is longer than the limit', () => {
    expect(cutAtWord('Supercalifragilistic word', 5)).toBe('Super');
  });

  it('never returns more than the limit', () => {
    const text = 'the quick brown fox jumps over '.repeat(30);

    expect(cutAtWord(text, 300).length).toBeLessThanOrEqual(300);
    expect(text.startsWith(cutAtWord(text, 300))).toBe(true);
  });
});
