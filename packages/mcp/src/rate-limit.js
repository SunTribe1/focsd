/**
 * In-memory token bucket per client key (wave 15 ruling R2). Limits hold per process: a hosted
 * deployment must also put the platform's own limiter in front.
 */

/** Default sustained rate. */
const DEFAULT_PER_MINUTE = 60;

/** Default burst: requests a fresh client may make at once. */
const DEFAULT_BURST = 20;

const OVERFLOW_KEY = '*';

/** Keys remembered; past this, new keys share one overflow bucket and none is evicted. */
const DEFAULT_MAX_KEYS = 10_000;

/**
 * @typedef {object} RateLimitOptions
 * @property {number} [perMinute] Sustained requests per minute per key (default 60).
 * @property {number} [burst] Bucket size (default 20).
 * @property {() => number} [now] Clock in milliseconds (tests).
 * @property {number} [maxKeys] Keys kept in memory (default 10 000). Past that, new unknown keys share one overflow bucket; known keys are never evicted.
 * @typedef {{ ok: true } | { ok: false, retryAfter: number }} TakeResult
 * @typedef {{ take(key: string): TakeResult, size(): number }} RateLimiter
 */

/**
 * @param {string} name
 * @param {number} value
 */
function assertPositive(name, value) {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${name} must be a positive number, got ${value}.`);
}

/**
 * @param {RateLimitOptions} [options]
 * @returns {RateLimiter}
 */
export function createRateLimiter(options = {}) {
  const { perMinute = DEFAULT_PER_MINUTE, burst = DEFAULT_BURST, now = Date.now, maxKeys = DEFAULT_MAX_KEYS } = options;

  assertPositive('perMinute', perMinute);
  assertPositive('burst', burst);
  assertPositive('maxKeys', maxKeys);
  const perMs = perMinute / 60_000;
  /** @type {Map<string, { tokens: number, at: number }>} */
  const buckets = new Map();
  /** @type {Map<string, { tokens: number, at: number }>} */
  const overflow = new Map();

  return {
    take(key) {
      const time = now();

      // A key unknown at capacity joins the shared overflow bucket; known keys are never evicted.
      const known = buckets.has(key);
      const full = !known && buckets.size >= maxKeys;
      const store = full ? overflow : buckets;
      const slot = full ? OVERFLOW_KEY : key;
      const last = store.get(slot);
      const tokens = last ? Math.min(burst, last.tokens + (time - last.at) * perMs) : burst;
      const ok = tokens >= 1;

      store.set(slot, { tokens: ok ? tokens - 1 : tokens, at: time });

      return ok ? { ok: true } : { ok: false, retryAfter: Math.max(1, Math.ceil((1 - tokens) / perMs / 1000)) };
    },
    size: () => buckets.size,
  };
}
