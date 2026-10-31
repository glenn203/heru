import { PrismCheckbox } from './checkbox.js';

if (!customElements.get('prism-checkbox'))
  customElements.define('prism-checkbox', PrismCheckbox);

declare global {
  interface HTMLElementTagNameMap {
    'prism-checkbox': PrismCheckbox;
  }
}
