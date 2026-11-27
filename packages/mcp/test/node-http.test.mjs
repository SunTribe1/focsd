import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { request } from 'node:http';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { parseCliArgs, startHttpServer } from '../src/node-http.js';
import { initialize } from './http-helpers.mjs';

/** @param {string} url */
async function connect(url) {
  const client = new Client({ name: 'node-http-test', version: '0.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL(url)));

  return client;
}

/** A POST through node:http, which (unlike fetch) sends a custom Host header. Resolves the status. */
const rawPost = (url, body, headers = {}) =>
  new Promise((resolve, reject) => {
    const req = request(
      url,
      { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...headers } },
      (res) => {
        res.resume();
        resolve(res.statusCode);
      },
    );

    req.on('error', reject);
    req.end(body);
  });

describe('startHttpServer (node:http adapter)', () => {
  let server;

  beforeAll(async () => {
    server = await startHttpServer({ port: 0, rateLimit: { perMinute: 60, burst: 3 } });
  });

  afterAll(() => server?.close());

  it('listens on 127.0.0.1 by default and serves /mcp to the SDK client', async () => {
    expect(server.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/mcp$/);
    const client = await connect(server.url);

    try {
      const result = await client.callTool({ name: 'get_component', arguments: { tag: 'focsd-button' } });
      expect(result.structuredContent.tag).toBe('focsd-button');
    } finally {
      await client.close();
    }
  });

  it('answers 404 off /mcp and 403 for a foreign Host', async () => {
    expect((await fetch(server.url.replace('/mcp', '/other'), { method: 'POST' })).status).toBe(404);
    expect(await rawPost(server.url, JSON.stringify(initialize()), { host: 'attacker.example' })).toBe(403);
  });

  it('keys the limiter on the socket address, not a spoofed header', async () => {
    const statuses = [];

    for (let i = 0; i < 6; i += 1)
      statuses.push(await rawPost(server.url, JSON.stringify(initialize(i)), { 'x-forwarded-for': `10.0.0.${i}` }));
    expect(statuses).toContain(429);
  });
});

describe('parseCliArgs', () => {
  it('reads --http, --port and --host with safe defaults', () => {
    expect(parseCliArgs([])).toEqual({ http: false, port: 3333, host: '127.0.0.1' });
    expect(parseCliArgs(['--http', '--port', '8080', '--host', '0.0.0.0'])).toEqual({ http: true, port: 8080, host: '0.0.0.0' });
  });

  it('rejects a bad port', () => {
    expect(() => parseCliArgs(['--http', '--port', '70000'])).toThrow(/port/);
    expect(() => parseCliArgs(['--http', '--port', 'abc'])).toThrow(/port/);
  });
});

describe('focsd-mcp --http (smoke)', () => {
  it('serves the SDK client over HTTP on an ephemeral port', async () => {
    const child = spawn(process.execPath, [fileURLToPath(new URL('../src/cli.js', import.meta.url)), '--http', '--port', '0'], {
      stdio: ['ignore', 'ignore', 'pipe'],
    });

    try {
      let log = '';

      while (!/http:\/\/\S+\/mcp/.test(log)) log += String((await once(child.stderr, 'data'))[0]);
      const client = await connect(log.match(/http:\/\/\S+\/mcp/)[0]);
      const found = await client.callTool({ name: 'search_components', arguments: { query: 'date picker' } });
      expect(found.structuredContent.matches[0].tag).toBe('focsd-date-picker');
      await client.close();
    } finally {
      child.kill();
    }
  }, 20_000);
});
