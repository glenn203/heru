import { PrismSearchInput } from './search-input.js';

if (!customElements.get('prism-search-input'))
  customElements.define('prism-search-input', PrismSearchInput);

declare global {
  interface HTMLElementTagNameMap {
    'prism-search-input': PrismSearchInput;
  }
}
