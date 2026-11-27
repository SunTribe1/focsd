import { html, nothing } from 'lit';
import { iconSvg } from '../internal/icons.js';
import { cssomStyle } from '../internal/style.js';
import { schemeOf, resolveTarget } from '../internal/theme-store.js';
import { FocsdThemeChoiceBase } from './theme-choice-base.js';

/** @typedef {{ action: string, route: string, surface: string }} PresetSwatch */
/** @typedef {{ light: PresetSwatch, dark: PresetSwatch }} PresetSwatches */
/**
 * @typedef {{ brands: readonly string[], setBrand(brand: string | null, root?: Element): void,
 *   presetSwatches: Readonly<Record<string, PresetSwatches>>, defaultSwatches: PresetSwatches }} BrandApi
 */

/** The swatch's three colors, in order. */
const ROLES = /** @type {const} */ (['action', 'route', 'surface']);

/** @type {import('lit').ComplexAttributeConverter<string[] | null>} */
const listConverter = {
  fromAttribute: (value) => (value === null ? null : value.split(/[\s,]+/).filter(Boolean)),
  toAttribute: (value) => value?.join(' ') ?? null,
};

/**
 * Theme picker: a radio group of theme presets, each shown by name with a three-color swatch
 * (action, route, surface) in the current light or dark scheme and a check mark when chosen. The
 * first option is Focsd's own look (Wayfinding). Choosing sets `data-focsd-brand` on the target,
 * or removes it for the default, and remembers the choice.
 *
 * @fires change - Fired when the user picks a preset; read `value` (empty for the default).
 * @csspart group - The radio group.
 * @csspart option - Each option.
 * @csspart option-checked - The checked option.
 * @csspart swatch - The three colors of each option.
 * @csspart name - The name of each option.
 * @csspart check - The check mark of the chosen option.
 */
export class FocsdThemePickerBase extends FocsdThemeChoiceBase {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { ...FocsdThemeChoiceBase.properties, value: { reflect: true }, presets: { converter: listConverter } };

  /** @override */
  static storageKey = 'brand';

  /** @override */
  static groupTerm = 'themePreset';

  /**
   * The brand list, `setBrand` and swatches of `@focsd-dev/tokens`, set by the styled element.
   * @type {BrandApi | null}
   */
  static brandApi = null;

  constructor() {
    super();
    /** @type {string} The chosen preset's name; empty for the default (Wayfinding). Setting it applies the preset to the target without storing it. */
    this.value = '';
    /**
     * @type {string[] | null} The presets offered after the default, in order (attribute: a space- or
     * comma-separated list). Null offers every preset; unknown names are left out.
     */
    this.presets = null;
  }

  get #api() {
    return /** @type {typeof FocsdThemePickerBase} */ (this.constructor).brandApi;
  }

  /** @override */
  options() {
    const brands = this.#api?.brands ?? [];
    const names = this.presets ? this.presets.filter((name) => brands.includes(name)) : brands;

    return ['', ...names].map((value) => ({ value }));
  }

  /** @override @param {Element} target */
  readTarget(target) {
    const brand = target.getAttribute('data-focsd-brand') ?? '';

    return this.#api?.brands.includes(brand) ? brand : '';
  }

  /** @override @param {string} value @param {HTMLElement} target */
  applyTo(value, target) {
    this.#api?.setBrand(value || null, target);
  }

  /** @override @param {{ value: string }} option @param {boolean} checked */
  renderOption(option, checked) {
    const api = this.#api;
    const scheme = schemeOf(resolveTarget(this.target));
    const swatches = option.value ? api?.presetSwatches[option.value] : api?.defaultSwatches;
    const colors = swatches?.[scheme];

    return html`<span part="swatch" aria-hidden="true"
        >${ROLES.map((role) => html`<span class="chip" style=${cssomStyle({ '--_chip': colors?.[role] })}></span>`)}</span
      ><span part="name">${option.value ? this.localize.term('presetName', option.value) : this.localize.term('presetDefault')}</span
      >${checked ? html`<span part="check" aria-hidden="true">${iconSvg('check')}</span>` : nothing}`;
  }
}
