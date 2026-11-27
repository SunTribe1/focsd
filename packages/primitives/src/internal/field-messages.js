import { html, nothing } from 'lit';
import { iconSvg } from './icons.js';

/**
 * @typedef {'error' | 'warning' | 'success'} MessageKind
 * @typedef {{ kind: MessageKind, text: string }} ShownMessage
 * @typedef {{ error?: string | null, warning?: string | null, success?: string | null }} MessageSources
 */

/**
 * What the shared renderers read from a form control (see `FormControlMixin`).
 * @typedef {object} MessageHost
 * @property {string} hint
 * @property {ShownMessage | null} shownMessage
 * @property {{ hint: string, message: string }} messageIds
 * @property {'top' | 'start' | 'end'} effectiveLabelPosition
 * @property {{ term: (key: string, ...args: unknown[]) => string }} localize
 */

/** Message kinds in the order they win: an error hides a warning, a warning hides a success. */
export const MESSAGE_KINDS = Object.freeze(/** @type {const} */ (['error', 'warning', 'success']));

/** The localize term naming each kind, read before the message text ("Warning: …"). */
const MESSAGE_TERMS = Object.freeze({ error: 'messageError', warning: 'messageWarning', success: 'messageSuccess' });

/** Each kind has its own icon, so color is never the only signal. */
export const MESSAGE_ICONS = Object.freeze({ error: 'alert-circle', warning: 'alert-triangle', success: 'check' });

/**
 * The message a control shows: the first non-blank of error, warning and success.
 * @param {MessageSources} sources
 * @returns {ShownMessage | null}
 */
export const pickMessage = (sources) => {
  for (const kind of MESSAGE_KINDS) {
    const text = String(sources[kind] ?? '').trim();

    if (text) return { kind, text };
  }

  return null;
};

/**
 * The hint, the shown message (with its icon) and the always-present announcer.
 * @param {MessageHost} host
 */
export const renderMessages = (host) => {
  const shown = host.shownMessage;
  const ids = host.messageIds;

  // The kind is read out from a visually hidden prefix; the icon stays hidden, so it is not read twice.
  const message = shown
    ? html`<p part="message ${shown.kind}" id=${ids.message}><span part="message-icon" aria-hidden="true">${iconSvg(MESSAGE_ICONS[shown.kind])}</span><span class="focsd-visually-hidden">${host.localize.term(MESSAGE_TERMS[shown.kind])}: </span>${shown.text}</p>`
    : nothing;

  return html`${host.hint ? html`<p part="hint" id=${ids.hint}>${host.hint}</p>` : nothing}${message}<span part="announcer" role="status" class="focsd-visually-hidden"></span>`;
};

/**
 * The shared field layout: the label, then a body holding the control and its messages. The
 * label's place comes from `data-position`.
 * @param {MessageHost} host
 * @param {unknown} label
 * @param {unknown} body
 */
export const renderFieldLayout = (host, label, body) =>
  html`<div part="layout" data-position=${host.effectiveLabelPosition}>${label}<div part="body">${body}${renderMessages(host)}</div></div>`;

/**
 * Makes the function that reads a control's shown message ("Error: …") into its polite
 * `[part~="announcer"]` region, but only when the text changes after the first update (the first
 * text is already in the page). It clears first and writes in a microtask, so the same text after a
 * different one is heard again.
 * @param {Pick<MessageHost, 'localize'> & { renderRoot: ParentNode }} host
 * @returns {(shown: ShownMessage | null) => void}
 */
export const messageAnnouncer = (host) => {
  /** @type {string | undefined} The text at the last update (undefined before the first). */
  let last;

  return (shown) => {
    const text = shown ? `${host.localize.term(MESSAGE_TERMS[shown.kind])}: ${shown.text}` : '';
    const announcer = text !== (last ?? text) && host.renderRoot.querySelector('[part~="announcer"]');
    last = text;

    if (!announcer) return;
    announcer.textContent = '';
    // An empty text (the message cleared) rewrites the empty region, which changes nothing.
    queueMicrotask(() => {
      if (last === text) announcer.textContent = text;
    });
  };
};
