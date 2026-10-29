import { LitElement, css, html } from 'lit';
import { property, state } from 'lit/decorators.js';
import {
  applyViolations,
  devError,
  validateFooter,
  validateHeader,
  type CardCapabilities,
} from './card-slots.js';

/** PROPOSED (page: "about 280px or less †"): the narrow breakpoint. */
export const CARD_NARROW_PX = 280;

/**
 * One self-contained item with its own surface. NAMES PROVISIONAL except
 * Card, CardTitle and CardDescription (Notion Card page).
 *
 * Three slots: `header`, `content` and `footer`. Header and footer accept only
 * the approved parts (see card-slots.ts); anything else is hidden with a dev
 * error. Unslotted children go to `content`, which is free.
 *
 * ```html
 * <prism-card>
 *   <prism-card-title slot="header" level="3">Phishing playbook</prism-card-title>
 *   <prism-card-description slot="header">Owner: SOC</prism-card-description>
 *   <p>Free content.</p>
 *   <prism-card-meta slot="footer">Updated 2 min ago</prism-card-meta>
 *   <prism-card-actions slot="footer">
 *     <prism-button variant="ghost">View all</prism-button>
 *   </prism-card-actions>
 * </prism-card>
 * ```
 *
 * Accessibility: the card has no role of its own beyond `group` (standalone),
 * `listitem` (inside `prism-card-list`) or none (inside an `li`). Its name is
 * the CardTitle text, copied to `aria-label` because ID references cannot cross
 * shadow roots. It is never a landmark. An author `role` or `aria-label` wins.
 *
 * This milestone covers the shared card and the `default` and `borderless`
 * types. Clickable, selectable, widget and collapsible types come later.
 *
 * @tag prism-card
 * @slot header - CardTitle (required), CardDescription, icon or avatar, Tag or Badge, CardActions.
 * @slot content - Free content. Unslotted children land here too.
 * @slot footer - CardMeta at the start, CardActions at the end.
 * @csspart base - The card surface (padding, border, fill).
 * @csspart header - Header row.
 * @csspart content - Content area; grows so footers align across a row.
 * @csspart footer - Footer row.
 * @cssstate narrow - The card is 280px wide or less.
 * @cssstate has-header - The header slot has content.
 * @cssstate has-footer - The footer slot has content.
 */
export class PrismCard extends LitElement {
  static override styles = css`
    :host {
      /* PROPOSED (not in tokens/*.json): card padding is space-4 (16px) at
         default density, 12px compact, 20px comfortable. Built from the
         existing density pad units (compact 1, default 2, comfortable 3). */
      --_pad: calc(
        var(--prism-unit, 0.25rem) * (var(--prism-density-pad-units, 2) + 2)
      );
      display: block;
      position: relative;
      box-sizing: border-box;
      min-inline-size: 0;
    }
    :host([hidden]) {
      display: none;
    }
    [part='base'] {
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      block-size: 100%;
      min-inline-size: 0;
      padding: var(--_pad);
    }
    [part='header'] {
      /* start items | title | tag | spacer | actions. The title column is
         max-content so a Tag sits right after the title text. */
      display: grid;
      grid-template-columns:
        auto auto auto minmax(0, max-content) auto minmax(0, 1fr)
        auto;
      align-items: start;
      margin-block-end: var(--prism-space-3, 0.75rem);
    }
    [part='header'][hidden],
    [part='footer'][hidden] {
      display: none;
    }
    [part='header'] ::slotted(prism-card-handle) {
      grid-column: 1;
      grid-row: 1;
      margin-inline-end: var(--prism-space-2, 0.5rem);
    }
    [part='header'] ::slotted(prism-card-select) {
      grid-column: 2;
      grid-row: 1;
      margin-inline-end: var(--prism-space-2, 0.5rem);
    }
    [part='header'] ::slotted(prism-icon),
    [part='header'] ::slotted(prism-avatar),
    [part='header'] ::slotted([data-prism-card-icon]) {
      grid-column: 3;
      grid-row: 1;
      margin-inline-end: var(--prism-space-2, 0.5rem);
      /* Centre a 16px icon on the title's first line. */
      margin-block-start: calc(
        (var(--prism-font-line-height-20, 1.25rem) - 1rem) / 2
      );
    }
    [part='header'] ::slotted(prism-card-title) {
      grid-column: 4;
      grid-row: 1;
    }
    [part='header'] ::slotted(prism-card-description) {
      grid-column: 4 / 7;
      grid-row: 2;
    }
    [part='header'] ::slotted(prism-tag),
    [part='header'] ::slotted(prism-badge) {
      grid-column: 5;
      grid-row: 1;
      margin-inline-start: var(--prism-space-2, 0.5rem);
    }
    [part='header'] ::slotted(prism-card-actions) {
      grid-column: 7;
      grid-row: 1 / span 2;
      margin-inline-start: var(--prism-space-2, 0.5rem);
      /* Centre a medium icon button on the title's first line (20px). The
         button's hover fill may extend into the card padding, not over text. */
      margin-block: calc(
        (
            var(--prism-font-line-height-20, 1.25rem) - var(
                --prism-control-height-md,
                2.25rem
              )
          ) /
          2
      );
    }
    [part='content'] {
      flex: 1 1 auto;
      min-inline-size: 0;
      display: flex;
      flex-direction: column;
    }
    [part='footer'] {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--prism-space-2, 0.5rem);
      margin-block-start: var(--prism-space-3, 0.75rem);
    }
    [part='footer'] ::slotted(prism-card-meta) {
      flex: 1 1 0;
      min-inline-size: 0;
    }
    [part='footer'] ::slotted(prism-card-actions) {
      margin-inline-start: auto;
    }
    /* A violation is never rendered (see card-slots.ts). */
    ::slotted([data-prism-invalid]) {
      display: none !important;
    }
    /* Narrow: everything stacks, actions stay at the end. */
    :host(:state(narrow)) [part='footer'] {
      flex-direction: column;
      align-items: stretch;
    }
    :host(:state(narrow)) [part='footer'] ::slotted(prism-card-actions) {
      align-self: flex-end;
    }
  `;

