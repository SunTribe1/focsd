import { deepActiveElement } from './focus.js';

/**
 * One shared screen-reader announcer per document: a visually hidden live region for each
 * politeness, appended to `<body>` the first time it is needed (quality Q10, owner decision S4).
 * A modal dialog makes everything outside it inert, and an inert live region is not heard, so an
 * announcement `from` an element inside an open modal moves the region into that modal (B14 I1).
 */

/** @typedef {'polite' | 'assertive'} Politeness */
/**
 * @typedef {object} AnnounceOptions
 * @property {Politeness} [politeness] `assertive` interrupts; keep it for errors.
 * @property {Element} [from] The element announcing. Inside an open modal dialog, the region moves
 *   into the topmost open modal so it is not inert; otherwise it stays in `<body>`.
 */

/** Visually hidden, set through the CSSOM so a strict `style-src` policy allows it. */
const HIDDEN = {
  position: 'absolute',
  inlineSize: '1px',
  blockSize: '1px',
  margin: '-1px',
  padding: '0',
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  border: '0',
};

/** @type {WeakMap<Document, Map<Politeness, HTMLElement>>} */
const regionsByDocument = new WeakMap();

/** @type {WeakMap<HTMLElement, number>} */
const frames = new WeakMap();

/**
 * The parent in the flat tree: the slot a node is assigned to, else its parent, else the shadow host.
 * @param {Node} node
 * @returns {Node | null}
 */
const flatParent = (node) =>
  (node instanceof Element && node.assignedSlot) || node.parentNode || (node instanceof ShadowRoot ? node.host : null);

/**
 * The open modal dialog that `node` sits in (across shadow roots and slots), if any.
 * @param {Node | null | undefined} node
 * @returns {HTMLDialogElement | null}
 */
function modalAround(node) {
  for (let n = node ?? null; n; n = flatParent(n)) if (n instanceof HTMLDialogElement && n.open && n.matches(':modal')) return n;

  return null;
}

/**
 * Where the region must live to be heard: the topmost open modal when `from` is in one (focus
 * sits in the topmost modal, since every lower one is inert), otherwise `<body>`.
 * @param {Document} doc
 * @param {Element | undefined} from
 * @returns {Element}
 */
function containerFor(doc, from) {
  const own = modalAround(from);

  if (!own) return doc.body;

  return modalAround(deepActiveElement()) ?? own;
}

/**
 * The region for a politeness, created once and moved into `container` when it is elsewhere.
 * In a dialog it goes first, ahead of any content a template renders.
 * @param {Document} doc
 * @param {Politeness} politeness
 * @param {Element} container
 * @returns {HTMLElement}
 */
function regionFor(doc, politeness, container) {
  const regions = regionsByDocument.get(doc) ?? new Map();
  const region = regions.get(politeness) ?? doc.createElement('div');

  if (!regions.has(politeness)) {
    region.setAttribute('aria-live', politeness);
    region.setAttribute('aria-atomic', 'true');
    region.setAttribute('data-focsd-announcer', politeness);
    Object.assign(region.style, HIDDEN);
    regionsByDocument.set(doc, new Map([...regions, [politeness, region]]));
  }

  if (region.parentNode !== container) {
    if (container === doc.body) container.append(region);
    else container.prepend(region);
  }

  return region;
}

/**
 * Announce `message` to screen readers, for example after an async save or a filter. The region
 * is put in place and cleared first, then written on the next frame, so the same message twice
 * ("Saved") is heard twice. Pass `from` (usually the component itself) so an announcement from
 * inside a modal dialog is heard. Does nothing where there is no document (server rendering).
 * @param {string} message
 * @param {AnnounceOptions} [options]
 * @returns {void}
 */
export function announce(message, { politeness = 'polite', from } = {}) {
  if (typeof document === 'undefined' || !document.body) return;

  const level = politeness === 'assertive' ? 'assertive' : 'polite';
  const region = regionFor(document, level, containerFor(document, from));

  region.textContent = '';
  cancelAnimationFrame(frames.get(region) ?? 0);
  frames.set(
    region,
    requestAnimationFrame(() => {
      region.textContent = message;
    }),
  );
}
