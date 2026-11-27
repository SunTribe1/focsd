import { describe, expect, it } from 'vitest';
import { en } from '@focsd-dev/primitives/utils';
import { getType } from '../src/engine/types.js';

describe('filter operator labels', () => {
  it('every built-in operator has an op.* term in the English table, so translators see it', () => {
    for (const type of ['text', 'number', 'date', 'boolean', 'enum']) {
      for (const [id, op] of Object.entries(getType(type)?.operators ?? {})) {
        expect(en[`op.${id}`], `${type}: op.${id}`).toBe(op.label);
      }
    }
  });
});
