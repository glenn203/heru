import { LitElement, css, html } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { live } from 'lit/directives/live.js';
import { FormAssociated } from '../internal/form-associated.js';
import { uniqueId } from '../internal/ids.js';
import {
  controlBox,
  controlSize,
  textRole,
} from '../internal/control-styles.js';

/**
 * A headless single-line text field. The label, native input, description
 * and error all live in one shadow root, so `for`/`aria-describedby` work.
 *
 * @tag heru-text-field
 * @slot description - Helper text, announced with the input.
 * @slot error - Error text, shown and announced when invalid.
 * @csspart label - The label.
 * @csspart input - The native input.
 * @csspart description - Wrapper around the description slot.
 * @csspart error - Wrapper around the error slot.
 * @cssstate invalid - The value fails validation (after interaction or submit).
 * @cssstate disabled - The field is disabled.
 * @cssprop [--heru-control-height-sm=2rem] - Input height when size="sm" (density-aware).
 * @cssprop [--heru-control-height-md=2.25rem] - Input height when size="md" (default; density-aware).
 * @cssprop [--heru-control-height-lg=2.75rem] - Input height when size="lg" (density-aware).
 * @cssprop [--heru-control-padding-inline=0.75rem] - Input inline padding (density-aware).
 * @cssprop [--heru-radius-5=5px] - Input corner radius.
 * @cssprop [--heru-border-width=1px] - Input border width, drawn inside the height.
 * @cssprop --heru-text-label-font-size - Label role (also -line-height, -font-weight, -font-family).
 * @cssprop --heru-text-body-font-size - Input body role (also -line-height, -font-weight, -font-family).
 * @cssprop --heru-text-caption-font-size - Description/error caption role (also -line-height, -font-weight, -font-family).
 * @fires input - Native input event (composed).
 * @fires change - Re-dispatched from the native input.
 */
export class HeruTextField extends FormAssociated(LitElement) {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override styles = [
    controlSize,
    css`
      :host {
        display: block;
      }
      [part='label'] {
        display: block;
        ${textRole('label')}
      }
      [part='input'] {
        display: block;
        inline-size: 100%;
        margin: 0;
        background: none;
        color: inherit;
        ${controlBox}
        ${textRole('body')}
      }
      [part='description'],
      [part='error'] {
        ${textRole('caption')}
      }
      :host([hidden]) {
        display: none;
      }
      [part='error'][hidden] {
        display: none;
      }
    `,
  ];

  /** Input height: sm, md or lg. Follows density. */
  @property({ reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';

  /** Visible label text. Required for an accessible name. */
  @property() label = '';

  /** Current value. */
  @property() value = '';

  /** Native input type. */
  @property() type: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' =
    'text';

  @property() placeholder = '';

  @property({ type: Boolean, reflect: true }) required = false;

  @property({ type: Boolean, reflect: true }) readonly = false;

  @property() autocomplete = '';

  @query('input') private readonly input!: HTMLInputElement;

  @state() private touched = false;

  #defaultValue = '';
  readonly #id = uniqueId('heru-text-field');

  override connectedCallback(): void {
    super.connectedCallback();
    this.#defaultValue = this.getAttribute('value') ?? '';
  }

  get validity(): ValidityState {
    return this.internals.validity;
  }
  get validationMessage(): string {
    return this.internals.validationMessage;
  }
  checkValidity(): boolean {
    return this.internals.checkValidity();
  }
  reportValidity(): boolean {
    this.touched = true;
    return this.internals.reportValidity();
  }

  override focus(options?: FocusOptions): void {
    this.input?.focus(options);
  }

  formResetCallback(): void {
    this.value = this.#defaultValue;
    this.touched = false;
  }

  formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof state === 'string') this.value = state;
  }

  override willUpdate(changed: Map<PropertyKey, unknown>): void {
    super.willUpdate(changed);
    this.internals.setFormValue(
      this.isDisabled ? null : this.value,
      this.value,
    );
  }

  override updated(): void {
    // Validity must be computed against the rendered native input.
    const missing = this.required && !this.isDisabled && this.value === '';
    if (missing) {
      this.internals.setValidity(
        { valueMissing: true },
        'Please fill out this field.',
        this.input,
      );
    } else if (!this.input.validity.valid) {
      this.internals.setValidity(
        this.input.validity,
        this.input.validationMessage,
        this.input,
      );
    } else {
      this.internals.setValidity({});
    }
    const invalid = this.touched && !this.internals.validity.valid;
    this.setState('invalid', invalid);
    this.input.setAttribute('aria-invalid', String(invalid));
    // Only reference the error while it is shown.
    const describedBy = `${this.#id}-description${invalid ? ` ${this.#id}-error` : ''}`;
    this.input.setAttribute('aria-describedby', describedBy);
    this.renderRoot
      .querySelector('[part="error"]')
      ?.toggleAttribute('hidden', !invalid);
  }

  constructor() {
    super();
    this.addEventListener('invalid', () => {
      this.touched = true;
    });
  }

  #onInput(event: Event): void {
    this.value = (event.target as HTMLInputElement).value;
  }

  // A shadow input can't reach the outer form, so do implicit submission here.
  #onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.isComposing && this.form) {
      event.preventDefault();
      this.form.requestSubmit();
    }
  }

  #onChange(): void {
    this.touched = true;
    this.dispatchEvent(new Event('change', { bubbles: true }));
  }

  override render() {
    const id = this.#id;
    return html`
      <label part="label" for="${id}-input">${this.label}</label>
      <input
        part="input"
        id="${id}-input"
        .type=${this.type}
        .value=${live(this.value)}
        placeholder=${this.placeholder || ''}
        autocomplete=${this.autocomplete || 'off'}
        ?required=${this.required}
        ?readonly=${this.readonly}
        ?disabled=${this.isDisabled}
        @input=${this.#onInput}
        @change=${this.#onChange}
        @keydown=${this.#onKeydown}
        @blur=${() => {
          this.touched = true;
        }}
      />
      <div part="description" id="${id}-description">
        <slot name="description"></slot>
      </div>
      <div part="error" id="${id}-error" aria-live="polite" hidden>
        <slot name="error"></slot>
      </div>
    `;
  }
}
