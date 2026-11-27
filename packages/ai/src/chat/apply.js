// Applying wire chunks to a message, immutably: each call returns a new message (and new parts
// array) and never changes its input.

/**
 * @typedef {import('./types.js').Message} Message
 * @typedef {import('./types.js').Part} Part
 * @typedef {import('./types.js').Chunk} Chunk
 */

/**
 * Appends a delta to the last part of `type`, or starts a new one.
 * @param {Part[]} parts
 * @param {'text' | 'reasoning'} type
 * @param {string} delta
 * @returns {Part[]}
 */
function appendText(parts, type, delta) {
  const last = parts.at(-1);

  if (last?.type === type) return [...parts.slice(0, -1), { type, text: last.text + delta }];

  return [...parts, { type, text: delta }];
}

/**
 * @param {Part[]} parts
 * @param {Chunk} chunk
 * @returns {Part[]}
 */
function nextParts(parts, chunk) {
  switch (chunk.type) {
    case 'text-delta':
      return appendText(parts, 'text', chunk.delta);
    case 'reasoning-delta':
      return appendText(parts, 'reasoning', chunk.delta);
    case 'tool-call':
      return [...parts, { type: 'tool-call', id: chunk.id, name: chunk.name, input: chunk.input, status: 'running' }];
    case 'tool-result':
      return parts.map((p) =>
        p.type === 'tool-call' && p.id === chunk.id
          ? { ...p, output: chunk.output, status: chunk.status === 'error' ? 'error' : 'done' }
          : p,
      );
    case 'source':
      return [...parts, { type: 'source', url: chunk.url, title: chunk.title }];
    default:
      return parts;
  }
}

/**
 * The message after one chunk: deltas, tool calls and sources become parts; `error` marks the
 * message as failed. `finish` and unknown types leave the parts as they are.
 * @param {Message} message
 * @param {Chunk} chunk
 * @returns {Message}
 */
export function applyChunk(message, chunk) {
  if (chunk.type === 'error') return { ...message, status: 'error', error: chunk.message, errorCode: chunk.code };

  const parts = nextParts(message.parts, chunk);
  const status = message.status === 'pending' ? 'streaming' : message.status;

  return { ...message, parts, status };
}
