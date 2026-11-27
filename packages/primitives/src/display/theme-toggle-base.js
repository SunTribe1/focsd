import { html } from 'lit';
import { icon, registerPathIconLibrary } from '../internal/icons.js';
import { FocsdThemeChoiceBase } from './theme-choice-base.js';

/** @typedef {'light' | 'dark' | 'system' | 'contrast'} ThemeChoice */
/** @typedef {{ setTheme(theme: string, root?: Element): void, clearTheme(root?: Element): void }} ThemeApi */

/** Option icons (24×24 strokes), drawn as the `focsd-theme` icon library; apps can replace it with `registerIconLibrary`. */
// Sun, moon and monitor icons. From Lucide icons, ISC License, Copyright (c) 2026 Lucide Icons and Contributors (some derived from Feather, MIT, Copyright (c) 2013-present Cole Bemis); full text in LICENSE-lucide.txt in this package.
registerPathIconLibrary('focsd-theme', {
  light:
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41',
  dark: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z',
  system: 'M4 3h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2M8 21h8M12 17v4',
  contrast: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20M12 2v20M12 7h5M12 12h7M12 17h5',
});

const TERMS = /** @type {const} */ ({
  light: 'themeLight',
  dark: 'themeDark',
  system: 'themeSystem',
  contrast: 'themeContrast',
});

/**
 * Theme toggle: a radio group of Light, Dark, System and High contrast
 * that sets `data-focsd-theme` on the target, or removes it for System, and remembers the choice.
 *
 * @fires change - Fired when the user picks a theme; read `value`.
 * @csspart group - The radio group.
 * @csspart option - Each option.
 * @csspart option-checked - The checked option.
 * @csspart icon - The icon in each option.
 * @csspart label - The text of each option.
 */
export class FocsdThemeToggleBase extends FocsdThemeChoiceBase {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    ...FocsdThemeChoiceBase.properties,
    value: { reflect: true },
    labelDisplay: { attribute: 'label-display', reflect: true },
  };

  /** @override */
  static storageKey = 'theme';

  /** @override */
  static groupTerm = 'colorTheme';

  /**
   * The theme functions of `@focsd-dev/tokens`, set by the styled element.
   * @type {ThemeApi | null}
   */
  static themeApi = null;

  constructor() {
    super();
    /** @type {ThemeChoice} The checked theme; `system` follows the operating system. Setting it applies the theme to the target without storing it. */
    this.value = 'system';
    /** @type {'shown' | 'hidden'} Show each option's text beside its icon (`shown`, default), or icons only with the text kept for assistive technology (`hidden`), for a compact header. */
    this.labelDisplay = 'shown';
  }

  get #api() {
    return /** @type {typeof FocsdThemeToggleBase} */ (this.constructor).themeApi;
  }

  /** @override */
  options() {
    return ['light', 'dark', 'system', 'contrast'].map((value) => ({ value }));
  }

  /** @override @param {Element} target */
  readTarget(target) {
    const theme = target.getAttribute('data-focsd-theme') ?? '';

    return ['light', 'dark', 'contrast'].includes(theme) ? theme : 'system';
  }

  /** @override @param {string} value @param {HTMLElement} target */
  applyTo(value, target) {
    if (value === 'system') this.#api?.clearTheme(target);
    else this.#api?.setTheme(value, target);
  }

  /** @override @param {string} value */
  storedValue(value) {
    return value === 'system' ? null : value;
  }

  /** @override @param {{ value: string }} option */
  renderOption(option) {
    const name = /** @type {ThemeChoice} */ (option.value);

    return html`<span part="icon">${icon({ library: 'focsd-theme', name }, 'svg')}</span
      ><span part="label">${this.localize.term(TERMS[name])}</span>`;
  }
}
