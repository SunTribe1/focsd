import { css, noChange, svg } from 'lit';
import { AsyncDirective, directive } from 'lit/async-directive.js';
import { lucidePaths } from './lucide-paths.js';
import { finish, SVG_NS } from './icon-svg.js';
import { warnOnce } from './warn.js';

/**
 * Icons: a registry of icon libraries ("bring your own icons") plus the system icons components use.
 *
 * - `registerIconLibrary(name, { resolve, mutate })`: `resolve(iconName)` returns SVG markup, a URL
 *   (fetched once; `url#id` renders a sprite `<use>`), an SVGElement, null, or a Promise of these.
 * - `setDefaultIconLibrary(name)`: the library `<focsd-icon name>` uses (initially `default`: Lucide icons).
 * - `setSystemIcons(record)`: override some or all of the icons components draw internally, by
 *   system name, with markup, an SVGElement or `{ library, name }`. The rest keep ours.
 *
 * Every SVG is sized 1em, hidden from assistive technology, and re-rendered when the registry
 * changes. Every SVG that does not come from the built-in paths (library markup, SVG elements, URLs,
 * overrides) is sanitized (no scripts, event handlers, foreign content or external links) by
 * icon-sources.js, which is loaded only when such a source is registered or met (quality B11).
 */

/**
 * @typedef {import('./icon-svg.js').IconMutate} IconMutate
 * @typedef {{ resolve: (name: string) => unknown, mutate?: IconMutate }} IconLibrary
 * @typedef {SVGElement | null | Promise<SVGElement | null>} IconResult An icon template, null (unknown) or pending.
 * @typedef {string | SVGElement | { library?: string, name: string }} SystemIconOverride
 * @typedef {{ src?: string, name?: string, library?: string, system?: boolean }} IconRequest
 * @typedef {IconRequest & { part: string }} IconSpec
 */

/** The default icon set (Lucide, ISC: see lucide-paths.js), as one path per icon, by system name. */
export const iconPaths = lucidePaths;

/**
 * The same paths, indexable by any name.
 * @type {Readonly<Record<string, string | undefined>>}
 */
const pathByName = iconPaths;

/** Slotted SVG icons with only a viewBox have no size of their own: give them the icon box. */
export const slottedIconStyles = css`
  ::slotted(svg:not([width])) {
    inline-size: 1em;
    block-size: 1em;
  }
`;

/** Names of the icons components use internally (overridable with `setSystemIcons`). */
export const systemIconNames = Object.freeze(Object.keys(iconPaths));

/** @type {Map<string, IconLibrary>} */
const libraries = new Map();
let defaultLibrary = 'default';

/** @type {Record<string, SystemIconOverride>} */
let systemOverrides = {};

/** Resolved icons by key: an SVGElement template, null (unknown) or a pending Promise. */
/** @type {Map<string, IconResult>} */
const cache = new Map();

/** Cache keys whose resolver threw or rejected (already warned; not reported as unknown too). */
/** @type {Set<string>} */
const failedKeys = new Set();

/** @type {Set<() => void>} */
const subscribers = new Set();
let version = 0;

let notifyQueued = false;

/** Registry changed: drop cached icons now, re-render icons once per task (batching startup calls). */
function changed() {
  version += 1;
  cache.clear();

  sources?.forgetFailedUrls();
  failedKeys.clear();

  if (notifyQueued) return;
  notifyQueued = true;
  queueMicrotask(() => {
    notifyQueued = false;

    for (const notify of subscribers) notify();
  });
}

/** @param {string} d */
const strokeIcon = (d) => {
  const el = document.createElementNS(SVG_NS, 'svg');

  for (const [k, v] of Object.entries({
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  }))
    el.setAttribute(k, v);
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', d);
  el.append(path);

  return el;
};

/** @typedef {typeof import('./icon-sources.js')} IconSources */

/** The untrusted-source loader (sanitizer included), once loaded. */
/** @type {IconSources | undefined} */
let sources;

/**
 * Load a module once. A failed load is forgotten, so the next call tries again, and a load that
 * succeeds after a failure calls `recovered` (B14 m5).
 * @template T
 * @param {() => Promise<T>} importer
 * @param {() => void} recovered
 * @returns {() => Promise<T>}
 */
export function retryingLoader(importer, recovered) {
  /** @type {Promise<T> | undefined} */
  let loading;
  let failed = false;

  return () => {
    loading ??= importer().then(
      (loaded) => {
        if (failed) recovered();
        failed = false;

        return loaded;
      },
      (error) => {
        loading = undefined;
        failed = true;
        throw error;
      },
    );

    return loading;
  };
}

/**
 * Load the sanitizing source loader (once); registering a library starts it early. A failed load
 * is forgotten, so the next caller tries again; icons cached as failed meanwhile (empty) are
 * dropped and re-rendered once it loads.
 */
const loadSources = retryingLoader(
  () => import('./icon-sources.js').then((m) => (sources = m)),
  () => changed(),
);

