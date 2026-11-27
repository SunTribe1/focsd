#!/usr/bin/env node
/**
 * Run the Focsd MCP server.
 * - stdio (default): npx @focsd-dev/mcp
 * - streamable HTTP: npx @focsd-dev/mcp --http [--port 3333] [--host 127.0.0.1]
 */
import process from 'node:process';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { parseCliArgs, startHttpServer } from './node-http.js';
import { createServer } from './server.js';

/** @type {ReturnType<typeof parseCliArgs>} */
let args;

try {
  args = parseCliArgs(process.argv.slice(2));
} catch (error) {
  process.stderr.write(
    `focsd-mcp: ${error instanceof Error ? error.message : String(error)}\nUsage: focsd-mcp [--http [--port 3333] [--host 127.0.0.1]]\n`,
  );
  process.exit(1);
}

if (args.http) {
  // An optional bearer token, read from the environment (never a command-line flag, which other
  // processes can see).
  const token = process.env.FOCSD_MCP_TOKEN || undefined;
  const running = await startHttpServer({ port: args.port, host: args.host, token });

  process.stderr.write(`Focsd MCP server listening on ${running.url}\n`);
} else {
  await createServer().connect(new StdioServerTransport());
}
