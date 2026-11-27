// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FocsdLightboxBase, lightboxIndexForKey, lightboxItems, swipeStep } from '../src/display/lightbox-base.js';

customElements.define('x-lightbox', FocsdLightboxBase);

describe('lightboxIndexForKey', () => {
  it('Right is next and Left previous, wrapping at the ends; Home and End go to the first and last', () => {
    expect(lightboxIndexForKey(2, 'ArrowRight', 5, false)).toBe(3);
    expect(lightboxIndexForKey(2, 'ArrowLeft', 5, false)).toBe(1);
    expect(lightboxIndexForKey(4, 'ArrowRight', 5, false)).toBe(0);
    expect(lightboxIndexForKey(0, 'ArrowLeft', 5, false)).toBe(4);
    expect(lightboxIndexForKey(2, 'Home', 5, false)).toBe(0);
    expect(lightboxIndexForKey(2, 'End', 5, false)).toBe(4);
  });

  it('mirrors Left and Right under RTL', () => {
    expect(lightboxIndexForKey(2, 'ArrowLeft', 5, true)).toBe(3);
    expect(lightboxIndexForKey(2, 'ArrowRight', 5, true)).toBe(1);
  });

  it('ignores other keys and an empty set', () => {
    expect(lightboxIndexForKey(2, 'ArrowUp', 5, false)).toBeNull();
    expect(lightboxIndexForKey(0, 'ArrowRight', 0, false)).toBeNull();
  });
});

describe('swipeStep', () => {
  it('a mostly horizontal move past the threshold steps: a swipe to the left shows the next image', () => {
    expect(swipeStep(-80, 10, false)).toBe(1);
    expect(swipeStep(80, -10, false)).toBe(-1);
  });

  it('mirrors under RTL', () => {
    expect(swipeStep(80, 0, true)).toBe(1);
  });

  it('short or mostly vertical moves are not swipes', () => {
    expect(swipeStep(-20, 0, false)).toBe(0);
    expect(swipeStep(-60, 90, false)).toBe(0);
  });
});

const GALLERY = `
  <figure><a href="/a.jpg"><img src="/a-thumb.jpg" alt="A lake"></a><figcaption>Lake at dawn</figcaption></figure>
  <a href="/b.jpg"><img src="/b-thumb.jpg" alt="A hill"></a>
  <a href="/c.jpg"><img src="/c-thumb.jpg" alt="A road"></a>
  <a href="/elsewhere">Not an image</a>
`;

/** @returns {Promise<any>} */
async function mount(markup = `<x-lightbox lang="en">${GALLERY}</x-lightbox>`) {
  document.body.innerHTML = markup;
  const el = /** @type {any} */ (document.body.firstElementChild);

  await el.updateComplete;

  return el;
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe('lightboxItems', () => {
  it('reads every link that holds an image, with its full href, alt and caption', async () => {
    const el = await mount();

    expect(lightboxItems(el).map(({ href, alt, caption }) => ({ href: new URL(href).pathname, alt, caption }))).toEqual([
      { href: '/a.jpg', alt: 'A lake', caption: 'Lake at dawn' },
      { href: '/b.jpg', alt: 'A hill', caption: 'A hill' },
      { href: '/c.jpg', alt: 'A road', caption: 'A road' },
    ]);
  });

  it('reads the alt of a focsd-image in a link', async () => {
    const el = await mount('<x-lightbox><a href="/d.jpg"><focsd-image src="/d-thumb.jpg" alt="A dune"></focsd-image></a></x-lightbox>');

    expect(lightboxItems(el)[0].alt).toBe('A dune');
  });
});

describe('focsd-lightbox element', () => {
  it('names its dialog with the label, or "Image viewer"', async () => {
    const el = await mount();
    const dialog = el.shadowRoot.querySelector('dialog');

    expect(dialog.getAttribute('aria-label')).toBe('Image viewer');
    el.label = 'Holiday photos';
    await el.updateComplete;
    expect(dialog.getAttribute('aria-label')).toBe('Holiday photos');
  });

  it('a click on a thumbnail opens that image without following the link', async () => {
    const el = await mount();
    const link = el.querySelectorAll('a')[1];
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });

    link.dispatchEvent(click);
    await el.updateComplete;

    expect(click.defaultPrevented).toBe(true);
    expect(el.open).toBe(true);
    expect(el.index).toBe(1);
    expect(new URL(el.shadowRoot.querySelector('[part~="image"]').src).pathname).toBe('/b.jpg');
    expect(el.shadowRoot.querySelector('[part~="image"]').alt).toBe('A hill');
    expect(el.shadowRoot.querySelector('[part~="counter"]').textContent.trim()).toBe('Image 2 of 3');
    expect(el.shadowRoot.querySelector('[part~="caption"]').textContent.trim()).toBe('A hill');
  });

  it('a modified click (new tab) and a link without an image are left to the browser', async () => {
    const el = await mount();
    const ctrl = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
    el.querySelectorAll('a')[0].dispatchEvent(ctrl);
    const other = new MouseEvent('click', { bubbles: true, cancelable: true });
    el.querySelectorAll('a')[3].dispatchEvent(other);

    expect(ctrl.defaultPrevented).toBe(false);
    expect(other.defaultPrevented).toBe(false);
    expect(el.open).toBe(false);
  });
});

