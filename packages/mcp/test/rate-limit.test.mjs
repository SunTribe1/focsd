import { describe, expect, it } from 'vitest';
import { createRateLimiter } from '../src/rate-limit.js';

/** A clock the test moves by hand. */
function clock() {
  let now = 0;

  return { now: () => now, advance: (ms) => (now += ms) };
}

describe('createRateLimiter (R2 token bucket)', () => {
  it('allows a burst, then refuses with whole seconds to wait', () => {
    const time = clock();
    const limiter = createRateLimiter({ perMinute: 60, burst: 3, now: time.now });

    expect([1, 2, 3].map(() => limiter.take('a').ok)).toEqual([true, true, true]);
    const refused = limiter.take('a');
    expect(refused.ok).toBe(false);
    expect(refused.retryAfter).toBe(1);
  });

  it('refills at perMinute and keeps keys apart', () => {
    const time = clock();
    const limiter = createRateLimiter({ perMinute: 6, burst: 1, now: time.now });

    expect(limiter.take('a').ok).toBe(true);
    expect(limiter.take('a').ok).toBe(false);
    expect(limiter.take('b').ok).toBe(true);
    expect(limiter.take('a').retryAfter).toBe(10);
    time.advance(10_000);
    expect(limiter.take('a').ok).toBe(true);
  });

  it('forgets idle keys so memory stays bounded', () => {
    const time = clock();
    const limiter = createRateLimiter({ perMinute: 60, burst: 2, now: time.now, maxKeys: 2 });

    limiter.take('a');
    limiter.take('b');
    limiter.take('c');
    expect(limiter.size()).toBeLessThanOrEqual(2);
  });

  it('never evicts known keys at maxKeys: new keys share one overflow bucket', () => {
    const time = clock();
    const limiter = createRateLimiter({ perMinute: 6, burst: 1, now: time.now, maxKeys: 2 });

    expect(limiter.take('a').ok).toBe(true);
    expect(limiter.take('b').ok).toBe(true);
    // 'c' and 'd' are unknown at capacity: they share the overflow bucket (burst 1).
    expect(limiter.take('c').ok).toBe(true);
    expect(limiter.take('d').ok).toBe(false);
    expect(limiter.size()).toBeLessThanOrEqual(2);
    // Existing keys keep their state: 'a' is still spent, not reset by the churn.
    expect(limiter.take('a').ok).toBe(false);
    expect(limiter.take('b').ok).toBe(false);
  });

  it('defaults to 60 a minute with a burst of 20', () => {
    const limiter = createRateLimiter();
    const results = Array.from({ length: 21 }, () => limiter.take('k').ok);
    expect(results.filter(Boolean)).toHaveLength(20);
  });

  it('rejects nonsense limits', () => {
    expect(() => createRateLimiter({ perMinute: 0 })).toThrow(RangeError);
    expect(() => createRateLimiter({ burst: -1 })).toThrow(RangeError);
  });
});
