import { LitElement, css, html } from 'lit';
import { property, query } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { FormAssociated } from '../internal/form-associated.js';
import {
  controlBox,
  controlSize,
  textRole,
} from '../internal/control-styles.js';
import { stateLayer } from '../internal/state-layer.js';

/**
 * A headless button. Renders a native `<button>` in shadow DOM and joins the
 * surrounding form through ElementInternals.
 *
 * @tag prism-button
 * @slot - The label.
 * @slot start - Content before the label, such as an icon.
 * @slot end - Content after the label.
 * @csspart base - The native button.
 * @csspart label - Wrapper around the default slot.
 * @cssstate disabled - The button is disabled.
 * @cssstate pressed - A toggle button is pressed.
 * @cssprop [--prism-control-height-sm=2rem] - Height when size="sm" (density-aware).
 * @cssprop [--prism-control-height-md=2.25rem] - Height when size="md" (default; density-aware).
 * @cssprop [--prism-control-height-lg=2.75rem] - Height when size="lg" (density-aware).
 * @cssprop [--prism-control-padding-inline=0.75rem] - Inline padding (density-aware).
 * @cssprop [--prism-radius-5=5px] - Corner radius.
 * @cssprop [--prism-border-width=1px] - Border width, drawn inside the height.
 * @cssprop --prism-text-label-font-size - Label role font size (also -line-height, -font-weight, -font-family).
 * @fires click - Native click; suppressed while disabled.
 */
export class PrismButton extends FormAssociated(LitElement) {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  // Structural only: token-driven sizing and type, no color.
  static override styles = [
    controlSize,
    css`
      :host {
        display: inline-block;
      }
      :host([hidden]) {
        display: none;
      }
      [part='base'] {
        all: unset;
        box-sizing: border-box;
        display: inline-flex;
        align-items: center;
        gap: var(--prism-button-gap, 0);
        inline-size: 100%;
        cursor: var(--prism-button-cursor, pointer);
        ${controlBox}
        ${textRole('label')}
      }
      [part='base']:disabled {
        cursor: var(--prism-button-cursor-disabled, default);
      }
      [part='base']:focus-visible {
        outline: revert;
      }
    `,
    stateLayer("[part='base']"),
  ];

  /** Control height: sm, md or lg. Follows density. */
  @property({ reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';

  /**
   * Visual emphasis. Unset = `primary`. Headless: only the opt-in theme
   * paints variants. VARIANT NAMES PROVISIONAL.
   * - `primary` solid accent (default)
   * - `secondary` accent tint with accent text
   * - `ghost` transparent, no border
   * - `outline` transparent with a border
   * - `destructive` error-box tint with dark red text
   */
  @property({ reflect: true }) variant?:
    'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive';

  /** What the button does in a form. */
  @property({ reflect: true }) type: 'button' | 'submit' | 'reset' = 'submit';

  /** Value submitted with the form when this button submits it. */
  @property() value = '';

  /** Makes this a toggle button when set. `undefined` means not a toggle. */
  @property({ type: Boolean, reflect: true }) pressed?: boolean;

  @query('button') private readonly button!: HTMLButtonElement;

  override focus(options?: FocusOptions): void {
    this.button?.focus(options);
  }

  override willUpdate(changed: Map<PropertyKey, unknown>): void {
    super.willUpdate(changed);
    this.setState('pressed', this.pressed === true);
  }

  constructor() {
    super();
    // Block clicks on the host while disabled (covers slotted content).
    this.addEventListener(
      'click',
      (event) => {
        if (this.isDisabled) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      { capture: true },
    );
  }

  #onClick(): void {
    if (this.isDisabled) return;
    if (this.pressed !== undefined) this.pressed = !this.pressed;
    const form = this.form;
    if (!form) return;
    if (this.type === 'submit') {
      if (this.name) {
        // Submit our name/value via a temporary native submitter.
        const proxy = document.createElement('button');
        proxy.type = 'submit';
        proxy.name = this.name;
        proxy.value = this.value;
        proxy.hidden = true;
        form.append(proxy);
        form.requestSubmit(proxy);
        proxy.remove();
      } else {
        form.requestSubmit();
      }
    } else if (this.type === 'reset') {
      form.reset();
    }
  }

  override render() {
    return html`<button
      part="base"
      type="button"
      ?disabled=${this.isDisabled}
      aria-pressed=${ifDefined(this.pressed === undefined ? undefined : String(this.pressed))}
      @click=${this.#onClick}
    >
      <slot name="start"></slot><span part="label"><slot></slot></span
      ><slot name="end"></slot>
    </button>`;
  }
}
