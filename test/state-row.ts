import { LitElement, css, html } from 'lit';
import { stateLayer } from '../src/internal/state-layer.js';

/**
 * Test-only fixture: a generic interactive row (stand-in for a tab, tree row,
 * list item or clickable card) proving the state layer needs no
 * component-specific code. The consumer sets --_bg/--_on via ::part(base).
 */
class PrismTestRow extends LitElement {
  static override properties = {
    selected: { type: Boolean },
    disabled: { type: Boolean },
  };
  declare selected: boolean;
  declare disabled: boolean;
  static override styles = [
    css`
      [part='base'] {
        display: block;
        padding: 8px;
      }
    `,
    stateLayer("[part='base']"),
  ];
  constructor() {
    super();
    this.selected = false;
    this.disabled = false;
  }
  override render() {
    return html`<div
      part="base"
      role="option"
      tabindex="0"
      aria-selected=${String(this.selected)}
      aria-disabled=${String(this.disabled)}
    >
      ${this.selected ? '✓ ' : ''}<slot></slot>
    </div>`;
  }
}
if (!customElements.get('prism-test-row'))
  customElements.define('prism-test-row', PrismTestRow);
