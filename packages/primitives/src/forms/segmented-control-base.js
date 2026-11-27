import { html, nothing } from 'lit';
import { FocsdRadioGroupBase } from './radio-group-base.js';
import { FocsdSegmentBase } from './segment-base.js';
import { edgeIndex } from '../internal/roving.js';
import { uid } from '../internal/id.js';
import { renderFieldLayout } from '../internal/field-messages.js';

/**
 * Segmented control: pick one value or view from a row of segments. It is an APG radio group with
 * selection following focus: one tab stop, arrows (mirrored in RTL) move and select, wrapping and
 * skipping disabled segments, and Home/End go to the first and last. Form-associated (`name`,
 * `value`, `required`, `disabled`, plus hint and messages). For toolbar on/off buttons use
 * `focsd-toggle-group` instead.
 *
 * @fires input - Fired on every user edit of the value.
 * @fires change - Fired when the user commits a change to the value or state.
 * @slot - The `focsd-segment` elements.
 * @csspart group - The group element (role=radiogroup).
 * @csspart label - The label element.
 * @csspart segment - Set on every segment element.
 * @csspart segment-selected - Set on the selected segment element.
 * @csspart layout - The wrapper around the label and the body.
 * @csspart body - The group and the messages.
 * @csspart hint - The hint text.
 * @csspart message - The shown message (also error, warning or success).
 * @csspart message-icon - The icon in the message.
 * @csspart announcer - The hidden region that announces message changes.
 */
export class FocsdSegmentedControlBase extends FocsdRadioGroupBase {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { size: { reflect: true } };

  #labelId = uid('focsd-segmented-label');

  constructor() {
    super();
    /** @type {'s' | 'm' | 'l'} The segments' size: `s`, `m` (default) or `l`. Targets stay at least 44 px tall. */
    this.size = 'm';
    this.addEventListener('keydown', this.#onEdgeKey);
  }

  /** The segments, in order. */
  get segments() {
    return /** @type {FocsdSegmentBase[]} */ (this.radios.filter((el) => el instanceof FocsdSegmentBase));
  }

  /** @param {number} i */
  #isDisabled = (i) => this.isDisabled || (this.radios[i]?.disabled ?? true);

  /** @param {KeyboardEvent} event */
  #onEdgeKey = (event) => {
    const radios = this.radios;

    if ((event.key !== 'Home' && event.key !== 'End') || !radios.includes(/** @type {any} */ (event.target))) return;
    const index = edgeIndex(event.key === 'Home' ? 'first' : 'last', radios.length, this.#isDisabled);

    event.preventDefault();

    if (index < 0) return;
    // The group checks on click; a click on the edge segment selects it the same way.
    radios[index]?.click();
  };

  /** @override */
  updated() {
    super.updated();
    const disabled = this.isDisabled;

    for (const radio of this.radios) {
      const selected = radio.getAttribute('aria-checked') === 'true';

      radio.setAttribute('part', selected ? 'segment segment-selected' : 'segment');

      if (disabled) radio.setAttribute('tabindex', '-1');
    }
  }

  #onSlotChange = () => this.requestUpdate();

  /** @override */
  render() {
    const describedBy = this.describedByIds().join(' ');
    const label = this.label ? html`<span part="label" id=${this.#labelId}>${this.label}</span>` : nothing;

    const body = html`<div
      part="group"
      role="radiogroup"
      aria-labelledby=${this.label ? this.#labelId : nothing}
      aria-label=${this.label ? nothing : this.localize.term('segmentedControl')}
      aria-describedby=${describedBy || nothing}
      aria-required=${this.required ? 'true' : nothing}
      aria-disabled=${this.isDisabled ? 'true' : nothing}
    >
      <slot @slotchange=${this.#onSlotChange}></slot>
    </div>`;

    return renderFieldLayout(this, label, body);
  }
}
