import { LitElement, css, html, type CSSResultGroup } from 'lit';
import { property, state } from 'lit/decorators.js';
import { devError } from './card-slots.js';
import { SelectionController } from './selection-controller.js';
import type { PrismCard } from './card.js';
import type { PrismCardSelect } from './card-select.js';
import { uniqueId } from '../internal/ids.js';

/**
 * Groups selectable cards and owns their selection. NAME PROVISIONAL
 * (Technical Writer).
 *
 * - `selection="single"`: a radio group. Tab enters on the selected card (or
 *   the first), the arrow keys move **and** select, and wrap. Choosing one
 *   clears the others.
 * - `selection="multi"` (default): a set of checkboxes. Tab visits each one,
 *   Space toggles. A polite message says how many are selected.
 *
 * Selection is by item id (`value` on each card), so it survives paging: ids
 * of cards that are not on screen stay selected. Read and set it with
 * `selected` (an array of ids), `clear()` and the `prism-selection-change`
 * event. Initial `selected` attributes on the cards are read once.
 *
 * @tag prism-card-group
 * @slot - The selectable cards (anywhere below, for example inside a list).
 * @csspart status - The visually hidden live region.
 * @fires prism-selection-change - `detail: { selected: string[], count: number }`.
 */
export class PrismCardGroup extends LitElement {
  static override styles: CSSResultGroup = css`
    :host {
      display: block;
    }
    :host([hidden]) {
      display: none;
    }
    [part='status'] {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      margin: -1px;
      padding: 0;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
  `;

  /** `single` is a radio group, `multi` a set of checkboxes. */
  @property({ reflect: true }) selection: 'single' | 'multi' = 'multi';
  /** Accessible name of the group. */
  @property() label = '';

  @state() protected message = '';

  readonly #sel = new SelectionController(this, { mode: 'multi' });
  readonly #id = uniqueId('prism-card-group');
  #observer?: MutationObserver;
  #primed = false;
  #scheduled = false;

  /** Selected item ids, in the order they were selected. */
  get selected(): string[] {
    return this.#sel.values;
  }
  set selected(ids: string[]) {
    if (this.#sel.set(ids)) this.#changed(false);
  }
  get count(): number {
    return this.#sel.size;
  }
  clear(): void {
    if (this.#sel.clear()) this.#changed(true);
  }

  get cards(): PrismCard[] {
    return [
      ...this.querySelectorAll<PrismCard>('prism-card[type="selectable"]'),
    ].filter((c) => c.closest('prism-card-group, prism-card-list') === this);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('prism-card-change', this.#onCardChange);
    this.addEventListener('keydown', this.#onKeydown);
    this.#observer = new MutationObserver(() => this.#schedule());
    this.#observer.observe(this, { childList: true, subtree: true });
    this.#schedule();
  }
  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('prism-card-change', this.#onCardChange);
    this.removeEventListener('keydown', this.#onKeydown);
    this.#observer?.disconnect();
  }

  override willUpdate(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('selection')) {
      this.#sel.mode = this.selection;
      if (this.selection === 'single' && this.#sel.size > 1)
        this.#sel.set(this.#sel.values.slice(0, 1));
    }
  }
  override updated(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('selection') || changed.has('label')) this.#schedule();
    if (!this.label && !this.hasAttribute('aria-label'))
      devError(this, `<${this.localName}> needs a \`label\` that names it.`);
  }

  #schedule(): void {
    if (this.#scheduled) return;
    this.#scheduled = true;
    queueMicrotask(() => {
      this.#scheduled = false;
      this.#sync();
    });
  }

  /** Pushes the selection into every card on screen. */
  #sync(): void {
    const cards = this.cards;
    if (!this.#primed) {
      this.#primed = true;
      const initial = cards
        .filter((c) => c.hasAttribute('selected'))
        .map((c) => c.value || '');
      if (initial.length) this.#sel.set(initial.filter(Boolean));
    }
    const single = this.selection === 'single';
    const role = this.hostRole();
    if (role) {
      this.setAttribute('role', role);
      if (this.label) this.setAttribute('aria-label', this.label);
    }
    const enabled = cards.filter((c) => !c.disabled);
    // Roving tab stop (single): the selected card, else the first enabled one.
    const stop =
      enabled.find((c) => this.#sel.has(this.#idOf(c))) ?? enabled[0];
    cards.forEach((card, i) => {
      const id = this.#idOf(card);
      card.selected = this.#sel.has(id);
      const select = card.querySelector<PrismCardSelect>(
        ':scope > prism-card-select',
      );
      if (!select) return;
      select.control = single ? 'radio' : 'checkbox';
      select.tabbable = single ? card === stop : true;
      select.posinset = single ? i + 1 : undefined;
      select.setsize = single ? cards.length : undefined;
    });
    this.synced();
  }

  /**
   * The host's role. A card list overrides it with `null`: its list role lives
   * on an inner wrapper so the toolbar, pager and status sit outside the list.
   */
  protected hostRole(): string | null {
    return this.selection === 'single' ? 'radiogroup' : 'group';
  }
  /** Called after every sync. A card list hooks in here. */
  protected synced(): void {
    /* nothing */
  }

  #idOf(card: PrismCard): string {
    if (!card.value) {
      devError(card, 'A card in a group needs a `value` (its item id).');
      card.value = uniqueId('card');
    }
    return card.value;
  }

  readonly #onCardChange = (event: Event): void => {
    const { value, selected } = (
      event as CustomEvent<{ value: string; selected: boolean }>
    ).detail;
    event.stopPropagation();
    const card = (event as CustomEvent<{ card: PrismCard }>).detail.card;
    const id = value || this.#idOf(card);
    const changed =
      this.selection === 'single'
        ? this.#sel.select(id)
        : selected
          ? this.#sel.select(id)
          : this.#sel.deselect(id);
    this.#sync();
    if (changed) this.#changed(true);
  };

  #changed(announce: boolean): void {
    this.#sync();
    const count = this.#sel.size;
    if (announce && this.selection === 'multi')
      this.message = count === 0 ? 'None selected' : `${count} selected`;
    this.dispatchEvent(
      new CustomEvent('prism-selection-change', {
        bubbles: true,
        composed: true,
        detail: { selected: this.#sel.values, count },
      }),
    );
  }

  /** Single selection: arrows move and select (APG radio group). */
  readonly #onKeydown = (event: KeyboardEvent): void => {
    if (this.selection !== 'single') return;
    const keys = ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'];
    if (!keys.includes(event.key)) return;
    const path = event.composedPath();
    const from = this.cards.find((c) => path.includes(c));
    if (
      !from ||
      !path.some((n) => (n as Element).localName === 'prism-card-select')
    )
      return;
    const enabled = this.cards.filter((c) => !c.disabled);
    const i = enabled.indexOf(from);
    if (i < 0) return;
    const rtl = getComputedStyle(this).direction === 'rtl';
    const forward =
      event.key === 'ArrowDown' ||
      (event.key === 'ArrowRight' && !rtl) ||
      (event.key === 'ArrowLeft' && rtl);
    const next =
      enabled[(i + (forward ? 1 : -1) + enabled.length) % enabled.length];
    if (!next) return;
    event.preventDefault();
    this.#sel.select(this.#idOf(next));
    this.#changed(true);
    // The roving stop moved with the selection; focus the new control.
    void next.updateComplete.then(() =>
      next
        .querySelector<PrismCardSelect>(':scope > prism-card-select')
        ?.focus(),
    );
  };

  override render() {
    return html`<slot></slot>
      <div part="status" role="status" aria-live="polite" id=${this.#id}>
        ${this.message}
      </div>`;
  }
}
