/**
 * The response cap (wave 15 ruling R4): a tool result or resource text over the limit is cut down
 * and marked `truncated: true` with a hint, so stdio and HTTP clients get the same bounded answer.
 */

/** Largest tool result or resource text, in UTF-8 bytes of its JSON. */
export const DEFAULT_MAX_RESULT_BYTES = 65_536;

/** Bytes kept free for the JSON-RPC envelope around a result. */
export const ENVELOPE_BYTES = 512;

const HINT =
  'The result was over the size limit and was truncated. Narrow the request (a filter, a category or a smaller limit) to see the rest.';

const MARKER = `\n\n[truncated: ${HINT}]`;

/** @typedef {import('@modelcontextprotocol/server').CallToolResult} CallToolResult */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** @param {string} text */
const byteLength = (text) => encoder.encode(text).byteLength;

/** @param {unknown} value */
const jsonBytes = (value) => byteLength(JSON.stringify(value));

/**
 * Cut text to at most `maxBytes` UTF-8 bytes, ending with a truncation note.
 * @param {string} text
 * @param {number} maxBytes
 * @returns {string}
 */
export function capText(text, maxBytes) {
  if (byteLength(text) <= maxBytes) return text;
  const room = Math.max(0, maxBytes - byteLength(MARKER));
  // Decoding a cut buffer drops a split trailing character (U+FFFD), so strip any replacement.
  const head = decoder.decode(encoder.encode(text).subarray(0, room)).replace(/\uFFFD$/u, '');

  return `${head}${MARKER}`.slice(0, Math.max(0, maxBytes));
}

/**
 * The key of the longest array in an object, if it has one.
 * @param {Record<string, unknown>} data
 * @returns {string | undefined}
 */
function largestList(data) {
  let best;
  let size = -1;

  for (const [key, value] of Object.entries(data)) {
    if (!Array.isArray(value)) continue;
    const n = jsonBytes(value);

    if (n > size) [best, size] = [key, n];
  }

  return best;
}

/**
 * Structured content cut to fit `maxBytes`: the longest list keeps as many leading items as fit.
 * @param {Record<string, unknown>} data
 * @param {number} maxBytes
 * @returns {Record<string, unknown>}
 */
function shrinkStructured(data, maxBytes) {
  const key = largestList(data);
  const marked = { ...data, truncated: true, hint: HINT };

  if (key === undefined) return { truncated: true, hint: HINT };
  const list = /** @type {unknown[]} */ (data[key]);
  let [low, high] = [0, list.length];

  // Binary search for the most items that still fit.
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);

    if (jsonBytes({ ...marked, [key]: list.slice(0, mid) }) <= maxBytes) low = mid;
    else high = mid - 1;
  }

  const shrunk = { ...marked, [key]: list.slice(0, low) };

  return jsonBytes(shrunk) <= maxBytes ? shrunk : { truncated: true, hint: HINT };
}

/**
 * The first text block's text, or an empty string.
 * @param {CallToolResult} result
 */
const firstText = (result) => {
  const block = result.content?.[0];

  return block?.type === 'text' ? block.text : '';
};

/**
 * A truncated result: the text, the error flag, and the shrunk structured content when present.
 * @param {string} text
 * @param {boolean} isError
 * @param {Record<string, unknown> | undefined} structured
 * @returns {CallToolResult}
 */
function truncatedResult(text, isError, structured) {
  /** @type {CallToolResult} */
  const capped = { content: [{ type: 'text', text }] };

  if (isError) capped.isError = true;

  if (structured) capped.structuredContent = structured;

  return capped;
}

/**
 * Cap a tool result at `maxBytes` (JSON bytes). A result under the cap is returned as is.
 * @param {CallToolResult} result
 * @param {number} [maxBytes]
 * @returns {CallToolResult}
 */
export function capResult(result, maxBytes = DEFAULT_MAX_RESULT_BYTES) {
  if (jsonBytes(result) <= maxBytes) return result;

  const isError = result.isError === true;

  const structured = result.structuredContent
    ? shrinkStructured(/** @type {Record<string, unknown>} */ (result.structuredContent), Math.floor(maxBytes / 2))
    : undefined;

  const original = firstText(result);
  let budget = maxBytes - jsonBytes(truncatedResult('', isError, structured));

  // JSON escaping can grow the text, so shrink until the whole result fits.
  for (;;) {
    const capped = truncatedResult(capText(original, Math.max(0, budget)), isError, structured);
    const over = jsonBytes(capped) - maxBytes;

    if (over <= 0 || budget <= 0) return capped;
    budget -= over;
  }
}
