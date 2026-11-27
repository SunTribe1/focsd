// @vitest-environment happy-dom
// Wave 21c: the signature pad base class (drawing, typing, the form value, reset, required).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './helpers/element-internals.js';
import { FocsdSignaturePadBase } from '../src/forms/signature-pad-base.js';

customElements.define('x-signature-pad', FocsdSignaturePadBase);

const PNG = `data:image/png;base64,${btoa('png bytes')}`;

/** @type {import('vitest').Mock} */
let toDataURL;

beforeEach(() => {
  toDataURL = vi.fn(() => PNG);
  const ctx = new Proxy({}, { get: () => () => ({ width: 10 }), set: () => true });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  Object.assign(HTMLCanvasElement.prototype, { getContext: () => ctx, toDataURL });
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

/**
 * @param {string} [attrs]
 * @returns {Promise<any>}
 */
async function mount(attrs = 'label="Signature" name="sig"') {
  document.body.innerHTML = `<form><x-signature-pad ${attrs}></x-signature-pad></form>`;
  const el = /** @type {any} */ (document.body.querySelector('x-signature-pad'));

  await el.updateComplete;

  return el;
}

/** The spy on the form value. @param {any} el */
const spyValue = (el) => vi.spyOn(el.internals, 'setFormValue');

/** @param {any} el @param {string} part */
const part = (el, name) => el.shadowRoot.querySelector(`[part~="${name}"]`);

/** Draw one stroke of `points` moves. @param {any} el @param {number} [moves] */
function draw(el, moves = 1) {
  const canvas = part(el, 'canvas');

  const fire = (/** @type {string} */ type, /** @type {number} */ x) =>
    canvas.dispatchEvent(
      Object.assign(new Event(type, { bubbles: true, cancelable: true }), {
        pointerId: 1,
        button: 0,
        clientX: x,
        clientY: x,
        isPrimary: true,
      }),
    );

  fire('pointerdown', 1);

  for (let i = 0; i < moves; i += 1) fire('pointermove', 2 + i);
  fire('pointerup', 2 + moves);
}

/** @param {any} el @param {string} text */
function typeInto(el, text) {
  const input = part(el, 'typed-field');
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('signature pad: the form value', () => {
  it('is empty until something is drawn, and then a signature.png File under the name', async () => {
    const el = await mount();
    const set = spyValue(el);

    expect(el.isEmpty).toBe(true);
    draw(el);
    await el.updateComplete;

    const data = set.mock.calls.at(-1)?.[0];
    expect(data).toBeInstanceOf(FormData);
    const file = data.get('sig');
    expect(file.name).toBe('signature.png');
    expect(file.type).toBe('image/png');
    expect(data.has('sig-typed')).toBe(false);
  });

  it('sets the value at once when the stroke ends, before any update, so a submit then is not empty', async () => {
    const el = await mount();
    const set = spyValue(el);

    draw(el);

    expect(set).toHaveBeenCalled();
    expect(set.mock.calls.at(-1)?.[0]).toBeInstanceOf(FormData);
  });
});

describe('signature pad: the form value, at once', () => {
  it('sets the value at once after a typed character, with the typed flag', async () => {
    const el = await mount('label="Signature" name="sig" typed');
    const set = spyValue(el);

    typeInto(el, 'Ada');

    const data = set.mock.calls.at(-1)?.[0];
    expect(data.get('sig-typed')).toBe('true');
    expect(data.get('sig').name).toBe('signature.png');
  });

  it('makes no PNG for each pointer move: only when the stroke ends', async () => {
    const el = await mount();
    const set = spyValue(el);
    const canvas = part(el, 'canvas');

    const fire = (/** @type {string} */ type, /** @type {number} */ x) =>
      canvas.dispatchEvent(
        Object.assign(new Event(type, { bubbles: true, cancelable: true }), {
          pointerId: 1,
          button: 0,
          clientX: x,
          clientY: x,
          isPrimary: true,
        }),
      );

    toDataURL.mockClear();
    fire('pointerdown', 1);

    for (let i = 0; i < 40; i += 1) {
      fire('pointermove', 2 + i);
      await el.updateComplete;
    }

    expect(toDataURL).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();

    fire('pointerup', 50);
    await el.updateComplete;
    expect(toDataURL).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledTimes(1);
  });
});

describe('signature pad: the form value, cleared', () => {
  it('clears the value when Clear empties the pad, and on Undo of the only stroke', async () => {
    const el = await mount();

    draw(el);
    await el.updateComplete;
    const set = spyValue(el);
    part(el, 'clear').click();
    await el.updateComplete;
    expect(set.mock.calls.at(-1)?.[0]).toBeNull();

    draw(el);
    await el.updateComplete;
    part(el, 'undo').click();
    await el.updateComplete;
    expect(set.mock.calls.at(-1)?.[0]).toBeNull();
  });

  it('clears the value, not keeps the old one, when no PNG can be made', async () => {
    const el = await mount();

    draw(el);
    const set = spyValue(el);
    toDataURL.mockReturnValue('data:,');
    draw(el);

    expect(set.mock.calls.at(-1)?.[0]).toBeNull();
  });

  it('sends nothing without a name', async () => {
    const el = await mount('label="Signature"');
    const set = spyValue(el);

    draw(el);

    expect(set.mock.calls.every(([value]) => value === null)).toBe(true);
  });
});

describe('signature pad: modes and Clear', () => {
  it('Clear in typed mode clears the strokes too, so "Draw instead" shows a blank pad', async () => {
    const el = await mount();

    draw(el);
    part(el, 'mode').click();
    await el.updateComplete;
    typeInto(el, 'Ada');
    await el.updateComplete;
    part(el, 'clear').click();
    await el.updateComplete;
    part(el, 'mode').click();
    await el.updateComplete;

    expect(el.isEmpty).toBe(true);
    expect(el._strokes).toEqual([]);
  });

  it('describes the group by the hint, and not the canvas or the typed field again', async () => {
    const el = await mount('label="Signature" name="sig" hint="Sign inside the box"');

    expect(part(el, 'group').getAttribute('aria-describedby')).toBeTruthy();
    expect(part(el, 'canvas').hasAttribute('aria-describedby')).toBe(false);
    part(el, 'mode').click();
    await el.updateComplete;
    expect(part(el, 'typed-field').hasAttribute('aria-describedby')).toBe(false);
  });
});

describe('signature pad: form reset', () => {
  it('returns to the authored drawing mode, empty', async () => {
    const el = await mount();

    part(el, 'mode').click();
    await el.updateComplete;
    typeInto(el, 'Ada');
    expect(el.typed).toBe(true);

    el.formResetCallback();
    await el.updateComplete;

    expect(el.typed).toBe(false);
    expect(el.typedName).toBe('');
    expect(el.isEmpty).toBe(true);
  });

  it('returns to the authored typed mode', async () => {
    const el = await mount('label="Signature" name="sig" typed');

    part(el, 'mode').click();
    await el.updateComplete;
    expect(el.typed).toBe(false);
    expect(el.hasAttribute('typed')).toBe(false);

    el.formResetCallback();
    await el.updateComplete;

    expect(el.typed).toBe(true);
  });
});

describe('signature pad: required', () => {
  it('is valueMissing while empty and valid once signed', async () => {
    const el = await mount('label="Signature" name="sig" required');

    expect(el.validity.valueMissing).toBe(true);
    draw(el);
    await el.updateComplete;
    expect(el.validity.valueMissing).toBe(false);
    part(el, 'clear').click();
    await el.updateComplete;
    expect(el.validity.valueMissing).toBe(true);
  });
});

describe('signature pad: code', () => {
  it('toDataURL and toSVG are empty while there is no signature', async () => {
    const el = await mount();

    expect(el.toDataURL()).toBe('');
    expect(el.toSVG()).toBe('');
  });

  it('a pen width written as a string cannot break the SVG', async () => {
    const el = await mount();

    draw(el);
    el.penWidth = '1" onload="x';
    await el.updateComplete;

    expect(el.toSVG()).not.toContain('onload');
  });

  it('Clear from code removes the drawing and the typed name', async () => {
    const el = await mount();

    draw(el);
    el.typedName = 'Ada';
    el.clear();

    expect(el._strokes).toEqual([]);
    expect(el.typedName).toBe('');
  });
});
