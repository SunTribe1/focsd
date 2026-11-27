import { describe, expect, it } from 'vitest';
import { check } from '../src/fill.js';

const schema = {
  type: 'object',
  required: ['name', 'guests'],
  properties: {
    name: { type: 'string', maxLength: 5 },
    email: { type: 'string', format: 'email' },
    guests: { type: 'number', minimum: 1, maximum: 12 },
    rating: { type: 'integer', minimum: 1, maximum: 5 },
    area: { type: 'string', enum: ['inside', 'terrace'] },
    diet: { type: 'array', maxItems: 2, items: { type: 'string', enum: ['vegan', 'nuts', 'gluten'] } },
    when: {
      type: 'object',
      required: ['start', 'end'],
      properties: { start: { type: 'string', format: 'date' }, end: { type: 'string', format: 'date' } },
    },
    time: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' },
    ok: { type: 'boolean' },
  },
};

const fields = (input) =>
  check(schema, input)
    .map((e) => e.field)
    .toSorted();

describe('check', () => {
  it('accepts valid input', () => {
    expect(
      check(schema, {
        name: 'Ada',
        guests: 2,
        area: 'inside',
        diet: ['vegan'],
        when: { start: '2026-01-01', end: '2026-01-02' },
        time: '09:30',
        ok: true,
      }),
    ).toEqual([]);
  });
  it('reports missing required fields and unknown fields', () => {
    expect(fields({ nope: 1 })).toEqual(['guests', 'name', 'nope']);
  });
  it('reports each kind of mismatch', () => {
    expect(
      fields({
        name: 'Alexander',
        guests: 20,
        email: 'x',
        rating: 2.5,
        area: 'roof',
        diet: ['vegan', 'nuts', 'gluten'],
        when: { start: '2026-01-01' },
        time: '25:00',
        ok: 'yes',
      }),
    ).toEqual(['area', 'diet', 'email', 'guests', 'name', 'ok', 'rating', 'time', 'when']);
  });
  it('ignores inherited object keys and rejects non-text for text fields', () => {
    expect(fields({ name: 'Ada', guests: 2, constructor: 'x', toString: 'y' })).toEqual(['constructor', 'toString']);
    expect(fields({ name: { first: 'Ada' }, guests: 2 })).toEqual(['name']);
  });

  it('reports a null nested object as "Expected an object." instead of throwing', () => {
    const nested = {
      type: 'object',
      properties: {
        stops: { type: 'array', items: { type: 'object', required: ['at'], properties: { at: { type: 'string' } } } },
        when: { type: 'object', properties: { range: { type: 'object', required: ['start'] } } },
      },
    };

    expect(check(nested, { stops: [null] })).toEqual([{ field: 'stops', message: 'Expected an object.' }]);
    expect(check(nested, { when: { range: null } })).toEqual([{ field: 'when', message: 'Expected an object.' }]);
  });

  it('a nested required key holding 0, false or empty text is present, not missing', () => {
    const nested = {
      type: 'object',
      properties: {
        item: {
          type: 'object',
          required: ['count', 'gift', 'note'],
          properties: { count: { type: 'number' }, gift: { type: 'boolean' }, note: { type: 'string' } },
        },
      },
    };

    expect(check(nested, { item: { count: 0, gift: false, note: '' } })).toEqual([]);
    expect(check(nested, { item: { count: 0, gift: false } })).toEqual([{ field: 'item', message: 'Missing note.' }]);
    expect(check(nested, { item: { count: 0, gift: null, note: '' } })).toEqual([{ field: 'item', message: 'Missing gift.' }]);
  });
});
