/**
 * @focsd/webmcp: make forms and app actions WebMCP tools (https://github.com/webmachinelearning/webmcp).
 *
 * Mark a form with the standard declarative attributes (`toolname`, `tooldescription`,
 * `toolautosubmit`, and `toolparamdescription` on fields) and call `enableWebMCP()`. Each form is
 * registered as a tool whose input schema covers Focsd controls (selects, date pickers, sliders…)
 * as well as native ones. Agents get a precise schema; people see the form fill in and, unless
 * `toolautosubmit` is set, confirm by submitting it themselves.
 */
import { formSchema, isHidden } from './schema.js';
import { check, fill } from './fill.js';
import { warnOnce } from './warn.js';

export { formSchema, controlSchema } from './schema.js';

/** @typedef {import('./schema.js').JsonSchema} JsonSchema */
/** @typedef {import('./schema.js').Control} Control */
/** @typedef {import('./schema.js').FieldError} FieldError */

/**
 * A WebMCP tool: a form, or an app action given to `defineTool`.
 * @typedef {object} WebMCPTool
 * @property {string} name
 * @property {string} description
 * @property {JsonSchema} [inputSchema]
 * @property {{ readOnlyHint?: boolean, [key: string]: unknown }} [annotations]
 * @property {(input: Record<string, unknown>, options?: { signal?: AbortSignal }) => unknown} execute
 */

/**
 * What `enableWebMCP()` returns.
 * @typedef {object} WebMCPHandle
 * @property {boolean} supported False when the browser has no WebMCP (`document.modelContext`); everything is then a no-op.
 * @property {(tool: WebMCPTool) => Promise<() => void>} defineTool Register an app tool; resolves to a function that unregisters it.
 * @property {() => void} dispose Unregister every tool this handle registered and stop watching the page.
 */

/**
 * The WebMCP API this package uses.
 * @typedef {object} ModelContext
 * @property {(tool: WebMCPTool, options?: { signal?: AbortSignal }) => unknown} registerTool
 * @property {(name: string) => unknown} [unregisterTool]
 */

/**
 * The page's WebMCP entry point (`document.modelContext`, or the older `navigator.modelContext`).
 * @returns {ModelContext | null}
 */
export const modelContext = () => {
  const doc = /** @type {(Document & { modelContext?: ModelContext }) | undefined} */ (globalThis.document);
  const nav = /** @type {(Navigator & { modelContext?: ModelContext }) | undefined} */ (globalThis.navigator);

  return doc?.modelContext ?? nav?.modelContext ?? null;
};

/**
 * True when the browser (or a polyfill) also builds tools from `form[toolname]` itself; Focsd then
 * moves those attributes to `data-focsd-*` so the form is registered once, with the richer schema.
 */
const declarativeNative = () =>
  Boolean(globalThis.SubmitEvent && 'agentInvoked' in SubmitEvent.prototype) ||
  Boolean(/** @type {{ __webmcp_registered_tools?: unknown }} */ (globalThis).__webmcp_registered_tools);

const NAME = ['toolname', 'data-focsd-toolname'];
const DESCRIPTION = ['tooldescription', 'data-focsd-tooldescription'];

/** Attribute changes that can change a tool's name, description or schema. */
const WATCHED = [
  ...NAME,
  ...DESCRIPTION,
  'toolparamdescription',
  'name',
  'type',
  'required',
  'disabled',
  'readonly',
  'min',
  'max',
  'step',
  'multiple',
  'label',
  'pattern',
  'minlength',
  'maxlength',
  'range',
  'length',
  'value',
  'swatches',
  'allow-custom',
  'color',
];

/**
 * @param {Element} form
 * @param {string[]} names
 * @returns {string}
 */
const read = (form, names) => /** @type {string} */ (names.map((n) => form.getAttribute(n)).find(Boolean) ?? '');

/**
 * Register a tool; resolves to a function that unregisters it (a no-op when registration failed).
 * @param {ModelContext} context
 * @param {WebMCPTool} tool
 * @returns {Promise<() => void>}
 */
async function register(context, tool) {
  const controller = new AbortController();

  try {
    await context.registerTool(tool, { signal: controller.signal });
  } catch (error) {
    const failure = /** @type {{ message?: string } | null | undefined} */ (error);
    warnOnce(`webmcp:register:${tool.name}`, `@focsd/webmcp could not register the tool "${tool.name}": ${failure?.message ?? error}`);

    return () => {};
  }

  return () => {
    controller.abort();

    try {
      context.unregisterTool?.(tool.name);
    } catch {
      /* already unregistered by the abort */
    }
  };
}

/**
 * Why a tool call was canceled: the signal's reason, else a standard AbortError.
 * @param {AbortSignal} signal
 */
const cancelReason = (signal) => signal.reason ?? new DOMException('The tool call was canceled.', 'AbortError');

