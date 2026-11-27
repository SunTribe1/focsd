// The terms register under `ai.*` keys and resolve through the shared translation table.
import { expect, it } from 'vitest';
import { termFor } from '@focsd/primitives/internal';
import { terms } from '../src/index.js';

it('registers every term under an ai.* key', () => {
  const keys = Object.keys(terms).filter((k) => k !== '$code');

  expect(keys.every((k) => k.startsWith('ai.'))).toBe(true);
  expect(termFor('en', 'ai.send')).toBe('Send');
  expect(termFor('en', 'ai.removeFile', 'a.txt')).toBe('Remove a.txt');
});
