import { describe, expect, it } from 'vitest';
import { MESSAGE_ICONS, pickMessage } from '../src/internal/field-messages.js';

describe('pickMessage', () => {
  it('shows error over warning over success', () => {
    expect(pickMessage({ error: 'Taken', warning: 'Unusual', success: 'Free' })).toEqual({ kind: 'error', text: 'Taken' });
    expect(pickMessage({ error: '', warning: 'Unusual', success: 'Free' })).toEqual({ kind: 'warning', text: 'Unusual' });
    expect(pickMessage({ success: 'Free' })).toEqual({ kind: 'success', text: 'Free' });
  });
  it('treats blank and missing as no message', () => {
    expect(pickMessage({ error: '   ', warning: null, success: undefined })).toBeNull();
  });
  it('has an icon for every kind, so color is never the only signal', () => {
    expect(MESSAGE_ICONS).toEqual({ error: 'alert-circle', warning: 'alert-triangle', success: 'check' });
  });
});

describe('MESSAGE_KINDS', () => {
  it('lists the kinds in the order they win', async () => {
    const { MESSAGE_KINDS } = await import('../src/internal/field-messages.js');

    expect(MESSAGE_KINDS).toEqual(['error', 'warning', 'success']);
  });
});
