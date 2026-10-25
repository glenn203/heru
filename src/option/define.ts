import { PrismOption } from './option.js';

if (!customElements.get('prism-option'))
  customElements.define('prism-option', PrismOption);

declare global {
  interface HTMLElementTagNameMap {
    'prism-option': PrismOption;
  }
}
