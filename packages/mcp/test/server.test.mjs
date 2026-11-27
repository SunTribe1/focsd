import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import { DEFAULT_SEARCH_LIMIT } from '../src/catalog.js';
import { createServer } from '../src/server.js';
import { themes } from '@focsd/tokens';

let client;

beforeAll(async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await createServer().connect(serverTransport);
  client = new Client({ name: 'test', version: '0.0.0' });
  await client.connect(clientTransport);
});

afterAll(() => client?.close());

describe('MCP server', () => {
  it('offers the Focsd tools', async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).toSorted()).toEqual([
      'get_component',
      'get_setup',
      'get_tokens',
      'list_components',
      'search_components',
      'validate_markup',
    ]);

    for (const tool of tools) expect(tool.annotations?.readOnlyHint).toBe(true);
  });

  it('answers get_component with structured content and markdown', async () => {
    const result = await client.callTool({ name: 'get_component', arguments: { tag: 'focsd-floating-panel' } });
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent.tag).toBe('focsd-floating-panel');
    expect(result.content[0].text).toContain('# Floating panel');
  });

  it('reports an unknown component as a tool error with suggestions', async () => {
    const result = await client.callTool({ name: 'get_component', arguments: { tag: 'focsd-buton' } });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('focsd-button');
  });

  it('validates markup', async () => {
    const result = await client.callTool({ name: 'validate_markup', arguments: { html: '<focsd-text-field></focsd-text-field>' } });
    expect(result.structuredContent.issues[0].code).toBe('missing-label');
  });

  it('exposes each component as a resource', async () => {
    const { resources } = await client.listResources();
    expect(resources.some((r) => r.uri === 'focsd://components/focsd-button')).toBe(true);
    const doc = await client.readResource({ uri: 'focsd://components/focsd-button' });
    expect(doc.contents[0].text).toContain('focsd-button');
    const tokens = await client.readResource({ uri: 'focsd://tokens' });
    expect(tokens.contents[0].text).toContain('--focsd-action');
  });

  it('m44 refuses a query or markup over its length limit', async () => {
    const call = async (name, args) => {
      try {
        return await client.callTool({ name, arguments: args });
      } catch (error) {
        return { isError: true, content: [{ type: 'text', text: String(error) }] };
      }
    };

    expect((await call('search_components', { query: 'x'.repeat(200) })).isError).not.toBe(true);
    expect((await call('search_components', { query: 'x'.repeat(201) })).isError).toBe(true);
    expect((await call('validate_markup', { html: 'x'.repeat(200_000) })).isError).not.toBe(true);
    expect((await call('validate_markup', { html: 'x'.repeat(200_001) })).isError).toBe(true);
  });

  it('m44 caps the resource template tag at 200 characters', async () => {
    const read = (tag) =>
      client.readResource({ uri: `focsd://components/${tag}` }).then(
        () => 'ok',
        (e) => String(e.message),
      );

    const atLimit = await read('x'.repeat(200));
    const overLimit = await read('x'.repeat(201));

    expect(atLimit).toMatch(/Resource not found/);
    expect(overLimit).toMatch(/over 200 characters/);
  });

  it('m54 the search_components description states the same default limit the search uses', async () => {
    const { tools } = await client.listTools();
    const search = tools.find((t) => t.name === 'search_components');
    const found = await client.callTool({ name: 'search_components', arguments: { query: 'a' } });
    expect(search.inputSchema.properties.limit.description).toContain(`default ${DEFAULT_SEARCH_LIMIT}`);
    expect(found.structuredContent.matches.length).toBeLessThanOrEqual(DEFAULT_SEARCH_LIMIT);
  });
});

describe('MCP server tokens (B10)', () => {
  it('get_tokens offers the themes @focsd/tokens builds, not a hard-coded list', async () => {
    const { tools } = await client.listTools();
    const tokens = tools.find((t) => t.name === 'get_tokens');
    expect(tokens.inputSchema.properties.theme.enum).toEqual([...themes]);
  });
});
