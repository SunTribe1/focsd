// Shared chat types (JSDoc only; this module has no runtime code).

/**
 * @typedef {'user' | 'assistant' | 'system' | 'tool'} Role
 * @typedef {'pending' | 'streaming' | 'done' | 'stopped' | 'error'} MessageStatus
 * @typedef {{ type: 'text', text: string }
 *   | { type: 'reasoning', text: string }
 *   | { type: 'tool-call', id: string, name: string, input: unknown, status: 'running' | 'done' | 'error', output?: unknown }
 *   | { type: 'source', url: string, title: string }
 *   | { type: 'file', name: string, mediaType: string, size: number, url?: string }} Part A file's `url` is never
 *   shown or revoked by the elements: an object URL an app creates for a part is the app's to revoke.
 * @typedef {{ id: string, role: Role, status: MessageStatus, parts: Part[], createdAt: number, error?: string, errorCode?: ErrorCode }} Message
 * @typedef {'http' | 'network' | 'too-long' | 'too-large' | 'stream'} ErrorCode Why a reply failed; the UI may localize by code.
 * @typedef {{ type: 'text-delta', id: string, delta: string }
 *   | { type: 'reasoning-delta', id: string, delta: string }
 *   | { type: 'tool-call', id: string, name: string, input: unknown }
 *   | { type: 'tool-result', id: string, output: unknown, status?: 'done' | 'error' }
 *   | { type: 'source', url: string, title: string }
 *   | { type: 'finish', reason?: string }
 *   | { type: 'error', message: string, code?: ErrorCode }} Chunk The SSE wire format (R5), one per `data:` line.
 * @typedef {{ messages: Message[], signal: AbortSignal }} TransportRequest
 * @typedef {{ send(request: TransportRequest): AsyncIterable<Chunk> }} Transport
 * @typedef {{ name: string, mediaType: string, size: number, url?: string }} FileRef
 * @typedef {'idle' | 'streaming' | 'error'} ChatStatus
 * @typedef {{ messages: Message[], status: ChatStatus }} ChatState
 */

export {};
