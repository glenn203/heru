import { LitElement, css, html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { CheckMark, checkMarkStyles } from '../internal/check-mark.js';
import { stateLayer } from '../internal/state-layer.js';
import { textRole } from '../internal/control-styles.js';

/**
 * One action in a `prism-menu`. NAME PROVISIONAL.
 * Light-DOM child of the menu so the menu can roving-focus it.
 *
 * @tag prism-menu-item
 * @slot - The item label.
 * @csspart base - The row.
 * @csspart check - The check of a checkable item (draws in and out).
 * @cssstate active - Keyboard focus is on this item.
 * @cssstate checked - A checkable item that is on.
 * @cssstate disabled - Not actionable; skipped by arrow keys.
 */
export class PrismMenuItem extends LitElement {
  static override styles = [
    checkMarkStyles,
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
  /** Makes this a checkbox item: activating it flips `checked` and the menu stays open. */
  @property({ type: Boolean, reflect: true }) checkable = false;
  /** Whether a checkable item is on. */
  @property({ type: Boolean, reflect: true }) checked = false;

  readonly #internals = this.attachInternals();
  readonly #check = new CheckMark(this);

  get resolvedValue(): string {
    return this.value || (this.textContent ?? '').trim();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // Host attributes so every AT and test tool sees them (as prism-option).
    this.#syncRole();
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
    this.#state('checked', this.checkable && this.checked);
    this.#syncRole();
    this.#check.set(this.checkable && this.checked);
  }

  override firstUpdated(): void {
    this.#check.ready();
  }

  #syncRole(): void {
    this.setAttribute('role', this.checkable ? 'menuitemcheckbox' : 'menuitem');
    if (this.checkable) this.setAttribute('aria-checked', String(this.checked));
    else this.removeAttribute('aria-checked');
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
    } else if (this.checkable) this.checked = !this.checked;
  };

  override render() {
    return html`<div part="base">
      ${this.checkable ? this.#check.render() : nothing}<slot></slot>
    </div>`;
  }
}
