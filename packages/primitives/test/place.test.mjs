import { describe, expect, it } from 'vitest';
import { place } from '../src/internal/place.js';

const vp = { width: 1000, height: 800 };
const panel = { width: 300, height: 200 };

describe('place', () => {
  it('puts the panel below the target with a gap', () => {
    expect(place({ top: 100, left: 100, width: 50, height: 20, bottom: 120, right: 150 }, panel, vp, 'bottom')).toEqual({
      top: 128,
      left: 100,
      placement: 'bottom',
    });
  });
  it('flips to the top when there is no room below', () => {
    expect(place({ top: 700, left: 100, width: 50, height: 20, bottom: 720, right: 150 }, panel, vp, 'bottom')).toMatchObject({
      top: 492,
      placement: 'top',
    });
  });
  it('clamps inside the viewport', () => {
    expect(place({ top: 100, left: 950, width: 40, height: 20, bottom: 120, right: 990 }, panel, vp, 'bottom').left).toBe(692);
  });
});

describe('place, other sides', () => {
  const target = { top: 300, left: 400, width: 100, height: 40, bottom: 340, right: 500 };
  it('puts the panel to the right or left', () => {
    expect(place(target, panel, vp, 'right')).toEqual({ top: 300, left: 508, placement: 'right' });
    expect(place(target, panel, vp, 'left')).toEqual({ top: 300, left: 92, placement: 'left' });
  });
  it('flips left to right when there is no room on the left', () => {
    expect(place({ ...target, left: 50, right: 150 }, panel, vp, 'left')).toMatchObject({ left: 158, placement: 'right' });
  });
  it('keeps the requested side when neither side fits, and treats an unknown placement as bottom', () => {
    expect(place(target, { width: 300, height: 600 }, vp, 'top')).toEqual({ top: 8, left: 400, placement: 'top' });
    expect(place(target, panel, vp, 'middle')).toMatchObject({ top: 348, placement: 'bottom' });
    expect(place(target, panel, vp)).toMatchObject({ placement: 'bottom' });
  });
  it.each(['toString', 'constructor', '__proto__'])('treats the inherited key %s as bottom', (key) => {
    expect(place(target, panel, vp, key)).toMatchObject({ top: 348, placement: 'bottom' });
  });
});

describe('place, right-to-left', () => {
  const target = { top: 100, left: 500, width: 100, height: 20, bottom: 120, right: 600 };

  it('lines the panel up with the target’s right edge above or below', () => {
    expect(place(target, panel, { ...vp, rtl: true }, 'bottom')).toEqual({ top: 128, left: 300, placement: 'bottom' });
    expect(place({ ...target, top: 700, bottom: 720 }, panel, { ...vp, rtl: true }, 'bottom')).toEqual({
      top: 492,
      left: 300,
      placement: 'top',
    });
  });

  it('still clamps inside the viewport', () => {
    expect(place({ ...target, left: 20, right: 120 }, panel, { ...vp, rtl: true }, 'bottom').left).toBe(8);
  });
});