/**
 * Wait for the form's next submission and resolve with what the page answers. There is no timeout
 * of its own: the person may take as long as they need to review and submit, and the agent ends
 * the wait by aborting `signal` (an already-aborted one rejects at once).
 * @param {HTMLFormElement} form
 * @param {AbortSignal | undefined} signal
 * @returns {Promise<unknown>}
 */
function awaitSubmission(form, signal) {
  if (signal?.aborted) return Promise.reject(cancelReason(signal));

  return new Promise((resolve, reject) => {
    const done = () => signal?.removeEventListener('abort', onAbort);

    /** @param {SubmitEvent & { respondWith?: (answer: unknown) => void }} event */
    const onSubmit = (event) => {
      let responded = false;
      Object.defineProperty(event, 'agentInvoked', { value: true, configurable: true });
      // Call synchronously in the submit handler, with the result or a promise of it.
      event.respondWith = (answer) => {
        responded = true;
        done();
        Promise.resolve(answer).then(resolve, reject);
      };

      // After the page's own submit handlers ran: no respondWith means a plain submission.
      setTimeout(() => {
        if (responded) return;
        done();
        resolve({ ok: true, submitted: true });
      });
    };

    const onAbort = () => {
      form.removeEventListener('submit', onSubmit, { capture: true });
      reject(cancelReason(/** @type {AbortSignal} */ (signal)));
    };

    form.addEventListener('submit', onSubmit, { capture: true, once: true });
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Problems the browser's own validation finds in the exposed fields.
 * @param {HTMLFormElement} form
 * @returns {FieldError[]}
 */
const invalidFields = (form) => {
  const fields = /** @type {Array<Control & { willValidate: boolean, checkValidity(): boolean, validationMessage: string }>} */ ([
    ...form.elements,
  ]);

  return fields.flatMap((el) =>
    !isHidden(el) && el.willValidate && !el.checkValidity() ? [{ field: el.name, message: el.validationMessage || 'Invalid.' }] : [],
  );
};

/**
 * The form as a tool definition.
 * @param {HTMLFormElement} form
 * @returns {WebMCPTool}
 */
function formTool(form) {
  const name = read(form, NAME);

  return {
    name,
    // WebMCP requires a description; fall back to one built from the form's name.
    description: read(form, DESCRIPTION) || `Fill in and submit the "${name}" form.`,
    inputSchema: formSchema(form),
    annotations: { readOnlyHint: false },
    /**
     * @param {Record<string, unknown>} input
     * @param {{ signal?: AbortSignal }} [options]
     */
    async execute(input, options = {}) {
      if (options.signal?.aborted) {
        // Canceled before it began: report it, but touch nothing (no fill, no submit).
        form.dispatchEvent(new CustomEvent('focsd-toolcanceled', { bubbles: true, detail: { toolName: name } }));
        throw cancelReason(options.signal);
      }

      const errors = check(formSchema(form), input);

      if (errors.length) return { ok: false, errors };
      form.toggleAttribute('data-focsd-tool-active', true);
      form.dispatchEvent(new CustomEvent('focsd-toolactivated', { bubbles: true, detail: { toolName: name, input } }));

      try {
        await fill(form, input);

        if (form.hasAttribute('toolautosubmit')) {
          // An invalid form fires "invalid", not "submit": report why instead of waiting forever.
          const invalid = invalidFields(form);

          if (invalid.length) return { ok: false, errors: invalid };
          const submission = awaitSubmission(form, options.signal);
          form.requestSubmit();

          return await submission;
        }

        const submission = awaitSubmission(form, options.signal);
        /** @type {HTMLElement | null} */ (
          form.querySelector('[type="submit"], focsd-button:not([type="button"]), button:not([type="button"])')
        )?.focus();

        return await submission;
      } catch (error) {
        form.dispatchEvent(new CustomEvent('focsd-toolcanceled', { bubbles: true, detail: { toolName: name } }));
        throw error;
      } finally {
        form.removeAttribute('data-focsd-tool-active');
      }
    },
  };
}

/**
 * The tools this handle has registered, and the queue that keeps a name from being registered
 * again before the previous registration of it is gone.
 * @param {ModelContext} context
 */
function createRegistry(context) {
  /**
   * Registered forms: the fingerprint they were registered with and how to unregister them.
   * @type {Map<HTMLFormElement, { key: string, name: string, registration: Promise<() => void> }>}
   */
  const forms = new Map();
  /** @type {Set<() => void>} */
  const extra = new Set();
  /**
   * Per tool name, the last registration step: a name is only re-registered after it is free.
   * @type {Map<string, Promise<unknown>>}
   */
  const queues = new Map();
  let disposed = false;

  /**
   * @template T
   * @param {string} name
   * @param {() => T | PromiseLike<T>} step
   * @returns {Promise<T>}
   */
  const enqueue = (name, step) => {
    const next = (queues.get(name) ?? Promise.resolve()).then(step);
    queues.set(name, next);

    return next;
  };

  /** @param {HTMLFormElement} form */
  const unregisterForm = (form) => {
    const entry = forms.get(form);

    if (!entry) return;
    forms.delete(form);
    enqueue(entry.name, () => entry.registration.then((stop) => stop()));
  };

  return {
    forms,
    unregisterForm,
    isDisposed: () => disposed,

    /** @param {WebMCPTool} tool */
    async defineTool(tool) {
      if (disposed) return () => {};

      const unregister = await enqueue(tool.name, () => register(context, tool));
      extra.add(unregister);

      return () => {
        extra.delete(unregister);
        unregister();
      };
    },

    /**
     * Register a form as a tool, replacing the registration it had.
     * @param {HTMLFormElement} form
     * @param {string} key
     * @param {string} name
     */
    registerForm(form, key, name) {
      unregisterForm(form);
      const tool = formTool(form);
      forms.set(form, { key, name, registration: enqueue(name, () => (disposed ? () => {} : register(context, tool))) });
    },

    /** Unregister every tool this handle registered. */
    dispose() {
      disposed = true;

      for (const form of forms.keys()) unregisterForm(form);

      for (const stop of extra) stop();
      extra.clear();
    },
  };
}

/** Name, description and schema: when any of them changes, the tool is registered again. */
/** @param {HTMLFormElement} form */
const fingerprint = (form) => `${read(form, NAME)}|${read(form, DESCRIPTION)}|${JSON.stringify(formSchema(form))}`;

/**
 * Where the browser builds tools from `form[toolname]` itself, hand it nothing: the attributes
 * move to `data-focsd-*`, so the form is registered once, with the richer schema.
 * @param {HTMLFormElement} form
 */
function moveDeclarativeAttributes(form) {
  if (!declarativeNative()) return;

  for (const [from, to] of /** @type {const} */ ([
    ['toolname', 'data-focsd-toolname'],
    ['tooldescription', 'data-focsd-tooldescription'],
  ])) {
    if (!form.hasAttribute(from)) continue;
    form.setAttribute(to, /** @type {string} */ (form.getAttribute(from)));
    form.removeAttribute(from);
  }
}

/**
 * Keep the registry in step with the forms under `root`: register new and changed ones, drop
 * removed ones. Returns a function that stops watching.
 * @param {Document | Element} root
 * @param {ReturnType<typeof createRegistry>} registry
 * @returns {() => void}
 */
function observeForms(root, registry) {
  /** @type {Set<string>} */
  const waiting = new Set();
  let queued = false;

  const schedule = () => {
    if (queued || registry.isDisposed()) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      sync();
    });
  };

  /**
   * Components that upgrade later change the schema: look again once they are defined.
   * @param {HTMLFormElement} form
   */
  const watchUpgrades = (form) => {
    for (const el of form.querySelectorAll(':not(:defined)')) {
      // Only custom element names (with a hyphen) can upgrade; some DOMs report native ones as undefined.
      if (!el.localName.includes('-') || waiting.has(el.localName)) continue;
      waiting.add(el.localName);
      customElements.whenDefined(el.localName).then(schedule);
    }
  };

  function sync() {
    if (registry.isDisposed()) return;

    const present = new Set(
      /** @type {NodeListOf<HTMLFormElement>} */ (root.querySelectorAll('form[toolname], form[data-focsd-toolname]')),
    );

    for (const form of registry.forms.keys())
      if (!present.has(form) || !form.isConnected || !read(form, NAME)) registry.unregisterForm(form);

    for (const form of present) {
      const name = read(form, NAME);

      if (!name) continue;
      watchUpgrades(form);
      const key = fingerprint(form);

      if (registry.forms.get(form)?.key === key) continue;
      moveDeclarativeAttributes(form);
      registry.registerForm(form, key, name);
    }
  }

  // `color` is watched for swatch options only: other elements (badges, icons) use it for looks.
  const observer = new MutationObserver((records) => {
    if (records.some((r) => r.attributeName !== 'color' || /** @type {Element} */ (r.target).localName === 'focsd-option')) schedule();
  });

  observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: WATCHED });
  sync();

  return () => observer.disconnect();
}

/**
 * Register every `form[toolname]` in `root` as a WebMCP tool and keep them in step with the page.
 * Returns `{ supported, defineTool, dispose }`. Without WebMCP in the browser it does nothing.
 * @param {{ root?: Document | Element }} [options]
 * @returns {WebMCPHandle}
 */
export function enableWebMCP({ root = globalThis.document } = {}) {
  const context = modelContext();

  if (!context) return { supported: false, defineTool: async () => () => {}, dispose: () => {} };

  const registry = createRegistry(context);

  if (!root) return { supported: false, defineTool: registry.defineTool, dispose: registry.dispose };
  const stopObserving = observeForms(root, registry);

  return {
    supported: true,
    defineTool: registry.defineTool,
    dispose() {
      stopObserving();
      registry.dispose();
    },
  };
}
