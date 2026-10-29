import { css, html, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { PrismCardGroup } from './card-group.js';
import { devError } from './card-slots.js';
import { authored, renderLight } from './light-dom.js';
import type { PrismCard } from './card.js';

/** Page sizes the Card page names ("Common page sizes are 12, 24 and 48"). */
export const CARD_LIST_PAGE_SIZES = [12, 24, 48] as const;
export type CardListPageSize = (typeof CARD_LIST_PAGE_SIZES)[number];
/** PROPOSED (page: "Cards stay at least 280px wide"). */
export const CARD_LIST_MIN_PX = 280;

type ListState = 'loading' | 'refreshing' | 'empty' | 'no-matches' | 'error';

/**
 * A grid or single-column list of cards, with paging, selection that is kept
 * across pages, and the loading, empty and error states. NAME PROVISIONAL
 * (Technical Writer). Section owns these states on a real page; this element
 * gives them a default look and fires events so a Section can take over.
 *
 * ```html
 * <prism-card-list label="Hosts" selection="multi" total="120" page="2">
 *   <prism-card type="selectable" kind="collection" value="h-13">…</prism-card>
 * </prism-card-list>
 * ```
 *
 * - **Layout.** Columns follow the list's own width (a container query), not
 *   the screen: under 640px one column, 640 to 1023 two, 1024 to 1279 three,
 *   1280 and up four. Cards stay at least 280px wide, the gap is space-4 (16px)
 *   and cards in a row share a height. `columns="1"` pins one column (Aside,
 *   Drawer, Modal). No masonry.
 * - **Semantics.** The host is a labelled `list` and each card a `listitem`
 *   (the card sets its own role). Titles stay real headings: give every card
 *   the same `level`, one below the Section heading. With `total` set, each
 *   card gets `aria-posinset` and `aria-setsize` from the data, not from what
 *   is on the page.
 * - **Paging.** Server-side: you swap the children when `prism-card-list-page`
 *   fires. `page-size` is 12, 24 or 48 (default 24). The pager shows even when
 *   there is one page. A `pagination` slot replaces it with a real Pagination
 *   component; `load-more` shows a "Load more" button instead.
 * - **Selection** uses the same cards, `value` ids and controller as
 *   `prism-card-group`, multi only (use a group for a single choice). Ids not
 *   on screen stay selected when the page changes; a visible "N selected" and
 *   "Clear selection" sit above the cards unless `hide-selection-bar` is set
 *   or you fill the `toolbar` slot.
 * - **States** (`state`): `loading` (skeleton cards, list busy, polite
 *   "Loading"), `refreshing` (cards stay, quiet busy line), `empty` (fill the
 *   `empty` slot), `no-matches` ("No matches" and Clear filters), `error`
 *   (what failed and Retry). A single failed card uses `state="error"` on the
 *   card itself.
 *
 * @tag prism-card-list
 * @slot - The cards, all of one type with the same slots.
 * @slot toolbar - Replaces the selected count and Clear selection.
 * @slot pagination - Replaces the built-in pager.
 * @slot empty - First-use empty state: a short title, one sentence, one button.
 * @csspart grid - The grid of cards.
 * @csspart status - The visually hidden live region.
 * @csspart busy - The quiet busy line while refreshing.
 * @fires prism-card-list-page - Pager used. `detail: { page, pageSize }`.
 * @fires prism-card-list-load-more - Load more pressed.
 * @fires prism-card-list-retry - Retry pressed in the error state.
 * @fires prism-card-list-clear-filters - Clear filters pressed in no-matches.
 */
export class PrismCardList extends PrismCardGroup {
  static override styles = [
    PrismCardGroup.styles,
    css`
      :host {
        display: block;
        container-type: inline-size;
      }
      [part='grid'] {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: var(--prism-space-4, 1rem);
        align-items: stretch;
      }
      /* Columns follow the list's width (same four widths as the page). */
      @container (min-width: 640px) {
        [part='grid'] {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @container (min-width: 1024px) {
        [part='grid'] {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }
      @container (min-width: 1280px) {
        [part='grid'] {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
      }
      :host([columns='1']) [part='grid'] {
        grid-template-columns: minmax(0, 1fr) !important;
      }
      ::slotted(prism-card),
      ::slotted(prism-card-skeleton) {
        min-inline-size: 0;
      }
      [part='toolbar'],
      [part='pager'],
      [part='state'] {
        display: block;
      }
      [part='toolbar']:not(:has(::slotted(*))),
      [part='pager']:not(:has(::slotted(*))) {
        display: none;
      }
      [part='toolbar'] {
        margin-block-end: var(--prism-space-3, 0.75rem);
      }
      [part='pager'] {
        margin-block-start: var(--prism-space-4, 1rem);
      }
      [part='busy'] {
        display: block;
        block-size: 2px;
        margin-block-end: var(--prism-space-2, 0.5rem);
      }
      [part='busy'][hidden] {
        display: none;
      }
    `,
  ];

  /** Pins one column ("1") for an Aside, Drawer or Modal. Otherwise automatic. */
  @property({ reflect: true }) columns?: '1';
  /** Current page, starting at 1. Server-side: you swap the children. */
  @property({ type: Number, reflect: true }) page = 1;
  /** Cards per page: 12, 24 or 48. */
  @property({ type: Number, attribute: 'page-size', reflect: true })
  pageSize: number = 24;
  /** Total items across all pages (also sets each card's position and size). */
  @property({ type: Number }) total?: number;
  /** Replaces the pager with a "Load more" button (a feed that grows). */
  @property({ type: Boolean, attribute: 'load-more', reflect: true })
  loadMore = false;
  @property({ reflect: true }) state?: ListState;
  /** The reason for `state="error"`. */
  @property({ attribute: 'state-message' }) stateMessage = '';
  /** How many skeleton cards to show while loading (about eight). */
  @property({ type: Number, attribute: 'skeleton-count' }) skeletonCount = 8;
  /** Hides the built-in "N selected" bar (use your Toolbar instead). */
  @property({ type: Boolean, attribute: 'hide-selection-bar' })
  hideSelectionBar = false;

  #hadCards = false;
  #lastTotal?: number;

  protected override hostRole(): string {
    return 'list';
  }

  protected override synced(): void {
    const cards = this.#items;
    // Position and total come from the data, not from what is on the page.
    const offset = this.loadMore
      ? 0
      : (Math.max(1, this.page) - 1) * this.pageSize;
    cards.forEach((card, i) => {
      if (this.total === undefined) {
        card.removeAttribute('aria-setsize');
        card.removeAttribute('aria-posinset');
      } else {
        card.setAttribute('aria-setsize', String(this.total));
        card.setAttribute('aria-posinset', String(offset + i + 1));
      }
    });
    const levels = new Set(
      cards
        .map((c) =>
          c.querySelector(':scope > prism-card-title')?.getAttribute('level'),
        )
        .filter(Boolean),
    );
    if (levels.size > 1)
      devError(
        this,
        'Cards in a list share one title level (one below the Section heading); found ' +
          [...levels].join(', ') +
          '.',
      );
    const has = this.cards.length > 0;
    if (has !== this.#hadCards) {
      this.#hadCards = has;
      this.requestUpdate();
    }
  }

  get #items(): PrismCard[] {
    return [...this.children].filter(
      (c): c is PrismCard => c.localName === 'prism-card',
    );
  }

  override willUpdate(changed: Map<PropertyKey, unknown>): void {
    super.willUpdate(changed);
    if (changed.has('state')) {
      if (this.state === 'loading') this.message = 'Loading';
      else if (this.state === 'refreshing') this.message = 'Refreshing';
      else if (changed.get('state') !== undefined) this.message = '';
    }
    if (changed.has('total')) {
      if (this.#lastTotal !== undefined && this.total !== undefined)
        this.message = `${this.total} result${this.total === 1 ? '' : 's'}`;
      this.#lastTotal = this.total;
    }
  }

  override updated(changed: Map<PropertyKey, unknown>): void {
    super.updated(changed);
    if (this.selection === 'single')
      devError(
        this,
        'A card list selects many. Use <prism-card-group selection="single"> for a single choice.',
      );
    if (!(CARD_LIST_PAGE_SIZES as readonly number[]).includes(this.pageSize))
      devError(
        this,
        `page-size is ${CARD_LIST_PAGE_SIZES.join(', ')} (default 24), not ${String(this.pageSize)}.`,
      );
    if (this.columns !== undefined && String(this.columns) !== '1')
      devError(this, '`columns` takes "1" only; other widths are automatic.');
    this.toggleAttribute('aria-busy', false);
    if (this.state === 'loading' || this.state === 'refreshing')
      this.setAttribute('aria-busy', 'true');
    this.synced();
    this.#renderBars();
  }

  /** Everything the list adds itself goes in the light DOM (see light-dom.ts). */
  #renderBars(): void {
    // Selected count + Clear selection.
    const showBar =
      !this.hideSelectionBar &&
      !authored(this, 'toolbar') &&
      (this.#hadCards || this.count > 0);
    renderLight(
      this,
      'toolbar',
      showBar
        ? html`<div data-prism-selection-bar>
            <span data-prism-count tabindex="-1">${this.count} selected</span>
            ${
              this.count > 0
                ? html`<prism-button
                    variant="ghost"
                    size="sm"
                    type="button"
                    @click=${this.#onClear}
                    >Clear selection</prism-button
                  >`
                : null
            }
          </div>`
        : null,
    );

    // Skeleton cards while loading.
    renderLight(
      this,
      'skeleton',
      this.state === 'loading'
        ? html`${Array.from(
            { length: Math.max(1, Math.min(48, this.skeletonCount)) },
            () =>
              html`<prism-card-skeleton variant="card"></prism-card-skeleton>`,
          )}`
        : null,
    );

    // Whole-list states.
    let stateTpl: TemplateResult | null = null;
    if (this.state === 'no-matches')
      stateTpl = html`<div data-prism-list-state="no-matches">
        <p>No matches</p>
        <prism-button
          variant="secondary"
          type="button"
          @click=${() => this.#fire('prism-card-list-clear-filters')}
          >Clear filters</prism-button
        >
      </div>`;
    else if (this.state === 'error')
      stateTpl = html`<div data-prism-list-state="error">
        <p>${this.stateMessage || "The cards couldn't be loaded."}</p>
        <prism-button
          variant="secondary"
          type="button"
          @click=${() => this.#fire('prism-card-list-retry')}
          >Retry</prism-button
        >
      </div>`;
    else if (this.state === 'empty' && !authored(this, 'empty'))
      stateTpl = html`<div data-prism-list-state="empty">
        <p>Nothing here yet</p>
      </div>`;
    renderLight(this, 'state', stateTpl);

    // Pager or Load more.
    let pager: TemplateResult | null = null;
    if (!authored(this, 'pagination')) {
      if (this.loadMore)
        pager = html`<div data-prism-pager>
          <prism-button
            variant="secondary"
            type="button"
            @click=${() => this.#fire('prism-card-list-load-more')}
            >Load more</prism-button
          >
        </div>`;
      else if (this.total !== undefined) {
        const pages = Math.max(1, Math.ceil(this.total / this.pageSize));
        const page = Math.min(Math.max(1, this.page), pages);
        pager = html`<nav aria-label="Pagination" data-prism-pager>
          <prism-button
            variant="ghost"
            size="sm"
            type="button"
            ?disabled=${page <= 1}
            @click=${() => this.#go(page - 1)}
            >Previous</prism-button
          >
          <span data-prism-page>Page ${page} of ${pages}</span>
          <prism-button
            variant="ghost"
            size="sm"
            type="button"
            ?disabled=${page >= pages}
            @click=${() => this.#go(page + 1)}
            >Next</prism-button
          >
          <label data-prism-page-size
            >Per page
            <select @change=${this.#onSize}>
              ${CARD_LIST_PAGE_SIZES.map(
                (n) =>
                  html`<option value=${n} ?selected=${n === this.pageSize}>
                    ${n}
                  </option>`,
              )}
            </select>
          </label>
        </nav>`;
      }
    }
    renderLight(this, 'pagination', pager);
  }

  #fire(name: string, detail?: unknown): void {
    this.dispatchEvent(
      new CustomEvent(name, { bubbles: true, composed: true, detail }),
    );
  }

  #go(page: number): void {
    this.page = page;
    this.#fire('prism-card-list-page', { page, pageSize: this.pageSize });
  }

  #onSize = (event: Event): void => {
    this.pageSize = Number((event.target as HTMLSelectElement).value);
    this.page = 1;
    this.#fire('prism-card-list-page', {
      page: 1,
      pageSize: this.pageSize,
    });
  };

  /** Clear selection: the button disappears, so focus moves to the count. */
  #onClear = async (): Promise<void> => {
    this.clear();
    await this.updateComplete;
    this.querySelector<HTMLElement>('[data-prism-count]')?.focus();
  };

  override render() {
    const state = this.state;
    const whole =
      state === 'empty' || state === 'no-matches' || state === 'error';
    return html`<div part="toolbar"><slot name="toolbar"></slot></div>
      <div
        part="busy"
        aria-hidden="true"
        ?hidden=${state !== 'refreshing'}
      ></div>
      ${
        whole
          ? html`<div part="state">
              <slot name="state"></slot><slot name="empty"></slot>
            </div>`
          : html`<div part="grid">
              ${
                state === 'loading'
                  ? html`<slot name="skeleton"></slot>`
                  : html`<slot></slot>`
              }
            </div>`
      }
      <div part="pager"><slot name="pagination"></slot></div>
      <div part="status" role="status" aria-live="polite">
        ${this.message}
      </div>`;
  }
}
