import { describe, expect, it } from 'vitest';
import { deltaState, deltaText } from '../src/display/stat-delta.js';
import { termFor } from '../src/internal/localize.js';

/** @param {string} key @param {...unknown} args */
const term = (key, ...args) => termFor('en', key, ...args);

describe('deltaState', () => {
  it('infers the trend from the sign of the delta', () => {
    expect(deltaState(0.12).trend).toBe('up');
    expect(deltaState(-0.05).trend).toBe('down');
    expect(deltaState(0).trend).toBe('flat');
  });

  it('an explicit trend wins over the sign; an unknown one is ignored', () => {
    expect(deltaState(0.12, 'flat').trend).toBe('flat');
    expect(deltaState(0.12, /** @type {any} */ ('sideways')).trend).toBe('up');
  });

  it('judges the change by `good`: up is good by default, down when good="down"', () => {
    expect(deltaState(0.12).judgement).toBe('good');
    expect(deltaState(-0.12).judgement).toBe('bad');
    expect(deltaState(0.12, '', 'down').judgement).toBe('bad');
    expect(deltaState(-0.12, '', 'down').judgement).toBe('good');
    expect(deltaState(0).judgement).toBe('neutral');
  });

  it('has nothing to say without a finite delta', () => {
    expect(deltaState(undefined)).toBeNull();
    expect(deltaState(Number.NaN)).toBeNull();
  });
});

describe('deltaText', () => {
  it('reads direction, amount, period and judgement in words', () => {
    expect(deltaText(term, deltaState(0.12), '12%', '')).toBe('Up 12% from last period, good');
    expect(deltaText(term, deltaState(-0.03), '3%', 'last week')).toBe('Down 3% from last week, bad');
    expect(deltaText(term, deltaState(-0.03, '', 'down'), '3%', '')).toBe('Down 3% from last period, good');
    expect(deltaText(term, deltaState(0), '0%', 'yesterday')).toBe('No change from yesterday');
  });
});
