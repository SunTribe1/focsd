/** Shared helpers for the HTTP handler tests. */
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';

export const URL_MCP = 'http://127.0.0.1/mcp';

/**
 * A raw POST with a text body.
 * @param {string} body
 * @param {Record<string, string>} [headers]
 */
export const postText = (body, headers = {}) =>
  new Request(URL_MCP, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...headers },
    body,
  });

/**
 * A raw JSON-RPC POST.
 * @param {unknown} payload
 * @param {Record<string, string>} [headers]
 */
export const post = (payload, headers = {}) => postText(JSON.stringify(payload), headers);

export const initialize = (id = 1) => ({
  jsonrpc: '2.0',
  id,
  method: 'initialize',
  params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'raw', version: '0' } },
});

/**
 * An MCP SDK client whose fetch calls the handler in process.
 * @param {(request: Request) => Promise<Response>} handler
 */
export async function clientFor(handler) {
  const client = new Client({ name: 'http-test', version: '0.0.0' });
  const fetch = (url, init) => handler(new Request(url, init));
  await client.connect(new StreamableHTTPClientTransport(new URL(URL_MCP), { fetch }));

  return client;
}

/**
 * The JSON-RPC message in a JSON or single-event SSE body.
 * @param {Response} response
 */
export async function message(response) {
  const text = await response.text();

  const data = text.startsWith('{')
    ? text
    : text
        .split('\n')
        .find((line) => line.startsWith('data: '))
        ?.slice(6);

  return JSON.parse(data ?? 'null');
}
