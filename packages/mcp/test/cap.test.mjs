import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import { DEFAULT_MAX_RESULT_BYTES, capResult, capText } from '../src/cap.js';
import { createServer } from '../src/server.js';

const bytes = (value) => Buffer.byteLength(JSON.stringify(value));

/** @param {object} [options] */
async function connect(options) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await createServer(options).connect(serverTransport);
  const client = new Client({ name: 'cap-test', version: '0.0.0' });
  await client.connect(clientTransport);

  return client;
}

describe('capResult (R4)', () => {
  it('defaults to 64 KB', () => {
    expect(DEFAULT_MAX_RESULT_BYTES).toBe(65_536);
  });

  it('returns a result under the cap unchanged', () => {
    const small = { content: [{ type: 'text', text: 'ok' }], structuredContent: { items: [1] } };
    expect(capResult(small, 1000)).toBe(small);
  });

  it('drops items from the largest list and marks the result truncated', () => {
    const items = Array.from({ length: 200 }, (_, i) => ({ tag: `focsd-x-${i}`, summary: 'y'.repeat(40) }));
    const big = { content: [{ type: 'text', text: JSON.stringify(items) }], structuredContent: { count: 200, items } };
    const capped = capResult(big, 4000);

    expect(bytes(capped)).toBeLessThanOrEqual(4000);
    expect(capped.structuredContent.truncated).toBe(true);
    expect(capped.structuredContent.hint).toMatch(/narrow/i);
    expect(capped.structuredContent.items.length).toBeGreaterThan(0);
    expect(capped.structuredContent.items.length).toBeLessThan(200);
    expect(capped.content[0].text).toContain('truncated');
  });

  it('keeps an error result an error and still fits a cap with no list to shrink', () => {
    const big = { isError: true, content: [{ type: 'text', text: 'é'.repeat(5000) }] };
    const capped = capResult(big, 1000);

    expect(bytes(capped)).toBeLessThanOrEqual(1000);
    expect(capped.isError).toBe(true);
    expect(capped.content[0].text).toContain('truncated');
  });

  it('capText cuts long text at a byte budget and says so', () => {
    expect(capText('short', 100)).toBe('short');
    const cut = capText('x'.repeat(500), 200);
    expect(Buffer.byteLength(cut)).toBeLessThanOrEqual(200);
    expect(cut).toContain('truncated');
  });
});

describe('server tools apply the cap (stdio and HTTP alike)', () => {
  it('truncates list_components under a small cap', async () => {
    const client = await connect({ maxResultBytes: 4000 });

    try {
      const result = await client.callTool({ name: 'list_components', arguments: {} });
      expect(bytes({ content: result.content, structuredContent: result.structuredContent })).toBeLessThanOrEqual(4000);
      expect(result.structuredContent.truncated).toBe(true);
      expect(result.structuredContent.components.length).toBeGreaterThan(0);
    } finally {
      await client.close();
    }
  });

  it('caps a resource read and marks it', async () => {
    const client = await connect({ maxResultBytes: 2000 });

    try {
      const tokens = await client.readResource({ uri: 'focsd://tokens' });
      expect(Buffer.byteLength(tokens.contents[0].text)).toBeLessThanOrEqual(2000);
      expect(tokens.contents[0].text).toContain('truncated');
    } finally {
      await client.close();
    }
  });

  it('does not mark a normal result truncated at the default cap', async () => {
    const client = await connect();

    try {
      const result = await client.callTool({ name: 'get_component', arguments: { tag: 'focsd-button' } });
      expect(result.structuredContent.truncated).toBeUndefined();
    } finally {
      await client.close();
    }
  });
});
