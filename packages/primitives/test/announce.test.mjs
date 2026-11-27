// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { announce } from '../src/internal/announce.js';

/**
 * An open modal dialog. happy-dom keeps `:modal` false after showModal(), so the instance answers
 * it the way a browser does (no module mocking).
 * @param {ParentNode} parent
 */
function openModal(parent) {
  const dialog = document.createElement('dialog');
  const matches = dialog.matches.bind(dialog);

  dialog.matches = (selector) => (selector === ':modal' ? dialog.open : matches(selector));
  parent.append(dialog);
  dialog.showModal();

  return dialog;
}

const region = () => /** @type {HTMLElement} */ (document.querySelector('[data-focsd-announcer="polite"]') ?? deepRegion());

/** The polite region wherever it is, including inside a shadow root. */
function deepRegion() {
  for (const host of document.querySelectorAll('*')) {
    const found = host.shadowRoot?.querySelector('[data-focsd-announcer="polite"]');

    if (found) return found;
  }

  return null;
}

/** Synchronous animation frames, and a clean page after each test. */
function setUp() {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (/** @type {FrameRequestCallback} */ cb) => {
      cb(0);

      return 1;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });
}

describe('announce() placement (B14 I1)', () => {
  setUp();

  it('puts the region in <body> without `from`, even while a modal is open', () => {
    openModal(document.body);
    announce('Saved');
    expect(region().parentElement).toBe(document.body);
    expect(region().textContent).toBe('Saved');
  });

  it('puts the region in the open modal dialog that contains `from`', () => {
    const dialog = openModal(document.body);
    const field = document.createElement('input');

    dialog.append(field);
    announce('3 of 40 characters', { from: field });
    expect(region().parentElement).toBe(dialog);
    expect(region().textContent).toBe('3 of 40 characters');
  });

  it('finds the modal across shadow roots', () => {
    const host = document.createElement('div');

    document.body.append(host);
    const root = host.attachShadow({ mode: 'open' });
    const dialog = openModal(root);
    const field = document.createElement('input');

    dialog.append(field);
    announce('Saved', { from: field });
    expect(region().parentElement).toBe(dialog);
  });

  it('moves the region back to <body> once `from` is no longer in a modal', () => {
    const dialog = openModal(document.body);
    const field = document.createElement('input');

    dialog.append(field);
    announce('One', { from: field });
    dialog.close();
    announce('Two', { from: field });
    expect(region().parentElement).toBe(document.body);
    expect(region().textContent).toBe('Two');
    expect(document.querySelectorAll('[data-focsd-announcer="polite"]')).toHaveLength(1);
  });
});

describe('announce() placement with stacked modals and timing', () => {
  setUp();

  it('uses a modal stacked above the one that contains `from` (where focus is)', () => {
    const lower = openModal(document.body);
    const upper = openModal(document.body);
    const field = document.createElement('input');
    const button = document.createElement('button');

    lower.append(field);
    upper.append(button);
    button.focus();
    announce('Saved', { from: field });
    expect(region().parentElement).toBe(upper);
  });

  it('stays in <body> when `from` is outside every modal', () => {
    openModal(document.body);
    const field = document.createElement('input');

    document.body.append(field);
    announce('Saved', { from: field });
    expect(region().parentElement).toBe(document.body);
  });

  it('is in place, and cleared, before the text is written', () => {
    const frames = /** @type {FrameRequestCallback[]} */ ([]);

    vi.stubGlobal('requestAnimationFrame', (/** @type {FrameRequestCallback} */ cb) => frames.push(cb));
    announce('Before');
    frames.at(-1)?.(0);
    const dialog = openModal(document.body);
    const field = document.createElement('input');

    dialog.append(field);
    announce('After', { from: field });
    expect(region().parentElement).toBe(dialog);
    expect(region().textContent).toBe('');
    frames.at(-1)?.(0);
    expect(region().textContent).toBe('After');
  });
});
