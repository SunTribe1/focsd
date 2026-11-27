import { describe, expect, it } from 'vitest';
import { cssName } from '../lib/names.mjs';

describe('cssName', () => {
  it.each([
    [['ref', 'color', 'graphite', '21'], '--focsd-ref-graphite-21'],
    [['ref', 'color', 'overlay', 'ink-48'], '--focsd-ref-overlay-ink-48'],
    [['ref', 'space', '4'], '--focsd-ref-space-4'],
    [['ref', 'font', 'atkinson-next'], '--focsd-ref-font-atkinson-next'],
    [['sys', 'color', 'ink'], '--focsd-ink'],
    [['sys', 'color', 'ink-muted'], '--focsd-ink-muted'],
    [['sys', 'text', 'body', 'size'], '--focsd-text-body-size'],
    [['sys', 'control', 'height'], '--focsd-control-height'],
    [['cmp', 'button', 'background'], '--focsd-button-background'],
  ])('%j → %s', (path, expected) => {
    expect(cssName(path)).toBe(expected);
  });

  it('rejects unknown tiers', () => {
    expect(() => cssName(['brand', 'color', 'x'])).toThrow('Unknown token tier "brand"');
  });
});
