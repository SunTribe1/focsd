import { describe, expect, it } from 'vitest';
import { compareVersions } from '../src/text.js';

describe('compareVersions', () => {
  it('orders x.y.z versions part by part', () => {
    expect(compareVersions('1.2.3', '1.2.3')).toBe(0);
    expect(compareVersions('1.2.3', '1.10.0')).toBe(-1);
    expect(compareVersions('2.0.0', '1.99.99')).toBe(1);
  });

  it('counts a missing part as 0', () => {
    expect(compareVersions('1.2', '1.2.1')).toBe(-1);
    expect(compareVersions('1.2.1', '1.2')).toBe(1);
    expect(compareVersions('1.2', '1.2.0')).toBe(0);
    expect(compareVersions('1', '1.0.0')).toBe(0);
  });

  it('ignores pre-release tags', () => {
    expect(compareVersions('1.2.0-beta.1', '1.2.0')).toBe(0);
    expect(compareVersions('1.2.0-beta.1', '1.2.1')).toBe(-1);
  });
});
