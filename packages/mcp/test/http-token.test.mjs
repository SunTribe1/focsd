import { describe, expect, it } from 'vitest';
import { createHttpHandler, hasBearer } from '../src/http.js';
import { initialize, message, post } from './http-helpers.mjs';

const TOKEN = 'a-long-enough-test-token';

describe('optional bearer token (review item 77)', () => {
  it('answers 401 with WWW-Authenticate when the token is missing or wrong', async () => {
    const handler = createHttpHandler({ token: TOKEN, rateLimit: false });

    for (const headers of [{}, { authorization: 'Bearer nope' }, { authorization: TOKEN }]) {
      const response = await handler(post(initialize(), headers));

      expect(response.status).toBe(401);
      expect(response.headers.get('www-authenticate')).toBe('Bearer');
    }
  });

  it('serves a request with the right token', async () => {
    const response = await createHttpHandler({ token: TOKEN, rateLimit: false })(post(initialize(), { authorization: `Bearer ${TOKEN}` }));

    expect(response.status).toBe(200);
    expect((await message(response)).result.serverInfo.name).toBe('focsd');
  });

  it('needs no token when none is set', async () => {
    expect((await createHttpHandler({ rateLimit: false })(post(initialize()))).status).toBe(200);
  });

  it('rate-limits token guesses', async () => {
    const handler = createHttpHandler({ token: TOKEN, rateLimit: { perMinute: 1, burst: 1 } });

    expect((await handler(post(initialize()))).status).toBe(401);
    expect((await handler(post(initialize()))).status).toBe(429);
  });

  it('refuses a short or non-string token', () => {
    expect(() => createHttpHandler({ token: 'short' })).toThrow(TypeError);
    expect(() => createHttpHandler({ token: /** @type {any} */ (42) })).toThrow(TypeError);
  });

  it('compares the whole header', () => {
    const request = (value) => new Request('http://x/', { headers: value ? { authorization: value } : {} });

    expect(hasBearer(request(`Bearer ${TOKEN}`), TOKEN)).toBe(true);
    expect(hasBearer(request(`Bearer ${TOKEN}x`), TOKEN)).toBe(false);
    expect(hasBearer(request(`Bearer ${TOKEN.slice(0, -1)}`), TOKEN)).toBe(false);
    expect(hasBearer(request(''), TOKEN)).toBe(false);
  });

  it('accepts the scheme in any case, but not the token', () => {
    const request = (value) => new Request('http://x/', { headers: { authorization: value } });

    expect(hasBearer(request(`bearer ${TOKEN}`), TOKEN)).toBe(true);
    expect(hasBearer(request(`BEARER ${TOKEN}`), TOKEN)).toBe(true);
    expect(hasBearer(request(`Bearer ${TOKEN.toUpperCase()}`), TOKEN)).toBe(false);
    expect(hasBearer(request(`Basic ${TOKEN}`), TOKEN)).toBe(false);
  });
});
