import { LitElement, css, html } from 'lit';
import { property } from 'lit/decorators.js';

/**
 * One label and value of a `prism-description-list`. The default slot is the value
 * (text, a Tag, a link). NAME PROVISIONAL.
 *
 * @tag prism-description-list-item
 * @slot - The value.
 * @csspart label - The label (a `term`).
 * @csspart value - The value (a `definition`).
 */
export class PrismDescriptionListItem extends LitElement {
  static override styles = css`
    :host {
      display: grid;
      grid-template-columns: subgrid;
      grid-column: 1 / -1;
      align-items: baseline;
      min-inline-size: 0;
    }
    :host([hidden]) {
      display: none;
    }
    [part='value'] {
      min-inline-size: 0;
      overflow-wrap: anywhere;
    }
  `;

  /** The label: "Version", "OS". */
  @property() label = '';

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute('role')) this.setAttribute('role', 'listitem');
  }

  override updated(): void {
    if (!this.label)
      console.error('[prism-description-list-item] `label` is required.', this);
  }

  override render() {
    return html`<span part="label" role="term">${this.label}</span
      ><span part="value" role="definition"><slot></slot></span>`;
  }
}
