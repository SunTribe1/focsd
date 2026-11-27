/**
 * Focus-ring assertions shared by the specs (Q48 re-homes the older copies onto these).
 * The expected ring is whatever the ring token computes to beside the element, so the check holds
 * in every theme and engine without matching color strings.
 */
import { expect } from './test.js';

/**
 * The element's box-shadow, and the ring token's box-shadow computed in the same place.
 * @param {Element} el
 * @param {string} token
 */
function ringOf(el, token) {
  const probe = document.createElement('div');
  probe.style.setProperty('box-shadow', `var(${token})`);
  (el.parentNode ?? document.body).append(probe);
  const expected = getComputedStyle(probe).boxShadow;
  probe.remove();

  return { actual: getComputedStyle(el).boxShadow, expected };
}

/**
 * WebKit under Playwright never applies :focus-visible to computed style (m72), so there the check
 * reads the stylesheet instead: the element has focus and one of its own :focus-visible rules (with
 * :focus standing in for it) paints the ring token.
 * @param {Element} el
 * @param {string} token
 */
function ruleRing(el, token) {
  const root = el.getRootNode();
  let active = root.activeElement ?? document.activeElement;

  // Focus may sit inside the element (a field wrapper whose editor has focus, a delegating host).
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  const focused = active === el || el.contains(active) || el.shadowRoot?.activeElement != null;

  if (!focused) return 'not focused';
  const sheets = [...(root.adoptedStyleSheets ?? []), ...(root.styleSheets ?? [])];
  const flat = (rules) => [...rules].flatMap((rule) => [rule, ...(rule.cssRules ? flat(rule.cssRules) : [])]);

  const paints = (rule) => {
    const focusSelector = rule.selectorText?.includes(':focus-visible') || rule.selectorText?.includes(':focus-within');

    if (!focusSelector || !rule.style?.boxShadow.includes(`var(${token}`)) return false;

    return rule.selectorText.split(',').some((selector) => {
      try {
        return el.matches(selector.replaceAll(':focus-visible', ':focus'));
      } catch {
        return false; // :host(...) and other shadow-only selectors
      }
    });
  };

  return sheets.flatMap((sheet) => flat(sheet.cssRules)).some(paints) ? 'two-tone ring' : 'no :focus-visible ring rule';
}

/**
 * The element draws the Focsd two-tone focus ring: the floor's outer ring, or the inset variant
 * that listbox options and grid cells use. In WebKit the stylesheet rule is checked instead (m72).
 * @param {import('@playwright/test').Locator} locator
 * @param {{ inset?: boolean, via?: 'style' | 'rule' }} [options]
 */
export async function expectFloorFocusRing(locator, { inset = false, via } = {}) {
  const token = inset ? '--focsd-focus-ring-inset' : '--focsd-focus-ring';
  const engine = locator.page().context().browser()?.browserType().name();
  // The inset ring marks the active option with no :focus-visible rule, so computed style works everywhere.
  const mode = via ?? (engine === 'webkit' && !inset ? 'rule' : 'style');

  const styled = async () => {
    const { actual, expected } = await locator.evaluate(ringOf, token);

    // A selected option lists its selection bar (or a transparent stand-in) before the ring.
    const drawn = actual === expected || actual.endsWith(`, ${expected}`);

    return expected !== 'none' && drawn ? 'two-tone ring' : `${actual} (expected ${expected})`;
  };

  // In WebKit a :focus-within ring shows in computed style; only :focus-visible needs the rule check.
  const check =
    mode === 'rule' ? async () => ((await styled()) === 'two-tone ring' ? 'two-tone ring' : locator.evaluate(ruleRing, token)) : styled;

  await expect.poll(check).toBe('two-tone ring');
}