/** Start loading the source loader early; a failure warns once instead of going unhandled. */
function preloadSources() {
  loadSources().catch((error) => {
    warnOnce('icon-sources', `the icon loader could not be loaded: ${error instanceof Error ? error.message : String(error)}`);
  });
}

/**
 * Turn whatever a resolver returned into an SVGElement template, null, or a Promise of one.
 * @param {unknown} source
 * @param {IconMutate} [mutate]
 * @returns {IconResult}
 */
function toIcon(source, mutate) {
  const thenable = /** @type {{ then?: unknown }} */ (source);

  if (source && typeof thenable.then === 'function') return Promise.resolve(source).then((s) => toIcon(s, mutate));

  if (source == null || source === '') return null;

  if (sources) return sources.toIcon(source, mutate);

  return loadSources().then((loaded) => loaded.toIcon(source, mutate));
}

/**
 * Compute an icon once per key. A resolver that throws or rejects renders the empty box and warns
 * once per key.
 * @param {string} key
 * @param {string} what The icon, for the warning (`icon "star" in the "remote" icon library`).
 * @param {() => IconResult} compute
 * @returns {IconResult}
 */
function cached(key, what, compute) {
  if (cache.has(key)) return /** @type {IconResult} */ (cache.get(key));

  /** @param {unknown} error */
  const failed = (error) => {
    failedKeys.add(key);
    warnOnce(`icon:${key}`, `${what} could not be resolved: ${error instanceof Error ? error.message : String(error)}`);

    return null;
  };

  /** @type {IconResult} */
  let result;

  try {
    result = compute();
  } catch (error) {
    result = failed(error);
  }

  if (result instanceof Promise) result = result.catch(failed);

  cache.set(key, result);

  if (result instanceof Promise) {
    result.then((icon) => {
      if (cache.get(key) === result) cache.set(key, icon);
    });
  }

  return result;
}

/**
 * @param {string} libraryName
 * @param {string} name
 * @returns {IconResult}
 */
function fromLibrary(libraryName, name) {
  return cached(`l:${libraryName}:${name}`, `icon "${name}" in the "${libraryName}" icon library`, () => {
    const library = libraries.get(libraryName);

    if (!library) return null;

    if (pathLibraries.has(library)) return pathIcon(library.resolve(name));

    return toIcon(library.resolve(name), library.mutate);
  });
}

/**
 * @param {string} name
 * @returns {IconResult}
 */
function fromSystem(name) {
  return cached(`s:${name}`, `system icon "${name}"`, () => {
    const override = systemOverrides[name];

    if (override && typeof override === 'object' && !(override instanceof Node) && 'name' in override)
      return fromLibrary(override.library ?? defaultLibrary, override.name);

    if (override) return toIcon(override);

    return pathIcon(pathByName[name]);
  });
}

/**
 * Resolve an icon request: `{ src }`, `{ system: true, name }` or `{ library?, name }`.
 * @param {IconRequest} spec
 * @returns {IconResult}
 */
function resolveIcon(spec) {
  const src = spec.src;

  if (src)
    return cached(`u:${src}`, `icon "${src}"`, () =>
      sources ? sources.fromUrl(src) : loadSources().then((loaded) => loaded.fromUrl(src)),
    );
  const name = spec.name;

  if (!name) return null;

  if (spec.system) return fromSystem(name);

  return fromLibrary(spec.library || defaultLibrary, name);
}

/** @param {IconRequest} spec */
function warnUnknown(spec) {
  const library = spec.system ? 'system' : spec.library || defaultLibrary;

  if (spec.src || !spec.name || (!spec.system && !libraries.has(library))) return;

  if (failedKeys.has(spec.system ? `s:${spec.name}` : `l:${library}:${spec.name}`)) return;
  warnOnce(`icon-unknown:${library}:${spec.name}`, `unknown icon "${spec.name}" in the "${library}" icon library.`);
}

/**
 * An empty 1em box: keeps layout stable while an icon loads or when it is unknown.
 * @returns {SVGElement}
 */
function placeholder() {
  return /** @type {SVGElement} */ (finish(document.createElementNS(SVG_NS, 'svg')));
}

/** True while Lit adopts server-rendered markup: the part starts at a `<!--lit-part …-->` marker. */
/** @param {import('lit').ChildPart} part */
const isHydrating = (part) => {
  const start = /** @type {Comment | null} */ (part.startNode);

  return start?.nodeType === 8 && start.data.startsWith('lit-part');
};

class IconDirective extends AsyncDirective {
  /** @type {IconSpec | null} */
  #spec = null;
  #rendered = '';
  #token = 0;

  /**
   * Server-side (no DOM): built-in paths only.
   * @param {IconSpec} spec
   */
  render(spec) {
    const d = spec.system || !spec.library ? pathByName[/** @type {string} */ (spec.name)] : undefined;

    return svg`<svg part=${spec.part} viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d ? svg`<path d=${d}></path>` : ''}</svg>`;
  }

