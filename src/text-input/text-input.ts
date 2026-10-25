import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { live } from 'lit/directives/live.js';
import { TextControl } from '../internal/text-control.js';

/**
 * A single-line text input. Covers text, email, url and tel via `type`.
 * Passwords, search and one-time codes have their own components.
 *
 * @tag prism-text-input
 * @slot description - Helper text, announced with the input.
 * @slot error - Error text, shown in the attached status box when invalid.
 * @csspart label - The label.
 * @csspart control - Wrapper around the native input.
 * @csspart input - The native input.
 * @csspart description - Wrapper around the description slot.
 * @csspart error - Attached error status box.
 * @cssstate invalid - Fails validation (after interaction or submit).
 * @cssstate disabled - Disabled (own or via fieldset).
 * @fires input - Native input event (composed).
 * @fires change - Committed value change.
 */
export class PrismTextInput extends TextControl {
  /** Native input type. Use the dedicated components for password/search/OTP. */
  @property() type: 'text' | 'email' | 'url' | 'tel' = 'text';
  /** Virtual keyboard hint, passed through. */
  @property() inputmode = '';
  /** Regular expression the value must match (native semantics). */
  @property() pattern = '';

  protected renderControl() {
    const a = this.a11yAttrs;
    return html`<input
      part="input"
      id="${this.fieldId}-input"
      .type=${this.type}
      .value=${live(this.value)}
      placeholder=${this.placeholder || ''}
      autocomplete=${a.autocomplete}
      inputmode=${this.inputmode || nothing}
      pattern=${this.pattern || nothing}
      minlength=${a.minlength}
      maxlength=${a.maxlength}
      ?required=${this.required}
      ?readonly=${this.readonly}
      ?disabled=${this.isDisabled}
      @input=${this.onInput}
      @change=${this.onChange}
      @keydown=${this.onKeydown}
      @blur=${this.onBlur}
    />`;
  }
}
