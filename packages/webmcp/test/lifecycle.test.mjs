// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableWebMCP } from '../src/index.js';

/** A modelContext that, like the spec and Chrome, refuses a name that is already registered. */
function fakeContext() {
  const tools = new Map();

  return {
    tools,
    registerTool: vi.fn(async (tool, { signal } = {}) => {
      if (tools.has(tool.name)) throw new DOMException(`Duplicate tool ${tool.name}`, 'InvalidStateError');
      tools.set(tool.name, tool);
      signal?.addEventListener('abort', () => tools.delete(tool.name));
    }),
  };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const form = (name, description = 'Test.', inner = '<input name="q">') =>
  `<form toolname="${name}" tooldescription="${description}">${inner}<button>Go</button></form>`;

let context;
let handle;

beforeEach(() => {
  context = fakeContext();
  Object.defineProperty(document, 'modelContext', { configurable: true, value: context });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  handle?.dispose();
  handle = undefined;
  document.body.innerHTML = '';
  delete document.modelContext;
  vi.restoreAllMocks();
});

describe('enableWebMCP lifecycle', () => {
  it('reports no support and registers nothing without modelContext', async () => {
    delete document.modelContext;
    document.body.innerHTML = form('search');
    handle = enableWebMCP();
    expect(handle.supported).toBe(false);
    expect(await handle.defineTool({ name: 'x', description: 'x', execute() {} })).toBeTypeOf('function');
    expect(context.registerTool).not.toHaveBeenCalled();
  });

  it('registers each form with a toolname, with its schema', async () => {
    document.body.innerHTML = `${form('search', 'Find things.')}<form><input name="other"></form>`;
    handle = enableWebMCP();
    await settle();
    expect([...context.tools.keys()]).toEqual(['search']);
    expect(context.tools.get('search')).toMatchObject({
      description: 'Find things.',
      inputSchema: { type: 'object', properties: { q: { type: 'string' } } },
    });
  });

  it('registers forms added later and unregisters removed ones', async () => {
    handle = enableWebMCP();
    document.body.insertAdjacentHTML('beforeend', form('late'));
    await settle();
    expect(context.tools.has('late')).toBe(true);
    document.querySelector('form').remove();
    await settle();
    expect(context.tools.has('late')).toBe(false);
  });

  it('re-registers when the description or the fields change, keeping one tool', async () => {
    document.body.innerHTML = form('contact', 'Old.');
    handle = enableWebMCP();
    await settle();
    const el = document.querySelector('form');
    el.setAttribute('tooldescription', 'New.');
    el.insertAdjacentHTML('afterbegin', '<input name="email" type="email">');
    await settle();
    await settle();
    expect(context.tools.get('contact').description).toBe('New.');
    expect(Object.keys(context.tools.get('contact').inputSchema.properties)).toEqual(['email', 'q']);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('unrelated page changes do not re-register an unchanged form', async () => {
    document.body.innerHTML = form('steady');
    handle = enableWebMCP();
    await settle();
    document.body.insertAdjacentHTML('beforeend', '<p>Hello</p>');
    document.querySelector('input').setAttribute('placeholder', 'Type');
    await settle();
    expect(context.registerTool).toHaveBeenCalledTimes(1);
  });

  it('a renamed form frees its old name', async () => {
    document.body.innerHTML = form('before');
    handle = enableWebMCP();
    await settle();
    document.querySelector('form').setAttribute('toolname', 'after');
    await settle();
    await settle();
    expect([...context.tools.keys()]).toEqual(['after']);
  });

  it('replacing a form by one with the same name ends with exactly one tool, the new form', async () => {
    document.body.innerHTML = form('same', 'First.');
    handle = enableWebMCP();
    await settle();
    document.querySelector('form').outerHTML = form('same', 'Second.');
    await settle();
    await settle();
    expect(context.tools.size).toBe(1);
    expect(context.tools.get('same').description).toBe('Second.');
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('dispose unregisters forms and defined tools and stops watching', async () => {
    document.body.innerHTML = form('a');
    handle = enableWebMCP();
    await handle.defineTool({ name: 'extra', description: 'Extra.', execute: () => 'ok' });
    await settle();
    expect([...context.tools.keys()].toSorted()).toEqual(['a', 'extra']);
    handle.dispose();
    await settle();
    expect(context.tools.size).toBe(0);
    document.body.insertAdjacentHTML('beforeend', form('b'));
    await settle();
    expect(context.tools.size).toBe(0);
    expect(await handle.defineTool({ name: 'more', description: 'More.', execute() {} })).toBeTypeOf('function');
    expect(context.tools.size).toBe(0);
  });

  it('a defined tool can be removed on its own', async () => {
    handle = enableWebMCP();
    const remove = await handle.defineTool({ name: 'temp', description: 'Temp.', execute() {} });
    expect(context.tools.has('temp')).toBe(true);
    remove();
    expect(context.tools.has('temp')).toBe(false);
  });

  it('a failed registration warns and does not throw', async () => {
    context.registerTool.mockRejectedValueOnce(new Error('nope'));
    handle = enableWebMCP();
    const remove = await handle.defineTool({ name: 'broken', description: 'Broken.', execute() {} });
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('could not register the tool "broken": nope'));
    expect(() => remove()).not.toThrow();
  });

  it('only watches inside the given root', async () => {
    document.body.innerHTML = `<section id="app">${form('inside')}</section>${form('outside')}`;
    handle = enableWebMCP({ root: document.getElementById('app') });
    await settle();
    expect([...context.tools.keys()]).toEqual(['inside']);
  });

  it('rejects invalid input without touching the form', async () => {
    document.body.innerHTML = form('search');
    handle = enableWebMCP();
    await settle();
    const result = await context.tools.get('search').execute({ nope: 1 });
    expect(result).toEqual({ ok: false, errors: [{ field: 'nope', message: 'Not a field of this form.' }] });
    expect(document.querySelector('input').value).toBe('');
  });

  it('a filled form waits for the person to submit, then resolves with the page answer', async () => {
    document.body.innerHTML = form('search');
    const el = document.querySelector('form');
    el.addEventListener('submit', (event) => {
      event.preventDefault();

      if (event.agentInvoked) event.respondWith({ ok: true, found: 3 });
    });
    handle = enableWebMCP();
    await settle();
    const pending = context.tools.get('search').execute({ q: 'lamps' });
    await settle();
    expect(document.querySelector('input').value).toBe('lamps');
    expect(el.hasAttribute('data-focsd-tool-active')).toBe(true);
    el.requestSubmit();
    expect(await pending).toEqual({ ok: true, found: 3 });
    expect(el.hasAttribute('data-focsd-tool-active')).toBe(false);
  });

  it('an aborted call rejects and clears the active state', async () => {
    document.body.innerHTML = form('search');
    const el = document.querySelector('form');
    const canceled = vi.fn();
    el.addEventListener('focsd-toolcanceled', canceled);
    handle = enableWebMCP();
    await settle();
    const controller = new AbortController();
    const pending = context.tools.get('search').execute({ q: 'x' }, { signal: controller.signal });
    await settle();
    controller.abort();
    await expect(pending).rejects.toBeTruthy();
    expect(canceled).toHaveBeenCalledOnce();
    expect(el.hasAttribute('data-focsd-tool-active')).toBe(false);
  });

  it('m42 an already-aborted signal rejects at once instead of waiting forever', async () => {
    document.body.innerHTML = form('search');
    const el = document.querySelector('form');
    const canceled = vi.fn();
    el.addEventListener('focsd-toolcanceled', canceled);
    handle = enableWebMCP();
    await settle();
    const reason = new Error('gone');
    const signal = AbortSignal.abort(reason);

    const outcome = await Promise.race([
      context.tools
        .get('search')
        .execute({ q: 'x' }, { signal })
        .then(
          () => 'resolved',
          (error) => error,
        ),
      new Promise((resolve) => setTimeout(() => resolve('hung'), 500)),
    ]);

    expect(outcome).toBe(reason);
    expect(canceled).toHaveBeenCalledOnce();
    expect(el.hasAttribute('data-focsd-tool-active')).toBe(false);
  });

  it('an already-aborted signal neither fills nor submits the form', async () => {
    document.body.innerHTML = `<form toolname="book" tooldescription="Book." toolautosubmit><input name="who"><button>Go</button></form>`;
    const el = document.querySelector('form');
    const submit = vi.spyOn(el, 'requestSubmit');
    handle = enableWebMCP();
    await settle();
    const reason = new Error('gone');

    await expect(context.tools.get('book').execute({ who: 'ann' }, { signal: AbortSignal.abort(reason) })).rejects.toBe(reason);
    expect(el.elements.who.value).toBe('');
    expect(submit).not.toHaveBeenCalled();
  });

  it('with toolautosubmit, an invalid form reports its errors instead of waiting', async () => {
    document.body.innerHTML = `<form toolname="book" tooldescription="Book." toolautosubmit><input name="who" required><button>Go</button></form>`;
    handle = enableWebMCP();
    await settle();
    const result = await context.tools.get('book').execute({});
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('with toolautosubmit, a valid form is submitted and answers', async () => {
    document.body.innerHTML = `<form toolname="book" tooldescription="Book." toolautosubmit><input name="who" required><button>Go</button></form>`;
    const el = document.querySelector('form');
    el.addEventListener('submit', (event) => {
      event.preventDefault();
      event.respondWith({ ok: true, booked: true });
    });
    handle = enableWebMCP();
    await settle();
    expect(await context.tools.get('book').execute({ who: 'Ada' })).toEqual({ ok: true, booked: true });
  });

  it('a plain submission nobody answers resolves as submitted', async () => {
    document.body.innerHTML = `<form toolname="book" tooldescription="Book." toolautosubmit><input name="who"><button>Go</button></form>`;
    document.querySelector('form').addEventListener('submit', (event) => event.preventDefault());
    handle = enableWebMCP();
    await settle();
    expect(await context.tools.get('book').execute({ who: 'Ada' })).toEqual({ ok: true, submitted: true });
  });

  it('defineTool registers an app tool and the returned function removes it', async () => {
    handle = enableWebMCP();
    const stop = await handle.defineTool({ name: 'ping', description: 'Ping.', execute: () => 'pong' });
    expect(context.tools.has('ping')).toBe(true);
    stop();
    await settle();
    expect(context.tools.has('ping')).toBe(false);
  });

  it('defineTool after dispose does nothing', async () => {
    handle = enableWebMCP();
    handle.dispose();
    const stop = await handle.defineTool({ name: 'late', description: 'Late.', execute() {} });
    expect(context.tools.has('late')).toBe(false);
    expect(stop).toBeTypeOf('function');
  });

  it('moves the declarative attributes aside when the browser builds those tools itself', async () => {
    Object.defineProperty(globalThis, '__webmcp_registered_tools', { configurable: true, value: [] });
    document.body.innerHTML = form('search', 'Find things.');
    handle = enableWebMCP();
    await settle();
    const el = document.querySelector('form');
    delete globalThis.__webmcp_registered_tools;
    expect(el.hasAttribute('toolname')).toBe(false);
    expect(el.getAttribute('data-focsd-toolname')).toBe('search');
    expect([...context.tools.keys()]).toEqual(['search']);
  });

  it('looks again once a custom element it contains is defined, keeping one tool', async () => {
    document.body.innerHTML = form('search', 'Find.', '<focsd-late-demo></focsd-late-demo>');
    handle = enableWebMCP();
    await settle();
    customElements.define('focsd-late-demo', class extends HTMLElement {});
    await settle();
    await settle();
    expect([...context.tools.keys()]).toEqual(['search']);
    expect(context.registerTool).toHaveBeenCalledTimes(1);
  });
});

describe('enableWebMCP observer', () => {
  it('a color change outside a focsd-option does not rebuild the tools', async () => {
    document.body.innerHTML = `${form('tag', 'Tag.', '<focsd-swatch-picker name="c"><focsd-option color="red"></focsd-option></focsd-swatch-picker>')}<focsd-badge color="blue"></focsd-badge>`;
    handle = enableWebMCP();
    await settle();
    const scan = vi.spyOn(document, 'querySelectorAll');
    document.querySelector('focsd-badge').setAttribute('color', 'green');
    await settle();
    expect(scan).not.toHaveBeenCalled();
    document.querySelector('focsd-option').setAttribute('color', 'teal');
    await settle();
    expect(scan).toHaveBeenCalled();
  });
});

describe('enableWebMCP warnings', () => {
  it('a failed registration warns once per tool, with the shared Focsd prefix (m37)', async () => {
    context.registerTool.mockRejectedValue(new Error('denied'));
    handle = enableWebMCP();
    await handle.defineTool({ name: 'twice', description: 'Twice.', execute() {} });
    await handle.defineTool({ name: 'twice', description: 'Twice.', execute() {} });
    const calls = vi.mocked(console.warn).mock.calls.filter(([m]) => String(m).includes('"twice"'));
    expect(calls).toEqual([['Focsd: @focsd/webmcp could not register the tool "twice": denied']]);
  });
});
