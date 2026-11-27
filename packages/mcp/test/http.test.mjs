import { describe, expect, it } from 'vitest';
import { createHttpHandler } from '../src/http.js';
import { URL_MCP, clientFor, initialize, message, post, postText } from './http-helpers.mjs';

describe('createHttpHandler: MCP over HTTP', () => {
  it('answers initialize, tools/list and tools/call through the SDK client', async () => {
    const client = await clientFor(createHttpHandler({ rateLimit: false }));

    try {
      expect(client.getServerVersion()?.name).toBe('focsd');
      const { tools } = await client.listTools();
      expect(tools).toHaveLength(6);

      for (const tool of tools) expect(tool.annotations?.readOnlyHint).toBe(true);
      const found = await client.callTool({ name: 'search_components', arguments: { query: 'date picker' } });
      expect(found.structuredContent.matches[0].tag).toBe('focsd-date-picker');
    } finally {
      await client.close();
    }
  });

  it('answers a raw initialize POST', async () => {
    const response = await createHttpHandler()(post(initialize()));
    expect(response.status).toBe(200);
    expect((await message(response)).result.serverInfo.name).toBe('focsd');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('caps a tools/call result and marks it truncated', async () => {
    const client = await clientFor(createHttpHandler({ rateLimit: false, maxResponseBytes: 4096 }));

    try {
      const result = await client.callTool({ name: 'list_components', arguments: {} });
      expect(result.structuredContent.truncated).toBe(true);
      expect(result.structuredContent.hint).toMatch(/narrow/i);
    } finally {
      await client.close();
    }
  });

  it('keeps the full 64 KB default under the cap on the wire', async () => {
    const handler = createHttpHandler({ rateLimit: false });

    const call = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: 'validate_markup', arguments: { html: '<focsd-nope></focsd-nope>\n'.repeat(2400) } },
    };

    const response = await handler(post(call, { 'mcp-protocol-version': '2025-06-18' }));
    const body = await response.text();
    expect(Buffer.byteLength(body)).toBeLessThanOrEqual(65_536 + 64);
    expect(body).toContain('truncated');
  });
});

describe('createHttpHandler: methods and body cap', () => {
  it('refuses GET, PUT and DELETE with 405 and Allow: POST', async () => {
    const handler = createHttpHandler();

    for (const method of ['GET', 'PUT', 'DELETE']) {
      const response = await handler(new Request(URL_MCP, { method }));
      expect(response.status).toBe(405);
      expect(response.headers.get('allow')).toBe('POST');
    }
  });

  it('refuses OPTIONS when CORS is off', async () => {
    const response = await createHttpHandler()(new Request(URL_MCP, { method: 'OPTIONS' }));
    expect(response.status).toBe(405);
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('answers 413 for a body over the cap, declared or streamed', async () => {
    const handler = createHttpHandler({ maxBodyBytes: 1024 });
    const declared = await handler(postText('x'.repeat(2048)));
    expect(declared.status).toBe(413);

    const stream = new ReadableStream({
      start(controller) {
        for (let i = 0; i < 4; i += 1) controller.enqueue(new TextEncoder().encode('y'.repeat(512)));
        controller.close();
      },
    });

    const streamed = await handler(
      new Request(URL_MCP, { method: 'POST', headers: { 'content-type': 'application/json' }, body: stream, duplex: 'half' }),
    );

    expect(streamed.status).toBe(413);
  });

  it('accepts a body at the default 64 KB cap and refuses one byte more', async () => {
    const handler = createHttpHandler({ rateLimit: false });
    // JSON allows trailing whitespace, so padding keeps the message valid.
    const pad = (n) => JSON.stringify(initialize()) + ' '.repeat(n);
    const base = Buffer.byteLength(pad(0));
    expect((await handler(postText(pad(65_536 - base)))).status).toBe(200);
    expect((await handler(postText(pad(65_537 - base)))).status).toBe(413);
  });
});

describe('Origin validation (MCP transport spec: refuse origins that are not allowed)', () => {
  it('refuses a browser Origin that is not allowed with 403, and serves requests without one', async () => {
    const handler = createHttpHandler({ rateLimit: false });

    expect((await handler(post(initialize(), { origin: 'https://evil.example' }))).status).toBe(403);
    expect((await handler(post(initialize(), { origin: 'null' }))).status).toBe(403);
    expect((await handler(post(initialize()))).status).toBe(200);
  });

  it('allows listed origins, the CORS origin, and any origin with cors "*"', async () => {
    const listed = createHttpHandler({ rateLimit: false, allowedOrigins: ['localhost'] });
    const cors = createHttpHandler({ rateLimit: false, cors: { origin: 'https://app.example' } });
    const any = createHttpHandler({ rateLimit: false, cors: { origin: '*' } });

    expect((await listed(post(initialize(), { origin: 'http://localhost:5173' }))).status).toBe(200);
    expect((await cors(post(initialize(), { origin: 'https://app.example' }))).status).toBe(200);
    expect((await cors(post(initialize(), { origin: 'https://other.example' }))).status).toBe(403);
    expect((await any(post(initialize(), { origin: 'https://other.example' }))).status).toBe(200);
  });
});
