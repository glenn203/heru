import { LitElement, css, html } from 'lit';
import { property, query } from 'lit/decorators.js';
import {
  fieldPartsStyles,
  renderDescription,
  renderError,
  renderLabel,
  syncFieldA11y,
} from '../internal/field-parts.js';
import { FieldValidityController } from '../internal/field-validity.js';
import { FormAssociated } from '../internal/form-associated.js';
import { uniqueId } from '../internal/ids.js';
import type { PrismRadio } from './radio.js';

/**
 * A group of radios where exactly one can be picked, and the value of the
 * pick is what the form submits.
 *
 * - `role="radiogroup"`, named by `label`. Put help text in the `description`
 *   slot and the message for a failed check in the `error` slot.
 * - One tab stop: the selected radio, or the first enabled one. Arrow keys
 *   (Left and Up go back, Right and Down go forward, Left and Right swap in
 *   right-to-left text) move focus to the next enabled radio, wrapping, and
 *   pick it, as native radios do. Space picks the focused radio.
 * - `value` is the picked radio's `value` (empty: none). It is what is
 *   submitted under `name`. `required` fails validation while none is picked.
 *   A radio with `checked` in the markup sets the starting value. Resets to
 *   the starting value with the form.
 * - Fires `input` and `change` after each user pick.
 * - Disabling the group disables every radio in it.
 *
 * @tag prism-radio-group
 * @slot - The `prism-radio` choices.
 * @slot description - Help text under the label.
 * @slot error - Message shown while the group is invalid.
 * @csspart group - The radiogroup element.
 * @csspart label - The group's label.
 * @csspart description - The help text.
 * @csspart options - Wraps the radios.
 * @csspart error - The error message.
 * @cssstate disabled - The group is disabled.
 * @cssstate invalid - Fails validation (after interaction or submit).
 * @fires input - After the user picks a radio.
 * @fires change - After the user picks a radio.
 */
export class PrismRadioGroup extends FormAssociated(LitElement) {
  static override styles = [
    fieldPartsStyles,
    css`
      [part='options'] {
        display: flex;
        flex-direction: column;
        gap: var(--prism-space-2, 0.5rem);
        margin-block-start: var(--prism-space-2, 0.5rem);
      }
      :host([orientation='horizontal']) [part='options'] {
        flex-flow: row wrap;
        gap: var(--prism-space-2, 0.5rem) var(--prism-space-6, 1.5rem);
      }
    `,
  ];

  /** The picked radio's `value`; empty when none is picked. */
  @property({ reflect: true }) value = '';

  /** Required. What the choice is: "Delivery speed". */
  @property() label = '';

  /** A pick is required for the form to submit. */
  @property({ type: Boolean, reflect: true }) required = false;

  /** Layout of the radios: stacked (default) or in a row. */
  @property({ reflect: true }) orientation: 'vertical' | 'horizontal' =
    'vertical';

  @query('[part="group"]') private readonly group!: HTMLElement;

  readonly #id = uniqueId('prism-radio-group');
  readonly #validity = new FieldValidityController(this);
  #defaultValue = '';
  #adopted = false;

  get validity(): ValidityState {
    return this.internals.validity;
  }

  checkValidity(): boolean {
    return this.internals.checkValidity();
  }

  reportValidity(): boolean {
    this.#validity.touch();
    return this.internals.reportValidity();
  }

  formResetCallback(): void {
    this.value = this.#defaultValue;
    this.#validity.reset();
  }

  formStateRestoreCallback(state: string | File | FormData | null): void {
    this.value = typeof state === 'string' ? state : '';
  }

  override willUpdate(changed: Map<PropertyKey, unknown>): void {
    super.willUpdate(changed);
    this.#adoptStartingValue();
    if (changed.has('value'))
      this.internals.setFormValue(this.value || null, this.value);
  }

  override updated(): void {
    if (!this.label)
      console.error(
        '[prism-radio-group] `label` is required: a group needs an accessible name.',
        this,
      );
    this.internals.setValidity(
      this.required && !this.value ? { valueMissing: true } : {},
      'Pick one of these choices to continue.',
      this.group,
    );
    syncFieldA11y(this.renderRoot, this.group, this.#id, this.#validity.sync());
    this.#syncRadios();
  }

  #radios(): PrismRadio[] {
    return [...this.querySelectorAll<PrismRadio>('prism-radio')];
  }

  /** Pushes the value, the disabled state and the tab stop into the radios. */
  #syncRadios(): void {
    const radios = this.#radios();
    const enabled = radios.filter((r) => !r.disabled && !this.isDisabled);
    const stop =
      enabled.find((r) => this.value !== '' && r.value === this.value) ??
      enabled[0];
    for (const r of radios) {
      r.checked = this.value !== '' && r.value === this.value;
      r.groupDisabled = this.isDisabled;
      r.tabStop = r === stop;
    }
  }

  /**
   * A radio marked `checked` in the markup sets the starting value. Runs once,
   * as soon as there are radios to read.
   */
  #adoptStartingValue(): void {
    if (this.#adopted) return;
    const radios = this.#radios();
    if (!radios.length) return;
    this.#adopted = true;
    if (!this.value) this.value = radios.find((r) => r.checked)?.value ?? '';
    this.#defaultValue = this.value;
  }

  #onSlotChange = (): void => {
    this.#adoptStartingValue();
    this.#syncRadios();
  };

  #pick(radio: PrismRadio): void {
    if (radio.isDisabled || radio.value === this.value) return;
    this.value = radio.value;
    this.#validity.touch();
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true }));
  }

  #onSelect = (event: Event): void => {
    this.#pick(event.target as PrismRadio);
  };

  #onKeyDown = (event: KeyboardEvent): void => {
    const radio = (event.target as Element).closest<PrismRadio>('prism-radio');
    const rtl = getComputedStyle(this).direction === 'rtl';
    const step = {
      ArrowDown: 1,
      ArrowUp: -1,
      ArrowRight: rtl ? -1 : 1,
      ArrowLeft: rtl ? 1 : -1,
    }[event.key];
    if (!radio || !step || event.ctrlKey || event.altKey || event.metaKey)
      return;
    event.preventDefault();
    const enabled = this.#radios().filter((r) => !r.isDisabled);
    const next =
      enabled[
        (enabled.indexOf(radio) + step + enabled.length) % enabled.length
      ];
    if (!next) return;
    next.focus();
    this.#pick(next);
  };

  #onFocusOut = (event: FocusEvent): void => {
    if (!this.contains(event.relatedTarget as Node | null))
      this.#validity.touch();
  };

  override render() {
    return html`<div
      part="group"
      role="radiogroup"
      aria-labelledby="${this.#id}-label"
      aria-required=${this.required ? 'true' : 'false'}
      @prism-radio-select=${this.#onSelect}
      @keydown=${this.#onKeyDown}
      @focusout=${this.#onFocusOut}
    >
      ${renderLabel(this.#id, this.label)} ${renderDescription(this.#id)}
      <div part="options">
        <slot @slotchange=${this.#onSlotChange}></slot>
      </div>
      ${renderError(this.#id)}
    </div>`;
  }
}
