/**
 * The landing page's client code: registers the components, fills the demos, runs the header
 * (theme, menu, search links) and the motion. Motion and the shader load after the page and never
 * run under `prefers-reduced-motion: reduce`.
 */
import '@focsd/components';
import '@focsd/data-grid';
import { setUpChart, setUpCommand, setUpForm, setUpGrid, setUpKeys, setUpNotifications } from './demos.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)');

/** The header's theme button: one switch for Starlight's `data-theme` and the tokens' `data-focsd-theme`. */
function setUpThemeButton() {
  const button = document.querySelector('[data-lp-theme]');

  if (!button) return;
  const root = document.documentElement;
  const sync = () => button.setAttribute('aria-pressed', String(root.dataset.focsdTheme !== 'light'));

  button.addEventListener('click', () => {
    const next = root.dataset.focsdTheme === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    root.dataset.focsdTheme = next;

    try {
      localStorage.setItem('starlight-theme', next);
    } catch {
      /* storage blocked: the choice lasts for this page */
    }

    sync();
  });
  sync();
}

/** The phone menu: a disclosure button for the main links. */
function setUpMenu() {
  const button = document.querySelector('[data-lp-menu]');
  const nav = document.getElementById('lp-mobile-nav');

  if (!button || !nav) return;

  const set = (/** @type {boolean} */ open) => {
    nav.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
  };

  button.addEventListener('click', () => set(nav.hidden));
  nav.addEventListener('keydown', (event) => {
    if (/** @type {KeyboardEvent} */ (event).key === 'Escape') {
      set(false);
      /** @type {HTMLElement} */ (button).focus();
    }
  });
  matchMedia('(min-width: 48rem)').addEventListener('change', (event) => event.matches && set(false));
}

/** `/?search=words` (the bot's "search the docs" link) opens the search dialog with the words in it. */
function openSearchFromUrl() {
  const query = new URLSearchParams(location.search).get('search');
  const opener = /** @type {HTMLButtonElement | null} */ (document.querySelector('site-search button[data-open-modal]'));

  if (!query || !opener) return;

  const fill = () => {
    const input = /** @type {HTMLInputElement | null} */ (document.querySelector('site-search input'));

    if (!input) return false;
    input.value = query;
    input.dispatchEvent(new Event('input', { bubbles: true }));

    return true;
  };

  opener.click();
  // Pagefind's input appears once its UI has loaded (on idle).

  if (!fill()) {
    const watch = new MutationObserver(() => fill() && watch.disconnect());
    watch.observe(document.querySelector('site-search') ?? document.body, { childList: true, subtree: true });
  }
}

/** The rich text editor (ProseMirror, the largest package) loads when its card comes near. */
function loadEditorWhenNear() {
  const editor = document.querySelector('focsd-rich-text');

  if (!editor) return;

  const near = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return;
      near.disconnect();
      import('@focsd/editor');
    },
    { rootMargin: '600px 0px' },
  );

  near.observe(editor);
}

/** Section entrances: each card or panel rises in once, the first time it scrolls into view. */
async function revealOnScroll() {
  if (reduced.matches) return;
  const targets = /** @type {HTMLElement[]} */ ([...document.querySelectorAll('[data-lp-card], [data-lp-reveal]')]);
  const below = targets.filter((el) => el.getBoundingClientRect().top > innerHeight);

  if (!below.length) return;
  const { animate, inView } = await import('motion');

  for (const el of below) el.style.opacity = '0';
  inView(
    below,
    (element) => {
      const el = /** @type {HTMLElement} */ (element);
      const siblings = el.parentElement ? [...el.parentElement.children].filter((c) => below.includes(/** @type {HTMLElement} */ (c))) : [];
      const delay = Math.max(0, siblings.indexOf(el)) * 0.05;
      animate(el, { opacity: [0, 1], y: [16, 0] }, { duration: 0.5, delay: Math.min(delay, 0.3), ease: [0.2, 0.7, 0.2, 1] });
    },
    { amount: 0.15 },
  );
  // If motion is turned off later, show everything at once.
  reduced.addEventListener(
    'change',
    () => {
      for (const el of below) el.style.opacity = '';
    },
    { once: true },
  );
}

/** The headline's word changes every few seconds to another at random (never the same twice in a row). */
function rotateHeadlineWord() {
  const words = /** @type {HTMLElement[]} */ ([...document.querySelectorAll('[data-lp-rotate] .lp-rotate-word')]);

  if (words.length < 2 || reduced.matches) return;
  let current = 0;

  setInterval(() => {
    if (document.hidden || reduced.matches) return;
    let next = current;

    while (next === current) next = Math.floor(Math.random() * words.length);
    words[current]?.removeAttribute('data-active');
    words[next]?.setAttribute('data-active', '');
    current = next;
  }, 2600);
}

/** The header gains its divider once the page scrolls (state only: the border color, no movement). */
function trackHeader() {
  const header = document.querySelector('[data-lp-header]');
  const hero = document.querySelector('[data-lp-hero]');

  if (!header || !hero) return;

  const sentinel = new IntersectionObserver(([entry]) => header.toggleAttribute('data-scrolled', !entry?.isIntersecting), {
    rootMargin: '-64px 0px 0px 0px',
    threshold: 0.98,
  });

  sentinel.observe(hero.querySelector('.lp-hero-title') ?? hero);
}

setUpThemeButton();

setUpMenu();

setUpGrid();

setUpChart();

setUpForm();

setUpCommand();

setUpNotifications();

setUpKeys();

trackHeader();

rotateHeadlineWord();

loadEditorWhenNear();

import('@focsd/charts');

openSearchFromUrl();

revealOnScroll();
