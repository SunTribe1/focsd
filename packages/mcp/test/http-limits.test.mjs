import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHttpHandler } from '../src/http.js';
import { URL_MCP, initialize, message, post, postText } from './http-helpers.mjs';

const burst = async (handler, n, headers) => {
  const statuses = [];

  for (let i = 0; i < n; i += 1) statuses.push((await handler(post(initialize(i), headers))).status);

  return statuses;
};

describe('createHttpHandler: rate limit (R2)', () => {
  it('answers 429 with Retry-After in seconds once the burst is spent', async () => {
    const handler = createHttpHandler({ rateLimit: { perMinute: 60, burst: 2 } });
    expect(await burst(handler, 2)).toEqual([200, 200]);
    const refused = await handler(post(initialize()));
    expect(refused.status).toBe(429);
    expect(Number(refused.headers.get('retry-after'))).toBeGreaterThanOrEqual(1);
    expect((await refused.json()).error.message).toMatch(/too many/i);
  });

  it('ignores a spoofed X-Forwarded-For without trustProxy', async () => {
    const handler = createHttpHandler({ rateLimit: { perMinute: 60, burst: 2 } });
    await burst(handler, 2, { 'x-forwarded-for': '10.0.0.1' });
    expect((await handler(post(initialize(), { 'x-forwarded-for': '10.0.0.2' }))).status).toBe(429);
  });

  it('keys on the proxy-appended (last) X-Forwarded-For entry with trustProxy', async () => {
    const handler = createHttpHandler({ trustProxy: true, rateLimit: { perMinute: 60, burst: 1 } });
    expect(await burst(handler, 1, { 'x-forwarded-for': '1.1.1.1, 10.0.0.1' })).toEqual([200]);
    // The client can forge the left entries, not the one the proxy appends.
    expect((await handler(post(initialize(), { 'x-forwarded-for': '9.9.9.9, 10.0.0.1' }))).status).toBe(429);
    expect((await handler(post(initialize(), { 'x-forwarded-for': '10.0.0.2' }))).status).toBe(200);
  });

  it('uses a custom clientKey and can be turned off', async () => {
    const keyed = createHttpHandler({ rateLimit: { perMinute: 60, burst: 1 }, clientKey: (r) => r.headers.get('x-key') ?? '' });
    expect(await burst(keyed, 1, { 'x-key': 'a' })).toEqual([200]);
    expect(await burst(keyed, 1, { 'x-key': 'b' })).toEqual([200]);
    expect(await burst(createHttpHandler({ rateLimit: false }), 25)).not.toContain(429);
  });
});

describe('createHttpHandler: CORS, hosts and safety', () => {
  it('sends no CORS headers by default', async () => {
    const response = await createHttpHandler()(post(initialize(), { origin: 'https://evil.example' }));
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('answers a preflight and tags responses when CORS is on', async () => {
    const handler = createHttpHandler({ cors: { origin: 'https://app.example' } });
    const preflight = await handler(new Request(URL_MCP, { method: 'OPTIONS' }));
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('access-control-allow-origin')).toBe('https://app.example');
    expect(preflight.headers.get('access-control-allow-methods')).toBe('POST, OPTIONS');
    const response = await handler(post(initialize()));
    expect(response.headers.get('access-control-allow-origin')).toBe('https://app.example');
    expect((await handler(new Request(URL_MCP, { method: 'GET' }))).headers.get('allow')).toBe('POST, OPTIONS');
  });

  it('refuses a Host outside allowedHosts (DNS rebinding)', async () => {
    const handler = createHttpHandler({ allowedHosts: ['127.0.0.1', 'localhost'] });
    expect((await handler(post(initialize(), { host: 'attacker.example' }))).status).toBe(403);
    expect((await handler(post(initialize(), { host: '127.0.0.1:3333' }))).status).toBe(200);
  });

  it('never reflects input as HTML', async () => {
    const response = await createHttpHandler()(postText('<script>alert(1)</script>'));
    expect(response.headers.get('content-type') ?? '').not.toMatch(/html/);
  });

  it('treats a path-like tag as a lookup, never a file read', async () => {
    const handler = createHttpHandler({ rateLimit: false });

    const call = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'get_component', arguments: { tag: '../../../../etc/passwd' } },
    };

    const reply = await message(await handler(post(call, { 'mcp-protocol-version': '2025-06-18' })));
    expect(reply.result.isError).toBe(true);
    expect(reply.result.content[0].text).not.toMatch(/root:/);
  });

  it('rejects bad options', () => {
    expect(() => createHttpHandler({ maxBodyBytes: 0 })).toThrow(RangeError);
    expect(() => createHttpHandler({ cors: { origin: '' } })).toThrow(TypeError);
  });
});

describe('body read timeout (bodyTimeoutMs)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('answers 408 when the body drips slower than the timeout', async () => {
    // Fake timers: the timeout fires when the test advances the clock, never by wall-clock luck.
    vi.useFakeTimers();
    const handler = createHttpHandler({ bodyTimeoutMs: 50, rateLimit: false });

    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{'));
      },
      // Never delivers the rest.
      pull: () => new Promise(() => {}),
    });

    const request = new Request('http://127.0.0.1/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
      body,
      duplex: 'half',
    });

    const pending = handler(request);
    await vi.advanceTimersByTimeAsync(50);
    const response = await pending;
    expect(response.status).toBe(408);
  });

  it('rejects a nonsense timeout', async () => {
    expect(() => createHttpHandler({ bodyTimeoutMs: 0 })).toThrow(RangeError);
  });
});
