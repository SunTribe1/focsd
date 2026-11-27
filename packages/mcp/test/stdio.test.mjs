import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

describe('focsd-mcp command', () => {
  it('serves over stdio, as clients launch it (npx @focsd-dev/mcp)', async () => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [fileURLToPath(new URL('../src/cli.js', import.meta.url))],
    });

    const client = new Client({ name: 'stdio-test', version: '0.0.0' });
    await client.connect(transport);

    try {
      expect(client.getServerVersion()?.name).toBe('focsd');
      const found = await client.callTool({ name: 'search_components', arguments: { query: 'date picker' } });
      expect(found.structuredContent.matches[0].tag).toBe('focsd-date-picker');
    } finally {
      await client.close();
    }
  }, 20_000);
});
