import {
  LitElement,
  css,
  html,
  nothing,
  type CSSResultGroup,
  type TemplateResult,
} from 'lit';
import { property } from 'lit/decorators.js';
import { FormAssociated } from './form-associated.js';
import { stateLayer } from './state-layer.js';
import { uniqueId } from './ids.js';
import { controlBox, controlSize, textRole } from './control-styles.js';
import {
  fieldPartsStyles,
  renderDescription,
  renderError,
  renderLabel,
  syncFieldA11y,
} from './field-parts.js';
import { FieldValidityController } from './field-validity.js';

type NativeControl = HTMLInputElement | HTMLTextAreaElement;

/**
 * Private base for the text input family (TextInput, PasswordInput,
 * SearchInput, OtpInput, TextArea). Owns form association, value/reset/
 * restore, validity mirroring and the label, description and error parts. Each
 * public component only renders its own control via `renderControl()`; there
 * is no type switch here. Not exported from the package.
 */
export abstract class TextControl extends FormAssociated(LitElement) {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override styles: CSSResultGroup = [
    controlSize,
    fieldPartsStyles,
    css`
      [part='control'] {
        position: relative;
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
      /* Adornment buttons (password toggle, search clear): >=24px target. */
      .adornment {
        position: absolute;
        inset-block: 0;
        inset-inline-end: calc(var(--prism-space-1, 0.25rem) * 1.5);
        display: grid;
        place-items: center;
        margin-block: auto;
        inline-size: 24px;
        block-size: 24px;
        padding: 0;
        border: 0;
        color: inherit;
        cursor: pointer;
        z-index: 2;
      }
      .adornment[hidden] {
        display: none;
      }
      .adornment:disabled {
        cursor: default;
      }
      :host([data-adorned]) [part='input'] {
        padding-inline-end: calc(
          var(--prism-control-padding-inline, 0.75rem) + 24px
        );
      }
    `,
    stateLayer('.adornment'),
  ];

  /** Control height: sm, md or lg. Follows density. */
  @property({ reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  /** Visible label text. Required for an accessible name. */
  @property() label = '';
  /** Current value. The `value` attribute sets the initial (and reset) value; it is never reflected back. */
  @property() value = '';
  @property() placeholder = '';
  @property({ type: Boolean, reflect: true }) required = false;
  @property({ type: Boolean, reflect: true }) readonly = false;
  /** Passed through to the native control (omitted when empty). */
  @property() autocomplete = '';
  @property({ type: Number }) minlength?: number;
  @property({ type: Number }) maxlength?: number;

  protected readonly validityCtl = new FieldValidityController(this);
  protected readonly fieldId = uniqueId('prism-field');
  #defaultValue = '';

  /** Render the native control. It must carry id `${fieldId}-input`. */
  protected abstract renderControl(): TemplateResult;

  /** Message for an empty required field. */
  protected requiredMessage = 'Please fill out this field.';

  /** Component-specific constraint beyond native validity. */
  protected validate(): [ValidityStateFlags, string] | null {
    return null;
  }

  /** Single-line controls submit their form on Enter. */
  protected implicitSubmit = true;

  protected get control(): NativeControl | null {
    return this.renderRoot?.querySelector<NativeControl>(
      `#${this.fieldId}-input`,
    );
  }

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
    this.validityCtl.touch();
    return this.internals.reportValidity();
  }
  /** Custom error, like the native setCustomValidity(). */
  setCustomValidity(message: string): void {
    this.#custom = message;
    this.requestUpdate();
  }
  #custom = '';

  override focus(options?: FocusOptions): void {
    this.control?.focus(options);
  }
  select(): void {
    this.control?.select();
  }

  formResetCallback(): void {
    this.value = this.#defaultValue;
    this.validityCtl.reset();
  }
  formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof state === 'string') this.value = state;
  }

  /** Value submitted with the form (subclasses may normalise). */
  protected formValue(): string {
    return this.value;
  }

  override willUpdate(changed: Map<PropertyKey, unknown>): void {
    super.willUpdate(changed);
    this.internals.setFormValue(
      this.isDisabled ? null : this.formValue(),
      this.value,
    );
  }

  protected override updated(changed: Map<PropertyKey, unknown>): void {
    super.updated(changed);
    const el = this.control;
    if (!el) return;
    if (this.#custom) {
      this.internals.setValidity({ customError: true }, this.#custom, el);
    } else if (this.required && !this.isDisabled && this.value === '') {
      this.internals.setValidity(
        { valueMissing: true },
        this.requiredMessage,
        el,
      );
    } else if (this.validate()) {
      const [flags, message] = this.validate()!;
      this.internals.setValidity(flags, message, el);
    } else if (!el.validity.valid) {
      this.internals.setValidity(el.validity, el.validationMessage, el);
    } else {
      this.internals.setValidity({});
    }
    const invalid = this.validityCtl.sync();
    syncFieldA11y(this.renderRoot, el, this.fieldId, invalid, {
      hideDescriptionWhenInvalid: true,
    });
    this.renderRoot
      .querySelector('[part="description"]')
      ?.toggleAttribute('hidden', invalid);
  }

  protected onInput = (event: Event): void => {
    this.value = (event.target as NativeControl).value;
  };
  protected onChange = (): void => {
    this.validityCtl.touch();
    this.dispatchEvent(new Event('change', { bubbles: true }));
  };
  protected onBlur = (): void => this.validityCtl.touch();
  /** A shadow input can't reach the outer form: do implicit submission. */
  protected onKeydown = (event: KeyboardEvent): void => {
    if (
      this.implicitSubmit &&
      event.key === 'Enter' &&
      !event.isComposing &&
      this.form
    ) {
      event.preventDefault();
      this.form.requestSubmit();
    }
  };

  /** Shared attributes for the native control. */
  protected get a11yAttrs() {
    return {
      autocomplete: this.autocomplete || nothing,
      minlength: this.minlength ?? nothing,
      maxlength: this.maxlength ?? nothing,
    };
  }

  /** Extra content rendered after the error box (e.g. a counter). */
  protected renderAfter(): TemplateResult | typeof nothing {
    return nothing;
  }

  override render() {
    const id = this.fieldId;
    return html`
      ${renderLabel(id, this.label, `${id}-input`)}
      <div part="control">${this.renderControl()}</div>
      ${renderDescription(id)} ${renderError(id)} ${this.renderAfter()}
    `;
  }
}