describe('focsd-lightbox element: links that leave the page', () => {
  it('leaves target="_blank" and download links, and middle clicks, to the browser', async () => {
    const el = await mount(`<x-lightbox lang="en">
      <a href="/a.jpg" target="_blank"><img src="/a-thumb.jpg" alt="A"></a>
      <a href="/b.jpg" download><img src="/b-thumb.jpg" alt="B"></a>
      <a href="/c.jpg" target="_self"><img src="/c-thumb.jpg" alt="C"></a>
    </x-lightbox>`);

    const [blank, download, self] = el.querySelectorAll('a');

    const clicks = [blank, download].map((link) => {
      const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
      link.dispatchEvent(click);

      return click;
    });

    const middle = new MouseEvent('click', { bubbles: true, cancelable: true, button: 1 });
    self.dispatchEvent(middle);

    expect(clicks.map((c) => c.defaultPrevented)).toEqual([false, false]);
    expect(middle.defaultPrevented).toBe(false);
    expect(el.open).toBe(false);

    const plain = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    self.dispatchEvent(plain);
    expect(plain.defaultPrevented).toBe(true);
    expect(el.open).toBe(true);
  });

  it.each(['altKey', 'ctrlKey', 'metaKey'])('ignores arrow keys with %s held (Alt+Left is Back)', async (modifier) => {
    const el = await mount();
    el.show(1);
    await el.updateComplete;
    const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true, [modifier]: true });
    el.shadowRoot.querySelector('dialog').dispatchEvent(event);
    await el.updateComplete;

    expect(el.index).toBe(1);
    expect(event.defaultPrevented).toBe(false);
  });
});

describe('focsd-lightbox element: moving between images', () => {
  it('next and previous wrap and fire focsd-index-change', async () => {
    const el = await mount();
    const seen = [];
    el.addEventListener('focsd-index-change', (/** @type {CustomEvent} */ e) => seen.push(e.detail.index));
    el.show(2);
    await el.updateComplete;

    el.shadowRoot.querySelector('[part~="next"]').click();
    await el.updateComplete;
    el.shadowRoot.querySelector('[part~="prev"]').click();
    await el.updateComplete;

    expect(seen).toEqual([0, 2]);
    expect(el.shadowRoot.querySelector('[part~="counter"]').textContent.trim()).toBe('Image 3 of 3');
  });

  it('arrow keys in the dialog move between images', async () => {
    const el = await mount();
    el.show(0);
    await el.updateComplete;
    const event = new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true });
    el.shadowRoot.querySelector('dialog').dispatchEvent(event);
    await el.updateComplete;

    expect(el.index).toBe(2);
    expect(event.defaultPrevented).toBe(true);
  });

  it('the buttons are named from the term table', async () => {
    const el = await mount();
    const name = (part) => el.shadowRoot.querySelector(`[part~="${part}"]`).getAttribute('aria-label');

    expect([name('prev'), name('next'), name('close')]).toEqual(['Previous image', 'Next image', 'Close image viewer']);
  });
});
