import { LitElement, css, html } from 'lit';
import { property, query } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import type { PrismCard } from './card.js';

/**
 * The selection control of a selectable card: a real, always visible
 * `<input type="checkbox">` or `<input type="radio">`. NAME PROVISIONAL.
 * Prism has no Checkbox or Radio component yet, so this is card-private and swappable.
 *
 * It is labelled by the card's title and described by its description. ID
 * references cannot cross shadow roots, so the text is copied into
 * `aria-label` and `aria-description` and kept in sync by the card. The
 * `control` comes from the group (`single` is radio, `multi` is checkbox); a
 * card on its own is a checkbox.
 *
 * Radios in separate shadow roots do not form a native group, so
 * `prism-card-group` moves focus and selection with the arrow keys and sets
 * `aria-posinset` and `aria-setsize` itself.
 *
 * The target is at least 24 by 24px. The selected mark is the native check or
 * dot, so selection never relies on colour alone.
 *
 * @tag prism-card-select
 * @csspart base - The 24px label that holds the input.
 * @csspart input - The native checkbox or radio.
 * @fires prism-card-toggle - The user changed the control. `detail: { checked }`.
 */
export class PrismCardSelect extends LitElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override styles = css`
    :host {
      display: inline-block;
    }
    :host([hidden]) {
      display: none;
    }
    [part='base'] {
      display: grid;
      place-items: center;
      /* 24 by 24px target (WCAG 2.5.8), room around the 16px control. */
      min-inline-size: 1.5rem;
      min-block-size: 1.5rem;
      cursor: pointer;
    }
    :host([disabled]) [part='base'] {
      cursor: default;
    }
    [part='input'] {
      margin: 0;
      inline-size: 1rem;
      block-size: 1rem;
      cursor: inherit;
      accent-color: var(--prism-color-accent, currentColor);
    }
    /* A choice card shows its focus on the whole card instead. */
    :host([choice]) [part='input']:focus-visible {
      outline: none;
    }
  `;

  /** Set by the group: `radio` for single selection, else `checkbox`. */
  @property({ reflect: true }) control: 'checkbox' | 'radio' = 'checkbox';
  @property({ type: Boolean, reflect: true }) checked = false;
  @property({ type: Boolean, reflect: true }) disabled = false;
  /** Set by the card on a choice card (no other controls, whole card toggles). */
  @property({ type: Boolean, reflect: true }) choice = false;
  /** Roving tab stop: the group clears this on radios that are not current. */
  @property({ type: Boolean }) tabbable = true;
  @property({ type: Number }) posinset?: number;
  @property({ type: Number }) setsize?: number;

  @query('input') private readonly input!: HTMLInputElement;

  override focus(options?: FocusOptions): void {
    this.input?.focus(options);
  }

  get #card(): PrismCard | null {
    return this.closest('prism-card');
  }

  /** The card's name and description, copied for the native input. */
  syncText(): void {
    this.requestUpdate();
  }

  #onChange = (event: Event): void => {
    event.stopPropagation();
    const checked = this.input.checked;
    // The card (or group) owns the truth; snap back, then let it re-render.
    this.input.checked = this.checked;
    this.dispatchEvent(
      new CustomEvent('prism-card-toggle', {
        bubbles: true,
        composed: true,
        detail: { checked },
      }),
    );
  };

  override render() {
    const card = this.#card;
    const name = card?.titleText ?? '';
    const desc = card?.descriptionText ?? '';
    return html`<label part="base">
      <input
        part="input"
        type=${this.control}
        .checked=${this.checked}
        ?disabled=${this.disabled}
        tabindex=${this.tabbable ? '0' : '-1'}
        aria-label=${ifDefined(name || undefined)}
        aria-description=${ifDefined(desc || undefined)}
        aria-posinset=${ifDefined(this.posinset)}
        aria-setsize=${ifDefined(this.setsize)}
        @change=${this.#onChange}
      />
    </label>`;
  }
}
