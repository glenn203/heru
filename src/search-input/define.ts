import { HeruSearchInput } from './search-input.js';

if (!customElements.get('heru-search-input'))
  customElements.define('heru-search-input', HeruSearchInput);

declare global {
  interface HTMLElementTagNameMap {
    'heru-search-input': HeruSearchInput;
  }
}
