import { PrismTextField } from './text-field.js';

if (!customElements.get('prism-text-field'))
  customElements.define('prism-text-field', PrismTextField);

declare global {
  interface HTMLElementTagNameMap {
    'prism-text-field': PrismTextField;
  }
}
