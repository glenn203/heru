import { LitElement, css, html } from 'lit';
import { stateLayer } from '../internal/state-layer.js';
import { property } from 'lit/decorators.js';
import { uniqueId } from '../internal/ids.js';

/**
 * One choice inside `prism-select`. Light-DOM child, so the select's trigger
 * can point `aria-activedescendant` at it. NAME PENDING.
 *
 * @tag prism-option
 * @slot - The option label.
 * @csspart base - The row.
 * @csspart check - Selected indicator.
 * @cssstate selected - This option is the select's value.
 * @cssstate active - Keyboard/pointer highlighted.
 * @cssstate disabled - Not selectable; skipped by arrow keys.
 */
export class PrismOption extends LitElement {
  static override styles = [
    css`
      :host {
        display: block;
        cursor: default;
      }
      :host([hidden]) {
        display: none;
      }
      [part='base'] {
        display: flex;
        align-items: center;
        gap: var(--prism-space-2, 0.5rem);
      }
      [part='check'] {
        inline-size: 1em;
        visibility: hidden;
      }
      :host(:state(selected)) [part='check'] {
        visibility: visible;
      }
    `,
    stateLayer("[part='base']"),
  ];

  /** Submitted value. Falls back to the text content. */
  @property() value = '';
  /** Initial selection (like native). */
  @property({ type: Boolean, reflect: true }) selected = false;
  @property({ type: Boolean, reflect: true }) disabled = false;
  /** Display label override; defaults to the text content. */
  @property() label = '';

  readonly #internals = this.attachInternals();

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.id) this.id = uniqueId('prism-option');
    // Host attributes (not only ElementInternals) so every AT and test tool sees them.
    this.setAttribute('role', 'option');
  }

  get resolvedValue(): string {
    return this.getAttribute('value') ?? this.value ?? this.text;
  }
  get text(): string {
    return this.label || (this.textContent ?? '').trim();
  }

  /** @internal set by the select. */
  setChoiceState(selected: boolean, active: boolean): void {
    const s = this.#internals.states;
    if (selected) s.add('selected');
    else s.delete('selected');
    if (active) s.add('active');
    else s.delete('active');
    this.setAttribute('aria-selected', String(selected));
  }

  override updated(): void {
    this.toggleAttribute('aria-disabled', this.disabled);
    if (this.disabled) this.setAttribute('aria-disabled', 'true');
    if (this.disabled) this.#internals.states.add('disabled');
    else this.#internals.states.delete('disabled');
  }

  override render() {
    return html`<div part="base">
      <span part="check" aria-hidden="true">✓</span><slot></slot>
    </div>`;
  }
}
