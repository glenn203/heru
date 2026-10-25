import { PrismTextArea } from './text-area.js';

if (!customElements.get('prism-text-area'))
  customElements.define('prism-text-area', PrismTextArea);

declare global {
  interface HTMLElementTagNameMap {
    'prism-text-area': PrismTextArea;
  }
}
