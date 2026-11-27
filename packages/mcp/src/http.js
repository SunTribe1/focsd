/**
 * The Focsd MCP server over streamable HTTP, as a Fetch API handler: `(request) => Promise<Response>`.
 * Host neutral (Node, serverless functions, Workers). Stateless: every request gets a fresh server, so
 * GET (the SSE listen stream) and DELETE (session end) answer 405. Read-only tools only (R4).
 */
import { createMcpHandler, hostHeaderValidationResponse, originValidationResponse } from '@modelcontextprotocol/server';
import { DEFAULT_MAX_RESULT_BYTES } from './cap.js';
import { createRateLimiter } from './rate-limit.js';
import { createServer } from './server.js';

/** Largest request body accepted, in bytes. */
export const DEFAULT_MAX_BODY_BYTES = 65_536;

/** Longest the request body may take to arrive, in milliseconds. */
export const DEFAULT_BODY_TIMEOUT_MS = 10_000;

/** The one key every client shares when no trusted client address is known. */
export const SHARED_CLIENT_KEY = 'shared';

const CORS_HEADERS = 'content-type, accept, authorization, mcp-protocol-version, mcp-session-id, last-event-id';

/**
 * @typedef {object} HttpHandlerOptions
 * @property {{ perMinute?: number, burst?: number } | false} [rateLimit] In-memory token bucket per client key (default 60 a minute, burst 20). The limit holds per process, so a hosted deployment must also put the platform's limiter in front. `false` turns it off.
 * @property {(request: Request) => string} [clientKey] The rate-limit key for a request. Default: with `trustProxy`, the last `X-Forwarded-For` entry (the one your proxy appends); otherwise one key shared by every client, so without `trustProxy` or `clientKey` one client can exhaust the burst for all.
 * @property {boolean} [trustProxy] Trust `X-Forwarded-For` for the default client key. Only set it behind a proxy that overwrites or appends the header (default false).
 * @property {number} [maxBodyBytes] Largest request body in bytes (default 65 536); larger answers 413.
 * @property {number} [bodyTimeoutMs] Longest the body may take to arrive, in milliseconds (default 10 000); slower answers 408.
 * @property {number} [maxResponseBytes] Largest tool result or resource text in bytes (default 65 536); larger results are truncated and marked `truncated: true`.
 * @property {false | { origin: string }} [cors] CORS for browser clients (default off). `origin` is the one allowed origin, or `*`.
 * @property {string[]} [allowedHosts] When set, a request whose Host header is not listed answers 403 (DNS rebinding protection for a local server).
 * @property {string[]} [allowedOrigins] Host names a browser page may call from. A request with an `Origin` header that is not listed answers 403, as the MCP transport spec requires. Default: the `cors.origin` host, or none (requests without an `Origin`, as non-browser clients send, are not affected). With `cors: { origin: '*' }` every origin is allowed.
 * @property {string} [token] When set, every request must send `Authorization: Bearer <token>`; others answer 401. For a public deployment that only your clients may use. Keep it in a secret (an environment variable), never in code.
 * @property {(error: Error) => void} [onerror] Reports errors and rejected requests (never changes the response).
 * @typedef {(request: Request) => Promise<Response>} HttpHandler
 */

/**
 * @param {string} name
 * @param {number} value
 */
