/**
 * Serve the Focsd MCP HTTP handler with node:http (no framework). Used by `focsd-mcp --http`.
 */
import { createServer as createNodeServer } from 'node:http';
import { Readable } from 'node:stream';
import { parseArgs } from 'node:util';
import { localhostAllowedHostnames, localhostAllowedOrigins } from '@modelcontextprotocol/server';
import { SHARED_CLIENT_KEY, createHttpHandler } from './http.js';

/** Default port for `--http`. */
export const DEFAULT_PORT = 3333;

/** Default interface: loopback only. */
export const DEFAULT_HOST = '127.0.0.1';

/** The path the server answers on. */
export const MCP_PATH = '/mcp';

/** Time allowed to receive a whole request (slow-client protection). */
const REQUEST_TIMEOUT_MS = 30_000;

const LOOPBACK = new Set(['127.0.0.1', '::1', 'localhost']);

/**
 * @typedef {import('./http.js').HttpHandlerOptions & { port?: number, host?: string }} NodeServerOptions
 * @typedef {{ url: string, server: import('node:http').Server, close(): Promise<void> }} RunningServer
 */

/**
 * Parse `focsd-mcp` arguments.
 * @param {string[]} argv
 * @returns {{ http: boolean, port: number, host: string }}
 */
export function parseCliArgs(argv) {
  const { values } = parseArgs({
    args: argv,
    strict: true,
    options: { http: { type: 'boolean', default: false }, port: { type: 'string' }, host: { type: 'string' } },
  });

  const port = values.port === undefined ? DEFAULT_PORT : Number(values.port);

  if (!Number.isInteger(port) || port < 0 || port > 65_535)
    throw new RangeError(`--port must be a whole number from 0 to 65535, got ${values.port}.`);

  return { http: values.http, port, host: values.host ?? DEFAULT_HOST };
}

/**
 * The incoming message as a Fetch API Request.
 * @param {import('node:http').IncomingMessage} req
 * @param {string} origin
 */
function toRequest(req, origin) {
  const headers = new Headers();

  for (const [name, values] of Object.entries(req.headersDistinct)) for (const value of values ?? []) headers.append(name, value);
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';

  /** @type {RequestInit & { duplex?: 'half' }} */
  const init = { method: req.method, headers };

  if (hasBody) {
    init.body = /** @type {ReadableStream} */ (Readable.toWeb(req));
    init.duplex = 'half';
  }

  return new Request(new URL(req.url ?? '/', origin), init);
}

/**
 * Write a Fetch API Response to the Node response.
 * @param {Response} response
 * @param {import('node:http').ServerResponse} res
 */
function send(response, res) {
  res.writeHead(response.status, Object.fromEntries(response.headers));

  if (!response.body) {
    res.end();

    return;
  }

  const body = Readable.fromWeb(/** @type {import('node:stream/web').ReadableStream} */ (response.body));

  res.on('close', () => body.destroy());
  body.on('error', () => res.destroy());
  body.pipe(res);
}

/**
 * Start the Focsd MCP server over HTTP at `http://<host>:<port>/mcp`.
 * The rate limit keys on the socket address unless `trustProxy` or `clientKey` is given. On a
 * loopback host, a Host header that is not localhost answers 403 (DNS rebinding protection).
 * @param {NodeServerOptions} [options]
 * @returns {Promise<RunningServer>}
 */
export async function startHttpServer(options = {}) {
  const { port = DEFAULT_PORT, host = DEFAULT_HOST, ...handlerOptions } = options;
  /** @type {WeakMap<Request, string>} */
  const addresses = new WeakMap();
  /** @type {import('./http.js').HttpHandlerOptions} */
  const defaults = {};

  if (!handlerOptions.trustProxy) defaults.clientKey = (request) => addresses.get(request) ?? SHARED_CLIENT_KEY;

  if (LOOPBACK.has(host)) {
    defaults.allowedHosts = localhostAllowedHostnames();
    defaults.allowedOrigins = localhostAllowedOrigins();
  }

  const handler = createHttpHandler({ ...defaults, ...handlerOptions });

  const server = createNodeServer({ requestTimeout: REQUEST_TIMEOUT_MS }, async (req, res) => {
    try {
      if (new URL(req.url ?? '/', 'http://x').pathname !== MCP_PATH) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', 'x-content-type-options': 'nosniff' }).end('Not found');

        return;
      }

      const request = toRequest(req, `http://${host.includes(':') ? `[${host}]` : host}`);

      addresses.set(request, req.socket.remoteAddress ?? SHARED_CLIENT_KEY);
      send(await handler(request), res);
    } catch (error) {
      handlerOptions.onerror?.(error instanceof Error ? error : new Error(String(error)));

      if (!res.headersSent) res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Internal error');
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolve(undefined));
  });
  const address = /** @type {import('node:net').AddressInfo} */ (server.address());
  const shown = address.family === 'IPv6' ? `[${address.address}]` : address.address;

  return {
    url: `http://${shown}:${address.port}${MCP_PATH}`,
    server,
    close: () => new Promise((resolve) => server.close(() => resolve(undefined))),
  };
}
