import { LitElement, css, html } from 'lit';
import { property, query } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { controlSize } from '../internal/control-styles.js';
import { pressDepth, pressScale } from '../internal/press-scale.js';
import { stateLayer } from '../internal/state-layer.js';

/**
 * A square, icon-only button. NAME PROVISIONAL.
 *
 * Always ghost in the theme: transparent fill, text-colour overlay on hover and
 * press. Not form-associated: it never submits. `label` is required because
 * there is no visible text; it becomes the accessible name. When the button
 * lives in a card, put the card's title in the label ("More options for
 * Onboarding guide").
 *
 * @tag prism-icon-button
 * @slot - The icon (decorative; hidden from assistive tech by the component).
 * @csspart base - The native button.
 * @cssstate disabled - The button is disabled.
 * @cssstate pressed - A toggle button is pressed.
 * @fires click - Native click; suppressed while disabled.
 */
export class PrismIconButton extends LitElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override styles = [
    controlSize,
    css`
      :host {
        display: inline-block;
        inline-size: var(--_prism-control-height);
        block-size: var(--_prism-control-height);
      }
      :host([hidden]) {
        display: none;
      }
      [part='base'] {
        all: unset;
        box-sizing: border-box;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        inline-size: 100%;
        block-size: 100%;
        border: var(--prism-border-width, 1px) solid transparent;
        border-radius: var(--prism-radius-5, 5px);
        cursor: var(--prism-button-cursor, pointer);
      }
      [part='base']:disabled {
        cursor: var(--prism-button-cursor-disabled, default);
      }
      [part='base']:focus-visible {
        outline: revert;
      }
      ::slotted(*) {
        pointer-events: none;
      }
    `,
    stateLayer("[part='base']"),
  ];

  /** Required accessible name. Say what it does and for which item. */
  @property() label = '';
  /** Target size: sm, md or lg. Follows density (sm is 24px at compact). */
  @property({ reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  @property({ type: Boolean, reflect: true }) disabled = false;
  /** Makes this a toggle when set. */
  @property({ type: Boolean, reflect: true }) pressed?: boolean;
  /** Menu buttons: the kind of popup this opens (sets aria-haspopup). */
  @property() haspopup?: 'menu' | 'dialog' | 'listbox';
  /** Menu buttons: whether the popup is open (sets aria-expanded). */
  @property({ type: Boolean }) expanded?: boolean;

  @query('button') private readonly button!: HTMLButtonElement;

  readonly #internals = this.attachInternals();

  override focus(options?: FocusOptions): void {
    this.button?.focus(options);
  }

  constructor() {
    super();
    pressScale(this, {
      target: () => this.button,
      depth: () => pressDepth('sm', 0),
      enabled: () => !this.disabled,
      mark: true,
    });
    this.addEventListener(
      'click',
      (event) => {
        if (this.disabled) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      { capture: true },
    );
  }

  override willUpdate(): void {
    this.#toggleState('disabled', this.disabled);
    this.#toggleState('pressed', this.pressed === true);
  }

  override updated(): void {
    if (!this.label && !this.hasAttribute('aria-label'))
      console.error(
        '[prism-icon-button] `label` is required: an icon-only button needs an accessible name.',
        this,
      );
  }

  #toggleState(name: string, on: boolean): void {
    try {
      if (on) this.#internals.states.add(name);
      else this.#internals.states.delete(name);
    } catch {
      /* :state() unsupported */
    }
  }

  #onClick(): void {
    if (this.disabled) return;
    if (this.pressed !== undefined) this.pressed = !this.pressed;
  }

  override render() {
    return html`<button
      part="base"
      type="button"
      aria-label=${ifDefined(this.label || undefined)}
      aria-haspopup=${ifDefined(this.haspopup)}
      aria-expanded=${ifDefined(
        this.expanded === undefined ? undefined : String(this.expanded),
      )}
      aria-pressed=${ifDefined(
        this.pressed === undefined ? undefined : String(this.pressed),
      )}
      ?disabled=${this.disabled}
      @click=${this.#onClick}
    >
      <slot></slot>
    </button>`;
  }
}
