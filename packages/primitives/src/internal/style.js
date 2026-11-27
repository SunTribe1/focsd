import { noChange } from 'lit';
import { AsyncDirective } from 'lit/async-directive.js';
import { PartType, directive } from 'lit/directive.js';

/** @typedef {Record<string, string | number | null | undefined>} StyleProps */

/** A value that could end its declaration and start another (`1; background: url(…)`). */
const UNSAFE_VALUE = /[;{}]/;

/** @param {unknown} value */
const isUnset = (value) => value === null || value === undefined;

/**
 * Inline style written through the CSSOM (`style.setProperty`), which a strict `style-src` policy
 * (no 'unsafe-inline') does not block. Lit's styleMap sets the `style` attribute on its first
 * render, so under such a policy the first geometry is lost; this directive never does on the
 * client. Each value stays inside its own declaration: the CSSOM drops an invalid value, and the
 * old value is removed first, so it never lingers.
 *
 * The directive tracks what it wrote. When the binding stops being this directive (for example it
 * becomes `nothing`) or its element leaves the page, Lit disconnects it and the properties are
 * removed; a reconnect writes them again. Callers should still bind `cssomStyle({})` or pass
 * `undefined` values instead of switching to `nothing`.
 *
 * Server rendering has no CSSOM, so render() emits a `style` attribute (minus values that could
 * add declarations). Server-rendered geometry therefore needs `style-src-attr 'unsafe-inline'`
 * until the first client update.
 */
class CssomStyleDirective extends AsyncDirective {
  /** @type {Map<string, string>} */
  #written = new Map();

  /** @type {CSSStyleDeclaration | null} */
  #style = null;

  /** @param {import('lit/directive.js').PartInfo} partInfo */
  constructor(partInfo) {
    super(partInfo);

    // Lit gives an attribute part `strings` only when static text sits beside the binding.
    if (partInfo.type !== PartType.ATTRIBUTE || partInfo.name !== 'style' || partInfo.strings !== undefined) {
      throw new Error('cssomStyle() must be the whole value of a style attribute.');
    }
  }

  /** @param {StyleProps} props */
  render(props) {
    return Object.entries(props)
      .filter(([, value]) => !isUnset(value) && value !== '' && !UNSAFE_VALUE.test(String(value)))
      .map(([name, value]) => `${name}:${value}`)
      .join(';');
  }

  /**
   * @param {import('lit/directive.js').Part} part
   * @param {[StyleProps]} args
   * @override
   */
  update(part, [props]) {
    const style = /** @type {import('lit/directive.js').AttributePart} */ (part).element.style;
    this.#style = style;

    for (const name of this.#written.keys()) {
      if (isUnset(props[name])) {
        style.removeProperty(name);
        this.#written.delete(name);
      }
    }

    for (const [name, value] of Object.entries(props)) {
      if (isUnset(value)) continue;
      const text = String(value);
      style.removeProperty(name);

      if (UNSAFE_VALUE.test(text)) {
        this.#written.delete(name);
        continue;
      }

      style.setProperty(name, text);
      this.#written.set(name, text);
    }

    return noChange;
  }

  /** @override */
  disconnected() {
    for (const name of this.#written.keys()) this.#style?.removeProperty(name);
  }

  /** @override */
  reconnected() {
    for (const [name, text] of this.#written) this.#style?.setProperty(name, text);
  }
}

/**
 * Bind as the whole `style` attribute: `style=${cssomStyle({ 'inset-inline-start': '48px' })}`.
 * Use property names as in CSS (`inset-inline-start`, `--_level`); null or undefined removes one.
 *
 * @type {(props: StyleProps) => import('lit/directive.js').DirectiveResult}
 */
export const cssomStyle = directive(CssomStyleDirective);