  /**
   * @param {import('lit').ChildPart} part
   * @param {[IconSpec]} props
   * @override
   */
  update(part, [spec]) {
    this.#spec = spec;
    this.#subscribe();

    // Hydrating server output: the part already holds the server-rendered <svg>. Return the same
    // template so Lit can adopt it, then swap in the resolved icon (overrides, libraries).
    if (!this.#rendered && isHydrating(part)) {
      this.#rendered = 'hydrating';
      queueMicrotask(() => this.#onChange());

      return this.render(spec);
    }

    const key = this.#key(spec);

    if (key === this.#rendered) return noChange;
    this.#rendered = key;

    return this.#node();
  }

  /** @param {IconSpec} spec */
  #key(spec) {
    return `${version}|${spec.system ? 's' : ''}|${spec.library ?? ''}|${spec.name ?? ''}|${spec.src ?? ''}|${spec.part}`;
  }

  #node() {
    const spec = /** @type {IconSpec} */ (this.#spec);
    const token = ++this.#token;
    const icon = resolveIcon(spec);

    if (icon instanceof Promise) {
      icon.then((resolved) => {
        if (token !== this.#token || !this.isConnected) return;

        if (!resolved) warnUnknown(spec);
        this.setValue(this.#clone(resolved));
      });

      return this.#clone(null);
    }

    if (!icon) warnUnknown(spec);

    return this.#clone(icon);
  }

  /** @param {SVGElement | null} icon */
  #clone(icon) {
    const node = icon ? /** @type {SVGElement} */ (icon.cloneNode(true)) : placeholder();
    const spec = /** @type {IconSpec} */ (this.#spec);
    node.setAttribute('part', spec.part);

    return node;
  }

  #onChange = () => {
    if (!this.#spec) return;
    const key = this.#key(this.#spec);

    if (key === this.#rendered) return;
    // Record the key so the host's next render does not clone the icon a second time.
    this.#rendered = key;
    this.setValue(this.#node());
  };

  #subscribe() {
    if (this.isConnected) subscribers.add(this.#onChange);
  }

  /** @override */
  disconnected() {
    subscribers.delete(this.#onChange);
  }

  /** @override */
  reconnected() {
    this.#subscribe();
    this.#onChange();
  }
}

const iconDirective = directive(IconDirective);

/**
 * Render an icon from a library (`{ library?, name }`) or a file (`{ src }`).
 * @param {IconRequest} spec
 * @param {string} [part]
 */
export const icon = (spec, part = 'svg') => iconDirective({ ...spec, part });

/**
 * A system icon (decorative, aria-hidden), overridable with `setSystemIcons`.
 * @param {string} name
 * @param {string} [part]
 */
export const iconSvg = (name, part = 'svg') => iconDirective({ system: true, name, part });

/**
 * @param {string} name
 * @param {{ resolve?: (name: string) => unknown, mutate?: (svg: SVGElement) => void }} [library]
 */
export function registerIconLibrary(name, { resolve, mutate } = {}) {
  if (typeof resolve !== 'function') throw new TypeError(`registerIconLibrary("${name}"): resolve must be a function.`);
  libraries.set(name, { resolve, mutate });
  preloadSources();
  changed();
}

/** @param {string} name */
export function unregisterIconLibrary(name) {
  if (name === 'default') return;
  libraries.delete(name);
  changed();
}

/** @param {string} name */
export function setDefaultIconLibrary(name) {
  defaultLibrary = name;
  changed();
}

/**
 * Override some or all system icons; names not given keep their current icon.
 * @param {Record<string, SystemIconOverride>} record
 */
export function setSystemIcons(record) {
  systemOverrides = { ...systemOverrides, ...record };
  preloadSources();
  changed();
}

export function resetSystemIcons() {
  systemOverrides = {};
  changed();
}

/**
 * Libraries of stroke path data (`d` strings) drawn by Focsd itself: the built-in `default` (Lucide)
 * and the editor's toolbar icons. Path data only ever becomes the `d` attribute of a <path> we
 * create, so these skip the sanitizer and never load it (quality B11).
 * @type {WeakSet<IconLibrary>}
 */
const pathLibraries = new WeakSet();

/** @param {unknown} d */
const pathIcon = (d) => (typeof d === 'string' && d ? finish(strokeIcon(d)) : null);

/**
 * Internal: register a library of stroke path data by icon name (`registerIconLibrary` with the same
 * name replaces it with an app's own icons, which are sanitized as usual).
 * @param {string} name
 * @param {Readonly<Record<string, string | undefined>>} paths
 */
export function registerPathIconLibrary(name, paths) {
  /** @type {IconLibrary} */
  const library = { resolve: (key) => (Object.hasOwn(paths, key) ? paths[key] : null) };
  pathLibraries.add(library);
  libraries.set(name, library);
  changed();
}

registerPathIconLibrary('default', pathByName);