function assertPositive(name, value) {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${name} must be a positive number, got ${value}.`);
}

/**
 * A bearer token, when given, is a string of 16 or more characters.
 * @param {unknown} token
 */
function assertToken(token) {
  if (token !== undefined && (token?.constructor !== String || /** @type {string} */ (token).length < 16)) {
    throw new TypeError('token must be a string of at least 16 characters.');
  }
}

/**
 * A JSON-RPC error response with no request id (the request was refused before it was read).
 * @param {number} status
 * @param {string} text
 * @param {Record<string, string>} [headers]
 */
const refuse = (status, text, headers = {}) =>
  Response.json({ jsonrpc: '2.0', id: null, error: { code: -32_000, message: text } }, { status, headers });

const encoder = new TextEncoder();

/**
 * Whether the request carries `Authorization: Bearer <token>`. Compares in constant time, so the
 * response time does not reveal how much of a guess was right.
 * @param {Request} request
 * @param {string} token
 */
export function hasBearer(request, token) {
  const header = request.headers.get('authorization') ?? '';
  // The scheme name is case-insensitive (RFC 9110); the token is compared exactly.
  const sent = encoder.encode(/^bearer /i.test(header) ? `Bearer ${header.slice(7)}` : header);
  const expected = encoder.encode(`Bearer ${token}`);
  let diff = sent.length ^ expected.length;

  for (let i = 0; i < expected.length; i += 1) diff |= (sent[i] ?? 0) ^ (expected[i] ?? 0);

  return diff === 0;
}

/**
 * The default client key: the last X-Forwarded-For entry behind a trusted proxy, else shared.
 * @param {boolean} trustProxy
 * @returns {(request: Request) => string}
 */
const defaultClientKey = (trustProxy) => (request) => {
  if (!trustProxy) return SHARED_CLIENT_KEY;
  const last = (request.headers.get('x-forwarded-for') ?? '').split(',').at(-1)?.trim();

  return last || SHARED_CLIENT_KEY;
};

/** Marks a body that did not arrive in time. */
const TIMED_OUT = Symbol('timed out');

/**
 * Read a request body up to `maxBytes`; `undefined` when it is longer, `TIMED_OUT` when it is slower than `timeoutMs`.
 * @param {Request} request
 * @param {number} maxBytes
 * @param {number} timeoutMs
 * @returns {Promise<Uint8Array | undefined | typeof TIMED_OUT>}
 */
async function readBounded(request, maxBytes, timeoutMs) {
  if (Number(request.headers.get('content-length') ?? 0) > maxBytes) return undefined;

  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;

  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), timeoutMs);
  });

  try {
    const result = await Promise.race([readAll(reader, maxBytes), timeout]);

    if (result === TIMED_OUT) reader.cancel().catch(() => {});

    return /** @type {Uint8Array | undefined | typeof TIMED_OUT} */ (result);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {ReadableStreamDefaultReader<Uint8Array>} reader
 * @param {number} maxBytes
 * @returns {Promise<Uint8Array | undefined>}
 */
async function readAll(reader, maxBytes) {
  /** @type {Uint8Array[]} */
  const chunks = [];
  let size = 0;

  for (let next = await reader.read(); !next.done; next = await reader.read()) {
    size += next.value.byteLength;

    if (size > maxBytes) {
      await reader.cancel();

      return undefined;
    }

    chunks.push(next.value);
  }

  const body = new Uint8Array(size);
  let offset = 0;

  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return body;
}

/**
 * @param {HttpHandlerOptions} options
 */
function resolveOptions(options) {
  const {
    maxBodyBytes = DEFAULT_MAX_BODY_BYTES,
    bodyTimeoutMs = DEFAULT_BODY_TIMEOUT_MS,
    maxResponseBytes = DEFAULT_MAX_RESULT_BYTES,
    cors = false,
    rateLimit = {},
  } = options;

  assertPositive('maxBodyBytes', maxBodyBytes);
  assertPositive('maxResponseBytes', maxResponseBytes);
  assertPositive('bodyTimeoutMs', bodyTimeoutMs);

  if (cors && !cors.origin) throw new TypeError('cors.origin must be a non-empty origin or "*".');

  assertToken(options.token);

  const allow = cors ? 'POST, OPTIONS' : 'POST';
  /** @type {Record<string, string>} */
  const corsHeaders = cors ? { 'access-control-allow-origin': cors.origin, vary: 'Origin' } : {};

  return {
    maxBodyBytes,
    bodyTimeoutMs,
    maxResponseBytes,
    cors,
    allow,
    corsHeaders,
    ...originPolicy(cors, options.allowedOrigins),
    limiter: rateLimit === false ? undefined : createRateLimiter(rateLimit),
    clientKey: options.clientKey ?? defaultClientKey(options.trustProxy === true),
    token: options.token,
  };
}

/**
 * Which browser origins may call: any (`cors: { origin: '*' }`), else the listed host names, else the
 * CORS origin's host, else none.
 * @param {false | { origin: string }} cors
 * @param {string[] | undefined} allowedOrigins
 */
function originPolicy(cors, allowedOrigins) {
  if (cors && cors.origin === '*') return { anyOrigin: true, allowedOrigins: [] };

  return { anyOrigin: false, allowedOrigins: allowedOrigins ?? (cors ? [new URL(cors.origin).hostname] : []) };
}

/**
 * @param {ReturnType<typeof resolveOptions>} config
 */
const preflight = (config) =>
  new Response(null, {
    status: 204,
    headers: {
      ...config.corsHeaders,
      'access-control-allow-methods': config.allow,
      'access-control-allow-headers': CORS_HEADERS,
      'access-control-expose-headers': 'mcp-session-id, mcp-protocol-version',
      'access-control-max-age': '600',
    },
  });

/**
 * The refusal for a request that must not reach the MCP server, if any.
 * @param {Request} request
 * @param {ReturnType<typeof resolveOptions>} config
 * @param {string[] | undefined} allowedHosts
 * @returns {Response | undefined}
 */
function gate(request, config, allowedHosts) {
  const hostRefused = allowedHosts ? hostHeaderValidationResponse(request, allowedHosts) : undefined;

  if (hostRefused) return hostRefused;

  // A browser page from an origin we did not allow (DNS rebinding, cross-site requests): 403.
  const originRefused =
    config.anyOrigin || !request.headers.has('origin') ? undefined : originValidationResponse(request, config.allowedOrigins);

  if (originRefused) return originRefused;

  if (request.method !== 'POST') return refuse(405, 'Method not allowed. Send MCP requests as POST.', { allow: config.allow });
  const verdict = config.limiter?.take(config.clientKey(request));

  if (verdict && !verdict.ok) return refuse(429, 'Too many requests. Try again later.', { 'retry-after': String(verdict.retryAfter) });

  // After the rate limit, so guesses at the token are limited too.
  if (config.token && !hasBearer(request, config.token))
    return refuse(401, 'Missing or wrong bearer token.', { 'www-authenticate': 'Bearer' });

  return undefined;
}

/**
 * The response with the security and CORS headers added.
 * @param {Response} response
 * @param {Record<string, string>} extra
 */
function finish(response, extra) {
  const headers = new Headers(response.headers);

  headers.set('x-content-type-options', 'nosniff');
  headers.set('cache-control', 'no-store');

  for (const [name, value] of Object.entries(extra)) headers.set(name, value);

  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

/**
 * Create the Focsd MCP HTTP handler.
 * @param {HttpHandlerOptions} [options]
 * @returns {HttpHandler}
 */
export function createHttpHandler(options = {}) {
  const config = resolveOptions(options);
  const { onerror } = options;

  const mcp = createMcpHandler(() => createServer({ maxResultBytes: config.maxResponseBytes }), {
    maxRequestBodySize: config.maxBodyBytes,
    onerror: (error) => onerror?.(error),
  });

  return async (request) => {
    if (config.cors && request.method === 'OPTIONS') return preflight(config);
    const refused = gate(request, config, options.allowedHosts);

    if (refused) return finish(refused, config.corsHeaders);
    const body = await readBounded(request, config.maxBodyBytes, config.bodyTimeoutMs);

    if (body === TIMED_OUT) return finish(refuse(408, 'Request body took too long to arrive.'), config.corsHeaders);

    if (!body) return finish(refuse(413, `Request body is over ${config.maxBodyBytes} bytes.`), config.corsHeaders);

    try {
      const response = await mcp.fetch(new Request(request.url, { method: 'POST', headers: request.headers, body }));

      return finish(response, config.corsHeaders);
    } catch (error) {
      onerror?.(error instanceof Error ? error : new Error(String(error)));

      return finish(refuse(500, 'Internal error.'), config.corsHeaders);
    }
  };
}
