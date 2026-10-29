import { LitElement, css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { devError } from './card-slots.js';

/**
 * The card's name, and always a real heading (h2 to h6), in a list too.
 * NAME FROM THE NOTION CARD PAGE (CardTitle); `level` is provisional.
 *
 * `level` is required and has no default: pick it from the surrounding
 * outline (one below the Section heading, never skipping a level). Without a
 * valid level the text renders as plain text and a dev error is logged,
 * because a wrong default heading would break the page outline.
 *
 * Look: the PROPOSED component title text style (14px / 20px / 600). It is not
 * a heading style; the level only sets the semantics. Wraps to two lines, then
 * clamps with an ellipsis.
 *
 * Interaction: give it `href` (the card goes somewhere) or `action` (the card
 * does something) and the heading holds a real `<a>` or `<button>`. Its name is
 * the title text only, never the whole card's text. On a `clickable` card its
 * click area is stretched with a pseudo-element over the whole card; the card
 * is the positioning context. Other controls in the card sit above that layer.
 * On a collection card the link or button is just the title (not stretched).
 * A borderless card is never clickable, so there the title stays plain text.
 *
 * @tag prism-card-title
 * @slot - The title text.
 * @csspart heading - The heading element.
 * @csspart link - The real link or button (when `href` or `action` is set).
 * @csspart text - The clamped text.
 */
export class PrismCardTitle extends LitElement {
  static override styles = css`
    :host {
      /* PROPOSED text.component-title (14/20/600). Not in tokens/*.json yet;
         built from existing primitives. Do not set these from outside. */
      --_title-font-family: var(
        --prism-font-family-sans,
        Inter,
        ui-sans-serif,
        system-ui,
        sans-serif
      );
      --_title-font-size: var(--prism-font-size-14, 0.875rem);
      --_title-line-height: var(--prism-font-line-height-20, 1.25rem);
      --_title-font-weight: var(--prism-font-weight-semibold, 600);
      display: block;
      min-inline-size: 0;
    }
    :host([hidden]) {
      display: none;
    }
    [part='heading'] {
      margin: 0;
      padding: 0;
      font-family: var(--_title-font-family);
      font-size: var(--_title-font-size);
      line-height: var(--_title-line-height);
      font-weight: var(--_title-font-weight);
    }
    [part='link'] {
      all: unset;
      display: block;
      cursor: inherit;
      color: inherit;
      text-decoration: none;
      /* The card shows the focus ring around itself (rule 4). */
    }
    [part='link']:focus-visible {
      outline: none;
    }
    /* Stretched link: covers the card, whose host is position: relative. */
    :host([stretch]) [part='link']::after {
      content: '';
      position: absolute;
      inset: 0;
    }
    [part='text'] {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      overflow: hidden;
      overflow-wrap: anywhere;
    }
  `;

  /** Required heading level, 2 to 6. */
  @property({ type: Number, reflect: true }) level?: 2 | 3 | 4 | 5 | 6;

  /** Makes the title a link to this URL. */
  @property() href?: string;
  @property() target?: string;
  @property() rel?: string;
  /** Makes the title a button (the card does something). */
  @property({ type: Boolean, reflect: true }) action = false;

  /** @internal Set by the card: stretch the click area over the card. */
  @property({ type: Boolean, reflect: true }) stretch = false;
  /** @internal Set by the card: a borderless card is never interactive. */
  @property({ type: Boolean }) flat = false;
  /** @internal Set by the card. The reason belongs in the description. */
  @property({ type: Boolean }) disabled = false;

  override updated(): void {
    if (![2, 3, 4, 5, 6].includes(Number(this.level)))
      devError(
        this,
        '<prism-card-title> needs `level` (2 to 6), taken from the surrounding outline. It is rendered as plain text until then.',
      );
    if (this.flat && (this.href || this.action))
      devError(
        this,
        'A borderless card is never clickable: the link or button is ignored. Use a bordered card.',
      );
    if (this.href && this.action)
      devError(this, 'Use `href` or `action`, not both.');
  }

  #wrap(text: ReturnType<typeof html>) {
    if (this.flat) return text;
    if (this.href !== undefined && !this.action) {
      if (this.disabled)
        return html`<span part="link" role="link" aria-disabled="true"
          >${text}</span
        >`;
      return html`<a
        part="link"
        href=${this.href}
        target=${ifDefined(this.target)}
        rel=${ifDefined(this.rel)}
        >${text}</a
      >`;
    }
    if (this.action)
      return html`<button part="link" type="button" ?disabled=${this.disabled}>
        ${text}
      </button>`;
    return text;
  }

  override render() {
    const n = Number(this.level);
    const body = this.#wrap(html`<span part="text"><slot></slot></span>`);
    if (![2, 3, 4, 5, 6].includes(n))
      return html`<div part="heading">${body}</div>`;
    // Explicit templates (no dynamic tag names): a real h2 to h6.
    switch (n) {
      case 2:
        return html`<h2 part="heading">${body}</h2>`;
      case 3:
        return html`<h3 part="heading">${body}</h3>`;
      case 4:
        return html`<h4 part="heading">${body}</h4>`;
      case 5:
        return html`<h5 part="heading">${body}</h5>`;
      default:
        return html`<h6 part="heading">${body}</h6>`;
    }
  }
}