  /**
   * Surface type. `default` is bordered. `borderless` is a flat fill with no
   * border or shadow (replaces Panel); it is never clickable or selectable.
   * More types arrive in later milestones. NAME PROVISIONAL.
   */
  @property({ reflect: true }) type: 'default' | 'borderless' = 'default';

  /**
   * Elevation treatment: a shadow from the predefined elevation level, plus a
   * transparent border (kept visible in forced-colors mode). Ignored on
   * borderless cards. NAME PROVISIONAL.
   */
  @property({ type: Boolean, reflect: true }) raised = false;

  /**
   * A standalone task card: its footer may hold one primary button. Without
   * it the footer takes ghost and secondary only. NAME PROVISIONAL.
   */
  @property({ type: Boolean, reflect: true }) standalone = false;

  @state() private hasHeader = false;
  @state() private hasFooter = false;

  readonly #internals = this.attachInternals();
  #observer?: MutationObserver;
  #resize?: ResizeObserver;
  #scheduled = false;

  get capabilities(): CardCapabilities {
    return {
      standalone: this.standalone,
      selectable: false,
      draggable: false,
      widget: false,
    };
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#syncRole();
    this.#observer = new MutationObserver(() => this.#schedule());
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['slot', 'variant', 'level'],
    });
    this.#resize = new ResizeObserver(([entry]) => {
      const w = entry?.borderBoxSize?.[0]?.inlineSize ?? this.offsetWidth;
      this.#setState('narrow', w > 0 && w <= CARD_NARROW_PX);
    });
    this.#resize.observe(this);
    this.#schedule();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observer?.disconnect();
    this.#resize?.disconnect();
  }

  override willUpdate(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('type') || changed.has('raised')) {
      if (this.raised && this.type === 'borderless')
        devError(
          this,
          'A borderless card never has a shadow; `raised` is ignored.',
        );
      if (this.type !== 'default' && this.type !== 'borderless')
        devError(
          this,
          `Unknown type "${String(this.type)}". Available now: default, borderless.`,
        );
    }
  }

  override updated(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('standalone')) this.#schedule();
  }

  #setState(name: string, on: boolean): void {
    try {
      if (on) this.#internals.states.add(name);
      else this.#internals.states.delete(name);
    } catch {
      /* :state() unsupported */
    }
  }

  /** Slot children, flattened one level: direct children with slot=name. */
  #slotted(name: string): Element[] {
    return [...this.children].filter((c) => c.getAttribute('slot') === name);
  }

  #schedule = (): void => {
    if (this.#scheduled) return;
    this.#scheduled = true;
    queueMicrotask(() => {
      this.#scheduled = false;
      this.#validate();
    });
  };

  #validate(): void {
    const header = this.#slotted('header');
    const footer = this.#slotted('footer');
    this.hasHeader = header.length > 0;
    this.hasFooter = footer.length > 0;
    this.#setState('has-header', this.hasHeader);
    this.#setState('has-footer', this.hasFooter);
    const headerViolations = this.hasHeader
      ? validateHeader(header, this.capabilities, this)
      : [];
    applyViolations(header, headerViolations);
    applyViolations(footer, validateFooter(footer));
    // Actions groups re-check their own buttons against the card's flags.
    for (const el of [...header, ...footer])
      (el as Partial<{ revalidate(): void }>).revalidate?.();
    this.#syncName(header);
    this.#syncRole();
  }

  /** Role and name are set as host attributes (not only ElementInternals) so
   *  every assistive technology and test tool sees them, as prism-option does.
   *  An author-supplied `role` or `aria-label` always wins. */
  #own = new Set<string>();
  #setAttr(name: string, value: string | null): void {
    if (this.hasAttribute(name) && !this.#own.has(name)) return;
    if (value === null) {
      this.removeAttribute(name);
      this.#own.delete(name);
    } else {
      this.setAttribute(name, value);
      this.#own.add(name);
    }
  }

  #syncName(header: Element[]): void {
    const title = header.find((e) => e.localName === 'prism-card-title');
    const name = title?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    this.#setAttr('aria-label', name || null);
  }

  #syncRole(): void {
    const parent = this.parentElement;
    if (parent?.localName === 'li') this.#setAttr('role', null);
    else if (parent?.localName === 'prism-card-list')
      this.#setAttr('role', 'listitem');
    else this.#setAttr('role', 'group');
  }

  override render() {
    return html`<div part="base">
      <div part="header" ?hidden=${!this.hasHeader}>
        <slot name="header"></slot>
      </div>
      <div part="content"><slot name="content"></slot><slot></slot></div>
      <div part="footer" ?hidden=${!this.hasFooter}>
        <slot name="footer"></slot>
      </div>
    </div>`;
  }
}
