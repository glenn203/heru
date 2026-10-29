import { LitElement, css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { stateLayer } from '../internal/state-layer.js';
import { textRole } from '../internal/control-styles.js';

/**
 * One action in a `prism-menu`. NAME PROVISIONAL.
 * Light-DOM child of the menu so the menu can roving-focus it.
 *
 * @tag prism-menu-item
 * @slot - The item label.
 * @csspart base - The row.
 * @cssstate active - Keyboard focus is on this item.
 * @cssstate disabled - Not actionable; skipped by arrow keys.
 */
export class PrismMenuItem extends LitElement {
  static override styles = [
    css`
      :host {
        display: block;
        cursor: default;
        outline: none;
      }
      :host([hidden]) {
        display: none;
      }
      [part='base'] {
        display: flex;
        align-items: center;
        gap: var(--prism-space-2, 0.5rem);
        padding-inline: var(--prism-space-3, 0.75rem);
        padding-block: var(--prism-space-2, 0.5rem);
        ${textRole('body')}
      }
    `,
    stateLayer("[part='base']"),
  ];

  /** Passed to `prism-menu-select`. Falls back to the text content. */
  @property() value = '';
  @property({ type: Boolean, reflect: true }) disabled = false;

  readonly #internals = this.attachInternals();

  get resolvedValue(): string {
    return this.value || (this.textContent ?? '').trim();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // Host attributes so every AT and test tool sees them (as prism-option).
    this.setAttribute('role', 'menuitem');
    this.tabIndex = -1;
    this.addEventListener('focus', this.#onFocus);
    this.addEventListener('blur', this.#onBlur);
    this.addEventListener('click', this.#onClickCapture, { capture: true });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('focus', this.#onFocus);
    this.removeEventListener('blur', this.#onBlur);
    this.removeEventListener('click', this.#onClickCapture, { capture: true });
  }

  override willUpdate(): void {
    this.setAttribute('aria-disabled', String(this.disabled));
    this.#state('disabled', this.disabled);
  }

  #state(name: string, on: boolean): void {
    try {
      if (on) this.#internals.states.add(name);
      else this.#internals.states.delete(name);
    } catch {
      /* :state() unsupported */
    }
  }
  readonly #onFocus = (): void => this.#state('active', true);
  readonly #onBlur = (): void => this.#state('active', false);
  readonly #onClickCapture = (event: Event): void => {
    if (this.disabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  override render() {
    return html`<div part="base"><slot></slot></div>`;
  }
}
